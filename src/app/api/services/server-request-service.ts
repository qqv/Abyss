/**
 * 服务器端API请求服务
 * 此文件只在服务器端使用，包含Node.js专用模块
 * 不要在客户端组件中导入此文件
 */
import { ApiCollection, ApiFolder, ApiRequest, ApiResult } from '@/lib/api-data';
import { getProxies } from '@/lib/proxy-service';
import { Proxy } from '@/models/Proxy';
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

/**
 * 格式化代理URL
 * @param proxy 代理配置
 * @returns 格式化后的代理URL字符串
 */
export function formatProxyUrl(proxy: {
  host: string;
  port: number;
  protocol: string;
  username?: string;
  password?: string;
}): string | null {
  if (!proxy || !proxy.host || !proxy.port || !proxy.protocol) {
    return null;
  }
  
  const { host, port, protocol, username, password } = proxy;
  
  // 基础URL格式
  let proxyUrl = '';
  
  // 根据协议类型构建不同格式的代理URL
  if (protocol.toLowerCase().startsWith('socks')) {
    // SOCKS协议
    proxyUrl = `${protocol.toLowerCase()}://`;
    
    // 添加认证信息（如果有）
    if (username && password) {
      proxyUrl += `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`;
    }
    
    proxyUrl += `${host}:${port}`;
  } else {
    // HTTP/HTTPS协议
    proxyUrl = `${protocol.toLowerCase()}://`;
    
    // 添加认证信息（如果有）
    if (username && password) {
      proxyUrl += `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`;
    }
    
    proxyUrl += `${host}:${port}`;
  }
  
  return proxyUrl;
}

// 发送请求的选项
export interface SendRequestOptions {
  // 变量替换选项
  variables?: Record<string, string>;
  // 请求信号，用于取消请求
  signal?: AbortSignal;
  // 代理配置
  proxy?: {
    host: string;
    port: number;
    protocol: string;
    username?: string;
    password?: string;
  };
}

// 运行集合的扩展选项
export interface RunCollectionOptions extends SendRequestOptions {
  // 并发请求数量
  concurrency?: number;
  // 是否使用代理
  useProxy?: boolean;
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
}

/**
 * 通过代理发送HTTP请求
 */
export async function sendRequestViaProxy(options: {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
  proxy?: {
    host: string;
    port: number; 
    protocol: string;
    username?: string;
    password?: string;
  };
  timeout?: number;
}) {
  const { url, method, headers = {}, body, proxy, timeout = 30000 } = options;
  
  // 不处理请求头，直接使用原始格式
  // 打印收到的原始headers格式
  console.log('原始请求头格式:', JSON.stringify(headers).substring(0,50));
  
  // 仅用于日志监控 - 提取Authorization头信息并记录
  let hasAuthHeader = false;
  let authHeaderValue = '';
  
  // 先检查标准头字段
  if (headers && typeof headers === 'object') {
    // 直接检查的情况
    if (headers['Authorization'] || headers['authorization']) {
      hasAuthHeader = true;
      authHeaderValue = headers['Authorization'] || headers['authorization'];
    }
    
    // 检查嵌套结构
    if (!hasAuthHeader) {
      Object.entries(headers).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null && 'key' in value && 'value' in value) {
          const headerKey = (value as any).key;
          if (headerKey.toLowerCase() === 'authorization') {
            hasAuthHeader = true;
            authHeaderValue = (value as any).value;
          }
        }
      });
    }
  }
  
  // 日志输出认证情况
  if (hasAuthHeader) {
    console.log(`发现认证信息: ${authHeaderValue.substring(0, 15)}...`);
  } else {
    console.log('未发现Authorization头');
  }
  
  // 使用原始headers
  let agent;
  // 如果提供了代理配置，使用代理
  if (proxy) {
    const proxyUrl = formatProxyUrl(proxy);
    if (proxyUrl) {
      const agentOptions: any = {
        rejectUnauthorized: false,
        // 禁用主机名校验，解决某些代理返回IP地址导致的证书 SAN 不匹配问题
        checkServerIdentity: () => undefined
      };

      if (proxy.protocol.toLowerCase().startsWith('socks')) {
        agent = new SocksProxyAgent(proxyUrl, agentOptions);
      } else {
        // 对 HTTP/HTTPS 代理统一使用 HttpsProxyAgent（支持 CONNECT 隧道），并禁用证书核验
        agent = new HttpsProxyAgent(proxyUrl, agentOptions);
      }
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // 构建 fetch 选项，避免 agent 为 undefined 时仍然传递
  const requestOptions: any = {
    method,
    headers, // 直接使用原始 headers
    signal: controller.signal
  } as any;

  if (agent) {
    requestOptions.agent = agent;
  }

  if (body && method !== 'GET' && method !== 'HEAD') {
    // 根据传入的raw字符串直接使用
    requestOptions.body = body;
    
    // 根据内容类型设置Content-Type头
    if (!requestOptions.headers['Content-Type'] && !requestOptions.headers['content-type']) {
      requestOptions.headers['Content-Type'] = 'application/json';
    }
  }

  const startTime = Date.now();
  let responseSize = 0;
  
  try {
    const response = await fetch(url, requestOptions);
    clearTimeout(timeoutId);

    // 计算响应大小
    const responseText = await response.text();
    responseSize = new TextEncoder().encode(responseText).length;
    
    // 从响应头获取所有头信息
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value: string, key: string) => {
      responseHeaders[key] = value;
    });

    return {
      success: true,
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseText,
      responseTime: Date.now() - startTime,
      responseSize
    };
  } catch (fetchError: any) {
    clearTimeout(timeoutId);
    
    // 区分超时错误和其他错误
    const isTimeout = fetchError.name === 'AbortError';
    
    return {
      success: false,
      error: isTimeout ? '请求超时' : fetchError.message,
      isTimeout,
      responseTime: Date.now() - startTime
    };
  }
}

/**
 * 从请求数组中筛选需要运行的请求
 */
export function filterRequestsToRun(
  allRequests: ApiRequest[], 
  selectedRequests?: string[]
): ApiRequest[] {
  if (!selectedRequests || selectedRequests.length === 0) {
    return allRequests;
  }
  
  return allRequests.filter(req => {
    const requestId = req._id || req.id;
    return requestId && selectedRequests.includes(requestId);
  });
}

/**
 * 收集集合中的所有请求
 */
export function collectAllRequests(collection: ApiCollection): ApiRequest[] {
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
  
  // 处理items属性（兼容性考虑）
  if (collection.items) {
    collection.items.forEach(item => {
      if ('url' in item) {
        // 是请求
        allRequests.push(item);
      } else {
        // 是文件夹
        collectRequestsFromFolder(item);
      }
    });
  }
  
  return allRequests;
}
