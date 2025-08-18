/**
 * API 测试参数集服务
 * 用于获取和管理API测试参数集数据
 */
import { ParameterSet } from '@/lib/api-data';

// 获取参数集列表
export async function fetchParameterSets(): Promise<ParameterSet[]> {
  try {
    // 使用正确的API端点
    const response = await fetch('/api/v1/environments', {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`获取参数集列表失败: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 将环境数据转换为参数集格式
    return data.map((env: any) => ({
      id: env._id || env.id,
      name: env.name,
      variables: env.variables || {},
      createdAt: env.createdAt
    }));
  } catch (error) {
    console.error('获取参数集列表失败:', error);
    // 如果API调用失败，返回空数组
    return [];
  }
}
