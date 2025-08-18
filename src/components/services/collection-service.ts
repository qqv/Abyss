/**
 * API集合服务
 * 用于获取和管理API集合数据
 */
import { ApiCollection, ApiRequest, ApiFolder, HttpMethod } from '@/lib/api-data';

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
    // 如果API调用失败，返回空数组而不是使用硬编码数据
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
export async function createApiCollection(name: string, description: string = ''): Promise<ApiCollection | null> {
  try {
    const response = await fetch('/api/v1/collections', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        description,
        folders: [],
        requests: []
      })
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
export async function updateApiCollection(collection: ApiCollection): Promise<ApiCollection | null> {
  try {
    const id = collection._id || collection.id;
    
    // 确保数组字段正确初始化
    const collectionToUpdate = {
      ...collection,
      requests: Array.isArray(collection.requests) ? collection.requests : [],
      folders: Array.isArray(collection.folders) ? collection.folders : []
    };
    
    // 记录详细日志
    console.log('正在更新集合:', {
      collectionId: id,
      requestsCount: collectionToUpdate.requests.length,
      foldersCount: collectionToUpdate.folders.length,
      updatePayload: JSON.stringify(collectionToUpdate).substring(0, 200) + '...'
    });
    
    const response = await fetch(`/api/v1/collections/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(collectionToUpdate)
    });
    
    if (!response.ok) {
      // 尝试获取错误消息
      let errorMessage = `更新API集合失败: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage += ` - ${errorData.message || JSON.stringify(errorData)}`;
      } catch (e) {
        // 无法解析错误消息
      }
      
      throw new Error(errorMessage);
    }
    
    const updatedCollection = await response.json();
    console.log('集合更新成功:', {
      collectionId: id,
      updatedRequestsCount: updatedCollection.requests?.length || 0
    });
    
    return updatedCollection;
  } catch (error) {
    console.error('更新API集合失败:', error);
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

// 创建新请求
export async function createApiRequest(
  collectionId: string,
  request: Partial<ApiRequest>
): Promise<ApiRequest | null> {
  try {
    // 构建完整请求对象
    const newRequest: ApiRequest = {
      _id: `req-${Date.now()}`,
      id: `req-${Date.now()}`,
      name: request.name || '新建请求',
      method: request.method || 'GET' as HttpMethod,
      url: request.url || 'https://api.example.com',
      headers: request.headers || [],
      queryParams: request.queryParams || [],
      body: request.body || {
        mode: 'raw',
        contentType: 'application/json',
        raw: ''
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // 获取集合
    const collection = await fetchApiCollection(collectionId);
    if (!collection) {
      throw new Error(`无法获取集合 (ID: ${collectionId})`);
    }
    
    // 将请求添加到集合
    // 确保 requests 是数组，如果不是则创建新数组
    let requests = collection.requests || [];
    
    // 添加请求到数组
    requests = [...requests, newRequest];
    
    // 更新集合对象
    const updatedCollection = {
      ...collection,
      requests: requests
    };
    
    console.log('添加请求到集合:', {
      collectionId,
      requestId: newRequest._id,
      requestsCount: requests.length
    });
    
    // 更新集合
    const result = await updateApiCollection(updatedCollection);
    if (!result) {
      throw new Error('无法更新集合');
    }
    
    return newRequest;
  } catch (error) {
    console.error('创建API请求失败:', error);
    return null;
  }
}

// 更新请求
export async function updateApiRequest(
  collectionId: string,
  request: ApiRequest
): Promise<ApiRequest | null> {
  try {
    // 获取集合
    const collection = await fetchApiCollection(collectionId);
    if (!collection) {
      throw new Error(`无法获取集合 (ID: ${collectionId})`);
    }
    
    // 更新请求
    const requestId = request._id || request.id;
    const updatedRequests = (collection.requests || []).map((r: ApiRequest) => {
      if ((r._id || r.id) === requestId) {
        return {
          ...request,
          updatedAt: new Date().toISOString()
        };
      }
      return r;
    });
    
    // 更新集合
    const updatedCollection = {
      ...collection,
      requests: updatedRequests
    };
    
    const result = await updateApiCollection(updatedCollection);
    if (!result) {
      throw new Error('无法更新集合');
    }
    
    return request;
  } catch (error) {
    console.error('更新API请求失败:', error);
    return null;
  }
}

// 保存请求到集合
export async function saveApiRequest(
  collectionId: string,
  request: ApiRequest
): Promise<ApiRequest | null> {
  try {
    console.log('开始保存请求到集合:', { 
      collectionId, 
      requestId: request._id || request.id,
      requestName: request.name
    });
    
    // 获取集合
    const collection = await fetchApiCollection(collectionId);
    if (!collection) {
      throw new Error(`无法获取集合 (ID: ${collectionId})`);
    }
    
    // 确保请求有collectionId属性
    const updatedRequest = {
      ...request,
      collectionId, // 确保请求和集合关联
      updatedAt: new Date().toISOString()
    };
    
    // 获取请求ID
    const requestId = updatedRequest._id || updatedRequest.id;
    
    // 确保集合有requests数组
    const requests = Array.isArray(collection.requests) ? [...collection.requests] : [];
    
    // 检查请求是否已存在
    const existingRequestIndex = requests.findIndex(
      (r: ApiRequest) => (r._id || r.id) === requestId
    );
    
    if (existingRequestIndex >= 0) {
      // 更新现有请求
      console.log('更新现有请求:', { requestId, index: existingRequestIndex });
      requests[existingRequestIndex] = updatedRequest;
    } else {
      // 添加新请求
      console.log('添加新请求到集合:', { requestId });
      requests.push(updatedRequest);
    }
    
    // 更新集合
    const updatedCollection = {
      ...collection,
      requests: requests
    };
    
    console.log('准备更新集合:', { 
      collectionId, 
      requestsCount: requests.length,
      isNewRequest: existingRequestIndex < 0
    });
    
    // 将更新后的集合保存到数据库
    const result = await updateApiCollection(updatedCollection);
    if (!result) {
      throw new Error('无法更新集合');
    }
    
    console.log('请求保存成功:', { 
      collectionId, 
      requestId, 
      updatedRequestsCount: result.requests?.length || 0 
    });
    
    return updatedRequest;
  } catch (error) {
    console.error('保存API请求失败:', error);
    return null;
  }
}

// 删除请求
export async function deleteApiRequest(
  collectionId: string,
  requestId: string
): Promise<boolean> {
  try {
    // 获取集合
    const collection = await fetchApiCollection(collectionId);
    if (!collection) {
      throw new Error(`无法获取集合 (ID: ${collectionId})`);
    }
    
    // 过滤掉要删除的请求
    const updatedRequests = (collection.requests || []).filter((r: ApiRequest) => {
      return (r._id || r.id) !== requestId;
    });
    
    // 更新集合
    const updatedCollection = {
      ...collection,
      requests: updatedRequests
    };
    
    const result = await updateApiCollection(updatedCollection);
    return !!result;
  } catch (error) {
    console.error('删除API请求失败:', error);
    return false;
  }
}

// 保存请求到集合的帮助函数 - 不对外暴露
const _saveRequestHelper = async (
  collectionId: string,
  request: ApiRequest,
  isUpdate = false
): Promise<ApiRequest | null> => {
  try {
    if (isUpdate) {
      return await updateApiRequest(collectionId, request);
    } else {
      return await createApiRequest(collectionId, request);
    }
  } catch (error) {
    console.error(`${isUpdate ? '更新' : '创建'}请求失败:`, error);
    return null;
  }
}
