/**
 * API集合服务
 * 用于获取和管理API集合和相关数据
 */
import { ApiCollection, ApiRequest, ApiFolder } from '../../../lib/api-data';

// 获取API集合列表
export async function fetchApiCollections(): Promise<ApiCollection[]> {
  try {
    const response = await fetch('/api/v1/collections', {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`获取API集合列表失败: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('获取API集合列表失败:', error);
    return [];
  }
}

// 获取单个API集合详情
export async function fetchApiCollection(id: string): Promise<ApiCollection | null> {
  try {
    const response = await fetch(`/api/v1/collections/${id}`, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`获取API集合详情失败: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`获取API集合详情失败 (ID: ${id}):`, error);
    return null;
  }
}

// 创建新的API集合
export async function createApiCollection(collection: Omit<ApiCollection, 'id'>): Promise<ApiCollection | null> {
  try {
    const response = await fetch('/api/v1/collections', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(collection)
    });
    
    if (!response.ok) {
      throw new Error(`创建API集合失败: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('创建API集合失败:', error);
    return null;
  }
}

// 更新API集合
export async function updateApiCollection(id: string, collection: Partial<ApiCollection>): Promise<ApiCollection | null> {
  try {
    const response = await fetch(`/api/v1/collections/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(collection)
    });
    
    if (!response.ok) {
      throw new Error(`更新API集合失败: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`更新API集合失败 (ID: ${id}):`, error);
    return null;
  }
}

// 删除API集合
export async function deleteApiCollection(id: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/v1/collections/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`删除API集合失败: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error(`删除API集合失败 (ID: ${id}):`, error);
    return false;
  }
}

// 添加请求到集合
export async function addRequestToCollection(collectionId: string, request: Omit<ApiRequest, 'id'>): Promise<ApiRequest | null> {
  try {
    const response = await fetch(`/api/v1/collections/${collectionId}/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      throw new Error(`添加请求到集合失败: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`添加请求到集合失败 (Collection ID: ${collectionId}):`, error);
    return null;
  }
}

// 添加文件夹到集合
export async function addFolderToCollection(collectionId: string, folder: Omit<ApiFolder, 'id'>): Promise<ApiFolder | null> {
  try {
    const response = await fetch(`/api/v1/collections/${collectionId}/folders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(folder)
    });
    
    if (!response.ok) {
      throw new Error(`添加文件夹到集合失败: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`添加文件夹到集合失败 (Collection ID: ${collectionId}):`, error);
    return null;
  }
}
