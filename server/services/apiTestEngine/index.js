const mongoose = require('mongoose');
const RequestExecutor = require('../requestExecutor');
const ScanJob = require('../../data/models/ScanJob');
const ScanResult = require('../../data/models/ScanResult');
const ApiCollection = require('../../data/models/ApiCollection');
const Request = require('../../data/models/Request');
const Proxy = require('../../data/models/Proxy');
const ProxyPool = require('../../data/models/ProxyPool');
const ParameterSet = require('../../data/models/ParameterSet');

/**
 * API测试引擎类
 * 负责执行API测试任务并分析响应结果
 */
class ApiTestEngine {
  constructor() {
    // 活跃的测试任务映射
    this.activeTestJobs = new Map();
    
    // 最大并发任务数
    this.maxConcurrentTests = 5;
  }
  
  /**
   * 启动测试任务
   * @param {String} jobId - 测试任务ID
   * @returns {Promise<Object>} 测试结果概要
   */
  async startTestJob(jobId) {
    try {
      // 检查活跃任务数
      if (this.activeTestJobs.size >= this.maxConcurrentTests) {
        throw new Error('已达到最大并发测试任务数');
      }
      
      // 查找任务
      const job = await ScanJob.findById(jobId);
      if (!job) {
        throw new Error('测试任务不存在');
      }
      
      // 检查任务状态
      if (job.status === 'running') {
        throw new Error('测试任务已在运行中');
      }
      
      // 更新任务状态
      job.status = 'running';
      job.progress = 0;
      job.startTime = new Date();
      job.endTime = null;
      await job.save();
      
      // 将任务添加到活跃任务映射
      this.activeTestJobs.set(jobId, {
        job,
        results: [],
        completedRequests: 0,
        totalRequests: 0,
        aborted: false
      });
      
      // 异步执行测试
      this.executeTest(jobId).catch(error => {
        console.error(`测试任务 ${jobId} 执行错误:`, error);
        this.handleTestError(jobId, error);
      });
      
      return {
        jobId,
        status: 'running',
        message: '测试任务已启动'
      };
    } catch (error) {
      console.error('启动测试任务错误:', error);
      
      // 更新任务状态为失败
      if (jobId) {
        await ScanJob.findByIdAndUpdate(jobId, {
          status: 'failed',
          endTime: new Date()
        });
      }
      
      throw error;
    }
  }
  
  /**
   * 执行测试过程
   * @param {String} jobId - 测试任务ID
   * @returns {Promise<void>}
   */
  async executeTest(jobId) {
    try {
      const jobState = this.activeTestJobs.get(jobId);
      if (!jobState || jobState.aborted) {
        return;
      }
      
      const { job } = jobState;
      
      // 查找集合
      const collection = await ApiCollection.findById(job.collectionId);
      if (!collection) {
        throw new Error('未找到API集合');
      }
      
      // 查找要测试的请求
      let requests;
      if (job.requests && job.requests.length > 0) {
        requests = await Request.find({
          _id: { $in: job.requests }
        });
      } else {
        requests = await Request.find({
          collectionId: job.collectionId
        });
      }
      
      if (!requests || requests.length === 0) {
        throw new Error('没有找到要测试的请求');
      }
      
      // 获取参数集
      let parameterSet = null;
      if (job.parameterSetId) {
        parameterSet = await ParameterSet.findById(job.parameterSetId);
      }
      
      // 获取代理配置
      let proxyPool = null;
      if (job.proxyPoolId) {
        proxyPool = await ProxyPool.findById(job.proxyPoolId)
          .populate('proxies');
      }
      
      // 准备环境变量
      const environment = {};
      if (collection.variables && collection.variables.length > 0) {
        collection.variables.forEach(variable => {
          environment[variable.key] = variable.value;
        });
      }
      
      // 设置总请求数
      const totalRequests = this.calculateTotalRequests(requests, parameterSet);
      jobState.totalRequests = totalRequests;
      
      // 更新任务信息
      await ScanJob.findByIdAndUpdate(jobId, {
        progress: 0
      });
      
      console.log(`开始测试任务 ${jobId}, 共 ${totalRequests} 个请求变种`);
      
      // 分批处理请求
      const batchSize = job.concurrency || 5;
      const batches = this.createRequestBatches(requests, batchSize);
      
      for (const [batchIndex, batch] of batches.entries()) {
        if (jobState.aborted) {
          break;
        }
        
        // 并行处理批次中的请求
        const batchPromises = batch.map(request => 
          this.testRequest(request, environment, parameterSet, proxyPool, jobId)
        );
        
        const batchResults = await Promise.all(batchPromises);
        
        // 累加结果
        batchResults.forEach(results => {
          if (results && results.length > 0) {
            jobState.results.push(...results);
          }
        });
        
        // 更新进度
        const completedBatches = batchIndex + 1;
        const progress = Math.min(
          Math.floor((completedBatches * batchSize * 100) / totalRequests),
          99 // 最大到99%，留1%给最后的完成步骤
        );
        
        jobState.job.progress = progress;
        await ScanJob.findByIdAndUpdate(jobId, { progress });
        
        console.log(`测试任务 ${jobId} 进度: ${progress}%`);
      }
      
      // 完成测试
      await this.finishTest(jobId);
    } catch (error) {
      console.error(`测试任务 ${jobId} 执行错误:`, error);
      await this.handleTestError(jobId, error);
    } finally {
      // 从活跃任务映射中移除
      this.activeTestJobs.delete(jobId);
    }
  }
  
