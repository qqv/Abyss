import { NextResponse } from 'next/server';
import { LogMiddleware } from '@/lib/log-middleware';

// 定义测试结果类型
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

// 测试脚本执行环境 - 直接复制实现，避免导入问题
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
    } catch (error: any) {
      console.error('执行测试脚本失败:', error);
      
      return {
        name,
        passed: false,
        error: error.message || '测试脚本执行失败',
        duration: Date.now() - this.startTime
      };
    }
  }
}

// 配置路由为动态模式
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * 执行测试脚本API端点
 * 
 * 接收包含响应数据和测试脚本的请求，执行测试并返回结果
 */
export async function POST(request: Request) {
  const startTime = Date.now();
  let scriptsCount = 0;
  let responseInfo = null;

  try {
    // 解析请求数据
    const { response, scripts } = await request.json();
    
    scriptsCount = scripts?.length || 0;
    responseInfo = response ? {
      status: response.status,
      url: response.url,
      method: response.method
    } : null;
    
    if (!response) {
      await LogMiddleware.logWarning('api', '测试执行失败：缺少响应数据', {
        action: 'test_execute',
        error: '缺少必要参数: response'
      });
      
      return NextResponse.json(
        { error: '缺少必要参数: response' },
        { status: 400 }
      );
    }
    
    if (!scripts || !Array.isArray(scripts) || scripts.length === 0) {
      await LogMiddleware.logWarning('api', '测试执行失败：缺少测试脚本', {
        action: 'test_execute',
        error: '缺少必要参数: scripts',
        response_info: responseInfo
      });
      
      return NextResponse.json(
        { error: '缺少必要参数: scripts（必须是非空数组）' },
        { status: 400 }
      );
    }
    
    // 记录测试执行开始
    await LogMiddleware.logInfo('api', `开始执行测试：${scripts.length} 个测试脚本`, {
      action: 'test_execute_start',
      scripts_count: scripts.length,
      response_info: responseInfo,
      request_url: response.url,
      request_method: response.method,
      response_status: response.status
    });
    
    console.log(`执行 ${scripts.length} 个测试脚本...`);
    
    // 创建Postman脚本执行环境
    const executor = new PostmanScriptExecutor(response);
    
    // 执行每个测试脚本
    const testResults = scripts
      .filter(test => test.enabled !== false)
      .map(test => {
        console.log(`执行测试: ${test.name}`);
        try {
          // 如果脚本中包含嵌套的pm.test调用，做基本处理
          let script = test.script;
          if (script.includes('pm.test(') && script.includes('function')) {
            // 简单去除可能的嵌套问题
            const pmTestRegex = /pm\.test\s*\(\s*(['"])([^'"]*)(\1)\s*,\s*function\s*\(\s*\)\s*\{([\s\S]*?)\}\s*\)/;
            const match = script.match(pmTestRegex);
            if (match) {
              script = `pm.test(${match[1]}${match[2]}${match[3]}, function() {${match[4]}})`;  
            }
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
    const allTestsPassed = testResults.length > 0 ? testResults.every(result => result.passed) : null;
    const duration = Date.now() - startTime;
    const passedCount = testResults.filter(r => r.passed).length;
    const failedCount = testResults.filter(r => !r.passed).length;
    
    console.log(
      `测试执行结果: 总共 ${testResults.length} 个测试, ` + 
      `通过 ${passedCount} 个, ` + 
      `失败 ${failedCount} 个`
    );
    
    // 记录测试执行结果
    const logLevel = allTestsPassed ? 'info' : failedCount > 0 ? 'warn' : 'info';
    const message = `测试执行完成：${passedCount}/${testResults.length} 通过 (${duration}ms)`;
    
    await LogMiddleware.logInfo('api', message, {
      action: 'test_execute_complete',
      duration,
      total_tests: testResults.length,
      passed_tests: passedCount,
      failed_tests: failedCount,
      all_passed: allTestsPassed,
      response_info: responseInfo,
      test_results: testResults.map(r => ({
        name: r.name,
        passed: r.passed,
        duration: r.duration,
        error: r.error
      }))
    });
    
    // 返回测试结果
    return NextResponse.json({
      testResults,
      allTestsPassed
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    // 记录异常错误
    await LogMiddleware.logError('api', `测试执行异常：${error.message}`, {
      action: 'test_execute_exception',
      duration,
      scripts_count: scriptsCount,
      response_info: responseInfo,
      error: error.message,
      stack: error.stack
    });
    
    console.error('执行测试脚本失败:', error);
    
    return NextResponse.json(
      { 
        error: error.message || '执行测试脚本失败',
        testResults: [],
        allTestsPassed: false
      },
      { status: 500 }
    );
  }
}
