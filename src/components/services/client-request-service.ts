/**
 * 客户端请求服务
 * 用于在前端安全地发送API请求，并通过后端API处理代理相关功能
 * 这个文件不依赖任何Node.js特定的库，可以安全地在客户端使用
 */
import { ApiCollection, ApiFolder, ApiRequest, ApiResult } from '@/lib/api-data';
import { executeTestScripts, TestScript, TestResult } from './test-execution-service';
import { fetchTunnels } from '../../features/proxy-pool/services/tunnel-service';
import { Tunnel } from '../../features/proxy-pool/types';

// 使用文件中已定义的ProxyConfig接口

// 错误处理工具函数
function formatErrorForLogging(error: any): { message: string; details: any } {
  if (error instanceof Error) {
    return {
      message: error.message,
      details: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error as any).type && { type: (error as any).type },
        ...(error as any).status && { status: (error as any).status },
        ...(error as any).url && { url: (error as any).url }
      }
    };
  } else if (typeof error === 'object' && error !== null) {
    return {
      message: error.message || error.toString() || '未知错误',
      details: error
    };
  } else {
    return {
      message: String(error),
      details: { rawError: error }
    };
  }
}

// 网络错误检测函数
function isNetworkError(errorMessage: string): boolean {
  const networkErrorPatterns = [
    // 英文错误信息
    'socket hang up',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'ECONNRESET',
    'ENOTFOUND',
    'network',
    'connection',
    'timeout',
    'TLS',
    'DNS',
    'certificate',
    // 中文错误信息
    '请求超时',
    '连接超时',
    '网络错误',
    '连接失败',
    '无法连接'
  ];

  return networkErrorPatterns.some(pattern => errorMessage.includes(pattern));
}

// 定义嵌套请求头的接口
interface IndexedHeaderItem {
  key: string;
  value: string;
  enabled?: boolean;
  _id?: string;
}

interface IndexedHeaders {
  [key: string]: IndexedHeaderItem | string;
}

type HeadersType = Record<string, string> | IndexedHeaders;

// 发送请求的选项
export interface SendRequestOptions {
  // 变量替换选项
  variables?: Record<string, string>;
  // 请求信号，用于取消请求
  signal?: AbortSignal;
  // 是否使用代理
  useProxy?: boolean;
  // 选择的隧道ID
  selectedTunnelId?: string;
  // 单次请求超时时间 (毫秒)，默认 30000
  timeoutMs?: number;
  // 最大重试次数，默认 1
  maxRetries?: number;
  // 触发重试的 HTTP 状态码列表，默认 [429]
  retryStatusCodes?: number[];
  // 重试间隔 (毫秒)，默认 500
  retryDelayMs?: number;
}

// 代理配置接口
export interface ProxyConfig {
  host: string;
  port: number;
  protocol: string;
  username?: string;
  password?: string;
}

// 运行集合的扩展选项
export interface RunCollectionOptions extends SendRequestOptions {
  // 并发请求数量
  concurrency?: number;
  // 是否使用代理
  useProxy?: boolean;
  // 选择的隧道ID
  selectedTunnelId?: string;
  // 选择运行的请求ID列表
  selectedRequests?: string[];
  // 变量文件列表
  variableFiles?: Array<{
    variableName: string;
    values: string[];
    content?: string;
  }>;
  // 参数集ID
  parameterSetId?: string;
  // 进度回调
  onProgress?: (progress: {
    completed: number;
    total: number;
    currentRequest?: string;
    percentage: number;
  }) => void;
  // 单次请求超时（秒）
  timeoutSeconds?: number;
  // 最大重试次数 (默认1)
  maxRetries?: number;
  // 重试间隔毫秒 (默认500)
  retryDelayMs?: number;
  // 触发重试的状态码列表 (默认[429])
  retryStatusCodes?: number[];
}

// 通过代理发送请求
export async function sendRequestViaProxy(
  url: string,
  method: string,
  headers: Record<string, string> = {},
  body?: string,
  proxy?: ProxyConfig,
  timeout: number = 30000,
  tests?: Array<any> // 添加测试脚本参数
): Promise<any> {
  try {
    // 记录是否包含测试脚本
    if (tests && tests.length > 0) {
      // console.log('sendRequestViaProxy: 发送包含测试脚本的请求, 脚本数量:', tests.length);
    }

    // 调试信息：详细记录代理配置信息
    // console.log('🔄 请求通过代理发送: ', {
    //   url: url.substring(0, 100) + (url.length > 100 ? '...' : ''),
    //   method,
    //   headersCount: Object.keys(headers).length,
    //   hasBody: !!body,
    //   bodyLength: body?.length || 0,
    //   proxyConfig: proxy ? {
    //     host: proxy.host,
    //     port: proxy.port,
    //     protocol: proxy.protocol,
    //     hasAuth: !!(proxy.username && proxy.password)
    //   } : '未使用代理'
    // });

    // if (proxy) {
    //   console.log('✅ 使用代理配置:', JSON.stringify({
    //     host: proxy.host,
    //     port: proxy.port,
    //     protocol: proxy.protocol,
    //     username: proxy.username ? '已设置' : '未设置',
    //     password: proxy.password ? '已设置' : '未设置'
    //   }));
    // } else {
    //   console.log('⚠️ 警告: 请求未配置代理，将直接发送');
    // }

    // 记录请求开始时间，用于计算代理请求耗时
    const startTime = Date.now();
    // console.log('🚀 开始发送代理请求:', new Date().toISOString());
    
    const requestBody = JSON.stringify({
      url,
      method,
      headers,
      body,
      proxy,
      timeout,
      tests // 添加测试脚本到请求体中
    });

    // console.log('📦 发送到代理API的请求体大小:', requestBody.length, '字节');
    
    const response = await fetch('/api/v1/proxies/send-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestBody
    });
    
    const responseTime = Date.now() - startTime;
    // console.log(`⏱️ 代理请求完成，耗时: ${responseTime}ms, 状态码: ${response.status}`);
    
    if (!response.ok) {
      // console.error('❌ 代理请求失败，HTTP状态码:', response.status);
      return { error: `代理请求失败，状态码: ${response.status}`, proxyFailed: true };
    }
    
    const responseData = await response.json();
    // console.log('✅ 代理请求完成，响应大小:', JSON.stringify(responseData).length, '字节');

    // 如果后端标记 success=false，则视为失败
    if (responseData && responseData.success === false) {
      // console.error('❌ 代理返回失败:', responseData.error);
      return { 
        error: responseData.error || '代理请求失败', 
        proxyFailed: true,
        skipTests: true // 添加标记，指示应跳过测试脚本执行
      };
    }
    
    // 添加代理信息到响应中
    responseData._proxyInfo = {
      used: !!proxy,
      responseTime,
      proxy: proxy ? { host: proxy.host, port: proxy.port } : null
    };
    
    return responseData;
  } catch (error: any) {
    // console.error('❌ 通过代理发送请求失败:', error);
    const errorMessage = error?.message || '未知错误';
    return { 
      error: `代理请求异常: ${errorMessage}`, 
      proxyFailed: true,
      skipTests: true // 添加标记，指示应跳过测试脚本执行
    };
  }
}

