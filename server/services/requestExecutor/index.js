const axios = require('axios');
const vm = require('vm');
const qs = require('querystring');
const FormData = require('form-data');
const { URL } = require('url');
const Proxy = require('../../data/models/Proxy');
const ProxyPool = require('../../data/models/ProxyPool');
const HttpsProxyAgent = require('https-proxy-agent');
const SocksProxyAgent = require('socks-proxy-agent');

/**
 * 请求执行器类
 * 负责处理API请求的执行，包括变量替换、代理选择等
 */
class RequestExecutor {
  /**
   * 执行API请求
   * @param {Object} request - 请求对象
   * @param {Object} options - 额外选项
   * @returns {Promise<Object>} 响应结果
   */
  async executeRequest(request, options = {}) {
    try {
      const startTime = Date.now();
      
      // 解构选项
      const {
        environment = {},
        proxyId = null,
        proxyPoolId = null,
        skipPreRequestScript = false,
        skipTests = false
      } = options;
      
      // 处理变量
      const resolvedRequest = await this.resolveVariables(request, environment);
      
      // 执行前置脚本
      let scriptContext = { request: resolvedRequest, environment };
      
      if (!skipPreRequestScript && resolvedRequest.preRequestScript) {
        scriptContext = await this.executeScript(
          resolvedRequest.preRequestScript,
          scriptContext
        );
        
        // 如果脚本修改了请求，使用修改后的请求
        resolvedRequest = scriptContext.request;
      }
      
      // 选择代理
      const proxyConfig = await this.selectProxy(proxyId, proxyPoolId);
      
      // 准备请求配置
      const requestConfig = await this.prepareRequestConfig(resolvedRequest, proxyConfig);
      
      // 执行HTTP请求
      let response;
      let error = null;
      
      try {
        response = await axios(requestConfig);
      } catch (err) {
        error = err;
        response = err.response || {
          status: 0,
          statusText: err.message,
          headers: {},
          data: null
        };
      }
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // 构建结果对象
      const result = {
        status: response.status,
        statusText: response.statusText,
        responseTime,
        responseSize: this.calculateResponseSize(response),
        responseHeaders: response.headers,
        responseBody: typeof response.data === 'string' 
          ? response.data 
          : JSON.stringify(response.data),
        error: error ? error.message : null
      };
      
      // 执行测试脚本
      if (!skipTests && resolvedRequest.tests && resolvedRequest.tests.length > 0) {
        const testResults = [];
        
        for (const test of resolvedRequest.tests) {
          if (test.enabled) {
            try {
              const testContext = {
                request: resolvedRequest,
                response: {
                  status: response.status,
                  statusText: response.statusText,
                  headers: response.headers,
                  body: response.data,
                  responseTime
                },
                test: (name, fn) => {
                  try {
                    fn();
                    return { name, passed: true };
                  } catch (err) {
                    return { name, passed: false, error: err.message };
                  }
                },
                expect: require('chai').expect
              };
              
              const testResult = await this.executeScript(test.script, testContext);
              testResults.push({
                name: test.name,
                passed: testResult.passed !== false,
                error: testResult.error
              });
            } catch (testErr) {
              testResults.push({
                name: test.name,
                passed: false,
                error: testErr.message
              });
            }
          }
        }
        
        result.testResults = testResults;
      }
      
      return result;
    } catch (error) {
      console.error('请求执行错误:', error);
      return {
        status: 0,
        statusText: '请求执行失败',
        responseTime: 0,
        responseSize: 0,
        responseHeaders: {},
        responseBody: null,
        error: error.message
      };
    }
  }
  
  /**
   * 解析请求URL和查询参数
   * @param {Object} request - 请求对象
   * @returns {String} 完整URL
   */
  parseUrl(request) {
    try {
      const url = new URL(request.url);
      
      // 添加查询参数
      if (request.params && request.params.length > 0) {
        request.params.forEach(param => {
          if (param.enabled) {
            url.searchParams.append(param.key, param.value);
          }
        });
      }
      
      return url.toString();
    } catch (error) {
      console.error('URL解析错误:', error);
      return request.url;
    }
  }
  