  /**
   * 测试单个请求
   * @param {Object} request - 请求对象
   * @param {Object} environment - 环境变量
   * @param {Object} parameterSet - 参数集
   * @param {Object} proxyPool - 代理池
   * @param {String} jobId - 测试任务ID
   * @returns {Promise<Array>} 测试结果数组
   */
  async testRequest(request, environment, parameterSet, proxyPool, jobId) {
    const jobState = this.activeTestJobs.get(jobId);
    if (!jobState || jobState.aborted) {
      return [];
    }
    
    try {
      // 获取参数变量
      const parameterVariations = this.generateParameterVariations(request, parameterSet);
      
      const results = [];
      
      // 针对每个参数变量执行请求
      for (const params of parameterVariations) {
        if (jobState.aborted) {
          break;
        }
        
        // 合并环境变量和当前参数变量
        const requestEnvironment = {
          ...environment,
          ...params
        };
        
        // 选择代理
        let proxyId = null;
        if (proxyPool && proxyPool.proxies && proxyPool.proxies.length > 0) {
          const activeProxies = proxyPool.proxies.filter(p => p.isActive);
          if (activeProxies.length > 0) {
            // 根据代理池选择模式选择代理
            if (proxyPool.selectionMode === 'random') {
              const randomIndex = Math.floor(Math.random() * activeProxies.length);
              proxyId = activeProxies[randomIndex]._id;
            } else {
              // 默认顺序选择
              const index = (jobState.completedRequests || 0) % activeProxies.length;
              proxyId = activeProxies[index]._id;
            }
          }
        }
        
        // 执行请求
        const response = await RequestExecutor.executeRequest(request, {
          environment: requestEnvironment,
          proxyId
        });
        
        // 执行测试脚本
        const testResults = await this.runTests(request, response);
        
        // 创建测试结果
        const testResult = new ScanResult({
          jobId,
          requestId: request._id,
          status: response.status,
          statusText: response.statusText,
          url: response.url || request.url,
          method: request.method,
          responseTime: response.responseTime,
          responseSize: response.responseSize,
          responseHeaders: response.responseHeaders,
          responseBody: response.responseBody,
          error: response.error,
          testResults,
          parameterValues: params,
          proxyId,
          timestamp: new Date()
        });
        
        await testResult.save();
        results.push(testResult);
        
        // 更新完成的请求数
        jobState.completedRequests++;
      }
      
      return results;
    } catch (error) {
      console.error(`测试请求 ${request._id} 错误:`, error);
      
      // 记录错误结果
      const errorResult = new ScanResult({
        jobId,
        requestId: request._id,
        status: 0,
        statusText: '测试失败',
        url: request.url,
        method: request.method,
        error: error.message,
        timestamp: new Date()
      });
      
      await errorResult.save();
      jobState.completedRequests++;
      
      return [errorResult];
    }
  }
  