// 模拟原来sendApiRequest函数的行为，但使用新的后端API
export async function sendApiRequest(
  request: ApiRequest,
  options: SendRequestOptions = {}
): Promise<ApiResult> {
  
  const { method, url } = request;
  // 记录最终使用的隧道及代理信息，供结果返回
  let usedTunnelId: string | undefined = options.selectedTunnelId;
  let usedTunnelName: string | undefined;
  let usedProxy: ProxyConfig | undefined;
  const startTime = Date.now();
  
  // 构建请求头部 - 正确处理RequestHeader[]数组
  const requestHeaders: Record<string, string> = {};
  
  // 将RequestHeader[]数组转换为Record<string, string>
  if (request.headers && Array.isArray(request.headers)) {
    request.headers.forEach(header => {
      if (header.enabled && header.key && header.value) {
        requestHeaders[header.key] = header.value;
      }
    });
  }
  
  // 处理认证信息 - 将auth对象转换为标准的HTTP Authorization头
  if (request.auth && request.auth.enabled && request.auth.type !== 'none') {
    // console.log('处理认证信息:', request.auth.type);
    
    switch (request.auth.type) {
      case 'bearer':
        if (request.auth.token) {
          // console.log('添加Bearer Token认证头');
          requestHeaders['Authorization'] = `Bearer ${request.auth.token}`;
        }
        break;
      case 'basic':
        if (request.auth.username) {
          const credentials = btoa(`${request.auth.username}:${request.auth.password || ''}`);
          requestHeaders['Authorization'] = `Basic ${credentials}`;
        }
        break;
      case 'apikey':
        if (request.auth.apiKey && request.auth.apiKeyName) {
          if (request.auth.apiKeyIn === 'header') {
            requestHeaders[request.auth.apiKeyName] = request.auth.apiKey;
          }
          // 如果是query参数，则在URL处理时添加
        }
        break;
    }
  }
  
  // 确保JSON内容类型标头存在
  if (method !== 'GET' && method !== 'HEAD' && request.body && !requestHeaders['Content-Type']) {
    requestHeaders['Content-Type'] = 'application/json';
  }
  
  // 处理请求体
  let requestBody: string | undefined;
  if (request.body && method !== 'GET' && method !== 'HEAD') {
    // console.log('处理请求体，原始类型:', typeof request.body);
    
    // 处理复杂的请求体对象结构
    if (typeof request.body === 'object') {
      // 检查是否是复杂对象格式（包含content, raw, mode等字段的格式）
      const bodyObj = request.body as any;
      
      if (bodyObj.content || bodyObj.raw) {
        // console.log('检测到复杂的请求体格式，提取实际内容');
        
        // 优先使用content字段（已经被变量替换处理过的）
        let actualContent = bodyObj.content || bodyObj.raw;
        
        // 如果内容是字符串，且看起来是被转义的JSON
        if (typeof actualContent === 'string') {
          try {
            // 尝试解析可能的转义JSON字符串
            const parsedContent = JSON.parse(actualContent);
            // console.log('成功解析内嵌的JSON内容');
            requestBody = JSON.stringify(parsedContent);
          } catch (e) {
            // 如果解析失败，尝试去除转义字符再解析
            try {
              // 替换掉转义的引号和换行符
              const cleanContent = actualContent.replace(/\\r\\n/g, '')
                                              .replace(/\\"/g, '"');
              const parsedContent = JSON.parse(cleanContent);
              // console.log('成功解析去除转义后的JSON内容');
              requestBody = JSON.stringify(parsedContent);
            } catch (innerErr) {
              // 如果仍然失败，使用原始内容
              // console.log('无法解析内容，使用原始值', innerErr);
              requestBody = actualContent;
            }
          }
        } else {
          // 如果内容已经是对象，直接序列化
          requestBody = JSON.stringify(actualContent);
        }
      } else {
        // 标准对象，直接序列化
        requestBody = JSON.stringify(bodyObj);
      }
    } else if (typeof request.body === 'string') {
      // 处理字符串类型请求体
      try {
        // 尝试解析JSON字符串
        const parsedBody = JSON.parse(request.body);
        
        // 检查是否是嵌套的请求体结构
        if (parsedBody && (parsedBody.content || parsedBody.raw)) {
          // console.log('检测到字符串形式的嵌套请求体结构');
          
          // 优先使用content字段（已经被变量替换处理过的）
          const nestedContent = parsedBody.content || parsedBody.raw;
          
          if (typeof nestedContent === 'string') {
            try {
              // 尝试解析嵌套内容
              requestBody = JSON.stringify(JSON.parse(nestedContent));
            } catch {
              // 如果解析失败，尝试去除转义字符
              const cleanContent = nestedContent.replace(/\\r\\n/g, '')
                                             .replace(/\\"/g, '"');
              try {
                requestBody = JSON.stringify(JSON.parse(cleanContent));
              } catch {
                // 如果仍然失败，使用原始嵌套内容
                requestBody = nestedContent;
              }
            }
          } else {
            // 嵌套内容是对象，序列化它
            requestBody = JSON.stringify(nestedContent);
          }
        } else {
          // 正常的JSON字符串，保持原样
          requestBody = request.body;
        }
      } catch (e) {
        // 不是有效的JSON字符串，保持原样
        requestBody = request.body;
      }
    }
    
    // 确保Content-Type设置为application/json
    if (!requestHeaders['Content-Type']) {
      requestHeaders['Content-Type'] = 'application/json';
    }
    
    // console.log('最终处理后的请求体:', requestBody?.substring(0, 100) + (requestBody && requestBody.length > 100 ? '...' : ''));
  }
  
  // 这些变量需要在闭包中保持可用，以便在try块中使用
  const requestHeadersFinal = requestHeaders;
  const requestBodyFinal = requestBody;
  
  // 检查请求中是否包含测试脚本
  const tests = request.tests || [];
  if (tests.length > 0) {
    // console.log('sendApiRequest: 检测到测试脚本，数量:', tests.length);
  }

  try {
    // 获取代理配置（如果有）
    const runOptions = options as RunCollectionOptions;
    let proxy: ProxyConfig | undefined;
    
    // console.log('🔍 检查代理选项:', JSON.stringify({ 
    //   useProxy: runOptions.useProxy, 
    //   selectedTunnelId: runOptions.selectedTunnelId,
    //   hasRunOptions: !!runOptions
    // }));
    
    if (runOptions.useProxy === true && runOptions.selectedTunnelId) {
      // console.log('📋 开始获取隧道配置...');
      try {
        // 获取选中的隧道配置
        // console.log('🔗 正在调用fetchTunnels...');
        const tunnelsPromise = fetchTunnels();
        
        // 添加超时处理
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('获取隧道列表超时')), 5000);
        });
        
        // 使用Promise.race确保不会无限等待
        const tunnels = await Promise.race([tunnelsPromise, timeoutPromise])
          .catch(err => {
            console.error('🛑️ 获取隧道列表失败:', err instanceof Error ? err.message : String(err));
            return [];
          });
          
        // 检查tunnels是否是数组
        if (!Array.isArray(tunnels)) {
          console.error('🛑️ fetchTunnels返回的不是数组:', tunnels);
          // 创建空结果对象返回
          return {
            requestId: request._id || request.id || '',
            requestName: request.name || '',
            url: request.url,
            method: request.method,
            status: 0,
            statusText: 'fetchTunnels错误: 返回的不是数组',
            responseHeaders: {},
            responseBody: '',
            responseTime: 0,
            responseSize: 0,
            requestHeaders: requestHeadersFinal || {},
            requestBody: requestBodyFinal || '',
            timestamp: new Date().toISOString(),
            testResults: [],
            tests: tests
          };
        }
        
        // console.log('🔗 获取到隧道列表，数量:', tunnels.length);
        // console.log('📋 隧道列表详情:', JSON.stringify(tunnels.map(t => ({ id: t.id, name: t.name }))));
        
        const selectedTunnel = tunnels.find(tunnel => tunnel.id === runOptions.selectedTunnelId);
        // console.log('🎯 查找隧道结果:', JSON.stringify({
        //   found: !!selectedTunnel,
        //   selectedTunnelId: runOptions.selectedTunnelId,
        //   tunnelName: selectedTunnel?.name || '未找到',
        //   proxyCount: selectedTunnel?.proxyIds?.length || 0
        // }));
        
        if (selectedTunnel && selectedTunnel.proxyIds.length > 0) {
          // console.log(`🔗 使用隧道: ${selectedTunnel.name}，包含 ${selectedTunnel.proxyIds.length} 个代理`);
          
          // 获取代理池数据
          // console.log('📋 开始获取代理池数据...');
          const proxyResponse = await fetch('/api/v1/proxies');
          // console.log('📋 代理池API响应状态:', proxyResponse.status, proxyResponse.ok);
          
          if (proxyResponse.ok) {
            const proxyData = await proxyResponse.json();
            // console.log('📋 获取到代理数据，总数量:', proxyData.length);
            
            // 命令式日志打印代理池与隧道代理ID
            // console.log('⚠️ 详细检查代理ID匹配情况:');
            const proxyIdsInTunnel = selectedTunnel.proxyIds || [];
            // console.log('   隧道中的代理IDs:', JSON.stringify(proxyIdsInTunnel));
            
            // 打印部分代理池数据，查看结构
            // if (proxyData.length > 0) {
            //   const sampleProxy = proxyData[0];
            //   console.log('   代理池样本结构:', JSON.stringify({
            //     _id: sampleProxy._id,
            //     id: sampleProxy.id,
            //     idType: typeof(sampleProxy._id || sampleProxy.id),
            //     host: sampleProxy.host,
            //     isActive: sampleProxy.isActive
            //   }));
            // }
            
            // 增强筛选逻辑，添加详细日志
            const availableProxies = proxyData.filter((p: any) => {
              const proxyId = p._id || p.id;
              const included = proxyIdsInTunnel.some((id: string | number) => String(id) === String(proxyId));
              const active = !!p.isActive;
              
              if (included && !active) {
                // console.log(`   代理 ${proxyId} (${p.host}:${p.port}) 包含在隧道中，但不活跃`);
              }
              if (!included) {
                // console.log(`   代理 ${proxyId} (${p.host}:${p.port}) 不在隧道代理列表中`);
              }
              
              return included && active;
            });
            
            // console.log('🔍 筛选结果:', {
            //   totalProxies: proxyData.length,
            //   tunnelProxyIds: selectedTunnel.proxyIds,
            //   availableProxies: availableProxies.length,
            //   availableProxiesInfo: availableProxies.map((p: { _id: string; id: string; host: string; port: number; isActive: boolean }) => ({ 
            //     id: p._id || p.id, 
            //     host: p.host, 
            //     port: p.port, 
            //     isActive: p.isActive 
            //   }))
            // });
            
            if (availableProxies.length > 0) {
              // 根据隧道的轮换策略选择代理
              // console.log('⚙️ 开始选择代理，轮换策略:', selectedTunnel.rotationType || 'default');
              
              // 确保有可用代理并显示详细列表
              if (availableProxies.length === 0) {
                // console.error('⛔️ 没有可用的代理在此隧道中');
              } else {
                // console.log('✅ 找到可用代理，列表:');
                availableProxies.forEach((p: { host: string; port: number; _id?: string; id?: string; isActive: boolean }, idx: number) => {
                  // console.log(`   ${idx + 1}. ${p.host}:${p.port} (ID: ${p._id || p.id})状态: ${p.isActive ? '活跃' : '不活跃'}`);
                });
              }
              
              let selectedProxy;
              
              try {
                // 基于轮换策略选择代理
                if (availableProxies.length > 0) {
                  switch (selectedTunnel.rotationType) {
                    case 'random':
                      const randomIndex = Math.floor(Math.random() * availableProxies.length);
                      selectedProxy = availableProxies[randomIndex];
                      // console.log(`✅ 随机选中索引 ${randomIndex} 的代理`);
                      break;
                    case 'sequential':
                      const currentIndex = selectedTunnel.currentProxyIndex || 0;
                      const indexToUse = currentIndex % availableProxies.length;
                      selectedProxy = availableProxies[indexToUse];
                      // console.log(`✅ 顺序选中索引 ${indexToUse} 的代理 (当前索引: ${currentIndex})`);
                      break;
                    default:
                      selectedProxy = availableProxies[0];
                      // console.log('✅ 选中列表中第一个代理');
                  }
                } else {
                  // console.warn('⚠️ 无法选择代理，因为没有可用代理');
                }
              } catch (err) {
                // console.error('⛔️ 选择代理时出错:', err);
              }
              
              if (selectedProxy) {
                try {
                  // 确保所有必要字段都存在
                  if (!selectedProxy.host || !selectedProxy.port) {
                    // console.error('⛔️ 选中的代理缺少必要字段:', selectedProxy);
                  } else {
                    proxy = {
                      host: selectedProxy.host,
                      port: selectedProxy.port,
                      protocol: selectedProxy.protocol || 'http',  // 默认使用http协议
                      username: selectedProxy.username || '',
                      password: selectedProxy.password || ''
                    };
                    usedProxy = proxy;
                    usedTunnelName = selectedTunnel.name;
                    // console.log(`✅ 成功构建代理配置: ${proxy.host}:${proxy.port} (${proxy.protocol})`);
                    // console.log('✅ 代理认证信息:', proxy.username ? '已配置' : '未配置');
                  }
                } catch (err) {
                  // console.error('⛔️ 构建代理配置时出错:', err);
                }
              } else {
                // console.error('⛔️ 未能选中代理，将直接发送请求');
              }
            } else {
              // console.warn(`⚠️ 隧道 ${selectedTunnel.name} 中没有可用的活跃代理`);
            }
          }
        } else {
          // console.warn(`⚠️ 未找到隧道或隧道中没有代理: ${runOptions.selectedTunnelId}`);
        }
      } catch (error) {
        // console.error('获取隧道配置失败:', error);
      }
    }
    
    // 通过我们的代理API发送请求，并传递测试脚本
    const result = await sendRequestViaProxy(
      request.url,
      request.method,
      requestHeadersFinal,
      requestBodyFinal,
      proxy,
      options.timeoutMs ?? 30000, // 自定义超时, 默认30秒
      tests  // 传递测试脚本
    );
    
    if (!result.success) {
      // 检查是否是网络连接错误
      const errorMessage = result.error || '未知错误';

      // 对于网络错误，我们仍然返回结果，但让上层重试机制来处理
      // 这样网络错误也能参与重试逻辑
      if (isNetworkError(errorMessage)) {
        console.warn(`🌐 网络连接失败: ${request.name || request.url}`, {
          url: request.url,
          status: result.status || 0,
          error: errorMessage,
          proxyInfo: usedProxy ? `${usedProxy.host}:${usedProxy.port}` : '直连'
        });
      }

      // 所有失败情况都返回结果对象，让上层重试机制统一处理
      const failedResponse = {
        requestId: request._id || request.id || '',
        requestName: request.name || '',
        url: request.url,
        method: request.method,
        status: result.status || 0,
        statusText: isNetworkError(errorMessage) ? 'Network Error' : 'Request Failed',
        error: errorMessage,
        isNetworkError: isNetworkError(errorMessage),
        responseTime: Date.now() - startTime,
        responseSize: 0,
        responseHeaders: {},
        responseBody: `请求失败: ${errorMessage}`,
        timestamp: new Date().toISOString(),
        testResults: [],
        tests: tests,
        proxyInfo: {
          tunnelId: usedTunnelId,
          tunnelName: usedTunnelName,
          proxy: usedProxy ? {
            host: usedProxy.host,
            port: usedProxy.port,
            protocol: usedProxy.protocol
          } : null
        }
      };
      
      // 为失败的请求添加测试结果（标记所有测试为失败）
      if (tests && tests.length > 0) {
        failedResponse.testResults = tests.map(test => ({
          name: test.name,
          passed: false,
          error: `请求失败，无法执行测试: ${errorMessage}`
        }));
      }
      
      return failedResponse;
    }
    
    // 构建响应对象，确保包含测试结果、代理信息等
    const response: ApiResult = {
  requestId: request._id || request.id || '',
  requestName: request.name || '',
  url: request.url,
  method: request.method,
  // 请求信息
  requestHeaders: requestHeadersFinal || {},
  requestBody: requestBodyFinal || '',
  // 响应信息
  status: result.status,
  statusText: result.statusText,
  responseTime: result.responseTime || Date.now() - startTime,
  responseSize: result.responseSize || 0,
  responseHeaders: result.headers || {},
  responseBody: result.body || '',
  timestamp: new Date().toISOString(),
  testResults: result.testResults || [], // 添加测试结果
  tests: tests, // 保留原始测试脚本信息
  proxyInfo: {
    tunnelId: usedTunnelId,
    tunnelName: usedTunnelName,
    proxy: usedProxy ? {
      host: usedProxy.host,
      port: usedProxy.port,
      protocol: usedProxy.protocol
    } : null
  }
};
      
      // 转换为测试脚本格式
      const testScripts: TestScript[] = tests.map(test => ({
        name: test.name || '未命名测试',
        script: test.script || '',
        enabled: test.enabled !== false // 默认启用
      }));
      
      // 准备响应数据用于测试
      const responseForTest = {
        status: result.status || 0,
        statusText: result.statusText || '',
        headers: result.headers || {},
        data: result.body ? (
          // 尝试解析JSON响应
          (() => {
            try {
              return JSON.parse(result.body);
            } catch {
              return result.body;
            }
          })()
        ) : null
      };
      
      // 执行测试脚本，但如果代理失败则跳过
      if (result.skipTests) {
        console.log('⚠️ 代理请求失败，跳过测试脚本执行');
        response.testResults = testScripts.map(script => ({
          name: script.name,
          passed: false,
          error: `代理连接失败，跳过测试: ${result.error || '未知错误'}`
        }));
      } else {
        try {
          const testResults = executeTestScripts(testScripts, responseForTest);
          response.testResults = testResults;
          console.log('测试脚本执行完成:', testResults);
        } catch (testError: any) {
          const { message, details } = formatErrorForLogging(testError);
          console.error(`执行测试脚本时出错: ${message}`, details);
          response.testResults = testScripts.map(script => ({
            name: script.name,
            passed: false,
            error: `执行测试失败: ${message}`
          }));
        }
      }

    return response;
  } catch (error: any) {
    const { message, details } = formatErrorForLogging(error);
    console.error(`请求执行失败: ${message}`, details);
    
    // 检查是否是网络连接错误
    const networkError = isNetworkError(message);
    
    // 提供详细的错误诊断信息
    if (networkError) {
      console.warn(`🛑 网络连接失败 - ${request.name || request.url}:`);
      console.warn(`   目标URL: ${request.url}`);
      console.warn(`   错误详情: ${message}`);
      if (usedProxy) {
        console.warn(`   代理信息: ${usedProxy.host}:${usedProxy.port} (${usedProxy.protocol})`);
        console.warn(`   隧道名称: ${usedTunnelName || 'N/A'}`);
      } else {
        console.warn(`   代理状态: 未使用代理`);
      }
      console.warn(`   建议检查: 1) 网络连接 2) 目标服务器状态 3) 代理设置 4) 防火墙配置`);
    }

    return {
      requestId: request._id || request.id || '',
      requestName: request.name || '',
      url: request.url,
      method: request.method,
      status: 0,
      statusText: networkError ? 'Network Error' : 'Error',
      error: message,
      isNetworkError: networkError,
      responseTime: Date.now() - startTime,
      responseSize: 0,
      responseHeaders: {},
      responseBody: `请求执行失败: ${message}`,
      timestamp: new Date().toISOString(),
      testResults: [], // 错误情况下添加空的测试结果数组
      tests: tests, // 保留原始测试脚本信息
      proxyInfo: {
        tunnelId: usedTunnelId,
        tunnelName: usedTunnelName,
        proxy: usedProxy ? {
          host: usedProxy.host,
          port: usedProxy.port,
          protocol: usedProxy.protocol
        } : null
      }
    };
  }
}