  /**
   * 解析请求体
   * @param {Object} request - 请求对象
   * @returns {Any} 处理后的请求体
   */
  parseBody(request) {
    if (!request.body || request.body.mode === 'none') {
      return null;
    }
    
    switch (request.body.mode) {
      case 'raw':
        return request.body.raw;
        
      case 'form-data':
        const formData = new FormData();
        
        if (request.body.formData && request.body.formData.length > 0) {
          request.body.formData.forEach(param => {
            if (param.enabled) {
              formData.append(param.key, param.value);
            }
          });
        }
        
        return formData;
        
      case 'urlencoded':
        const urlEncodedData = {};
        
        if (request.body.urlencoded && request.body.urlencoded.length > 0) {
          request.body.urlencoded.forEach(param => {
            if (param.enabled) {
              urlEncodedData[param.key] = param.value;
            }
          });
        }
        
        return qs.stringify(urlEncodedData);
        
      case 'binary':
        return request.body.binary || null;
        
      default:
        return null;
    }
  }
  
  /**
   * 解析请求头
   * @param {Object} request - 请求对象
   * @returns {Object} 请求头对象
   */
  parseHeaders(request) {
    const headers = {};
    
    if (request.headers && request.headers.length > 0) {
      request.headers.forEach(header => {
        if (header.enabled) {
          headers[header.key] = header.value;
        }
      });
    }
    
    // 处理Content-Type
    if (request.body && request.body.mode !== 'none' && request.body.mode !== 'form-data') {
      if (request.body.mode === 'raw' && request.body.contentType) {
        headers['Content-Type'] = request.body.contentType;
      } else if (request.body.mode === 'urlencoded') {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }
    }
    
    return headers;
  }
  
  /**
   * 准备请求配置
   * @param {Object} request - 请求对象
   * @param {Object} proxyConfig - 代理配置
   * @returns {Object} Axios请求配置
   */
  async prepareRequestConfig(request, proxyConfig) {
    const url = this.parseUrl(request);
    const headers = this.parseHeaders(request);
    const data = this.parseBody(request);
    
    const config = {
      url,
      method: request.method,
      headers,
      data,
      timeout: 30000, // 默认30秒超时
      validateStatus: () => true, // 不抛出HTTP错误
      maxContentLength: 10 * 1024 * 1024, // 10MB响应大小限制
      maxRedirects: 5
    };
    
    // 如果有代理，添加代理配置
    if (proxyConfig) {
      // 添加代理配置
      if (proxyConfig.protocol === 'http' || proxyConfig.protocol === 'https') {
        const proxyUrl = `${proxyConfig.protocol}://${proxyConfig.username && proxyConfig.password 
          ? `${proxyConfig.username}:${proxyConfig.password}@` 
          : ''}${proxyConfig.host}:${proxyConfig.port}`;
        
        config.proxy = {
          host: proxyConfig.host,
          port: proxyConfig.port,
          protocol: proxyConfig.protocol,
          auth: proxyConfig.username && proxyConfig.password ? {
            username: proxyConfig.username,
            password: proxyConfig.password
          } : undefined
        };
      } else if (proxyConfig.protocol === 'socks4' || proxyConfig.protocol === 'socks5') {
        const socksUrl = `${proxyConfig.protocol}://${proxyConfig.username && proxyConfig.password 
          ? `${proxyConfig.username}:${proxyConfig.password}@` 
          : ''}${proxyConfig.host}:${proxyConfig.port}`;
        
        config.httpsAgent = new SocksProxyAgent(socksUrl);
        config.httpAgent = new SocksProxyAgent(socksUrl);
      }
    }
    
    return config;
  }
  
  /**
   * 变量替换处理
   * @param {Object} request - 请求对象
   * @param {Object} environment - 环境变量
   * @returns {Object} 处理后的请求
   */
  async resolveVariables(request, environment) {
    // 创建请求的深拷贝
    const resolvedRequest = JSON.parse(JSON.stringify(request));
    
    // 递归替换对象中的变量
    const replaceVariables = (obj) => {
      if (!obj) return obj;
      
      if (typeof obj === 'string') {
        return obj.replace(/{{([^{}]+)}}/g, (match, variableName) => {
          const trimmedName = variableName.trim();
          return environment[trimmedName] !== undefined 
            ? environment[trimmedName] 
            : match;
        });
      }
      
      if (Array.isArray(obj)) {
        return obj.map(item => replaceVariables(item));
      }
      
      if (typeof obj === 'object') {
        const result = {};
        for (const key in obj) {
          result[key] = replaceVariables(obj[key]);
        }
        return result;
      }
      
      return obj;
    };
    
    // 替换URL
    resolvedRequest.url = replaceVariables(resolvedRequest.url);
    
    // 替换请求头
    if (resolvedRequest.headers && resolvedRequest.headers.length > 0) {
      resolvedRequest.headers = replaceVariables(resolvedRequest.headers);
    }
    
    // 替换查询参数
    if (resolvedRequest.params && resolvedRequest.params.length > 0) {
      resolvedRequest.params = replaceVariables(resolvedRequest.params);
    }
    
    // 替换请求体
    if (resolvedRequest.body) {
      resolvedRequest.body = replaceVariables(resolvedRequest.body);
    }
    
    return resolvedRequest;
  }
  
