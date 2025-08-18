/**
 * 代理服务 - 后端服务模块
 * 负责代理的数据库操作和管理
 */

import { connectMongoDB } from './mongodb';
import { Proxy, ProxyPoolConfig } from '../models/Proxy';
import { ProxyData, ProxyPoolConfig as ConfigType } from './proxy-manager';
import * as http from 'http';
import * as https from 'https';
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

/**
 * 获取所有代理服务器列表
 */
export async function getProxies(): Promise<ProxyData[]> {
  try {
    await connectMongoDB();
    const proxies = await Proxy.find({}).sort({ host: 1 }).lean();
    // 使用类型断言确保返回类型正确
    return proxies as unknown as ProxyData[];
  } catch (error) {
    console.error('获取代理列表失败:', error);
    // 出错时返回空数组而不是抛出异常
    return [];
  }
}

/**
 * 测试代理连接性
 * @param proxy 代理配置
 * @returns 测试结果，包含代理是否有效和响应时间
 */
export async function testProxy(proxy: {
  host: string;
  port: number;
  protocol: string;
  username?: string;
  password?: string;
}): Promise<{ isValid: boolean; responseTime?: number; message?: string; data?: any }> {
  const startTime = Date.now();
  const testUrl = 'https://ipinfo.io/json'; // 与API路由的测试URL保持一致
  const timeout = 8000; // 8秒超时
  
  try {
    // 根据不同协议创建代理
    const proxyUrl = formatProxyUrl(proxy);
    
    if (!proxyUrl) {
      return { isValid: false, message: '无法格式化代理URL' };
    }
    
    // 创建适合的代理代理
    let agent;
    if (proxy.protocol.toLowerCase().startsWith('socks')) {
      agent = new SocksProxyAgent(proxyUrl);
    } else {
      agent = new HttpsProxyAgent(proxyUrl);
    }

    // 获取直连IP以便比较
    let directIp = null;
    try {
      const directResponse = await fetch(testUrl);
      if (directResponse.ok) {
        const directData = await directResponse.json();
        directIp = directData.ip;
      }
    } catch (directError) {
      console.log('获取直连IP失败:', directError);
    }

    // 发送代理测试请求
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(testUrl, {
        agent,
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      // 验证响应状态码
      if (!response.ok) {
        return { 
          isValid: false,
          message: `代理返回错误状态码: ${response.status}`,
          responseTime
        };
      }
      
      // 解析响应数据
      const data = await response.json();
      
      // 验证数据格式
      if (!data || typeof data !== 'object' || !data.ip || !data.country) {
        return {
          isValid: false,
          message: '代理返回数据无效或格式不正确',
          responseTime,
          data
        };
      }
      
      // 验证IP是否改变（确保代理真正在工作）
      if (directIp && directIp === data.ip) {
        return {
          isValid: false,
          message: '代理未改变IP地址，可能未正常工作',
          responseTime,
          data
        };
      }
      
      return {
        isValid: true,
        responseTime,
        message: '代理测试成功',
        data
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      return { 
        isValid: false, 
        message: fetchError instanceof Error ? fetchError.message : '代理连接失败'
      };
    }
  } catch (error) {
    console.error(`代理测试失败 ${proxy.host}:${proxy.port}:`, error);
    return { 
      isValid: false,
      message: error instanceof Error ? error.message : '代理测试失败'
    };
  }
}

/**
 * 格式化代理URL
 */
export function formatProxyUrl(proxy: {
  host: string;
  port: number;
  protocol: string;
  username?: string;
  password?: string;
}): string | null {
  try {
    const { protocol, host, port, username, password } = proxy;
    
    // 转换协议格式
    let protocolPrefix;
    switch(protocol.toLowerCase()) {
      case 'http':
        protocolPrefix = 'http:';
        break;
      case 'https':
        protocolPrefix = 'https:';
        break;
      case 'socks4':
        protocolPrefix = 'socks4:';
        break;
      case 'socks5':
        protocolPrefix = 'socks5:';
        break;
      default:
        throw new Error(`不支持的协议: ${protocol}`);
    }
    
    // 构建认证部分
    const auth = username && password ? `${username}:${password}@` : '';
    
    // 返回完整的代理URL
    return `${protocolPrefix}//${auth}${host}:${port}`;
  } catch (error) {
    console.error('格式化代理URL失败:', error);
    return null;
  }
}

/**
 * 获取代理池配置
 */
export async function getProxyConfig(): Promise<ConfigType> {
  try {
    await connectMongoDB();
    
    // 获取当前代理池配置，如果不存在则使用默认配置
    let config = await ProxyPoolConfig.findOne({}).sort({ updatedAt: -1 }).lean();
    
    if (!config) {
      // 创建默认配置
      const defaultConfig = new ProxyPoolConfig({
        selectionMode: 'random',
        autoRotationInterval: 300, // 5分钟
        checkProxiesOnStartup: true,
        validateOnFailure: true,
        maxFailures: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await defaultConfig.save();
      config = defaultConfig.toObject();
    }
    
    // 类型转换，确保返回类型符合期望
    if (!config) {
      throw new Error('未能获取代理池配置');
    }
    
    // 使用类型断言来处理Mongoose对象
    const configObj = config as any;
    
    return {
      _id: configObj._id.toString(),
      selectionMode: configObj.selectionMode as 'random' | 'roundRobin' | 'fastest',
      autoRotationInterval: configObj.autoRotationInterval,
      checkProxiesOnStartup: configObj.checkProxiesOnStartup,
      validateOnFailure: configObj.validateOnFailure,
      maxFailures: configObj.maxFailures,
      createdAt: configObj.createdAt.toString(),
      updatedAt: configObj.updatedAt.toString()
    };
  } catch (error) {
    console.error('获取代理池配置失败:', error);
    // 使用默认配置
    return {
      _id: 'default',
      selectionMode: 'random',
      autoRotationInterval: 300,
      checkProxiesOnStartup: true,
      validateOnFailure: true,
      maxFailures: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
}

/**
 * 更新代理状态信息
 */
export async function updateProxyStatus(
  proxyId: string, 
  isValid: boolean, 
  responseTime?: number
): Promise<void> {
  try {
    await connectMongoDB();
    
    const updateData: any = {
      isValid,
      lastChecked: new Date()
    };
    
    // 添加响应时间（如果提供）
    if (responseTime !== undefined) {
      updateData.responseTime = responseTime;
    }
    
    // 根据代理有效性进行不同处理
    if (!isValid) {
      // 如果代理无效，增加失败计数
      await Proxy.findByIdAndUpdate(
        proxyId,
        { $inc: { failureCount: 1 }, ...updateData },
        { new: true }
      );
    } else {
      // 如果代理有效，重置失败计数
      await Proxy.findByIdAndUpdate(
        proxyId,
        { 
          failureCount: 0,
          ...updateData
        },
        { new: true }
      );
    }
  } catch (error) {
    console.error(`更新代理状态失败 (ID: ${proxyId}):`, error);
  }
}

/**
 * 测试所有代理并更新状态
 */
export async function testAllProxies(): Promise<{ tested: number, valid: number }> {
  try {
    await connectMongoDB();
    
    // 获取所有代理
    const proxies = await Proxy.find({});
    let valid = 0;
    
    // 逐个测试
    for (const proxy of proxies) {
      const testResult = await testProxy({
        host: proxy.host,
        port: proxy.port,
        protocol: proxy.protocol,
        username: proxy.username,
        password: proxy.password
      });
      
      // 更新状态
      await updateProxyStatus(proxy._id.toString(), testResult.isValid, testResult.responseTime);
      
      if (testResult.isValid) {
        valid++;
      }
    }
    
    return { tested: proxies.length, valid };
  } catch (error) {
    console.error('测试所有代理失败:', error);
    return { tested: 0, valid: 0 };
  }
}

/**
 * 添加新代理
 */
export async function addProxy(proxyData: Partial<ProxyData>): Promise<ProxyData> {
  try {
    await connectMongoDB();
    
    // 验证必需字段
    if (!proxyData.host || !proxyData.port || !proxyData.protocol) {
      throw new Error('代理必须包含host、port和protocol字段');
    }
    
    // 检查是否已存在相同的代理
    const existingProxy = await Proxy.findOne({
      host: proxyData.host,
      port: proxyData.port,
      protocol: proxyData.protocol,
    });
    
    if (existingProxy) {
      throw new Error('该代理已存在');
    }
    
    // 创建新代理
    const newProxy = new Proxy({
      ...proxyData,
      isActive: true,
      failureCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await newProxy.save();
    return newProxy.toObject() as unknown as ProxyData;
  } catch (error) {
    console.error('添加代理失败:', error);
    throw error;
  }
}

/**
 * 更新代理池配置
 */
export async function updateProxyConfig(configData: Partial<ConfigType>): Promise<ConfigType> {
  try {
    await connectMongoDB();
    
    // 获取当前配置
    let config = await ProxyPoolConfig.findOne({}).sort({ updatedAt: -1 });
    
    if (!config) {
      // 如果没有现有配置，创建一个新的
      config = new ProxyPoolConfig({
        selectionMode: configData.selectionMode || 'random',
        autoRotationInterval: configData.autoRotationInterval || 300,
        checkProxiesOnStartup: configData.checkProxiesOnStartup !== undefined ? configData.checkProxiesOnStartup : true,
        validateOnFailure: configData.validateOnFailure !== undefined ? configData.validateOnFailure : true,
        maxFailures: configData.maxFailures || 3,
        createdAt: new Date()
      });
    } else {
      // 更新现有配置
      if (configData.selectionMode !== undefined) config.selectionMode = configData.selectionMode;
      if (configData.autoRotationInterval !== undefined) config.autoRotationInterval = configData.autoRotationInterval;
      if (configData.checkProxiesOnStartup !== undefined) config.checkProxiesOnStartup = configData.checkProxiesOnStartup;
      if (configData.validateOnFailure !== undefined) config.validateOnFailure = configData.validateOnFailure;
      if (configData.maxFailures !== undefined) config.maxFailures = configData.maxFailures;
    }
    
    // 更新时间戳
    config.updatedAt = new Date();
    
    // 保存配置
    await config.save();
    
    // 返回更新后的配置
    return {
      _id: config._id.toString(),
      selectionMode: config.selectionMode as 'random' | 'roundRobin' | 'fastest',
      autoRotationInterval: config.autoRotationInterval,
      checkProxiesOnStartup: config.checkProxiesOnStartup,
      validateOnFailure: config.validateOnFailure,
      maxFailures: config.maxFailures,
      createdAt: config.createdAt.toString(),
      updatedAt: config.updatedAt.toString()
    };
  } catch (error) {
    console.error('更新代理池配置失败:', error);
    throw error;
  }
}
