import { ApiCollection, ApiRequest, RequestHeader, RequestParam, RequestBody, HttpMethod } from './api-data';

export interface PostmanCollection {
  info: {
    _postman_id: string;
    name: string;
    schema: string;
    description?: string;
  };
  item: PostmanItem[];
  event?: PostmanEvent[];
}

export interface PostmanItem {
  name: string;
  event?: PostmanEvent[];
  request: PostmanRequest;
  response?: PostmanResponse[];
  item?: PostmanItem[]; // 用于文件夹
}

export interface PostmanEvent {
  listen: string;
  script: {
    exec: string[];
    type: string;
  };
}

export interface PostmanRequest {
  method: string;
  header: PostmanHeader[];
  body?: PostmanBody;
  url: string | PostmanUrl;
  auth?: PostmanAuth;
}

export interface PostmanHeader {
  key: string;
  value: string;
  type?: string;
  disabled?: boolean;
}

export interface PostmanBody {
  mode: string;
  raw?: string;
  options?: {
    raw?: {
      language: string;
    };
  };
  formdata?: PostmanFormData[];
  urlencoded?: PostmanUrlEncoded[];
}

export interface PostmanFormData {
  key: string;
  value: string;
  type: string;
  disabled?: boolean;
}

export interface PostmanUrlEncoded {
  key: string;
  value: string;
  disabled?: boolean;
}

export interface PostmanUrl {
  raw: string;
  protocol: string;
  host: string[];
  path: string[];
  query?: PostmanQuery[];
}

export interface PostmanQuery {
  key: string;
  value: string;
  disabled?: boolean;
}

export interface PostmanAuth {
  type: string;
  basic?: PostmanAuthBasic[];
  bearer?: PostmanAuthBearer[];
  apikey?: PostmanAuthApiKey[];
  oauth2?: PostmanAuthOAuth2[];
  [key: string]: any;
}

// Postman Basic认证
export interface PostmanAuthBasic {
  key: string;
  value: string;
  type: string;
}

// Postman Bearer认证
export interface PostmanAuthBearer {
  key: string;
  value: string;
  type: string;
}

// Postman ApiKey认证
export interface PostmanAuthApiKey {
  key: string;
  value: string;
  type: string;
}

// Postman OAuth2认证
export interface PostmanAuthOAuth2 {
  key: string;
  value: string;
  type: string;
}

export interface PostmanResponse {
  name: string;
  originalRequest: PostmanRequest;
  status: string;
  code: number;
  _postman_previewlanguage: string;
  header: PostmanHeader[];
  cookie: any[];
  body: string;
}

/**
 * 解析Postman Collection成API集合
 */
