/**
 * API请求代理服务
 * 用于转发HTTP请求，避免浏览器跨域限制
 * 并支持执行测试脚本来验证响应
 */
import { NextRequest, NextResponse } from 'next/server';

// 定义测试结果类型
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

// 测试脚本执行环境
class PostmanScriptExecutor {
  private response: any;
  private tests: Record<string, boolean> = {};
  private startTime: number;

  constructor(response: any) {
    this.response = response;
    this.startTime = Date.now();
  }

  // 模拟Postman的pm对象
  get pm() {
    return {
      response: {
        json: () => {
          return typeof this.response.body === 'string' 
            ? JSON.parse(this.response.body) 
            : this.response.body;
        },
        to: {
          have: {
            status: (code: number) => {
              return this.response.status === code;
            },
            header: (name: string) => {
              return Object.keys(this.response.headers || {}).some(
                key => key.toLowerCase() === name.toLowerCase()
              );
            }
          },
          be: {
            json: () => {
              try {
                if (typeof this.response.body === 'string') {
                  JSON.parse(this.response.body);
                }
                return true;
              } catch (e) {
                return false;
              }
            }
          }
        }
      },
      test: (name: string, fn: () => void) => {
        try {
          fn();
          this.tests[name] = true;
        } catch (e) {
          this.tests[name] = false;
          console.error(`测试"${name}"失败:`, e);
        }
      },
      expect: (actual: any) => ({
        to: {
          eql: (expected: any) => {
            if (actual !== expected) {
              throw new Error(`预期 ${expected} 但得到 ${actual}`);
            }
            return true;
          },
          equal: (expected: any) => {
            if (actual !== expected) {
              throw new Error(`预期 ${expected} 但得到 ${actual}`);
            }
            return true;
          },
          include: (expected: any) => {
            if (!actual.includes(expected)) {
              throw new Error(`预期包含 ${expected}`);
            }
            return true;
          }
        }
      }),
    };
  }

  // 执行测试脚本
  executeScript(script: string, name: string): TestResult {
    try {
      // 初始化测试环境
      this.tests = {};
      
      // 创建Postman环境上下文
      const context = {
        pm: this.pm,
        tests: this.tests,  // 确保tests对象可用
        // 其他Postman可能用到的全局对象
        console: console,
        JSON: JSON,
        Date: Date,
        Math: Math,
        String: String,
        Number: Number,
        Boolean: Boolean,
        Array: Array,
        Object: Object,
        RegExp: RegExp,
        Error: Error
      };
      
      // 将脚本包装在一个函数中执行，提供完整的上下文
      const wrappedScript = `
        with (context) {
          try {
            ${script}
          } catch (e) {
            console.error('Script execution error:', e);
            throw e;
          }
        }
      `;
      
      // 安全地执行脚本
      const scriptFunction = new Function('context', wrappedScript);
      scriptFunction(context);
      
      const duration = Date.now() - this.startTime;
      const passed = Object.values(this.tests).length > 0 
        ? Object.values(this.tests).every(result => result === true)
        : false;  // 如果没有测试结果，认为失败
      
      console.log('测试结果:', this.tests);
      
      return {
        name,
        passed,
        duration
      };
    } catch (e: any) {
      console.error('执行脚本出错:', e);
      return {
        name,
        passed: false,
        error: e.message,
        duration: Date.now() - this.startTime
      };
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const requestData = await request.json();
    const { url, method, headers, body, timeout, tests } = requestData;
    
    // 记录是否有测试脚本
    const hasTests = Array.isArray(tests) && tests.length > 0;
    if (hasTests) {
      console.log(`代理请求包含 ${tests.length} 个测试脚本`);
    }
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' }, 
        { status: 400 }
      );
    }
    
    console.log(`代理请求: ${method || 'GET'} ${url}`);
    
    // 处理认证头和敏感头部
    const safeHeaders: Record<string, string> = {};
    if (headers) {
      // 混合大小写处理，防止重复头部
      const normalizedHeaders: Record<string, string> = {};
      
      // 先标准化头部名称
      Object.keys(headers).forEach(key => {
        const lowerKey = key.toLowerCase();
        normalizedHeaders[lowerKey] = headers[key];
      });
      
      // 复制头部到安全版本
      Object.keys(normalizedHeaders).forEach(key => {
        // 确保认证头部被正确处理
        safeHeaders[key] = normalizedHeaders[key];
      });
    }
    
