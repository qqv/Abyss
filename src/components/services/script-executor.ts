/**
 * 脚本执行器
 * 用于安全地执行API测试脚本
 */

export interface ScriptExecutionContext {
  response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
    json(): any;
    text(): string;
  };
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
  };
  variables?: Record<string, string>;
}

export interface ScriptExecutionResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

/**
 * 执行测试脚本
 * @param script JavaScript脚本代码
 * @param context 执行上下文
 * @param testName 测试名称
 * @returns 执行结果
 */
export function executeScript(
  script: string,
  context: ScriptExecutionContext,
  testName: string
): ScriptExecutionResult {
  const startTime = Date.now();
  
  try {
    // 创建沙箱环境
    const sandbox = createSandbox(context);
    
    // 执行脚本
    const result = executeInSandbox(script, sandbox);
    
    const duration = Date.now() - startTime;
    
    return {
      name: testName,
      passed: result === true || result === undefined, // 默认通过，除非明确返回false
      duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      name: testName,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
      duration
    };
  }
}

/**
 * 创建脚本执行沙箱
 */
function createSandbox(context: ScriptExecutionContext) {
  const sandbox = {
    // 响应对象
    response: context.response,
    
    // 请求对象
    request: context.request,
    
    // 断言函数
    expect: (actual: any) => ({
      toBe: (expected: any) => {
        if (actual !== expected) {
          throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
        }
      },
      toEqual: (expected: any) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
        }
      },
      toContain: (expected: any) => {
        if (!String(actual).includes(String(expected))) {
          throw new Error(`Expected "${actual}" to contain "${expected}"`);
        }
      },
      toBeGreaterThan: (expected: number) => {
        if (actual <= expected) {
          throw new Error(`Expected ${actual} to be greater than ${expected}`);
        }
      },
      toBeLessThan: (expected: number) => {
        if (actual >= expected) {
          throw new Error(`Expected ${actual} to be less than ${expected}`);
        }
      },
      toBeTruthy: () => {
        if (!actual) {
          throw new Error(`Expected ${JSON.stringify(actual)} to be truthy`);
        }
      },
      toBeFalsy: () => {
        if (actual) {
          throw new Error(`Expected ${JSON.stringify(actual)} to be falsy`);
        }
      }
    }),
    
    // 简单断言函数（兼容性）
    assert: (condition: boolean, message?: string) => {
      if (!condition) {
        throw new Error(message || 'Assertion failed');
      }
    },
    
    // 测试函数
    test: (name: string, fn: () => void) => {
      try {
        fn();
        return true;
      } catch (error) {
        throw error;
      }
    },
    
    // 控制台对象（受限）
    console: {
      log: (...args: any[]) => console.log('[Script]', ...args),
      error: (...args: any[]) => console.error('[Script]', ...args),
      warn: (...args: any[]) => console.warn('[Script]', ...args)
    },
    
    // JSON对象
    JSON: JSON,
    
    // 数学对象
    Math: Math,
    
    // 时间对象
    Date: Date,
    
    // 正则表达式
    RegExp: RegExp
  };
  
  return sandbox;
}

/**
 * 在沙箱中执行脚本
 */
function executeInSandbox(script: string, sandbox: any): any {
  // 创建函数包装器
  const func = new Function(...Object.keys(sandbox), script);
  
  // 执行脚本
  return func(...Object.values(sandbox));
}

/**
 * 批量执行测试脚本
 */
export function executeTestScripts(
  tests: Array<{ name: string; script: string; enabled: boolean }>,
  context: ScriptExecutionContext
): ScriptExecutionResult[] {
  const results: ScriptExecutionResult[] = [];
  
  for (const test of tests) {
    if (!test.enabled) {
      continue;
    }
    
    const result = executeScript(test.script, context, test.name);
    results.push(result);
  }
  
  return results;
}
