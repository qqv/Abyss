/**
 * API导出服务
 * 用于将API集合导出为各种格式
 */
import { ApiCollection, ApiRequest, ApiFolder } from '@/lib/api-data';
import { v4 as uuidv4 } from 'uuid';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

/**
 * 将集合导出为Postman格式
 */
export function exportToPostmanFormat(collection: ApiCollection): any {
  // 生成Postman兼容的唯一ID
  const postmanId = uuidv4();
  
  // 创建Postman集合结构
  const postmanCollection = {
    info: {
      _postman_id: postmanId,
      name: collection.name,
      description: collection.description || '',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    item: [] as any[]
  };
  
  // 处理集合中的项目（请求和文件夹）
  if (collection.requests && collection.requests.length > 0) {
    collection.requests.forEach(request => {
      postmanCollection.item.push(convertRequestToPostmanItem(request));
    });
  }
  
  // 处理文件夹
  if (collection.folders && collection.folders.length > 0) {
    collection.folders.forEach(folder => {
      postmanCollection.item.push(convertFolderToPostmanItem(folder));
    });
  }
  
  // 处理兼容性的items数组
  if (collection.items && collection.items.length > 0) {
    collection.items.forEach(item => {
      if ('url' in item) {
        // 是请求
        postmanCollection.item.push(convertRequestToPostmanItem(item));
      } else {
        // 是文件夹
        postmanCollection.item.push(convertFolderToPostmanItem(item));
      }
    });
  }
  
  return postmanCollection;
}

/**
 * 将请求转换为Postman格式的项
 */
function convertRequestToPostmanItem(request: ApiRequest): any {
  // 创建基本结构
  const postmanItem: any = {
    name: request.name,
    request: {
      method: request.method,
      header: [],
      url: {
        raw: request.url,
        // 尝试解析URL以提取更多细节
        ...parseUrl(request.url)
      },
      description: ''
    },
    response: []
  };
  
  // 处理请求头
  if (request.headers && request.headers.length > 0) {
    request.headers.forEach(header => {
      if (header.enabled) {
        postmanItem.request.header.push({
          key: header.key,
          value: header.value,
          type: 'text'
        });
      }
    });
  }
  
  // 处理查询参数
  if (request.queryParams && request.queryParams.length > 0) {
    if (!postmanItem.request.url.query) {
      postmanItem.request.url.query = [];
    }
    
    request.queryParams.forEach(param => {
      if (param.enabled) {
        postmanItem.request.url.query.push({
          key: param.key,
          value: param.value
        });
      }
    });
  }
  
  // 处理请求体
  if (request.body) {
    postmanItem.request.body = {
      mode: request.body.mode || 'raw',
      options: {}
    };
    
    switch (request.body.mode) {
      case 'raw':
        postmanItem.request.body.raw = request.body.raw || request.body.content || '';
        postmanItem.request.body.options = {
          raw: {
            language: getLanguageFromContentType(request.body.contentType)
          }
        };
        break;
      case 'urlencoded':
        postmanItem.request.body.urlencoded = request.body.urlencoded?.map(item => ({
          key: item.key,
          value: item.value,
          disabled: !item.enabled,
          type: 'text'
        })) || [];
        break;
      case 'form-data':
        postmanItem.request.body.formdata = request.body.formData?.map(item => ({
          key: item.key,
          value: item.value,
          disabled: !item.enabled,
          type: 'text'
        })) || [];
        break;
    }
  }
  
  // 处理认证信息
  if (request.auth && request.auth.enabled && request.auth.type !== 'none') {
    postmanItem.request.auth = {
      type: request.auth.type
    };
    
    switch (request.auth.type) {
      case 'bearer':
        postmanItem.request.auth.bearer = [
          { key: 'token', value: request.auth.token || '', type: 'string' }
        ];
        break;
      case 'basic':
        postmanItem.request.auth.basic = [
          { key: 'username', value: request.auth.username || '', type: 'string' },
          { key: 'password', value: request.auth.password || '', type: 'string' }
        ];
        break;
      case 'apikey':
        postmanItem.request.auth.apikey = [
          { key: 'key', value: request.auth.apiKeyName || '', type: 'string' },
          { key: 'value', value: request.auth.apiKey || '', type: 'string' },
          { key: 'in', value: request.auth.apiKeyIn || 'header', type: 'string' }
        ];
        break;
    }
  }
  
  // 处理预请求脚本和测试脚本
  postmanItem.event = []; // 确保event字段存在，即使没有脚本
  
  // 处理预请求脚本
  if (request.preRequest && request.preRequest.enabled && request.preRequest.script) {
    postmanItem.event.push({
      listen: 'prerequest',
      script: {
        type: 'text/javascript',
        exec: request.preRequest.script.split('\n')
      }
    });
    console.log('已添加预请求脚本到导出项', request.name);
  }
  
  // 处理tests字段中的测试脚本
  if (request.tests && request.tests.length > 0) {
    const enabledTests = request.tests.filter(test => test.enabled);
    if (enabledTests.length > 0) {
      const combinedScript = enabledTests.map(test => test.script).join('\n\n');
      postmanItem.event.push({
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: combinedScript.split('\n')
        }
      });
      console.log('已添加tests字段测试脚本到导出项', request.name, '测试数量:', enabledTests.length);
    }
  }
  
  // 处理assertions字段中的测试脚本 (兼容旧格式)
  if (request.assertions && request.assertions.length > 0) {
    const enabledAssertions = request.assertions.filter((assertion: any) => assertion.enabled);
    if (enabledAssertions.length > 0) {
      // 将所有assertions脚本合并
      const combinedScript = enabledAssertions.map((assertion: any) => 
        assertion.value || assertion.target || assertion.script || ''
      ).join('\n\n');
      
      if (combinedScript.trim()) {
        postmanItem.event.push({
          listen: 'test',
          script: {
            type: 'text/javascript',
            exec: combinedScript.split('\n')
          }
        });
        console.log('已添加assertions字段测试脚本到导出项', request.name, '脚本数量:', enabledAssertions.length);
      }
    }
  }
  
  // 如果没有任何事件，则删除空数组
  if (postmanItem.event.length === 0) {
    delete postmanItem.event;
  } else {
    console.log(`导出的请求 ${request.name} 包含 ${postmanItem.event.length} 个事件`);
  }
  
  return postmanItem;
}

