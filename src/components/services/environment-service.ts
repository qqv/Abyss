/**
 * 环境变量服务 - 存根实现
 * 注意：环境变量功能已被弃用，此文件仅保留存根接口以兼容现有代码
 */

// 定义临时类型，避免引用外部模块
type EnvironmentVariable = {
  key: string;
  value: string;
  enabled: boolean;
};

type Environment = {
  id: string;
  name: string;
  variables: EnvironmentVariable[];
};

type GlobalVariables = {
  variables: EnvironmentVariable[];
};

// 获取环境变量列表 - 返回空数组
export async function fetchEnvironments(): Promise<Environment[]> {
  console.warn('环境变量功能已弃用');
  return [];
}

// 获取单个环境变量详情 - 返回null
export async function fetchEnvironment(id: string): Promise<Environment | null> {
  console.warn('环境变量功能已弃用');
  return null;
}

// 获取全局变量 - 返回空变量列表
export async function fetchGlobalVariables(): Promise<GlobalVariables> {
  console.warn('环境变量功能已弃用');
  return { variables: [] };
}

// 替换请求URL中的环境变量 - 直接返回原URL
export function replaceUrlVariables(url: string, variables: EnvironmentVariable[]): string {
  // 环境变量功能已弃用，直接返回原始URL
  return url;
}

// 替换请求头中的环境变量 - 直接返回原headers
export function replaceHeaderVariables(headers: any[], variables: EnvironmentVariable[]): any[] {
  // 环境变量功能已弃用，直接返回原始headers
  return headers;
}

// 替换请求体中的环境变量 - 直接返回原body
export function replaceBodyVariables(body: any, variables: EnvironmentVariable[]): any {
  // 环境变量功能已弃用，直接返回原始body
  return body;
}