  /**
   * 执行脚本
   * @param {String} script - 要执行的脚本
   * @param {Object} context - 脚本上下文
   * @returns {Object} 脚本执行后的上下文
   */
  async executeScript(script, context) {
    if (!script) return context;
    
    try {
      // 创建安全的沙箱环境
      const sandbox = { ...context };
      
      // 添加一些有用的辅助函数
      sandbox.console = console;
      sandbox.setTimeout = setTimeout;
      sandbox.clearTimeout = clearTimeout;
      
      // 执行脚本
      const scriptWithReturn = `
        (function() {
          ${script}
          return this;
        })();
      `;
      
      vm.createContext(sandbox);
      const result = vm.runInContext(scriptWithReturn, sandbox, {
        timeout: 5000, // 5秒超时
        displayErrors: true
      });
      
      return result;
    } catch (error) {
      console.error('脚本执行错误:', error);
      // 返回原始上下文并添加错误信息
      return {
        ...context,
        scriptError: error.message
      };
    }
  }
  
  /**
   * 选择代理
   * @param {String} proxyId - 特定代理ID
   * @param {String} proxyPoolId - 代理池ID
   * @returns {Object|null} 代理配置或null
   */
  async selectProxy(proxyId, proxyPoolId) {
    try {
      // 如果指定了特定代理，优先使用
      if (proxyId) {
        const proxy = await Proxy.findById(proxyId);
        if (proxy && proxy.isActive) {
          return proxy;
        }
      }
      
      // 如果指定了代理池，从池中选择代理
      if (proxyPoolId) {
        const proxyPool = await ProxyPool.findById(proxyPoolId)
          .populate('proxies');
        
        if (proxyPool && proxyPool.proxies && proxyPool.proxies.length > 0) {
          // 过滤出活跃的代理
          const activeProxies = proxyPool.proxies.filter(p => p.isActive);
          
          if (activeProxies.length === 0) {
            return null;
          }
          
          // 根据选择模式获取代理
          switch (proxyPool.selectionMode) {
            case 'sequential':
              // 获取最后使用的代理索引
              const lastIndex = proxyPool._lastProxyIndex || 0;
              const nextIndex = (lastIndex + 1) % activeProxies.length;
              
              // 更新索引
              proxyPool._lastProxyIndex = nextIndex;
              await ProxyPool.findByIdAndUpdate(proxyPoolId, {
                _lastProxyIndex: nextIndex
              });
              
              return activeProxies[nextIndex];
              
            case 'random':
              // 随机选择一个代理
              const randomIndex = Math.floor(Math.random() * activeProxies.length);
              return activeProxies[randomIndex];
              
            case 'custom':
              // 自定义选择逻辑可以在这里实现
              // 默认返回第一个代理
              return activeProxies[0];
              
            default:
              return activeProxies[0];
          }
        }
      }
      
      // 没有可用的代理
      return null;
    } catch (error) {
      console.error('选择代理错误:', error);
      return null;
    }
  }
  
  /**
   * 计算响应大小
   * @param {Object} response - Axios响应对象
   * @returns {Number} 响应大小（字节）
   */
  calculateResponseSize(response) {
    try {
      // 从响应头获取内容长度
      const contentLength = response.headers['content-length'];
      if (contentLength) {
        return parseInt(contentLength, 10);
      }
      
      // 如果没有内容长度头，手动计算
      const responseData = response.data;
      if (!responseData) {
        return 0;
      }
      
      if (typeof responseData === 'string') {
        return Buffer.byteLength(responseData, 'utf8');
      }
      
      if (typeof responseData === 'object') {
        return Buffer.byteLength(JSON.stringify(responseData), 'utf8');
      }
      
      return 0;
    } catch (error) {
      console.error('计算响应大小错误:', error);
      return 0;
    }
  }
}

module.exports = new RequestExecutor();
