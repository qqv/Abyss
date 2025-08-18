/**
 * 测试脚本执行服务
 * 提供统一的测试脚本执行环境，与 ResponseViewer 保持一致
 */

// 脚本测试结果接口
export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  executionTime?: number;
  tests?: Record<string, boolean>;
}

// 测试脚本接口
export interface TestScript {
  name: string;
  script: string;
  enabled: boolean;
}

/**
 * 清理测试脚本，解决嵌套问题和语法错误
 */
function cleanScript(script: string): string {
  if (!script) return '';
  
  try {
    // 移除可能的换行符和多余空格
    let cleaned = script.trim();
    
    // 移除可能的多层嵌套引号
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1);
    }
    if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
      cleaned = cleaned.slice(1, -1);
    }
    
    // 解码可能的转义字符
    cleaned = cleaned.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\'/g, "'");
    
    return cleaned;
  } catch (error) {
    console.error('清理脚本失败:', error);
    return script;
  }
}

/**
 * 定义_checkJsonIncludes函数
 */
function checkJsonIncludes(json: any, expected: any): boolean {
  // 简单实现检查JSON包含关系
  if (typeof expected !== 'object') {
    return json === expected;
  }
  
  if (Array.isArray(expected)) {
    return expected.every(item => 
      Array.isArray(json) && json.some(jsonItem => 
        checkJsonIncludes(jsonItem, item)
      )
    );
  }
  
  return Object.keys(expected).every(key => 
    json && key in json && checkJsonIncludes(json[key], expected[key])
  );
}

/**
 * 执行单个测试脚本
 */
