/**
 * API 测试作业服务
 * 用于获取和管理API测试作业数据
 */
import { ApiScanJob, ApiResult } from '@/lib/api-data';

// 获取API测试作业列表
export async function fetchApiJobs(): Promise<ApiScanJob[]> {
  try {
    const response = await fetch('/api/v1/tests', {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`获取API测试作业列表失败: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('获取API测试作业列表失败:', error);
    // 如果API调用失败，返回空数组
    return [];
  }
}

// 获取单个API测试作业详情
export async function fetchApiJob(id: string): Promise<ApiScanJob | null> {
  try {
    const response = await fetch(`/api/v1/tests/${id}`, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`获取API测试作业详情失败: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`获取API测试作业详情失败 (ID: ${id}):`, error);
    return null;
  }
}

// 创建API测试作业
export async function createApiJob(job: Omit<ApiScanJob, 'id' | 'status' | 'progress' | 'results'>): Promise<ApiScanJob | null> {
  try {
    const response = await fetch('/api/v1/tests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(job)
    });
    
    if (!response.ok) {
      throw new Error(`创建API测试作业失败: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('创建API测试作业失败:', error);
    return null;
  }
}

// 获取API测试作业结果
export async function fetchApiJobResults(jobId: string): Promise<ApiResult[]> {
  try {
    const response = await fetch(`/api/v1/tests/${jobId}/results`, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`获取API测试作业结果失败: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`获取API测试作业结果失败 (JobID: ${jobId}):`, error);
    return [];
  }
}

// 运行/重新运行API测试作业
export async function runApiJob(jobId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/v1/tests/${jobId}/run`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error(`运行API测试作业失败: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error(`运行API测试作业失败 (JobID: ${jobId}):`, error);
    return false;
  }
}

// 停止API测试作业
export async function stopApiJob(jobId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/v1/tests/${jobId}/stop`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error(`停止API测试作业失败: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error(`停止API测试作业失败 (JobID: ${jobId}):`, error);
    return false;
  }
}

// 删除API测试作业
export async function deleteApiJob(jobId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/v1/tests/${jobId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`删除API测试作业失败: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error(`删除API测试作业失败 (JobID: ${jobId}):`, error);
    return false;
  }
}