/**
 * 运行集合中的所有请求
 * @param collection 集合对象
 * @param options 选项
 * @returns 所有请求的结果数组
 */
export async function runCollection(
  collection: ApiCollection,
  options: RunCollectionOptions = {}
): Promise<ApiResult[]> {
  console.log(`开始运行集合: ${collection.name}`);
  const results: ApiResult[] = [];

  // 解析运行选项
  let {
    concurrency = 1,
    useProxy = false,
    selectedTunnelId,
    selectedRequests = [],
    variableFiles = [],
    timeoutSeconds = 30,
    maxRetries = 1,
    retryDelayMs = 500,
    retryStatusCodes = [429],
    onProgress // 提取进度回调
  } = options;

  console.log(`🔧 集合运行参数:`, {
    concurrency,
    useProxy,
    selectedTunnelId,
    timeoutSeconds,
    maxRetries,
    retryDelayMs,
    retryStatusCodes,
    selectedRequestsCount: selectedRequests.length,
    variableFilesCount: variableFiles.length
  });

  // 如果选择了隧道，获取隧道配置并应用其限制
  let tunnelConfig = null;
  if (useProxy && selectedTunnelId) {
    try {
      console.log('🔗 获取隧道配置用于集合运行...');
      const { fetchTunnels } = await import('../../features/proxy-pool/services/tunnel-service');
      const tunnels = await fetchTunnels();
      tunnelConfig = tunnels.find(tunnel => tunnel.id === selectedTunnelId);
      
      if (tunnelConfig) {
        console.log(`🎯 找到隧道配置: ${tunnelConfig.name}`);
        
        // 应用隧道的并发限制
        if (concurrency > tunnelConfig.maxConcurrentRequests) {
          // console.warn(`⚠️ 集合并发数 (${concurrency}) 超过隧道最大并发数 (${tunnelConfig.maxConcurrentRequests})，已调整为 ${tunnelConfig.maxConcurrentRequests}`);
          concurrency = tunnelConfig.maxConcurrentRequests;
        }
        
        // 应用隧道的重试配置
        if (tunnelConfig.retryCount > 0) {
          // console.log(`🔄 应用隧道重试配置: ${tunnelConfig.retryCount} 次`);
          maxRetries = Math.max(maxRetries, tunnelConfig.retryCount);
        }
      } else {
        // console.warn(`⚠️ 未找到指定的隧道: ${selectedTunnelId}`);
      }
    } catch (error) {
      // console.error('获取隧道配置失败:', error);
    }
  }
  
  // 生成变量组合
  const variableCombinations = generateVariableCombinations(variableFiles);
  // console.log(`📊 变量处理统计:`, {
  //   variableFilesCount: variableFiles.length,
  //   variableFiles: variableFiles.map(vf => ({ name: vf.variableName, valueCount: vf.values.length })),
  //   combinationsCount: variableCombinations.length,
  //   combinations: variableCombinations,
  //   appliedConcurrency: concurrency,
  //   appliedRetries: maxRetries,
  //   tunnelConfig: tunnelConfig ? {
  //     name: tunnelConfig.name,
  //     maxConcurrent: tunnelConfig.maxConcurrentRequests,
  //     retryCount: tunnelConfig.retryCount
  //   } : null
  // });
  
  // 收集集合中的所有请求
  const allRequests: ApiRequest[] = [];
  
  // 添加集合根级别的请求
  if (collection.requests && collection.requests.length > 0) {
    allRequests.push(...collection.requests);
  }
  
  // 递归函数收集文件夹中的请求
  function collectRequestsFromFolder(folder: ApiFolder) {
    if (folder.items) {
      folder.items.forEach(item => {
        if ('url' in item) {
          // 是请求
          allRequests.push(item);
        } else {
          // 是子文件夹
          collectRequestsFromFolder(item);
        }
      });
    }
  }
  
  // 处理集合中的文件夹
  if (collection.folders && collection.folders.length > 0) {
    collection.folders.forEach(folder => collectRequestsFromFolder(folder));
  }
  
  // console.log(`集合中找到 ${allRequests.length} 个请求`);
  
  // 如果有selectedRequests，过滤请求列表
  let requestsToRun = allRequests;
  if (selectedRequests && selectedRequests.length > 0) {
    requestsToRun = allRequests.filter(req => {
      const requestId = req._id || req.id;
      return requestId && selectedRequests.includes(requestId);
    });
    // console.log(`已选择运行 ${requestsToRun.length} 个请求`);
  }
  
  // 处理变量替换的请求执行
  const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

  const processRequestWithVariables = async (request: ApiRequest, variables: Record<string, string>, combinationIndex: number) => {
    console.log(`🚀 执行请求: ${request.name || request.url}, 重试参数:`, {
      maxRetries,
      retryDelayMs,
      retryStatusCodes,
      timeoutSeconds
    });
    
    // 调试：检查原始请求是否包含测试脚本
    // console.log(`🧪 批量运行调试 - 原始请求测试脚本:`, {
    //   requestName: request.name,
    //   hasTests: !!(request.tests && request.tests.length > 0),
    //   testsCount: request.tests?.length || 0,
    //   enabledTestsCount: request.tests?.filter(t => t.enabled)?.length || 0,
    //   hasAssertions: !!(request.assertions && request.assertions.length > 0),
    //   assertionsCount: request.assertions?.length || 0,
    //   enabledAssertionsCount: request.assertions?.filter(a => a.enabled)?.length || 0
    // });
    
    try {
      // 创建请求的副本并应用变量替换
      const processedRequest = applyVariablesToRequest(request, variables);
      
      //将 assertions 转换为 tests 字段
      if (!processedRequest.tests && processedRequest.assertions && processedRequest.assertions.length > 0) {
        // console.log(`🔄 转换 assertions 为 tests 字段，assertions 数量: ${processedRequest.assertions.length}`);
        processedRequest.tests = processedRequest.assertions
          .filter((assertion: any) => assertion.type === 'script' && assertion.enabled)
          .map((assertion: any) => ({
            name: assertion.name || 'Test Script',
            script: assertion.target || assertion.value,
            enabled: assertion.enabled || true
          }));
        // console.log(`✅ 转换完成，生成 tests 数量: ${processedRequest.tests.length}`);
      }
      
      // 调试：检查处理后的请求是否还包含测试脚本
      // console.log(`🧪 批量运行调试 - 处理后请求测试脚本:`, {
      //   requestName: processedRequest.name,
      //   hasTests: !!(processedRequest.tests && processedRequest.tests.length > 0),
      //   testsCount: processedRequest.tests?.length || 0,
      //   enabledTestsCount: processedRequest.tests?.filter(t => t.enabled)?.length || 0
      // });
      
      // 带重试的发送
      let attempt = 0;
      let lastResult: ApiResult | undefined;
      
      // console.log(`🔄 开始执行请求: ${processedRequest.name || processedRequest.url}，最大重试次数: ${maxRetries}，重试状态码: [${retryStatusCodes.join(', ')}]`);
      
      while (attempt <= maxRetries) {
        const isRetry = attempt > 0;
        // console.log(`📤 ${isRetry ? '重试' : '执行'}请求 (第 ${attempt + 1}/${maxRetries + 1} 次): ${processedRequest.name || processedRequest.url}`);
        
        try {
          lastResult = await sendApiRequest(
            { ...processedRequest, _id: `${processedRequest._id || ''}-${combinationIndex}` },
            {
              useProxy,
              selectedTunnelId,
              variables,
              timeoutMs: timeoutSeconds * 1000,
              maxRetries: 0, // 单请求层级不再重试，由此处统一管理
              retryDelayMs,
              retryStatusCodes,
            }
          );

          // console.log(`📬 请求响应: 状态码 ${lastResult.status}, 耗时 ${lastResult.responseTime}ms`);

          // 检查是否需要重试
          const shouldRetry = (lastResult.status !== undefined &&
                            retryStatusCodes.includes(lastResult.status) &&
                            attempt < maxRetries);

          console.log(`🔍 重试检查: 状态码=${lastResult.status}, 重试状态码=[${retryStatusCodes.join(',')}], 当前尝试=${attempt}/${maxRetries}, 需要重试=${shouldRetry}`);

          if (shouldRetry) {
            console.warn(
              `⏳ 状态码 ${lastResult.status} 触发重试条件，将在 ${retryDelayMs}ms 后重试 (第 ${attempt + 1}/${maxRetries} 次重试)`
            );
            attempt++;
            await sleep(retryDelayMs);
            continue; // 重新开始循环
          }

          // 成功或不需要重试，正常返回
          // console.log(`✅ 请求完成: ${processedRequest.name || processedRequest.url} (状态码: ${lastResult.status})`);
          return lastResult;
          
        } catch (err) {
          // console.error(`❌ 请求异常: ${processedRequest.name || processedRequest.url}:`, err);

          if (attempt < maxRetries) {
            // console.warn(`⏳ 异常触发重试，将在 ${retryDelayMs}ms 后重试 (第 ${attempt + 1}/${maxRetries} 次重试)`);
            attempt++;
            await sleep(retryDelayMs);
            continue; // 重新开始循环
          } else {
            // console.error(`💥 已达最大重试次数，返回错误结果`);
            // 不抛出异常，而是返回错误结果
            const { message } = formatErrorForLogging(err);
            return {
              requestId: processedRequest._id || processedRequest.id || '',
              requestName: processedRequest.name || '',
              url: processedRequest.url,
              method: processedRequest.method,
              status: 0,
              statusText: 'Request Failed',
              error: message,
              responseTime: 0,
              responseSize: 0,
              responseHeaders: {},
              responseBody: `请求重试失败: ${message}`,
              timestamp: new Date().toISOString(),
              testResults: [],
              tests: processedRequest.tests || [],
              proxyInfo: {
                tunnelId: selectedTunnelId,
                tunnelName: undefined,
                proxy: null
              }
            };
          }
        }
      }
      
      // 理论上不应该到达这里，但为了安全起见
      if (lastResult) {
        console.warn(`⚠️ 循环异常退出，返回最后结果`);
        return lastResult;
      }

      // 返回默认错误结果而不是抛出异常
      console.error('⚠️ 请求处理异常：未能获取任何结果');
      return {
        requestId: processedRequest._id || processedRequest.id || '',
        requestName: processedRequest.name || '',
        url: processedRequest.url,
        method: processedRequest.method,
        status: 0,
        statusText: 'Request Failed',
        error: '请求重试失败：超出最大尝试次数',
        responseTime: 0,
        responseSize: 0,
        responseHeaders: {},
        responseBody: '请求重试失败：超出最大尝试次数',
        timestamp: new Date().toISOString(),
        testResults: [],
        tests: processedRequest.tests || [],
        proxyInfo: {
          tunnelId: selectedTunnelId,
          tunnelName: undefined,
          proxy: null
        }
      };
    } catch (error: any) {
      const { message, details } = formatErrorForLogging(error);
      console.error(`请求 ${request.name || request.url} 执行失败: ${message}`, details);
      
      // 检查是否是网络连接错误 (status code 0 的情况)
      const networkError = isNetworkError(message);

      // 如果是严重的网络错误，在控制台显示详细信息
      if (networkError) {
        console.warn(`🛑 网络连接失败 - ${request.name || request.url}:`);
        console.warn(`   错误类型: ${networkError ? '网络连接' : '其他'}`);
        console.warn(`   详细信息: ${message}`);
        console.warn(`   建议: 检查网络连接、代理设置或目标服务器状态`);
      }
      
      // 尝试提取请求信息，即使在错误情况下也要记录
      let requestBody = '';
      let requestHeaders: Record<string, string> = {};
      
      // 尝试获取处理后的请求体和头部
      try {
        const processedRequest = applyVariablesToRequest(request, variables);
        requestBody = typeof processedRequest.body === 'string' ? processedRequest.body : 
                      (processedRequest.body ? JSON.stringify(processedRequest.body) : '');
                      
        // 收集请求头
        if (processedRequest.headers && Array.isArray(processedRequest.headers)) {
          processedRequest.headers.forEach(header => {
            if (header.enabled && header.key) {
              requestHeaders[header.key] = header.value;
            }
          });
        }
      } catch(e) {
        console.warn('提取请求信息失败', e);
      }
      
      return {
        requestId: `${request._id || request.id || ''}-${combinationIndex}`,
        requestName: request.name || '',
        url: request.url,
        method: request.method,
        requestHeaders: requestHeaders,
        requestBody: requestBody,
        status: 0,
        statusText: networkError ? 'Network Error' : 'Error',
        error: message,
        responseTime: 0,
        responseSize: 0,
        responseHeaders: {},
        responseBody: `请求执行失败: ${message}`,
        timestamp: new Date().toISOString()
      };
    }
  };
  
  // 如果没有变量文件，按原逻辑执行
  if (variableCombinations.length === 0) {
    console.log('没有变量文件，按原逻辑执行');
    // 并发执行请求
    const processRequest = async (request: ApiRequest) => {
      return await processRequestWithVariables(request, {}, 0);
    };
    
    // 并发或顺序执行
    if (concurrency > 1) {
      console.log(`使用并发数: ${concurrency}来运行请求`);
      const chunks = [];
      
      // 将请求分组
      for (let i = 0; i < requestsToRun.length; i += concurrency) {
        chunks.push(requestsToRun.slice(i, i + concurrency));
      }
      
      // 按组并发执行
      for (const chunk of chunks) {
        const chunkResults = await Promise.all(chunk.map(processRequest));
        results.push(...chunkResults);
        
        // 通知进度
        if (onProgress) {
          onProgress({
            completed: results.length,
            total: requestsToRun.length,
            currentRequest: chunk[0].name || chunk[0].url,
            percentage: (results.length / requestsToRun.length) * 100
          });
        }
      }
    } else {
      // 顺序执行
      for (const request of requestsToRun) {
        const result = await processRequest(request);
        results.push(result);
        
        // 通知进度
        if (onProgress) {
          onProgress({
            completed: results.length,
            total: requestsToRun.length,
            currentRequest: request.name || request.url,
            percentage: (results.length / requestsToRun.length) * 100
          });
        }
      }
    }
  } else {
    // 有变量文件，为每个变量组合运行所有请求
    const totalTasks = variableCombinations.length * requestsToRun.length;
    console.log(`使用变量组合运行，总运行次数: ${totalTasks}，并发数: ${concurrency}`);
    
    // 创建所有任务的队列 - 包含变量组合和请求的所有组合
    const allTasks: Array<{ request: ApiRequest; variables: Record<string, string>; combinationIndex: number; taskIndex: number }> = [];
    
    for (let i = 0; i < variableCombinations.length; i++) {
      const variables = variableCombinations[i];
      for (let j = 0; j < requestsToRun.length; j++) {
        const request = requestsToRun[j];
        allTasks.push({
          request,
          variables,
          combinationIndex: i,
          taskIndex: allTasks.length
        });
      }
    }
    
    console.log(`生成任务队列，共 ${allTasks.length} 个任务`);
    
    // 并发执行任务
    if (concurrency > 1) {
      console.log(`使用并发数: ${concurrency} 执行变量组合任务`);
      
      // 将任务分组
      const chunks = [];
      for (let i = 0; i < allTasks.length; i += concurrency) {
        chunks.push(allTasks.slice(i, i + concurrency));
      }
      
      // 按组并发执行
      for (const chunk of chunks) {
        const chunkPromises = chunk.map(task => 
          processRequestWithVariables(task.request, task.variables, task.combinationIndex)
        );
        
        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults);
        
        // 通知进度
        if (onProgress) {
          onProgress({
            completed: results.length,
            total: totalTasks,
            currentRequest: chunk[0].request.name || chunk[0].request.url,
            percentage: (results.length / totalTasks) * 100
          });
        }
      }
    } else {
      // 顺序执行
      console.log('顺序执行变量组合任务');
      for (const task of allTasks) {
        const result = await processRequestWithVariables(task.request, task.variables, task.combinationIndex);
        results.push(result);
        
        // 通知进度
        if (onProgress) {
          onProgress({
            completed: results.length,
            total: totalTasks,
            currentRequest: task.request.name || task.request.url,
            percentage: (results.length / totalTasks) * 100
          });
        }
      }
    }
  }
  
  console.log(`集合运行完成，总结果数: ${results.length}`);
  
  // 检查是否需要保存到数据库
  try {
    const { shouldUseDatabase } = await import('../../lib/storage-settings');
    if (shouldUseDatabase()) {
      await saveCollectionRunToDatabase(collection, options, results);
    }
  } catch (error) {
    console.error('保存集合运行结果到数据库失败:', error);
    // 不中断返回，即使保存失败也要返回结果
  }
  
  return results;
}