/**
 * 将文件夹转换为Postman格式的项
 */
function convertFolderToPostmanItem(folder: ApiFolder): any {
  const postmanFolder: any = {
    name: folder.name,
    item: []
  };
  
  // 处理文件夹中的请求
  if (folder.items && folder.items.length > 0) {
    folder.items.forEach(item => {
      if ('url' in item) {
        // 是请求
        postmanFolder.item.push(convertRequestToPostmanItem(item));
      } else {
        // 是子文件夹
        postmanFolder.item.push(convertFolderToPostmanItem(item));
      }
    });
  }
  
  return postmanFolder;
}

/**
 * 解析URL以提取更多细节
 */
function parseUrl(url: string): any {
  try {
    const parsedUrl = new URL(url);
    return {
      protocol: parsedUrl.protocol.replace(':', ''),
      host: parsedUrl.hostname.split('.'),
      port: parsedUrl.port || '',
      path: parsedUrl.pathname.split('/').filter(Boolean),
      hash: parsedUrl.hash || '',
      query: [] // 查询参数在外部处理
    };
  } catch (error) {
    // URL解析失败，可能是相对URL
    console.warn('URL解析失败:', url);
    return {};
  }
}

/**
 * 根据内容类型获取Postman语言类型
 */
function getLanguageFromContentType(contentType?: string): string {
  if (!contentType) return 'text';
  
  if (contentType.includes('json')) return 'json';
  if (contentType.includes('xml')) return 'xml';
  if (contentType.includes('javascript')) return 'javascript';
  if (contentType.includes('html')) return 'html';
  
  return 'text';
}

/**
 * 导出集合为JSON文件
 */
export function exportCollectionAsJson(collection: ApiCollection): void {
  const postmanCollection = exportToPostmanFormat(collection);
  const blob = new Blob([JSON.stringify(postmanCollection, null, 2)], { type: 'application/json' });
  saveAs(blob, `${collection.name.replace(/\s+/g, '_')}.postman_collection.json`);
}

/**
 * 导出集合为ZIP文件，包含所有请求的单独JSON文件
 */
export async function exportCollectionAsZip(collection: ApiCollection): Promise<void> {
  // 创建一个新的ZIP文件
  const zip = new JSZip();
  
  // 添加集合JSON文件
  const postmanCollection = exportToPostmanFormat(collection);
  zip.file(`${collection.name.replace(/\s+/g, '_')}.postman_collection.json`, JSON.stringify(postmanCollection, null, 2));
  
  // 创建requests文件夹
  const requestsFolder = zip.folder('requests');
  if (!requestsFolder) return;
  
  // 递归添加所有请求
  function addRequestsToZip(items: (ApiRequest | ApiFolder)[], parentPath: string = '', folder: JSZip) {
    items.forEach(item => {
      if ('url' in item) {
        // 这是一个请求
        const request = item;
        const postmanItem = convertRequestToPostmanItem(request);
        const fileName = `${request.name.replace(/\s+/g, '_')}.json`;
        const filePath = parentPath ? `${parentPath}/${fileName}` : fileName;
        folder.file(filePath, JSON.stringify(postmanItem, null, 2));
      } else {
        // 这是一个文件夹
        const folderItem = item;
        const folderPath = parentPath ? `${parentPath}/${folderItem.name}` : folderItem.name;
        if (folderItem.items && folderItem.items.length > 0) {
          addRequestsToZip(folderItem.items, folderPath, folder);
        }
      }
    });
  }
  
  // 开始递归添加请求
  if (collection.items && collection.items.length > 0) {
    addRequestsToZip(collection.items, '', requestsFolder);
  } else {
    // 兼容旧结构
    if (collection.requests && collection.requests.length > 0) {
      addRequestsToZip(collection.requests, '', requestsFolder);
    }
    
    if (collection.folders && collection.folders.length > 0) {
      addRequestsToZip(collection.folders, '', requestsFolder);
    }
  }
  
  // 生成ZIP文件并下载
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `${collection.name.replace(/\s+/g, '_')}_collection.zip`);
}