    // 构建fetch选项
    const fetchOptions: RequestInit = {
      method: method || 'GET',
      headers: safeHeaders,
      // 只有在非GET/HEAD请求且body非空时添加body
      ...(method && method !== 'GET' && method !== 'HEAD' && body ? { body } : {}),
      // 添加超时处理
      signal: timeout ? AbortSignal.timeout(timeout) : undefined,
      // 允许发送跨域请求认证凭证
      credentials: 'include'
    };
    
    // 发送请求
    const response = await fetch(url, fetchOptions);
    
    // 读取响应体
    let responseBody;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      responseBody = await response.json();
    } else {
      responseBody = await response.text();
    }
    
    // 构建响应头
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    
    // 准备响应对象
    const responseObj = {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseBody,
      url: response.url,
      redirected: response.redirected,
      type: response.type,
      ok: response.ok,
    };
    
    // 如果有测试脚本，执行测试
    let testResults: TestResult[] = [];
    let allTestsPassed: boolean | null = null;
    
    if (Array.isArray(tests) && tests.length > 0) {
      console.log(`正在执行 ${tests.length} 个测试脚本...`);
      
      // 创建Postman脚本执行环境
      const executor = new PostmanScriptExecutor(responseObj);
      
      // 执行每个测试脚本
      testResults = tests
        .filter(test => test.enabled !== false)
        .map(test => {
          console.log(`执行测试: ${test.name}`);
          try {
            // 获取脚本内容，确保非空
            let script = test.script || '';
            console.log(`原始脚本内容: ${script.substring(0, 100)}${script.length > 100 ? '...' : ''}`);
            
            // 检查是否已经是pm.test格式
            if (script.includes('pm.test(') && script.includes('function')) {
              console.log('脚本已包含pm.test格式，进行格式检查');
              
              // 处理可能存在的嵌套pm.test问题
              const pmTestRegex = /pm\.test\s*\(\s*(['"])([^'"]*)(\1)\s*,\s*function\s*\(\s*\)\s*\{([\s\S]*?)\}\s*\)/;
              const match = script.match(pmTestRegex);
              if (match) {
                // 提取测试名称和测试体
                const testName = match[2];
                const testBody = match[4];
                // 重新构建标准格式的pm.test
                script = `pm.test(${match[1]}${testName}${match[3]}, function() {${testBody}});`;
                console.log(`重构了测试脚本格式: ${script.substring(0, 100)}${script.length > 100 ? '...' : ''}`);
              }
            } else if (script.trim()) {
              // 如果脚本不包含pm.test但有内容，则包装为pm.test
              console.log('脚本不是pm.test格式，包装为标准格式');
              script = `pm.test("${test.name || 'API Test'}", function() {${script}});`;
              console.log(`包装后的脚本: ${script.substring(0, 100)}${script.length > 100 ? '...' : ''}`);
            }
            
            return executor.executeScript(script, test.name);
          } catch (error: any) {
            return {
              name: test.name,
              passed: false,
              error: error.message || '测试执行失败',
              duration: 0
            };
          }
        });
      
      // 计算所有测试是否通过
      allTestsPassed = testResults.length > 0 ? testResults.every(result => result.passed) : null;
      
      console.log(
        `测试执行结果: 总共 ${testResults.length} 个测试, ` + 
        `通过 ${testResults.filter(r => r.passed).length} 个, ` + 
        `失败 ${testResults.filter(r => !r.passed).length} 个`
      );
    }
    
    // 返回结果以及测试结果
    // 添加返回测试结果的日志
    console.log('添加测试结果到响应中:', {
      testResults: testResults.length > 0 ? testResults : undefined,
      allTestsPassed
    });
    
    const finalResponse = {
      ...responseObj,
      testResults: testResults.length > 0 ? testResults : undefined,
      allTestsPassed
    };
    
    // 确保测试结果被包含在响应中
    console.log('完整的响应数据:', JSON.stringify(finalResponse, null, 2));
    
    return NextResponse.json(finalResponse);
  } catch (error: any) {
    console.error('代理请求失败:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Proxy request failed',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, 
      { status: 500 }
    );
  }
}
