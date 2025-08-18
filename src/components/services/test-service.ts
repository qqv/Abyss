import { RequestTest } from "@/lib/api-data";

/**
 * API响应接口 - 用于测试API
 */
interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body?: any;
  data?: any;
  [key: string]: any;
}

/**
 * 测试结果接口
 */
export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

/**
 * 测试执行结果
 */
export interface TestExecutionResult {
  testResults: TestResult[];
  allTestsPassed: boolean | null;
  error?: string;
}

/**
 * 执行测试脚本
 * 
 * 将响应数据和测试脚本发送到专门的测试API执行
 * 这样将测试逻辑与请求逻辑完全分离
 */
export async function executeTests(
  response: ApiResponse, 
  scripts: RequestTest[]
): Promise<TestExecutionResult> {
  try {
    console.log('向测试API发送请求，执行测试脚本');
    
    // 只保留启用的测试脚本
    const enabledScripts = scripts.filter(script => script.enabled);
    
    if (enabledScripts.length === 0) {
      console.log('没有启用的测试脚本');
      return {
        testResults: [],
        allTestsPassed: null
      };
    }
    
    // 准备发送到测试API的数据
    const testRequestData = {
      response,
      scripts: enabledScripts
    };
    
    console.log('测试请求数据:', testRequestData);
    
    // 调用测试执行API
    const testResponse = await fetch('/api/v1/tests/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testRequestData),
    });
    
    if (!testResponse.ok) {
      const errorData = await testResponse.json();
      throw new Error(errorData.error || '测试执行API请求失败');
    }
    
    // 解析测试结果
    const testResults = await testResponse.json();
    console.log('测试执行结果:', testResults);
    
    return testResults;
  } catch (error: any) {
    console.error('执行测试脚本失败:', error);
    
    return {
      testResults: [],
      allTestsPassed: false,
      error: error.message || '执行测试脚本失败'
    };
  }
}