/**
 * 保存集合运行结果到数据库
 */
async function saveCollectionRunToDatabase(
  collection: ApiCollection,
  options: RunCollectionOptions,
  results: ApiResult[]
): Promise<void> {
  try {
    const startTime = Date.now();
    const successCount = results.filter(r => r.status >= 200 && r.status < 300).length;
    const failedCount = results.length - successCount;
    const endTime = Date.now();
    
    // 构建测试任务数据
    const testJobData = {
      name: `${collection.name} - ${new Date().toLocaleString()}`,
      description: `集合运行结果 - ${new Date().toISOString()}`,
      collectionId: collection._id,
      collectionName: collection.name,
      
      options: {
        concurrency: options.concurrency || 1,
        useProxy: options.useProxy || false,
        selectedTunnelId: options.selectedTunnelId,
        selectedRequests: options.selectedRequests || [],
        variableFiles: options.variableFiles || [],
        timeoutSeconds: options.timeoutSeconds || 30,
        maxRetries: options.maxRetries || 1,
        retryDelayMs: options.retryDelayMs || 500,
        retryStatusCodes: options.retryStatusCodes || [429]
      },
      
      status: 'completed',
      progress: 100,
      
      totalRequests: results.length,
      successCount,
      failedCount,
      
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      duration: endTime - startTime,
      
      results: results.map(result => ({
        requestId: result.requestId,
        requestName: result.requestName,
        url: result.url,
        method: result.method,
        
        requestHeaders: result.requestHeaders || {},
        requestBody: result.requestBody,
        
        status: result.status,
        statusText: result.statusText,
        responseTime: result.responseTime,
        responseSize: result.responseSize,
        responseHeaders: result.responseHeaders || {},
        responseBody: result.responseBody,
        
        error: result.error,
        isNetworkError: result.isNetworkError || false,
        
        testResults: result.testResults || [],
        allTestsPassed: result.allTestsPassed,
        
        parameterValues: result.parameterValues || {},
        timestamp: result.timestamp,
        
        proxyInfo: result.proxyInfo
      }))
    };
    
    // 发送到API
    const response = await fetch('/api/v1/tests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testJobData)
    });
    
    if (!response.ok) {
      throw new Error(`保存失败: ${response.status} ${response.statusText}`);
    }
    
    const savedJob = await response.json();
    console.log('集合运行结果已保存到数据库:', savedJob._id);
    
  } catch (error) {
    console.error('保存集合运行结果到数据库失败:', error);
    throw error;
  }
}