  /**
   * 运行测试脚本
   * @param {Object} request - 请求对象
   * @param {Object} response - 响应对象
   * @returns {Promise<Array>} 测试结果数组
   */
  async runTests(request, response) {
    const results = [];
    
    try {
      // 如果没有测试脚本，执行默认测试
      if (!request.tests || !request.tests.trim()) {
        return this.runDefaultTests(response);
      }
      
      // TODO: 实现测试脚本执行逻辑
      // 这里可以使用沙箱环境执行用户定义的测试脚本
      // 例如使用vm模块或者其他脚本执行引擎
      
      // 简单的模拟测试结果
      results.push({
        name: '用户自定义测试',
        passed: response.status >= 200 && response.status < 300,
        message: response.status >= 200 && response.status < 300 
          ? '测试通过' 
          : `请求返回了非成功状态码: ${response.status}`
      });
    } catch (error) {
      console.error('执行测试脚本错误:', error);
      results.push({
        name: '测试脚本执行',
        passed: false,
        message: `测试脚本执行错误: ${error.message}`
      });
    }
    
    return results;
  }
  
  /**
   * 运行默认测试
   * @param {Object} response - 响应对象
   * @returns {Array} 默认测试结果
   */
  runDefaultTests(response) {
    const results = [];
    
    // 检查状态码是否表示成功
    results.push({
      name: '状态码检查',
      passed: response.status >= 200 && response.status < 300,
      message: response.status >= 200 && response.status < 300 
        ? `状态码正常: ${response.status}` 
        : `状态码异常: ${response.status}`
    });
    
    // 检查响应时间
    const responseTimeThreshold = 5000; // 5秒
    results.push({
      name: '响应时间检查',
      passed: response.responseTime < responseTimeThreshold,
      message: response.responseTime < responseTimeThreshold
        ? `响应时间正常: ${response.responseTime}ms`
        : `响应时间过长: ${response.responseTime}ms (超过${responseTimeThreshold}ms)`
    });
    
    // 检查响应内容格式
    let isValidJSON = false;
    if (response.responseBody) {
      try {
        JSON.parse(response.responseBody.toString());
        isValidJSON = true;
      } catch (e) {
        isValidJSON = false;
      }
    }
    
    const contentTypeHeader = response.responseHeaders 
      ? (response.responseHeaders['content-type'] || response.responseHeaders['Content-Type']) 
      : '';
    
    if (contentTypeHeader && contentTypeHeader.includes('application/json')) {
      results.push({
        name: 'JSON格式检查',
        passed: isValidJSON,
        message: isValidJSON 
          ? 'JSON格式有效' 
          : 'Content-Type声明为JSON但内容解析失败'
      });
    }
    
    return results;
  }
  
  /**
   * 生成参数变体
   * @param {Object} request - 请求对象
   * @param {Object} parameterSet - 参数集
   * @returns {Array} 参数变体数组
   */
  generateParameterVariations(request, parameterSet) {
    // 如果没有参数集，返回空对象作为默认变体
    if (!parameterSet || !parameterSet.variables || parameterSet.variables.size === 0) {
      return [{}];
    }
    
    // 将 Map 转换为常规对象
    const variables = {};
    for (const [key, values] of parameterSet.variables.entries()) {
      variables[key] = values;
    }
    
    // 递归生成参数组合
    const generateCombinations = (keys, currentIndex = 0, currentCombination = {}) => {
      if (currentIndex >= keys.length) {
        return [currentCombination];
      }
      
      const key = keys[currentIndex];
      const values = variables[key] || [];
      
      // 如果没有值，递归下一个键
      if (!values.length) {
        return generateCombinations(keys, currentIndex + 1, currentCombination);
      }
      
      // 为当前键的每个值生成组合
      const combinations = [];
      for (const value of values) {
        const newCombination = {
          ...currentCombination,
          [key]: value
        };
        
        const nextCombinations = generateCombinations(
          keys,
          currentIndex + 1,
          newCombination
        );
        
        combinations.push(...nextCombinations);
      }
      
      return combinations;
    };
    
    // 生成所有可能的组合
    return generateCombinations(Object.keys(variables));
  }
  