export function executeTestScript(
  test: TestScript,
  response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    data: any;
  }
): TestResult {
  if (!test.enabled) {
    return {
      name: test.name,
      passed: false,
      error: '测试脚本已禁用'
    };
  }
  
  try {
    console.log('开始执行测试脚本:', test.name);
    
    const startTime = performance.now();
    
    // 预处理脚本 - 先清理嵌套结构
    let processedScript = cleanScript(test.script);
    
    // 如果脚本不包含pm.调用，则包装在pm.test中
    if (!processedScript.includes('pm.')) {
      processedScript = `pm.test("${test.name}", function() {\n${processedScript}\n});`;
    }
    
    console.log('处理后的脚本:', processedScript);
    
    // 首先定义函数以避免循环引用
    const tests: Record<string, boolean> = {};
    
    // 定义test函数
    const testFunction = (name: string, fn: () => void) => {
      try {
        console.log(`🧪 开始执行测试: ${name}`);
        fn();
        tests[name] = true;
        console.log(`✅ 测试 "${name}" 通过`);
      } catch (error) {
        tests[name] = false;
        console.log(`❌ 测试 "${name}" 失败:`, error);
      }
      console.log(`🔍 当前 tests 对象状态:`, tests);
    };
    
    // 创建测试环境上下文
    const testContext = {
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        body: response.data,
      },
      tests: tests,
      test: testFunction,
      expect: (actual: any) => ({
        toBe: (expected: any) => {
          if (actual !== expected) throw new Error(`Expected ${expected} but got ${actual}`);
          return true;
        },
        toEqual: (expected: any) => {
          if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
          }
          return true;
        },
        toContain: (expected: any) => {
          if (!actual.includes(expected)) {
            throw new Error(`Expected ${actual} to contain ${expected}`);
          }
          return true;
        },
      }),
      // 添加完整的pm对象以兼容Postman脚本
      pm: {
        // 添加response对象
        response: {
          json: () => {
            try {
              // 如果response.data是对象，直接返回
              if (typeof response.data === 'object' && response.data !== null) {
                return response.data;
              }
              
              // 如果是字符串，尝试解析
              if (typeof response.data === 'string') {
                // 检查是否为空字符串
                if (response.data.trim() === '') {
                  console.warn('响应体为空字符串，返回空对象');
                  return {};
                }
                
                // 检查是否以错误信息开头（如"dial tcp", "connect ECONNREFUSED"等）
                const errorPatterns = ['dial tcp', 'connect ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'Error:', '代理请求异常:', '代理请求失败'];
                const isErrorMessage = errorPatterns.some(pattern => response.data.includes(pattern));
                
                if (isErrorMessage) {
                  console.warn('检测到错误信息而非JSON数据:', response.data.substring(0, 100) + '...');
                  return { error: response.data };
                }
                
                return JSON.parse(response.data);
              }
              
              // 其他情况返回空对象
              console.warn('无法解析的响应数据类型:', typeof response.data);
              return {};
            } catch (e) {
              console.error('解析JSON响应失败:', e);
              console.error('原始响应数据:', response.data);
              // 返回包含原始数据的对象，避免测试脚本完全失败
              return { 
                _parseError: true, 
                _rawData: response.data,
                error: `JSON解析失败: ${e instanceof Error ? e.message : String(e)}`
              };
            }
          },
          text: () => response.data,
          status: response.status,
          headers: response.headers,
          to: {
            have: {
              status: (code: number) => {
                if (response.status !== code) {
                  throw new Error(`期望状态码 ${code} 但实际得到 ${response.status}`);
                }
                return true;
              },
              header: (name: string, value?: string) => {
                const headerValue = response.headers[name.toLowerCase()];
                if (headerValue === undefined) {
                  throw new Error(`期望头部 ${name} 但不存在`);
                }
                if (value !== undefined && headerValue !== value) {
                  throw new Error(`期望头部 ${name} 为 ${value} 但实际得到 ${headerValue}`);
                }
                return true;
              },
              jsonBody: () => {
                try {
                  if (typeof response.data === 'object') return true;
                  JSON.parse(response.data);
                  return true;
                } catch (e) {
                  throw new Error('响应不是有效的JSON');
                }
              }
            },
            include: {
              jsonBody: (expected: any) => {
                const json = typeof response.data === 'object' ? response.data : JSON.parse(response.data);
                const matches = checkJsonIncludes(json, expected);
                if (!matches) {
                  throw new Error(`响应JSON不包含期望的值`);
                }
                return true;
              }
            }
          }
        },
        // 添加test方法
        test: testFunction,
        // 添加expect方法
        expect: (actual: any) => {
          return {
            to: {
              eql: (expected: any) => {
                if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                  throw new Error(`期望 ${JSON.stringify(expected)} 但实际得到 ${JSON.stringify(actual)}`);
                }
                return true;
              },
              equal: (expected: any) => {
                if (actual !== expected) {
                  throw new Error(`期望 ${expected} 但实际得到 ${actual}`);
                }
                return true;
              }
            }
          };
        },
        // 添加tests对象
        tests: tests
      }
    };
    
    // 执行测试脚本
    const scriptWithContext = `
      (function(context) { 
        try {
          const response = context.response;
          const tests = context.tests;
          const test = context.test;
          const expect = context.expect;
          const pm = context.pm;
          
          ${processedScript}
          
          return { tests: context.tests, error: null };
        } catch (error) {
          return { tests: context.tests, error: error?.message || error || '未知错误' };
        }
      })(arguments[0]);
    `;
    
    // console.log('🚀 执行脚本前 tests 对象状态:', tests);
    const result = new Function(scriptWithContext)(testContext);
    //console.log('🏁 执行脚本后 tests 对象状态:', tests);
    //console.log('🏁 执行脚本后 testContext.tests 状态:', testContext.tests);
    
    const endTime = performance.now();
    const executionTime = Math.round(endTime - startTime);
    
    // 判断测试是否通过
    // 直接使用 testContext.tests，因为它已经正确记录了测试结果
    //console.log('🔍 executeTestScript 调试 - result对象:', result);
    //console.log('🔍 executeTestScript 调试 - testContext.tests对象:', testContext.tests);
    
    // 使用 testContext.tests 而不是 result?.tests，因为 testContext.tests 已正确更新
    const resultTests = testContext.tests || {};
    //console.log('🔍 executeTestScript 调试 - 使用的resultTests对象:', resultTests);
    
    const allTestsPassed = Object.values(resultTests).every(passed => passed);
    const hasAnyTest = Object.keys(resultTests).length > 0;
    //console.log('🔍 executeTestScript 调试 - allTestsPassed:', allTestsPassed, 'hasAnyTest:', hasAnyTest);
    
    // 修复测试结果判断逻辑:
    // 1. 如果有测试，那么只有全部通过才算通过
    // 2. 如果没有测试但有错误，则不通过
    // 3. 如果既没有测试也没有错误，则通过（视为检查通过）
    const passed = hasAnyTest ? allTestsPassed : (result?.error ? false : true);
    
    //console.log('🎯 最终测试结果 - passed:', passed, 'hasAnyTest:', hasAnyTest, 'allTestsPassed:', allTestsPassed);
    
    return {
      name: test.name,
      passed: passed,
      error: result?.error,
      executionTime,
      tests: resultTests // 添加 tests 对象
    };
    
  } catch (error: any) {
    console.error('执行测试脚本失败:', test.name, error);
    return {
      name: test.name,
      passed: false,
      error: error.message || '执行脚本时发生未知错误',
      executionTime: 0
    };
  }
}

/**
 * 执行多个测试脚本
 */
export function executeTestScripts(
  tests: TestScript[],
  response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    data: any;
  }
): TestResult[] {
  const enabledTests = tests.filter(test => test.enabled);
  return enabledTests.map(test => executeTestScript(test, response));
}
