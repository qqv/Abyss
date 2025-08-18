"use client";

import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Clock, FileJson, Globe, Save, FileCode, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { executeTests, TestExecutionResult } from '@/components/services/test-service';
import { useTranslation } from 'react-i18next';

interface ResponseViewerProps {
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    data: any;
    time?: number;
    size?: string;
    // 添加后端测试结果属性
    testResults?: {
      name: string;
      passed: boolean;
      error?: string;
      duration?: number;
    }[];
    allTestsPassed?: boolean | null;
  };
  isLoading?: boolean;
  onCancelRequest?: () => void;
  tests?: {
    name: string;
    script: string;
    enabled: boolean;
  }[];
  preRequest?: {
    script: string;
    enabled: boolean;
  };
}

// 脚本测试结果接口
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  executionTime?: number;
}

export function ResponseViewer({ response, isLoading, onCancelRequest, tests = [], preRequest }: ResponseViewerProps) {
  const { t } = useTranslation('common');
  // 状态变量声明
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [allTestsPassed, setAllTestsPassed] = useState<boolean | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  
  // 当响应变化时，自动执行测试脚本并显示结果
  useEffect(() => {
    // 首先重置测试结果
    setTestResults([]);
    setAllTestsPassed(null);
    
    // 输出测试脚本信息便于调试
    console.log('当前测试脚本数量:', tests?.length || 0);
    if (tests?.length) {
      console.log('测试脚本示例:', tests[0]);
    }
    
    if (response) {
      console.log('收到API响应，开始处理测试逻辑');
      
      // 检查响应中是否包含测试结果
      if (response.testResults && response.testResults.length > 0) {
        console.log('从API响应中获取测试结果:', response.testResults);
        
        // 直接使用后端返回的测试结果
        const mappedResults = response.testResults.map((result: any) => ({
          name: result.name,
          passed: result.passed,
          error: result.error,
          executionTime: result.duration
        }));
        
        // 设置测试结果和通过状态
        setTestResults(mappedResults);
        const allPassed = mappedResults.every(r => r.passed);
        setAllTestsPassed(allPassed);
        
        // 自动切换到脚本标签页
        console.log('检测到测试结果，自动切换到脚本标签页');
        setActiveTab("script");
      } else {
        // 无论如何，只要有响应且有测试脚本，就自动执行测试
        if (tests && tests.length > 0) {
          console.log('收到API响应，自动执行测试脚本:', tests.length, '个脚本');
          // 使用短暂延迟确保响应已完全处理
          setTimeout(() => {
            runAllTests();
            // 运行完测试后自动切换到脚本标签页
            setActiveTab("script");
          }, 100); 
        } else {
          console.log('没有可用的测试脚本，跳过自动测试执行');
        }
      }
      
      // 如果响应中有allTestsPassed属性，使用它
      if (response.allTestsPassed !== undefined) {
        setAllTestsPassed(response.allTestsPassed);
      }
      
      // 记录状态信息
      console.log('当前测试结果:', testResults);
      console.log('当前前端测试脚本名称:', tests.map(t => t.name));
      console.log('当前所有测试通过状态:', response.allTestsPassed);
    }
  }, [response, tests]);
  
  // 清理测试脚本，解决嵌套问题和语法错误
  const cleanScript = (script: string): string => {
    if (!script) return '';
    
    // 输出原始脚本便于调试
    console.log('测试脚本处理 - 原始脚本:', script.substring(0, 100) + (script.length > 100 ? '...' : ''));
    
    try {
      // 如果脚本包含嵌套的pm.test，尝试提取最内层的完整pm.test调用
      if (script.includes('pm.test(') && script.includes('function')) {
        // 尝试修复可能存在的格式问题
        console.log('检测到当前脚本可能存在格式问题，尝试通用解析方法');
        
        // 正则表达式匹配第一个完整的pm.test块
        const testBlockRegex = /pm\.test\s*\(\s*(['"])([^'"]*)\1\s*,\s*function\s*\([^\)]*\)\s*\{([\s\S]*?)\}\s*\);?/;
        const match = script.match(testBlockRegex);
        
        if (match && match[1] && match[2] && match[3]) {
          console.log('找到有效的测试块, 测试名称:', match[2]);
          // 构建标准格式的测试脚本
          return `pm.test(${match[1]}${match[2]}${match[1]}, function() {${match[3]}});`;
        }
        
        // 对于其他脚本，尝试更通用的方法
        try {
          // 尝试找到第一个完整的pm.test
          const testRegex = /pm\.test\s*\(\s*(['"])([^'"]+)\1\s*,\s*function\s*\([^\)]*\)\s*\{([\s\S]*?)\}\s*\)/;
          const match = script.match(testRegex);
          
          if (match && match[1] && match[2] && match[3]) {
            console.log('成功提取到测试块');
            // 重新构建测试脚本，确保格式正确
            return `pm.test(${match[1]}${match[2]}${match[1]}, function() {${match[3]}});`;
          }
        } catch (e) {
          console.error('提取脚本块时出错:', e);
        }
        
        // 然后检查是否是完整有效的pm.test结构
        const validPmTestRegex = /^\s*pm\.test\s*\(\s*(['"])([^'"]*)\1\s*,\s*function\s*\(\s*\)\s*\{[\s\S]*\}\s*\)\s*;?\s*$/;
        if (validPmTestRegex.test(script)) {
          console.log('脚本是完整有效的pm.test格式，无需处理');
          return script;
        }
        
        // 如果脚本包含嵌套的pm.test，尝试提取最内层的完整pm.test调用
        const pmTestRegex = /pm\.test\s*\(\s*(['"])([^'"]*)\1\s*,\s*function\s*\(\s*\)\s*\{([\s\S]*?)\}\s*\)/g;
        const allMatches = [...script.matchAll(pmTestRegex)];
        
        if (allMatches.length > 0) {
          // 取第一个完整的pm.test调用（最内层的）
          const firstMatch = allMatches[0];
          if (firstMatch && firstMatch[2] && firstMatch[3]) {
            const testName = firstMatch[2];
            const testBody = firstMatch[3];
            
            // 构建并返回正确的测试脚本
            const fixedScript = `pm.test("${testName}", function() {${testBody}});`;
            console.log('提取并修复了嵌套的pm.test脚本:', fixedScript);
            return fixedScript;
          }
        }
        
        // 如果无法提取完整的pm.test，尝试识别测试名称和函数体的片段
        const nameMatch = script.match(/pm\.test\s*\(\s*(['"])([^'"]*)\1/);  
        const bodyMatch = script.match(/\{([\s\S]*?)\}\s*\)/);  

        if (nameMatch && nameMatch[2] && bodyMatch && bodyMatch[1]) {
          const testName = nameMatch[2];
          const testBody = bodyMatch[1].trim();
          
          // 构建并返回修复后的脚本
          const fixedScript = `pm.test("${testName}", function() {${testBody}});`;
          console.log('通过分析修复了测试脚本:', fixedScript);
          return fixedScript;
        }
      }
      
      // 如果脚本是一个纯函数体内容，不包含pm.test调用
      if (!script.includes('pm.test') && script.trim()) {
        return script; // 原样返回，让外部包装
      }
    } catch (error) {
      console.error('处理脚本时出错:', error);
    }
    
    // 如果所有处理都失败，返回原始脚本
    return script;
  };

  // 执行单个测试脚本
  const executeTest = (test: { name: string; script: string; enabled: boolean }) => {
    if (!response || !test.enabled) return;
    
    try {
      console.log('开始执行测试脚本:', test.name);
      console.log('原始脚本内容:', test.script);
      
      const startTime = performance.now();
      
      // 预处理脚本 - 先清理嵌套结构
      let processedScript = cleanScript(test.script);
      
      // 如果脚本不包含pm.调用，则包装在pm.test中
      if (!processedScript.includes('pm.')) {
        processedScript = `pm.test("${test.name}", function() {\n${processedScript}\n});`;
      }
      
      console.log('处理后的脚本:', processedScript);
      
      // 日志显示当前响应数据
      console.log('当前响应数据:', response.data);
      
      // 如果脚本是Postman格式的(包含pm.调用)，则保持原样
      // 否则，将其包裹在pm.test中以兼容可能的纯 JavaScript 代码
      if (!processedScript.includes('pm.')) {
        processedScript = `pm.test("${test.name}", function() {\n${processedScript}\n});`;
      }
      
      // 清理脚本中可能的语法问题
      processedScript = cleanScript(processedScript);
      
      console.log('处理后的脚本:', processedScript);
      
      // 首先定义函数以避免循环引用
      const tests: Record<string, boolean> = {};
      
      // 定义test函数
      const testFunction = (name: string, fn: () => void) => {
        try {
          fn();
          tests[name] = true;
        } catch (error) {
          tests[name] = false;
        }
      };
      
      // 定义_checkJsonIncludes函数
      const checkJsonIncludes = (json: any, expected: any): boolean => {
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
      };
      
      // 创建测试环境上下文
      const testContext: {
        response: {
          status: number;
          statusText: string;
          headers: Record<string, string>;
          body: any;
        },
        tests: Record<string, boolean>;
        test: (name: string, fn: () => void) => void;
        expect: (actual: any) => any;
        pm: any; // 添加pm对象以兼容Postman脚本
      } = {
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
                return typeof response.data === 'object' ? response.data : JSON.parse(response.data);
              } catch (e) {
                console.error('解析JSON响应失败:', e);
                return {};
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
      
      // 添加pm对象的各种方法
      testContext.pm = {
        response: {
          json: () => {
            try {
              return typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
            } catch (e) {
              throw new Error('Invalid JSON response');
            }
          },
          status: response.status,
          headers: response.headers,
          to: {
            have: {
              status: (code: number) => {
                if (response.status !== code) {
                  throw new Error(`Expected status ${code} but got ${response.status}`);
                }
                return true;
              },
              header: (name: string) => {
                const hasHeader = Object.keys(response.headers).some(
                  key => key.toLowerCase() === name.toLowerCase()
                );
                if (!hasHeader) {
                  throw new Error(`Expected header ${name} to exist`);
                }
                return true;
              }
            }
          }
        },
        test: testContext.test,
        expect: testContext.expect
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
            return { tests: context.tests, error: error.message };
          }
        })(arguments[0]);
      `;
      
      // 执行脚本
      const result = new Function(scriptWithContext)(testContext);
      const endTime = performance.now();
      const executionTime = Math.round(endTime - startTime);
      
      // 判断测试是否通过
      const testNames = Object.keys(result.tests);
      const allPassed = testNames.length > 0 && testNames.every(name => result.tests[name]);
      
      // 更新测试结果
      const testResult: TestResult = {
        name: test.name,
        passed: allPassed,
        error: result.error || (!allPassed ? '测试断言失败' : undefined),
        executionTime,
      };
      
      setTestResults(prev => {
        const filtered = prev.filter(r => r.name !== test.name);
        return [...filtered, testResult];
      });
      
      return testResult;
    } catch (error) {
      // 处理执行异常
      const testResult: TestResult = {
        name: test.name,
        passed: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
      
      setTestResults(prev => {
        const filtered = prev.filter(r => r.name !== test.name);
        return [...filtered, testResult];
      });
      
      return testResult;
    }
  };
  
  // 执行所有测试
  const runAllTests = async () => {
    if (!response) return;
    
    setIsRunningTests(true);
    setTestResults([]);
    
    try {
      console.log('自动执行测试并调用测试API');
      // 使用test-service中的executeTests函数调用/api/v1/tests/execute
      const testResult = await executeTests(
        {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          data: response.data,
          body: response.data
        },
        tests
      );
      
      console.log('测试API返回结果:', testResult);
      
      // 设置测试结果
      if (testResult.testResults && testResult.testResults.length > 0) {
        const mappedResults = testResult.testResults.map(result => ({
          name: result.name,
          passed: result.passed,
          error: result.error,
          executionTime: result.duration
        }));
        
        setTestResults(mappedResults);
        setAllTestsPassed(testResult.allTestsPassed);
      }
    } catch (error) {
      console.error('执行测试时出错:', error);
      // 如果远程测试执行失败，回退到本地执行
      const enabledTests = tests.filter(test => test.enabled);
      const results: TestResult[] = [];
      
      for (const test of enabledTests) {
        const result = executeTest(test);
        if (result) results.push(result);
        // 添加小延迟，避免浏览器冻结
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      setTestResults(results);
      setAllTestsPassed(results.every(r => r.passed));
    } finally {
      setIsRunningTests(false);
    }
  };
  
  // 使用useRef确保标签页状态在组件渲染周期内一致
  const initialTabRef = useRef("body");
  const [activeTab, setActiveTab] = useState(initialTabRef.current);
  const [isProcessingScripts, setIsProcessingScripts] = useState(false);
  
  // 测试结果变化时自动切换到脚本标签页
  useEffect(() => {
    if (testResults.length > 0) {
      console.log('检测到测试结果已更新，切换到脚本标签页');
      setActiveTab("script");
    }
  }, [testResults]);
  
  // 处理加载状态和自动切换到测试结果标签页
  useEffect(() => {
    // 请求开始时，设置脚本处理状态
    if (isLoading && tests && tests.some(t => t.enabled)) {
      setIsProcessingScripts(true);
      console.log('正在发送请求，存在测试脚本将被执行');
      console.log('当前启用的测试脚本:', tests.filter(t => t.enabled).map(t => t.name));
    }
    
    // 请求完成时
    if (!isLoading && response) {
      console.log('请求完成，响应对象:', response);
      
      // 对整个响应对象进行详细输出，方便调试
      console.log('响应对象类型:', typeof response);
      console.log('响应对象属性:', Object.keys(response));
      console.log('响应对象完整数据:', JSON.stringify(response, null, 2));
      
      // 适配实际收到的API响应结构
      // 检查是否存在测试脚本
      const hasScripts = tests && tests.length > 0 && tests.some(t => t.enabled);
      
      // 在控制台显示脚本信息
      if (hasScripts) {
        console.log('当前测试脚本:', tests.filter(t => t.enabled).map(t => t.name));
      }
      
      // 安全处理响应数据
      let responseData: any = null;
      try {
        responseData = typeof response.data === 'string' && response.data.trim().startsWith('{') ? 
          JSON.parse(response.data) : 
          response.data;
        
        console.log('响应数据内容:', responseData);
      } catch (error) {
        console.log('响应数据解析失败:', error);
      }
      
      // 从响应对象直接获取测试结果
      // 检查测试结果是否存在于响应中
      console.log('检查测试结果是否存在于响应中');
      let testResultsData = null;
      
      // 使用新的测试服务来执行测试脚本
      console.log('检查响应对象和测试脚本');
      
      // 先检查是否已经有测试结果
      if (response.testResults && response.testResults.length > 0) {
        console.log('响应中已包含测试结果:', response.testResults);
        testResultsData = response.testResults;
      } 
      // 如果没有测试结果但有测试脚本，则异步执行测试
      else if (hasScripts && !isLoading) {
        console.log('准备使用测试服务执行测试脚本');
        
        // 转换响应格式以匹配测试API的需求
        const apiResponse = {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          body: typeof response.data === 'string' ? JSON.parse(response.data) : response.data
        };
        
        // 异步执行测试脚本
        const runTests = async () => {
          try {
            // 只对启用的测试脚本进行测试
            const enabledTests = tests.filter(t => t.enabled);
            if (enabledTests.length === 0) return;
            
            console.log('执行测试脚本:', enabledTests.map(t => t.name));
            
            // 调用测试服务
            const results = await executeTests(apiResponse, enabledTests);
            
            if (results.testResults && results.testResults.length > 0) {
              console.log('测试执行完成，获得结果:', results.testResults);
              setTestResults(results.testResults);
              setAllTestsPassed(results.allTestsPassed ?? null);
              setIsProcessingScripts(false);
              // 自动切换到脚本标签页
              setActiveTab("script");
            }
          } catch (error) {
            console.error('测试执行失败:', error);
          }
        };
        
        // 调用测试函数
        runTests();
        
        // 在测试执行期间显示处理中状态
        setIsProcessingScripts(true);
        testResultsData = null; // 等待异步结果
      }
      
      // 如果没有测试结果但有测试脚本，手动生成测试结果
      if (hasScripts && !testResultsData) {
        console.log('尝试根据脚本生成测试结果');
        
        // 检查是否为测试脚本失败的情况
        const enabledTests = tests.filter(t => t.enabled);
        if (enabledTests.length > 0) {
          // 生成测试结果，提示需要手动查看测试详情
          console.log('未在响应中找到测试结果，手动生成');
          const simulatedResults = enabledTests.map(test => ({
            name: test.name,
            passed: false,
            error: '测试结果未能正确从服务器获取，请打开脚本标签页查看详细结果。',
            duration: 100
          }));
          
          testResultsData = simulatedResults;
          console.log('模拟生成的测试结果:', simulatedResults);
        }
      }
      
      const hasTestResults = testResultsData && (
        Array.isArray(testResultsData) ? 
          testResultsData.length > 0 : 
          typeof testResultsData === 'object'
      );
      
      if (hasTestResults) {
        // 确保测试结果是数组
        const testResultsArray = Array.isArray(testResultsData) ? 
          testResultsData : 
          [testResultsData];
          
        console.log('发现测试结果:', testResultsArray);
        
        // 手动设置测试结果
        setTestResults(testResultsArray.map((result: any) => ({
          name: result.name || '未命名测试',
          passed: typeof result.passed === 'boolean' ? result.passed : false,
          error: result.error || undefined,
          executionTime: result.duration || result.executionTime || 0
        })));
        
        const allPassed = testResultsArray.every((result: any) => result.passed);
        setAllTestsPassed(allPassed);
        setIsProcessingScripts(false);
        setActiveTab("script");
        console.log('测试脚本执行完成，切换到脚本标签页');
      } else {
        // 强制显示测试结果 - 直接从测试脚本生成结果
        console.log('未找到测试结果，但存在测试脚本，手动创建测试结果');

        // 检查是否有测试脚本
        if (tests && tests.length > 0 && tests.some(t => t.enabled)) {
          // 如果有测试脚本，生成测试结果
          const testResults = tests
            .filter(t => t.enabled)
            .map(test => ({
              name: test.name,
              passed: false,
              error: '测试脚本已执行，但服务器没有返回结果。请查看控制台日志。',
              executionTime: 100
            }));

          if (testResults.length > 0) {
            // 设置测试结果
            setTestResults(testResults);
            setAllTestsPassed(false);
            setIsProcessingScripts(false);
            setActiveTab("script");
            console.log('手动创建并显示测试结果:', testResults);
          } else {
            // 如果没有测试结果但之前处于加载状态，关闭加载状态
            if (isProcessingScripts) {
              setIsProcessingScripts(false);
              console.log('请求完成，无测试结果');
            }
          }
        } else {
          // 如果没有测试脚本或所有脚本都被禁用
          if (isProcessingScripts) {
            setIsProcessingScripts(false);
            console.log('请求完成，无测试脚本或脚本已禁用');
          }
        }
      }
    }
  }, [isLoading, response, tests, isProcessingScripts]);
  // 状态变量声明已移至组件顶部
  
  // 显示加载状态：请求加载中或脚本处理中
  if (isLoading || isProcessingScripts) {
    return (
      <div className="h-full flex items-center justify-center flex-col p-4 text-center">
        <div className="mb-4 relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          {isProcessingScripts ? (
            <FileCode className="h-6 w-6 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          ) : (
            <Clock className="h-6 w-6 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          )}
        </div>
        <br />
        <p className="mb-4 text-lg">
          {isProcessingScripts ? t('workspace.response.loading.processingScripts', '正在处理测试脚本...') : t('workspace.response.loading.sending', '正在发送请求...')}
        </p>
        {!isProcessingScripts && onCancelRequest && (
          <Button variant="outline" onClick={onCancelRequest} className="mt-2">
            {t('workspace.response.actions.cancel', '取消请求')}
          </Button>
        )}
      </div>
    );
  }
  
  if (!response) {
    return (
      <div className="h-full flex items-center justify-center flex-col p-4 text-center text-muted-foreground">
        <Globe className="h-12 w-12 mb-4 opacity-40" />
        <p>{t('workspace.response.empty', '发送请求后将在此显示响应')}</p>
      </div>
    );
  }
  
  // 根据状态码获取适当的状态颜色和文本
  const getStatusInfo = (status: number, statusText?: string) => {
    // 标准HTTP状态码处理
    if (status > 0) {
      // 成功状态 - 绿色
      if (status >= 200 && status < 300) {
        return { 
          color: "bg-green-600", 
          textColor: "text-white",
          text: status.toString(),
          description: statusText || ''
        };
      }
      
      // 重定向状态 - 蓝色
      if (status >= 300 && status < 400) {
        return { 
          color: "bg-blue-600", 
          textColor: "text-white",
          text: status.toString(),
          description: statusText || ''
        };
      }
      
      // 客户端错误 - 红色
      if (status >= 400 && status < 500) {
        return { 
          color: "bg-red-600", 
          textColor: "text-white",
          text: status.toString(),
          description: statusText || ''
        };
      }
      
      // 服务器错误 - 红色
      if (status >= 500) {
        return { 
          color: "bg-red-600", 
          textColor: "text-white",
          text: status.toString(),
          description: statusText || ''
        };
      }
      
      // 其他数字状态码
      return { 
        color: "bg-gray-600", 
        textColor: "text-white",
        text: status.toString(),
        description: statusText || ''
      };
    }
    
    // 非HTTP状态码处理 - 灰色
    const text = statusText?.toLowerCase() || '';
    
    if (text.includes('cors') || text.includes('cross-origin')) {
      return { 
        color: "bg-gray-500", 
        textColor: "text-white",
        text: "CORS", 
        description: t('workspace.response.status.cors', '跨域请求限制') 
      };
    }
    
    if (text.includes('timeout') || text.includes('超时')) {
      return { 
        color: "bg-gray-500", 
        textColor: "text-white",
        text: "TIMEOUT", 
        description: t('workspace.response.status.timeout', '请求超时') 
      };
    }
    
    if (text.includes('network') || text.includes('网络')) {
      return { 
        color: "bg-gray-500", 
        textColor: "text-white",
        text: "NET", 
        description: t('workspace.response.status.network', '网络错误') 
      };
    }
    
    // 默认非HTTP错误状态
    return { 
      color: "bg-gray-500", 
      textColor: "text-white",
      text: "ERR", 
      description: statusText || t('workspace.response.status.unknown', '未知错误') 
    };
  };
  
  // 格式化JSON显示
  const formatJson = (data: any) => {
    try {
      if (typeof data === 'string') {
        // 尝试解析字符串为JSON
        const parsed = JSON.parse(data);
        return JSON.stringify(parsed, null, 2);
      }
      return JSON.stringify(data, null, 2);
    } catch (e) {
      // 如果不是有效的JSON，直接返回
      return data;
    }
  };
  
  // 获取时间线数据，添加等待响应时间
  const getTimelineData = () => {
    // 当前各阶段耗时数据 - 使用新的七种颜色
    const timelineData = [
      { name: t('workspace.response.timeline.dns', 'DNS查询'), time: 13, color: '#1E40AF', textColor: '#1E40AF' },
      { name: t('workspace.response.timeline.tcp', 'TCP连接'), time: 25, color: '#15803D', textColor: '#15803D' },
      { name: t('workspace.response.timeline.tls', 'TLS握手'), time: 33, color: '#FACC15', textColor: '#B45309' },
      { name: t('workspace.response.timeline.request', '请求发送'), time: 7, color: '#9333EA', textColor: '#9333EA' },
      { name: t('workspace.response.timeline.server', '服务器处理'), time: 34, color: '#DC2626', textColor: '#DC2626' },
      { name: t('workspace.response.timeline.download', '响应下载'), time: 11, color: '#EA580C', textColor: '#EA580C' },
    ];
    
    // 计算除了这些阶段外的等待时间
    const knownTime = timelineData.reduce((sum, item) => sum + item.time, 0);
    const waitTime = (response?.time || 0) - knownTime;
    
    // 添加等待时间到数据中
    return [
      ...timelineData,
      { name: t('workspace.response.timeline.wait', '等待响应'), time: Math.max(0, waitTime), color: '#64748B', textColor: '#64748B' }
    ];
  };
  
  // 状态码颜色映射（更高对比度）
  const statusColorMap = {
    success: "#22c55e", // 深绿色
    redirect: "#3b82f6", // 深蓝色
    clientError: "#ef4444", // 深红色
    serverError: "#b91c1c", // 更深的红色
    error: "#6b7280", // 深灰色
  };

  // 获取状态颜色
  const getStatusColorAndText = () => {
    const status = response.status;
    const statusText = response.statusText;
    
    // 标准HTTP状态码
    if (status > 0) {
      if (status >= 200 && status < 300) {
        return { color: statusColorMap.success, text: status, description: statusText };
      }
      if (status >= 300 && status < 400) {
        return { color: statusColorMap.redirect, text: status, description: statusText };
      }
      if (status >= 400 && status < 500) {
        return { color: statusColorMap.clientError, text: status, description: statusText };
      }
      if (status >= 500) {
        return { color: statusColorMap.serverError, text: status, description: statusText };
      }
      return { color: statusColorMap.error, text: status, description: statusText };
    }
    
    // 非HTTP状态码
    if (statusText?.toLowerCase().includes('cors') || statusText?.toLowerCase().includes('cross-origin')) {
      return { color: statusColorMap.error, text: 'CORS', description: '跨域请求错误' };
    }
    if (statusText?.toLowerCase().includes('timeout')) {
      return { color: statusColorMap.error, text: 'TIMEOUT', description: '请求超时' };
    }
    return { color: statusColorMap.error, text: 'ERR', description: statusText || '未知错误' };
  };
  
  const statusInfo = getStatusColorAndText();
  
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-2 border-b flex items-center justify-between">
        <div className="flex items-center">
          {/* 状态码标识 - 小巫美观的圆角样式 */}
          <div className="relative z-10 mr-8">
            <div 
              style={{
                backgroundColor: statusInfo.color,
                color: 'white',
                fontWeight: '600',
                padding: '2px 8px',
                borderRadius: '4px',
                minWidth: '36px',
                textAlign: 'center',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                fontSize: '12px',
                display: 'inline-block'
              }}
              title={statusInfo.description}
            >
              {statusInfo.text}
            </div>
          </div>
          {response.time && (
            <div className="flex items-center text-sm text-gray-500 ml-4">
              <Clock className="h-3 w-3 mr-1" />
              {response.time}ms
            </div>
          )}
          {response.size && (
            <div className="text-sm text-gray-500 ml-4">
              {response.size}
            </div>
          )}
        </div>
        <div>
          <Button variant="outline" size="sm">
            <Save className="h-4 w-4 mr-1" />
            {t('workspace.response.actions.save', '保存响应')}
          </Button>
        </div>
      </div>
      
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col"
      >
        <TabsList className="mx-2 mt-2 justify-start">
          <TabsTrigger value="body">{t('workspace.response.tabs.body', 'Body')}</TabsTrigger>
          <TabsTrigger value="headers">{t('workspace.response.tabs.headers', 'Headers')}</TabsTrigger>
          <TabsTrigger value="cookies">{t('workspace.response.tabs.cookies', 'Cookies')}</TabsTrigger>
          <TabsTrigger value="timeline">{t('workspace.response.tabs.timeline', 'Timeline')}</TabsTrigger>
          <TabsTrigger value="script" className="flex items-center">
            {t('workspace.response.tabs.script', 'Script')}
            {testResults.length > 0 && (
              <Badge variant="outline" className="ml-2 text-xs">
                {testResults.filter(r => r.passed).length}/{testResults.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        <div className="flex-1 overflow-auto">
          <TabsContent value="body" className="p-0 h-full">
            <div className="h-full flex flex-col">
              <div className="p-2 border-b flex items-center space-x-2">
                <FileJson className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">
                  {response?.headers?.['content-type'] || 'application/json'}
                </span>
              </div>
              <ScrollArea className="flex-1">
                <pre className="p-4 text-sm font-mono whitespace-pre-wrap">
                  {formatJson(response.data)}
                </pre>
              </ScrollArea>
            </div>
          </TabsContent>
          
          <TabsContent value="headers" className="p-2 h-full">
            <div className="border rounded-md">
              <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
                <table className="w-full border-collapse table-auto" style={{ minWidth: '800px' }}>
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2 font-medium text-sm" style={{ width: '45%' }}>{t('workspace.response.headers.name', '名称')}</th>
                    <th className="text-left p-2 font-medium text-sm" style={{ width: '55%' }}>{t('workspace.response.headers.value', '值')}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(response?.headers || {}).map(([key, value]) => (
                    <tr key={key} className="border-b last:border-b-0 hover:bg-muted/20">
                      <td className="p-2 font-medium text-sm text-blue-600 break-all align-top" style={{ minWidth: '180px', maxWidth: '45%' }}>
                        {key}
                      </td>
                      <td className="p-2 text-sm break-all" style={{ maxWidth: '55%' }}>
                        {value}
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
                {Object.keys(response?.headers || {}).length === 0 && (
                  <div className="p-4 text-center text-muted-foreground">
                    {t('workspace.response.headers.empty', '没有响应头信息')}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="cookies" className="p-2 h-full">
            {/* 解析Cookie并展示 */}
            {(() => {
              // 从响应头中提取Cookie
              const cookieHeader = response?.headers?.['set-cookie'] || response?.headers?.['Set-Cookie'];
              let cookies: {name: string, value: string, attributes?: Record<string, string>}[] = [];
              
              if (cookieHeader) {
                // 如果是字符串数组，处理多个cookie
                const cookieStrings = Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader];
                
                cookies = cookieStrings.map((cookieStr: string) => {
                  const parts = cookieStr.split(';');
                  const mainPart = parts[0].trim();
                  const [name, value] = mainPart.split('=').map((s: string) => s.trim());
                  
                  // 解析cookie属性
                  const attributes: Record<string, string> = {};
                  parts.slice(1).forEach((part: string) => {
                    const attributeParts = part.trim().split('=');
                    const attrName = attributeParts[0].trim();
                    const attrValue = attributeParts.length > 1 ? attributeParts[1].trim() : 'true';
                    attributes[attrName] = attrValue;
                  });
                  
                  return { name, value, attributes };
                });
              }
              
              return (
                <div className="border rounded-md">
                  <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
                    {cookies.length > 0 ? (
                      <table className="w-full border-collapse table-auto" style={{ minWidth: '800px' }}>
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-2 font-medium text-sm w-1/4">{t('workspace.response.cookies.name', '名称')}</th>
                          <th className="text-left p-2 font-medium text-sm w-1/4">{t('workspace.response.cookies.value', '值')}</th>
                          <th className="text-left p-2 font-medium text-sm w-2/4">{t('workspace.response.cookies.attributes', '属性')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cookies.map((cookie, index) => (
                          <tr key={index} className="border-b last:border-b-0 hover:bg-muted/20">
                            <td className="p-2 font-medium text-sm text-blue-600 break-all align-top">
                              {cookie.name}
                            </td>
                            <td className="p-2 text-sm break-all align-top">
                              {cookie.value}
                            </td>
                            <td className="p-2 text-sm">
                              {cookie.attributes && Object.entries(cookie.attributes).map(([name, value], i) => (
                                <div key={i} className="mb-1 last:mb-0">
                                  <span className="font-medium">{name}:</span> {value}
                                </div>
                              ))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      </table>
                    ) : (
                      <div className="p-4 text-center text-muted-foreground">
                        {t('workspace.response.cookies.empty', '没有Cookie信息')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </TabsContent>
          
          <TabsContent value="timeline" className="p-4">
            {/* 请求耗时分析 */}
            <div className="mb-4 p-3 bg-gray-50 border rounded-md text-sm">
              <h3 className="font-medium mb-1">{t('workspace.response.timeline.title', '请求耗时分析')}</h3>
              <p className="text-gray-600 text-xs">{t('workspace.response.timeline.total', '总耗时')}: <span className="font-semibold">{response?.time || 0}ms</span></p>
              <p className="text-gray-600 text-xs">{t('workspace.response.timeline.tip', '注: 请将鼠标悬停在各个色块上查看详细时间。"等待响应"的时间通常占据最大部分。')}</p>
            </div>
            
            {/* 总耗时可视化图表 */}
            <div className="mb-6 bg-white p-3 border rounded-md">
              <div className="text-sm font-medium mb-2">{t('workspace.response.timeline.chart', '耗时分布图')}</div>
              <div className="h-8 w-full bg-gray-100 rounded-md overflow-hidden flex">
                {getTimelineData().map((item, index) => (
                  <div
                    key={index}
                    className="h-full"
                    style={{ 
                      width: `${Math.max(0.5, (item.time / (response?.time || 1)) * 100)}%`,
                      backgroundColor: item.color
                    }}
                    title={`${item.name}: ${item.time}ms`}
                  ></div>
                ))}
              </div>
              
              <div className="mt-2 flex flex-wrap gap-2">
                {getTimelineData().map((item, index) => (
                  <div key={index} className="flex items-center text-xs">
                    <div 
                      className="w-3 h-3 rounded-sm mr-1"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span style={{ color: item.textColor }}>{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* 网络与服务器时间概览 */}
            <div className="flex justify-between text-xs text-gray-500 border-t pt-2 mt-4">
              <span>{t('workspace.response.timeline.total', '总耗时')}: <span className="font-bold text-gray-700">{response?.time || 0}ms</span></span>
              <span>{t('workspace.response.timeline.network', '网络耗时')}: <span className="font-medium">{getTimelineData().slice(0, 6).reduce((sum, item) => sum + item.time, 0)}ms</span></span>
              <span>{t('workspace.response.timeline.serverTime', '服务器时间')}: <span className="font-medium">{getTimelineData().find(item => item.name === t('workspace.response.timeline.server', '服务器处理'))?.time || 0}ms</span></span>
            </div>
          </TabsContent>
          
          <TabsContent value="script" className="p-4">
            {(testResults.length > 0 || (tests && tests.length > 0)) ? (
              <div className="space-y-4">
                <div className="mb-4 p-3 bg-gray-50 border rounded-md text-sm">
                  <h3 className="font-medium mb-1">{t('workspace.response.tests.title', '测试脚本验证')}</h3>
                  <p className="text-gray-600 text-xs">{t('workspace.response.tests.subtitle', '运行测试脚本以验证响应内容')}</p>
                  
                  {allTestsPassed !== null && (
                    <div className={`mt-2 p-2 rounded ${allTestsPassed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      <div className="flex items-center">
                        {allTestsPassed ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            <span className="font-medium">{t('workspace.response.tests.allPassed', '所有测试通过')}</span>
                          </>
                        ) : (
                          <>
                            <span className="text-red-500 mr-2">✕</span>
                            <span className="font-medium">{t('workspace.response.tests.failed', '测试断言未满足')}</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {tests.filter(test => test.enabled).map((test, index) => {
                  const result = testResults.find(r => r.name === test.name);
                  const passed = result?.passed;
                  const hasRun = result !== undefined;
                  
                  return (
                    <div key={index} className="border rounded-md overflow-hidden">
                      <div className="p-2 border-b bg-muted/20 flex items-center justify-between">
                        <div className="flex items-center">
                          <FileCode className="h-4 w-4 mr-2 text-blue-500" />
                          <span className="font-medium text-sm">{test.name}</span>
                          {!test.enabled && (
                            <Badge variant="outline" className="ml-2 text-xs">{t('workspace.response.tests.disabled', '已禁用')}</Badge>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-xs"
                          onClick={() => executeTest(test)}
                          disabled={!response || isRunningTests || !test.enabled}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          {t('workspace.response.tests.run', '运行测试')}
                        </Button>
                      </div>
                      <div className="p-3 bg-gray-50 max-h-60 overflow-auto">
                        <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                          {test.script}
                        </pre>
                      </div>
                      <div className="p-2 border-t bg-white flex items-center justify-between">
                        {hasRun ? (
                          <div className={`flex items-center ${passed ? 'text-green-600' : 'text-red-600'}`}>
                            {passed ? (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                <span className="text-xs">{t('workspace.response.tests.passed', '测试通过')}</span>
                              </>
                            ) : (
                              <>
                                <span className="text-red-500 mr-1">✕</span>
                                <span className="text-xs">{t('workspace.response.tests.assertionFailed', '断言未满足')}</span>
                                {result?.error && (
                                  <span className="ml-2 text-xs text-red-500">{result.error}</span>
                                )}
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400">{t('workspace.response.tests.notRun', '尚未运行')}</div>
                        )}
                        {result?.executionTime && (
                          <div className="text-xs text-gray-500">
                            {result?.executionTime}ms
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                <div className="mt-4 flex justify-end">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={runAllTests}
                    disabled={!response || isRunningTests || !tests.some(t => t.enabled)}
                  >
                    {isRunningTests ? t('workspace.response.tests.running', '正在运行...') : t('workspace.response.tests.runAll', '运行所有测试')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <FileCode className="h-12 w-12 mx-auto mb-4 opacity-40" />
                <p>{t('workspace.response.tests.empty', '没有可用的测试脚本')}</p>
                <p className="text-sm mt-2">{t('workspace.response.tests.hint', '在请求编辑器中添加测试脚本以验证响应')}</p>
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