  /**
   * 计算总请求数
   * @param {Array} requests - 请求数组
   * @param {Object} parameterSet - 参数集
   * @returns {Number} 总请求数
   */
  calculateTotalRequests(requests, parameterSet) {
    const requestCount = requests.length;
    
    // 如果没有参数集，每个请求只有一个变体
    if (!parameterSet || !parameterSet.variables || parameterSet.variables.size === 0) {
      return requestCount;
    }
    
    // 计算参数组合数
    let combinationCount = 1;
    for (const values of parameterSet.variables.values()) {
      combinationCount *= Math.max(values.length, 1);
    }
    
    return requestCount * combinationCount;
  }
  
  /**
   * 创建请求批次
   * @param {Array} requests - 请求数组
   * @param {Number} batchSize - 批次大小
   * @returns {Array} 请求批次数组
   */
  createRequestBatches(requests, batchSize) {
    const batches = [];
    for (let i = 0; i < requests.length; i += batchSize) {
      batches.push(requests.slice(i, i + batchSize));
    }
    return batches;
  }
  
  /**
   * 完成测试
   * @param {String} jobId - 测试任务ID
   * @returns {Promise<void>}
   */
  async finishTest(jobId) {
    try {
      const jobState = this.activeTestJobs.get(jobId);
      if (!jobState) {
        return;
      }
      
      // 更新任务状态
      await ScanJob.findByIdAndUpdate(jobId, {
        status: 'completed',
        progress: 100,
        endTime: new Date()
      });
      
      console.log(`测试任务 ${jobId} 已完成，共测试 ${jobState.completedRequests} 个请求`);
    } catch (error) {
      console.error(`完成测试任务 ${jobId} 错误:`, error);
      await this.handleTestError(jobId, error);
    }
  }
  
  /**
   * 处理测试错误
   * @param {String} jobId - 测试任务ID
   * @param {Error} error - 错误对象
   * @returns {Promise<void>}
   */
  async handleTestError(jobId, error) {
    try {
      // 更新任务状态为失败
      await ScanJob.findByIdAndUpdate(jobId, {
        status: 'failed',
        endTime: new Date()
      });
      
      console.error(`测试任务 ${jobId} 失败:`, error.message);
    } catch (err) {
      console.error(`更新失败任务状态错误:`, err);
    }
  }
  
  /**
   * 取消测试任务
   * @param {String} jobId - 测试任务ID
   * @returns {Promise<Object>} 取消结果
   */
  async cancelTestJob(jobId) {
    try {
      const jobState = this.activeTestJobs.get(jobId);
      
      if (!jobState) {
        return {
          success: false,
          message: '未找到活跃的测试任务'
        };
      }
      
      // 标记为已中止
      jobState.aborted = true;
      
      // 更新任务状态
      await ScanJob.findByIdAndUpdate(jobId, {
        status: 'cancelled',
        endTime: new Date()
      });
      
      return {
        success: true,
        message: '测试任务已取消'
      };
    } catch (error) {
      console.error('取消测试任务错误:', error);
      return {
        success: false,
        message: '取消测试任务失败',
        error: error.message
      };
    }
  }
  
  /**
   * 获取活跃测试任务列表
   * @returns {Array} 活跃测试任务数组
   */
  getActiveTestJobs() {
    const jobs = [];
    
    for (const [jobId, jobState] of this.activeTestJobs.entries()) {
      jobs.push({
        jobId,
        status: jobState.job.status,
        progress: jobState.job.progress,
        completedRequests: jobState.completedRequests,
        totalRequests: jobState.totalRequests
      });
    }
    
    return jobs;
  }
}

module.exports = new ApiTestEngine();
