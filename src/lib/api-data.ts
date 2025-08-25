// 定义API请求相关的类型和模型

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface RequestHeader {
  key: string;
  value: string;
  enabled: boolean;
}

export interface RequestParam {
  key: string;
  value: string;
  enabled: boolean;
}

export interface RequestVariable {
  key: string;
  value: string;
  description?: string;
}

export interface RequestBody {
  mode?: 'raw' | 'form-data' | 'urlencoded' | 'binary' | 'none';
  raw?: string;
  content?: string; // MongoDB中存储的字段，兼容已导入的请求
  contentType?: string; // 如 'application/json', 'text/plain' 等
  formData?: RequestParam[];
  urlencoded?: RequestParam[];
  binary?: string;
  _id?: any; // MongoDB ID字段
}

export interface RequestTest {
  name: string;
  script: string; // JavaScript 测试脚本
  enabled: boolean;
}

export interface RequestPreScript {
  script: string; // 预执行脚本
  enabled: boolean;
}

// 认证类型
export type AuthType = 'none' | 'basic' | 'apikey' | 'bearer' | 'oauth2';

// 认证参数接口
export interface AuthParams {
  type: AuthType;
  enabled: boolean;
  // Basic Auth
  username?: string;
  password?: string;
  // API Key
  apiKey?: string;
  apiKeyName?: string;
  apiKeyIn?: 'header' | 'query';
  // Bearer Token
  token?: string;
  // OAuth2
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenUrl?: string;
  authUrl?: string;
  scope?: string;
}

export interface ApiRequest {
  _id: string;
  id?: string; // 兼容字段，将逐步弃用
  name: string;
  url: string;
  method: HttpMethod;
  headers: RequestHeader[];
  queryParams: RequestParam[]; // URL查询参数，以前称为params
  body: RequestBody;
  collectionId?: string; // 所属集合ID
  tests?: RequestTest[];
  preRequest?: RequestPreScript;
  // 与后端模型匹配的字段
  preRequestScript?: string;
  assertions?: any[];
  auth?: AuthParams; // 认证参数
  parentId?: string; // 用于分组
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiFolder {
  _id: string;
  id?: string; // 兼容字段，将逐步弃用
  name: string;
  parentId?: string;
  items: (ApiRequest | ApiFolder)[];
} // 用于嵌套文件夹

export interface ApiResult {
  requestId: string;
  requestName?: string;  // 请求名称，便于在集合运行结果中显示
  url?: string;         // 请求URL，便于在集合运行结果中显示
  method?: HttpMethod;  // HTTP方法，便于在集合运行结果中显示
  // 请求相关字段
  requestHeaders?: Record<string, string>; // 请求头
  requestBody?: string;  // 请求体
  // 响应相关字段
  status: number;
  statusText: string;
  responseTime: number; // 毫秒
  responseSize: number; // 字节
  responseHeaders: Record<string, string>;
  responseBody: string; 
  error?: string;
  isNetworkError?: boolean; // 是否为网络连接错误
  testResults?: {
    name: string;
    passed: boolean;
    error?: string;
    duration?: number; // 测试执行时间（毫秒）
  }[];
  allTestsPassed?: boolean | null; // 所有测试是否通过
  parameterValues?: Record<string, string>; // 运行时使用的参数值
  timestamp: string; // 执行时间戳
  tests?: RequestTest[]; // 原始测试脚本信息
  // 代理信息（如果使用代理）
  proxyInfo?: {
    tunnelId?: string;
    tunnelName?: string;
    proxy?: {
      host: string;
      port: number;
      protocol?: string;
    } | null;
  };
}

export interface ParameterSet {
  _id: string;
  id?: string; // 兼容字段，将逐步弃用
  name: string;
  variables: Record<string, string[]>; // 变量名 -> 变量值数组
  createdAt: string;
}

export interface ProxyConfig {
  _id: string;
  id?: string; // 兼容字段，将逐步弃用
  name: string;
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'socks4' | 'socks5';
  auth?: {
    username: string;
    password: string;
  };
  enabled: boolean;
}

export interface ProxyPool {
  _id: string;
  id?: string; // 兼容字段，将逐步弃用
  name: string;
  proxies: ProxyConfig[];
  mode: 'round-robin' | 'random' | 'sticky';
}

export interface ApiCollection {
  _id: string;
  id?: string; // 兼容字段，将逐步弃用
  name: string;
  description?: string;
  items: (ApiRequest | ApiFolder)[];
  requests?: ApiRequest[]; // 直接附属于集合的请求列表
  folders?: ApiFolder[]; // 直接附属于集合的文件夹列表
  variables?: RequestVariable[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiScanJob {
  _id: string;
  id?: string; // 兼容字段，将逐步弃用
  name: string;
  collectionId: string;
  parameterSetId?: string;
  proxyPoolId?: string;
  concurrency: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number; // 0-100
  startTime?: string;
  endTime?: string | null;
  results: ApiResult[];
}

// 示例数据
export const mockParameterSets: ParameterSet[] = [
  {
    _id: "param-domains",
    id: "param-domains", // 兼容字段
    name: "测试域名",
    variables: {
      "domain": ["example.com", "test.com", "dev.local"]
    },
    createdAt: "2025-05-16T10:00:00.000Z"
  },
  {
    _id: "param-users",
    id: "param-users", // 兼容字段
    name: "用户测试集",
    variables: {
      "username": ["admin", "test", "user1", "user2"]
    },
    createdAt: "2025-05-16T11:00:00.000Z"
  }
];