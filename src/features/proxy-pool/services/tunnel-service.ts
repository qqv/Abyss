import { Tunnel } from '../types';

// 获取所有隧道
export async function fetchTunnels(): Promise<Tunnel[]> {
  try {
    const response = await fetch('/api/v1/tunnels', {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`获取隧道列表失败: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 转换API返回的数据为UI组件需要的格式
    return data.map((tunnel: any) => {
      const tunnelObj: Tunnel = {
        id: tunnel._id,
        name: tunnel.name,
        proxyIds: tunnel.proxyIds || [],
        active: tunnel.active || false,
        taskId: tunnel.taskId,
        rotationType: tunnel.rotationType || 'sequential',
        rotationInterval: tunnel.rotationInterval || 300,
        maxRotations: tunnel.maxRotations || 0,
        validityDuration: tunnel.validityDuration || 0,
        maxConcurrentRequests: tunnel.maxConcurrentRequests || 10,
        retryCount: tunnel.retryCount || 3,
        createdAt: tunnel.createdAt ? new Date(tunnel.createdAt) : new Date(),
        updatedAt: tunnel.updatedAt ? new Date(tunnel.updatedAt) : new Date(),
        totalRequests: tunnel.totalRequests || 0,
        successfulRequests: tunnel.successfulRequests || 0,
        currentProxyIndex: tunnel.currentProxyIndex || 0,
        rotationCount: tunnel.rotationCount || 0,
      };
      
      return tunnelObj;
    });
  } catch (error) {
    console.error('获取隧道列表失败:', error);
    return [];
  }
}

// 创建新隧道
export async function createTunnel(tunnelData: Omit<Tunnel, 'id' | 'createdAt' | 'updatedAt' | 'totalRequests' | 'successfulRequests' | 'currentProxyIndex' | 'rotationCount'>): Promise<Tunnel> {
  try {
    const response = await fetch('/api/v1/tunnels', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tunnelData),
    });
    
    if (!response.ok) {
      throw new Error(`创建隧道失败: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 转换返回的数据
    return {
      id: data._id,
      name: data.name,
      proxyIds: data.proxyIds || [],
      active: data.active || false,
      taskId: data.taskId,
      rotationType: data.rotationType || 'sequential',
      rotationInterval: data.rotationInterval || 300,
      maxRotations: data.maxRotations || 0,
      validityDuration: data.validityDuration || 0,
      maxConcurrentRequests: data.maxConcurrentRequests || 10,
      retryCount: data.retryCount || 3,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
      totalRequests: data.totalRequests || 0,
      successfulRequests: data.successfulRequests || 0,
      currentProxyIndex: data.currentProxyIndex || 0,
      rotationCount: data.rotationCount || 0,
    };
  } catch (error) {
    console.error('创建隧道失败:', error);
    throw error;
  }
}

// 更新隧道
export async function updateTunnel(id: string, tunnelData: Omit<Tunnel, 'id' | 'createdAt' | 'updatedAt' | 'totalRequests' | 'successfulRequests' | 'currentProxyIndex' | 'rotationCount'>): Promise<Tunnel> {
  try {
    const response = await fetch('/api/v1/tunnels', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, ...tunnelData }),
    });
    
    if (!response.ok) {
      throw new Error(`更新隧道失败: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 转换返回的数据
    return {
      id: data._id,
      name: data.name,
      proxyIds: data.proxyIds || [],
      active: data.active || false,
      taskId: data.taskId,
      rotationType: data.rotationType || 'sequential',
      rotationInterval: data.rotationInterval || 300,
      maxRotations: data.maxRotations || 0,
      validityDuration: data.validityDuration || 0,
      maxConcurrentRequests: data.maxConcurrentRequests || 10,
      retryCount: data.retryCount || 3,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
      totalRequests: data.totalRequests || 0,
      successfulRequests: data.successfulRequests || 0,
      currentProxyIndex: data.currentProxyIndex || 0,
      rotationCount: data.rotationCount || 0,
    };
  } catch (error) {
    console.error('更新隧道失败:', error);
    throw error;
  }
}

// 删除隧道
export async function deleteTunnel(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/v1/tunnels?id=${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`删除隧道失败: ${response.status}`);
    }
  } catch (error) {
    console.error('删除隧道失败:', error);
    throw error;
  }
}

// 切换隧道激活状态
export async function toggleTunnelActive(id: string, active: boolean): Promise<void> {
  try {
    const response = await fetch('/api/v1/tunnels', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        id, 
        active,
        updateActiveOnly: true // 标记只更新active字段
      }),
    });
    
    if (!response.ok) {
      throw new Error(`切换隧道状态失败: ${response.status}`);
    }
  } catch (error) {
    console.error('切换隧道状态失败:', error);
    throw error;
  }
}
