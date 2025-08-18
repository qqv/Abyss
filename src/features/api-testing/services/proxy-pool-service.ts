/**
 * API 测试代理池服务
 * 用于获取和管理API测试中使用的代理池数据
 */
import { ProxyPool } from '@/lib/api-data';

// 获取代理池列表
export async function fetchProxyPools(): Promise<ProxyPool[]> {
  try {
    // 使用现有的代理API端点
    const [proxiesResponse, configResponse] = await Promise.all([
      fetch('/api/v1/proxies', { cache: 'no-store' }),
      fetch('/api/v1/proxy-config', { cache: 'no-store' })
    ]);
    
    if (!proxiesResponse.ok || !configResponse.ok) {
      throw new Error(`获取代理池数据失败: ${proxiesResponse.status} / ${configResponse.status}`);
    }
    
    const [proxies, config] = await Promise.all([
      proxiesResponse.json(),
      configResponse.json()
    ]);
    
    // 将代理数据和配置组合成代理池格式
    const proxyPool: ProxyPool = {
      _id: 'default-proxy-pool',
      id: 'default-proxy-pool',
      name: '默认代理池',
      proxies: proxies.map((proxy: any) => ({
        id: proxy._id || proxy.id,
        name: `${proxy.protocol}://${proxy.host}:${proxy.port}`,
        host: proxy.host,
        port: proxy.port,
        protocol: proxy.protocol,
        auth: proxy.username ? {
          username: proxy.username,
          password: proxy.password || ''
        } : undefined,
        username: proxy.username || '',
        password: proxy.password || '',
        enabled: proxy.isActive
      })),
      mode: config.selectionMode === 'sequential' ? 'round-robin' : 
            config.selectionMode === 'random' ? 'random' : 'sticky'
    };
    
    return [proxyPool];
  } catch (error) {
    console.error('获取代理池列表失败:', error);
    // 如果API调用失败，返回空数组
    return [];
  }
}
