/**
 * 侧边栏服务函数
 * 用于获取和管理侧边栏显示的数据
 */
import { ApiCollection } from '@/lib/api-data';

// 获取API集合列表
export async function fetchSidebarCollections(): Promise<ApiCollection[]> {
  try {
    const response = await fetch('/api/v1/collections', {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`获取API集合列表失败: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('获取侧边栏API集合列表失败:', error);
    // 如果API调用失败，返回空数组而不是使用硬编码数据
    return [];
  }
}