// 生成变量组合函数
function generateVariableCombinations(variableFiles: Array<{ variableName: string; values: string[] }>) {
  if (variableFiles.length === 0) {
    return [];
  }
  
  const combinations: Record<string, string>[] = [];
  
  // 递归生成组合
  function generateCombinations(currentIndex: number, currentCombination: Record<string, string>) {
    if (currentIndex === variableFiles.length) {
      combinations.push(currentCombination);
      return;
    }
    
    const variableFile = variableFiles[currentIndex];
    const variableName = variableFile.variableName;
    const values = variableFile.values;
    
    for (const value of values) {
      const newCombination = { ...currentCombination, [variableName]: value };
      generateCombinations(currentIndex + 1, newCombination);
    }
  }
  
  generateCombinations(0, {});
  
  return combinations;
}

// 应用变量替换到请求函数
function applyVariablesToRequest(request: ApiRequest, variables: Record<string, string>) {
  console.log('🔧 applyVariablesToRequest 开始处理:', {
    requestName: request.name,
    requestUrl: request.url,
    variables,
    variableCount: Object.keys(variables).length
  });
  
  const processedRequest = { ...request };
  
  // 处理URL中的变量替换
  if (processedRequest.url) {
    const originalUrl = processedRequest.url;
    Object.keys(variables).forEach(variableName => {
      const variableValue = variables[variableName];
      const regex = new RegExp(`{{${variableName}}}`, 'g');
      processedRequest.url = processedRequest.url.replace(regex, variableValue);
      console.log(`🔍 URL变量替换: {{${variableName}}} -> ${variableValue}`);
    });
    if (originalUrl !== processedRequest.url) {
      console.log('✅ URL替换完成:', originalUrl, '->', processedRequest.url);
    } else {
      console.log('ℹ️ URL未发生变化:', originalUrl);
    }
  }
  
  // 处理请求体中的变量替换
  if (processedRequest.body) {
    const body = processedRequest.body;
    console.log('🔧 处理请求体变量替换, body类型:', typeof body, 'mode:', body.mode);
    
    if (body.mode === 'raw' && body.raw && typeof body.raw === 'string') {
      // 处理原始字符串（包括JSON）
      const originalRaw = body.raw;
      let rawString = body.raw;
      Object.keys(variables).forEach(variableName => {
        const variableValue = variables[variableName];
        const regex = new RegExp(`{{${variableName}}}`, 'g');
        rawString = rawString.replace(regex, variableValue);
        console.log(`🔍 Body(raw)变量替换: {{${variableName}}} -> ${variableValue}`);
      });
      
      // 同时处理content字段（如果存在）
      let contentString: string | undefined = body.content;
      if (body.content && typeof body.content === 'string') {
        const originalContent = body.content;
        Object.keys(variables).forEach(variableName => {
          const variableValue = variables[variableName];
          const regex = new RegExp(`{{${variableName}}}`, 'g');
          contentString = (contentString as string).replace(regex, variableValue);
          console.log(`🔍 Body(content)变量替换: {{${variableName}}} -> ${variableValue}`);
        });
        if (originalContent !== contentString) {
          console.log('✅ Body(content)替换完成:', originalContent.substring(0, 100), '->', (contentString as string).substring(0, 100));
        }
      }
      
      // 更新请求体，确保content和raw都被更新
      processedRequest.body = { 
        ...body, 
        raw: rawString,
        content: contentString || rawString // 如果没有content字段，使用rawString
      };
      
      if (originalRaw !== rawString) {
        console.log('✅ Body(raw)替换完成:', originalRaw.substring(0, 100), '->', rawString.substring(0, 100));
      }
    } else if (body.mode === 'form-data' && body.formData) {
      // 处理表单数据
      const newFormData = body.formData.map(item => {
        const newItem = { ...item };
        if (typeof newItem.value === 'string') {
          const originalValue = newItem.value;
          Object.keys(variables).forEach(variableName => {
            const variableValue = variables[variableName];
            const regex = new RegExp(`{{${variableName}}}`, 'g');
            newItem.value = (newItem.value as string).replace(regex, variableValue);
            console.log(`🔍 FormData变量替换: {{${variableName}}} -> ${variableValue}`);
          });
          if (originalValue !== newItem.value) {
            console.log('✅ FormData替换完成:', originalValue, '->', newItem.value);
          }
        }
        return newItem;
      });
      processedRequest.body = { ...body, formData: newFormData };
    } else if (body.mode === 'urlencoded' && body.urlencoded) {
      // 处理URL编码数据
      const newUrlencoded = body.urlencoded.map(item => {
        const newItem = { ...item };
        if (typeof newItem.value === 'string') {
          const originalValue = newItem.value;
          Object.keys(variables).forEach(variableName => {
            const variableValue = variables[variableName];
            const regex = new RegExp(`{{${variableName}}}`, 'g');
            newItem.value = (newItem.value as string).replace(regex, variableValue);
            console.log(`🔍 URLEncoded变量替换: {{${variableName}}} -> ${variableValue}`);
          });
          if (originalValue !== newItem.value) {
            console.log('✅ URLEncoded替换完成:', originalValue, '->', newItem.value);
          }
        }
        return newItem;
      });
      processedRequest.body = { ...body, urlencoded: newUrlencoded };
    } else if (body.content && typeof body.content === 'string') {
      // 处理content字段（兼容MongoDB存储的字段）
      const originalContent = body.content;
      let contentString = body.content;
      Object.keys(variables).forEach(variableName => {
        const variableValue = variables[variableName];
        const regex = new RegExp(`{{${variableName}}}`, 'g');
        contentString = contentString.replace(regex, variableValue);
        console.log(`🔍 Body(content)变量替换: {{${variableName}}} -> ${variableValue}`);
      });
      processedRequest.body = { ...body, content: contentString };
      if (originalContent !== contentString) {
        console.log('✅ Body(content)替换完成:', originalContent.substring(0, 100), '->', contentString.substring(0, 100));
      }
    } else {
      console.log('⚠️ 未匹配的请求体格式:', body);
    }
  }
  
  // 处理请求头中的变量替换
  if (processedRequest.headers) {
    console.log('🔧 处理请求头变量替换, headers类型:', Array.isArray(processedRequest.headers) ? 'array' : 'object');
    const newHeaders = processedRequest.headers.map(header => {
      const newHeader = { ...header };
      if (typeof newHeader.value === 'string') {
        const originalValue = newHeader.value;
        Object.keys(variables).forEach(variableName => {
          const variableValue = variables[variableName];
          const regex = new RegExp(`{{${variableName}}}`, 'g');
          newHeader.value = newHeader.value.replace(regex, variableValue);
          console.log(`🔍 Header变量替换: ${newHeader.key}: {{${variableName}}} -> ${variableValue}`);
        });
        if (originalValue !== newHeader.value) {
          console.log('✅ Header替换完成:', `${newHeader.key}: ${originalValue}`, '->', newHeader.value);
        }
      }
      return newHeader;
    });
    processedRequest.headers = newHeaders;
  }
  
  console.log('🎯 applyVariablesToRequest 完成处理');
  return processedRequest;
}