export function parsePostmanCollection(collection: PostmanCollection): ApiCollection {
  const collectionId = collection.info._postman_id || generateId();
  const apiCollection: ApiCollection = {
    _id: collectionId,
    id: collectionId, // 兼容字段
    name: collection.info.name,
    description: collection.info.description,
    items: [],
    variables: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // 处理顶级的事件（比如全局的pre-request脚本）
  if (collection.event) {
    // 这里可以添加全局变量处理逻辑
  }

  // 递归处理所有项目
  processItems(collection.item, apiCollection.items);

  return apiCollection;
}

/**
 * 递归处理Postman项目（请求或文件夹）
 */
function processItems(items: PostmanItem[], targetItems: (ApiRequest | any)[]) {
  for (const item of items) {
    if (item.item) {
      // 是一个文件夹
      const folder = {
        id: generateId(),
        name: item.name,
        items: []
      };
      processItems(item.item, folder.items);
      targetItems.push(folder);
    } else {
      // 是一个请求
      const request = convertToApiRequest(item);
      targetItems.push(request);
    }
  }
}

/**
 * 转换Postman请求为API请求
 */
function convertToApiRequest(item: PostmanItem): ApiRequest {
  const postmanRequest = item.request;
  let url = '';
  let params: RequestParam[] = [];

  // 解析URL
  if (typeof postmanRequest.url === 'string') {
    url = postmanRequest.url;
  } else if (postmanRequest.url) {
    const urlObj = postmanRequest.url;
    url = urlObj.raw;
    
    // 解析URL参数
    if (urlObj.query) {
      params = urlObj.query.map(q => ({
        key: q.key,
        value: q.value,
        enabled: !q.disabled
      }));
    }
  }

  // 解析请求头
  const headers: RequestHeader[] = postmanRequest.header.map(h => ({
    key: h.key,
    value: h.value,
    enabled: !h.disabled
  }));

  // 解析请求体
  let body: RequestBody = {
    mode: 'none'
  };

  if (postmanRequest.body) {
    const pb = postmanRequest.body;
    
    if (pb.mode === 'raw' && pb.raw) {
      body = {
        mode: 'raw',
        raw: pb.raw,
        contentType: pb.options?.raw?.language === 'json' 
          ? 'application/json' 
          : 'text/plain'
      };
    } else if (pb.mode === 'formdata' && pb.formdata) {
      body = {
        mode: 'form-data',
        formData: pb.formdata.map(f => ({
          key: f.key,
          value: f.value,
          enabled: !f.disabled
        }))
      };
    } else if (pb.mode === 'urlencoded' && pb.urlencoded) {
      body = {
        mode: 'urlencoded',
        urlencoded: pb.urlencoded.map(u => ({
          key: u.key,
          value: u.value,
          enabled: !u.disabled
        }))
      };
    }
  }

  // 解析测试脚本
  let tests;
  let preRequest;

  if (item.event) {
    for (const event of item.event) {
      if (event.listen === 'test') {
        tests = [{
          name: item.name + ' 测试',
          script: event.script.exec.join('\n'),
          enabled: true
        }];
      } else if (event.listen === 'prerequest') {
        preRequest = {
          script: event.script.exec.join('\n'),
          enabled: true
        };
      }
    }
  }
  
  // 解析认证信息
  let auth: any = undefined;
  
  if (postmanRequest.auth) {
    const postmanAuth = postmanRequest.auth;
    
    // 初始化认证对象
    auth = {
      type: postmanAuth.type as 'none' | 'basic' | 'apikey' | 'bearer' | 'oauth2',
      enabled: true
    };
    
    // 根据不同的认证类型进行处理
    switch (postmanAuth.type) {
      case 'basic':
        // 处理Basic认证
        if (postmanAuth.basic) {
          const username = postmanAuth.basic.find(item => item.key === 'username');
          const password = postmanAuth.basic.find(item => item.key === 'password');
          
          if (username && password) {
            auth.username = username.value;
            auth.password = password.value;
          }
        }
        break;
        
      case 'bearer':
        // 处理Bearer Token认证
        if (postmanAuth.bearer) {
          const token = postmanAuth.bearer.find(item => item.key === 'token');
          if (token) {
            auth.token = token.value;
          }
        }
        break;
        
      case 'apikey':
        // 处理API Key认证
        if (postmanAuth.apikey) {
          const key = postmanAuth.apikey.find(item => item.key === 'key');
          const value = postmanAuth.apikey.find(item => item.key === 'value');
          const in_ = postmanAuth.apikey.find(item => item.key === 'in');
          
          if (key && value) {
            auth.apiKeyName = key.value;
            auth.apiKey = value.value;
            auth.apiKeyIn = (in_ && in_.value === 'query') ? 'query' : 'header';
          }
        }
        break;
        
      case 'oauth2':
        // 处理OAuth2认证
        if (postmanAuth.oauth2) {
          const accessToken = postmanAuth.oauth2.find(item => item.key === 'accessToken');
          const refreshToken = postmanAuth.oauth2.find(item => item.key === 'refreshToken');
          
          if (accessToken) {
            auth.accessToken = accessToken.value;
          }
          if (refreshToken) {
            auth.refreshToken = refreshToken.value;
          }
        }
        break;
        
      // 其他认证类型可以根据需要添加
    }
    
    // 处理Postman的其他直接属性
    // 有些旧版本Postman将直接将值存储在auth对象的属性中
    if (postmanAuth.type === 'bearer' && typeof postmanAuth.token === 'string') {
      auth.token = postmanAuth.token;
    }
  }

  // 创建API请求
  return {
    _id: generateId(),
    id: generateId(),
    name: item.name,
    url,
    method: (postmanRequest.method as HttpMethod) || 'GET',
    headers,
    queryParams: params, // 注意这里用queryParams而query、params已不再使用
    body,
    tests,
    preRequest,
    // 添加认证信息
    auth: auth,
    // 添加必要的时间字段
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * 生成唯一ID
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * 解析Postman Collection JSON字符串
 */
export function parsePostmanCollectionFromJson(jsonString: string): ApiCollection | null {
  try {
    const postmanCollection = JSON.parse(jsonString) as PostmanCollection;
    return parsePostmanCollection(postmanCollection);
  } catch (error) {
    console.error('解析Postman Collection失败:', error);
    return null;
  }
}
