"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  ResizableHandle, 
  ResizablePanel, 
  ResizablePanelGroup 
} from "@/components/ui/resizable";
import { CollectionTree } from "./CollectionTree";
// 注意：这些组件路径可能需要根据实际文件位置调整
import { RequestTabs } from "./RequestTabs"; 
import { RequestEditor } from "./RequestEditor";
import { ResponseViewer } from "./ResponseViewer";
import { Button } from "@/components/ui/button";
import { AlertCircle, Plus, Repeat, Save } from "lucide-react";
import { ApiCollection, ApiRequest, ApiResult, HttpMethod, RequestTest } from "@/lib/api-data";
import { fetchApiCollections, saveApiRequest } from "@/components/services/collection-service";
import { sendApiRequest } from "@/components/services/client-request-service";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";

export interface ApiWorkspaceProps {
  // 已移除onRunCollection属性
}

interface TabItem {
  id: string;
  title: string;
  request: ApiRequest;
  isActive: boolean;
  isDirty: boolean;
  isLoading?: boolean;
  response?: ApiResult;
  // 添加测试脚本属性
  tests?: RequestTest[];
}

export function ApiWorkspace({}: ApiWorkspaceProps) {
  const { t } = useTranslation('common');
  // 集合和选择状态
  const [collections, setCollections] = useState<ApiCollection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");
  const [activeRequest, setActiveRequest] = useState<ApiRequest | null>(null);
  const [activeResponse, setActiveResponse] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);
  
  // UI状态
  const [showResponse, setShowResponse] = useState(false);
  const [tabsHeight, setTabsHeight] = useState<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  
  // 集合运行相关功能已移至ApiTestPanel.tsx
  
  // 请求控制相关
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  
  // 其他状态
  const { toast } = useToast();
  const [collectionContextMenu, setCollectionContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    collectionId: string;
    type: "collection" | "folder" | "request";
  }>({show: false, x: 0, y: 0, collectionId: "", type: "collection"});
  
  // 标签相关状态
  const [tabs, setTabs] = useState<TabItem[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>("");

  // 加载API集合
  const fetchCollections = async () => {
    try {
      setLoading(true);
      const data = await fetchApiCollections();
      if (data && data.length > 0) {
        setCollections(data);
        setSelectedCollectionId(data[0].id || "");
      }
    } catch (error) {
      console.error(t('workspace.toast.loadCollectionsFailed', '加载API集合失败:'), error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchCollections();
  }, []);
  
  // 集合运行功能已移动到ApiTestPanel.tsx
  
  // 请求创建和保存相关功能已移至下面
  
  // 打开请求标签
  const openRequest = (request: ApiRequest) => {
    const reqId = request._id || request.id || `req-${Date.now()}`;
    
    // 如果已经打开，激活它
    if (tabs.some(tab => tab.id === reqId)) {
      setActiveTabId(reqId); // reqId 现在始终是字符串，不会是undefined
      setTabs(tabs.map(tab => ({
        ...tab,
        isActive: tab.id === reqId
      })));
      return;
    }
    
    // 否则添加新标签
    const newTab: TabItem = {
      id: reqId || `tab-${Date.now()}`,
      title: request.name,
      request,
      isActive: true,
      isDirty: false
    };
    
    setTabs(prev => prev.map(t => ({ ...t, isActive: false })).concat(newTab));
    setActiveTabId(newTab.id);
    setShowResponse(false);
  };
  
  // 关闭请求标签
  const closeTab = (tabId: string) => {
    const tabIndex = tabs.findIndex(t => t.id === tabId);
    if (tabIndex === -1) return;
    
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);
    
    // 如果关闭的是当前活动标签，需要激活另一个标签
    if (activeTabId === tabId && newTabs.length > 0) {
      const newActiveIndex = Math.min(tabIndex, newTabs.length - 1);
      setActiveTabId(newTabs[newActiveIndex].id);
      setTabs(newTabs.map((t, i) => ({
        ...t,
        isActive: i === newActiveIndex
      })));
    }
    
    if (newTabs.length === 0) {
      setActiveTabId(null);
    }
  };
  
  // 更新请求
  const updateRequest = (requestId: string, updatedRequest: ApiRequest) => {
    console.log('更新请求:', { requestId, tests: updatedRequest.tests?.length || 0 });
    
    setTabs(tabs.map(tab => 
      tab.id === requestId
        ? { 
            ...tab, 
            request: updatedRequest, 
            // 同时更新tab.tests以便能在sendRequest中被正确收集
            tests: updatedRequest.tests,
            isDirty: true 
          }
        : tab
    ));
  };
  
  // 保存请求到集合
  const saveApiRequestToCollection = async (collectionId: string, request: ApiRequest) => {
    try {
      console.log('开始保存请求:', { 
        collectionId, 
        requestId: request._id || request.id,
        requestName: request.name 
      });

      // 验证请求数据
      if (!request.name || request.name.trim() === '') {
        throw new Error('请求必须有名称才能保存');
      }

      // 确保请求已关联到集合
      const requestToSave = {
        ...request,
        collectionId: collectionId,
        updatedAt: new Date().toISOString()
      };
      
      // 保存请求到服务器
      console.log('调用saveApiRequest:', { collectionId, requestData: JSON.stringify(requestToSave).substring(0, 200) + '...' });
      const savedRequest = await saveApiRequest(collectionId, requestToSave);
      
      if (!savedRequest) {
        throw new Error('服务器未返回保存结果，保存失败');
      }
      
      console.log('请求保存成功，更新UI:', { 
        savedRequestId: savedRequest._id || savedRequest.id,
        tabsCount: tabs.length,
        activeTabId
      });
      
      // 更新标签状态
      setTabs(tabs.map(tab => {
        const isCurrentRequest = tab.id === request._id || tab.id === request.id;
        if (isCurrentRequest) {
          console.log('更新标签:', { tabId: tab.id, newRequestId: savedRequest._id || savedRequest.id });
          return { 
            ...tab, 
            request: savedRequest, 
            isDirty: false,
            id: savedRequest._id || savedRequest.id || `req-${Date.now()}`,
            title: savedRequest.name
          };
        }
        return tab;
      }));
      
      // 刷新集合列表
      fetchCollections();
      
      // 显示成功提示
      toast({
        title: '请求已保存',
        description: `请求 "${savedRequest.name}" 已成功保存到集合中`,
      });
      
      return savedRequest;
    } catch (error: any) {
      console.error('保存请求失败:', error);
      
      // 显示错误提示
      toast({
        title: '保存失败',
        description: error.message || '保存请求时出错',
        variant: 'destructive',
      });
      
      return null;
    }
  };
  
  // 环境变量相关代码已移除
  
  // 保存当前活动请求
  const saveActiveRequest = async () => {
    console.log(t('workspace.editor.log.trySave', '尝试保存当前活动请求'));
    
    if (!activeTabId) {
      console.warn(t('workspace.editor.log.noActiveTab', '没有活动标签，无法保存'));
      return;
    }
    
    const activeTab = tabs.find(tab => tab.id === activeTabId);
    if (!activeTab) {
      console.warn(t('workspace.editor.log.noActiveTabObject', '找不到活动标签对象，无法保存'));
      return;
    }
    
    console.log('正在保存请求:', { 
      tabId: activeTabId, 
      requestId: activeTab.request._id || activeTab.request.id,
      requestName: activeTab.request.name 
    });
    
    // 如果没有选择集合，提示用户选择
    if (!selectedCollectionId) {
      toast({
        title: t('workspace.toast.saveFailed', '保存失败'),
        description: t('workspace.toast.chooseCollection', '请先选择要保存到的集合'),
        variant: 'destructive',
      });
      return;
    }
    
    // 如果请求没有名称，提示用户填写
    if (!activeTab.request.name || activeTab.request.name.trim() === '') {
      toast({
        title: t('workspace.toast.saveFailed', '保存失败'),
        description: t('workspace.toast.requestNameRequired', '请求必须有名称才能保存'),
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // 确保请求与集合关联
      const requestToSave = {
        ...activeTab.request,
        collectionId: selectedCollectionId // 确保请求已关联到当前选中的集合
      };
      
      // 调用保存请求函数
      const result = await saveApiRequestToCollection(selectedCollectionId, requestToSave);
      
      if (result) {
        console.log('保存成功:', { 
          savedRequestId: result._id || result.id,
          collectionId: selectedCollectionId 
        });
      } else {
        console.error('保存结果为空');
      }
    } catch (error: any) {
      console.error('保存请求异常:', error);
      // 错误处理已在saveApiRequestToCollection中完成
    }
  };
  
  // 发送请求
  // 取消当前请求
  const cancelRequest = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      
      // 更新标签状态
      setTabs(tabs.map(tab => 
        tab.id === activeTabId
          ? { ...tab, isLoading: false }
          : tab
      ));
      
      toast({
        title: t('workspace.toast.requestCancelled', '请求已取消'),
        description: t('workspace.toast.requestCancelledDesc', '请求已被用户取消'),
      });
    }
  };
  
  const sendRequest = async (request: ApiRequest) => {
    try {
      // 显示响应区域
      setShowResponse(true);
      
      // 如果有正在进行的请求，先取消
      if (abortController) {
        abortController.abort();
      }
      
      // 创建新的AbortController
      const controller = new AbortController();
      setAbortController(controller);
      
      // 更新标签状态为正在加载
      setTabs(tabs.map(tab => 
        tab.id === activeTabId
          ? { ...tab, isLoading: true }
          : tab
      ));
      
      // 深度克隆请求对象，以便添加测试脚本
      const requestWithTests = JSON.parse(JSON.stringify(request));
      
      // 确保请求对象中有测试脚本数组
      if (!requestWithTests.tests) {
        requestWithTests.tests = [];
      }
      
      // 检查是否有assertions，如果有则转换为测试脚本
      if (requestWithTests.assertions && requestWithTests.assertions.length > 0) {
        console.log('请求中发现assertions:', requestWithTests.assertions.length);
        console.log('原始assertions内容:', JSON.stringify(requestWithTests.assertions));
        
        // 将所有assertions转换为测试脚本
        const assertionTests: RequestTest[] = [];
        
        requestWithTests.assertions.forEach((assertion: any, index: number) => {
          console.log(`处理第${index+1}个assertion:`, JSON.stringify(assertion));
          
          // 定义测试脚本名称
          let testName = assertion.target || assertion.name || `API Test ${index+1}`;
          
          // 生成测试脚本内容
          let scriptContent = '';
          
          try {
            // 分析assertion类型
            console.log(`当前处理的assertion类型: ${assertion.type}, 操作: ${assertion.operation}`);
            
            // 为script类型的特殊处理
            if (assertion.type === 'script' || assertion.operation === 'script') {
              // 从不同可能的字段获取脚本内容
              // 首先检查value字段，然后是script字段，再是target字段
              let rawScript = assertion.value || assertion.script || assertion._script || assertion.content || assertion.target;
              
              // 检查内容是否已经是pm.test格式
              if (rawScript && typeof rawScript === 'string') {
                // 检查是否已经是pm.test开头的脚本
                if (rawScript.trim().startsWith('pm.test(')) {
                  // 直接使用现有脚本
                  scriptContent = rawScript;
                  console.log('使用已存在的pm.test脚本:', scriptContent.substring(0, 50) + '...');
                  
                  // 从脚本中提取测试名称 - 匹配"pm.test("NAME", function..."格式
                  const nameMatch = rawScript.match(/pm\.test\("([^"]+)"/i);
                  if (nameMatch && nameMatch[1]) {
                    testName = nameMatch[1];
                    console.log('从脚本中提取测试名称:', testName);
                  }
                } else {
                  // 包装为pm.test脚本
                  testName = 'Custom Test';
                  scriptContent = `pm.test("${testName}", function() {\n  ${rawScript}\n});`;
                  console.log('将原始脚本包装为pm.test:', scriptContent.substring(0, 50) + '...');
                }
              }
            }
            // 如果是状态码检查
            else if (assertion.operation === 'equals' && assertion.target === 'Status code') {
              scriptContent = `pm.test("Status code is ${assertion.value || 200}", function() {\n  pm.response.to.have.status(${assertion.value || 200});\n});`;
              console.log('生成状态码检查脚本');
            }
            // 如果是包含关系
            else if (assertion.operation === 'contains') {
              scriptContent = `pm.test("Response contains ${assertion.target || 'value'}", function() {\n  pm.expect(pm.response.text()).to.include("${assertion.value || ''}");\n});`;
              console.log('生成包含关系脚本');
            }
            // 其他类型测试生成默认脚本
            else {
              // 默认生成一个基本的状态码检查脚本
              scriptContent = `pm.test("${testName}", function() {\n  // 自动生成的测试: ${assertion.target || ''} ${assertion.operation || ''} ${assertion.value || ''}\n  pm.response.to.have.status(200);\n});`;
              console.log('生成默认脚本类型');
            }  
            
            // 确保脚本内容非空
            if (scriptContent) {
              console.log(`添加测试脚本: ${testName}`);
              
              // 创建测试脚本对象
              const testScript: RequestTest = {
                name: testName,
                script: scriptContent,
                enabled: assertion.enabled === undefined ? true : assertion.enabled
              };
              
              // 添加到临时数组
              assertionTests.push(testScript);
            }
          } catch (error) {
            console.error(`处理assertion时出错:`, error);
          }
        });
        
        console.log(`从${requestWithTests.assertions.length}个assertions生成了${assertionTests.length}个测试脚本`);
        
        // 将生成的测试脚本添加到请求中
        assertionTests.forEach(test => {
          // 检查是否已存在相同名称的测试
          if (!requestWithTests.tests.some((t: RequestTest) => t.name === test.name)) {
            requestWithTests.tests.push(test);
          }
        });
        
        console.log('转换后的测试脚本数组:', requestWithTests.tests.length);
        console.log('转换后的测试脚本内容:', JSON.stringify(requestWithTests.tests));
      }
      
      // 检查当前请求中的脚本（这是主要的测试脚本来源）
      if (request.tests && request.tests.length > 0) {
        console.log('请求中已有测试脚本:', request.tests);
        
        // 确保所有测试脚本都是正确的格式
        request.tests.forEach((test: any) => {
          // 如果脚本只是字符串，创建正确格式的测试对象
          if (typeof test === 'string') {
            const scriptContent = `pm.test("${test}", function() {
  var jsonData = pm.response.json();
  pm.expect(jsonData.isEmailVerifiedTenant).to.eql(true);
});`;
            
            requestWithTests.tests.push({
              name: test,
              script: scriptContent,
              enabled: true
            });
          } else if (typeof test === 'object') {
            // 已经是正确的测试对象格式
            // 确保不重复添加
            if (!requestWithTests.tests.some((t: RequestTest) => t.name === test.name)) {
              requestWithTests.tests.push(test);
            }
          }
        });
      }
      
      // 获取当前活动的标签页，确保我们使用最新的请求数据
      const currentTab = tabs.find(tab => tab.id === activeTabId);
      if (currentTab && currentTab.tests && currentTab.tests.length > 0) {
        console.log('从当前标签页获取测试脚本:', currentTab.tests);
        
        // 添加标签页中的测试（这可能是用户最近编辑的）
        currentTab.tests.forEach((test: any) => {
          if (typeof test === 'object') {
            // 检查是否已存在相同名称的测试
            const existingTestIndex = requestWithTests.tests.findIndex((t: RequestTest) => t.name === test.name);
            if (existingTestIndex >= 0) {
              // 更新现有测试
              requestWithTests.tests[existingTestIndex] = test;
            } else {
              // 添加新测试
              requestWithTests.tests.push(test);
            }
          }
        });
      }
      
      console.log('发送给后端的完整测试脚本:', requestWithTests.tests);
      
      // 发送API请求，包含测试脚本
      const response = await sendApiRequest(requestWithTests, { signal: controller.signal });
      
      console.log('API请求响应:', response);
      
      // 确保测试脚本和测试结果被保存到响应对象中
      const enhancedResponse = {
        ...response,
        tests: requestWithTests.tests || [] // 确保测试脚本信息被保存
      };
      
      console.log('增强后的响应对象（带测试脚本）:', enhancedResponse);
      
      // 更新标签中的响应
      setTabs(tabs.map(tab => 
        tab.id === activeTabId
          ? { ...tab, response: enhancedResponse, isLoading: false }
          : tab
      ));
      
      // 自动执行测试脚本（如果存在）
      if (requestWithTests.tests && requestWithTests.tests.length > 0) {
        console.log('响应返回后自动执行测试脚本');
        
        // 为了确保响应已经更新到标签页，添加小延迟
        setTimeout(async () => {
          try {
            import('@/components/services/test-service').then(async ({ executeTests }) => {
              // 准备测试所需的响应数据
              const apiResponse = {
                status: response.status,
                statusText: response.statusText,
                headers: response.responseHeaders || {},
                body: response.responseBody ? (
                  response.responseBody.trim().startsWith('{') ? 
                    JSON.parse(response.responseBody) : 
                    response.responseBody
                ) : {}
              };
              
              // 调用测试服务执行测试
              console.log('自动调用测试API执行测试脚本');
              const testResult = await executeTests(apiResponse, requestWithTests.tests);
              
              // 更新响应中的测试结果
              if (testResult && testResult.testResults) {
                console.log('测试执行完成，结果：', testResult);
                
                const updatedResponse = {
                  ...enhancedResponse,
                  testResults: testResult.testResults,
                  allTestsPassed: testResult.allTestsPassed
                };
                
                // 更新标签页响应
                setTabs(tabs.map(tab => 
                  tab.id === activeTabId
                    ? { ...tab, response: updatedResponse }
                    : tab
                ));
              }
            });
          } catch (error) {
            console.error('自动执行测试脚本失败:', error);
          }
        }, 100);
      }
      
      // 重置AbortController
      setAbortController(null);
      
      // 显示成功提示
      toast({
        title: t('workspace.toast.requestSent', '请求已发送'),
        description: `${t('workspace.toast.status', '状态码')}: ${response.status} ${response.statusText}`,
        variant: response.status >= 400 ? 'destructive' : 'default',
      });
    } catch (error: any) {
      console.error('发送请求失败:', error);
      
      // 如果是用户取消的请求，不显示错误
      if (error.name === 'AbortError') {
        console.log('请求被用户取消');
      } else {
        // 更新标签状态并显示错误
        setTabs(tabs.map(tab => 
          tab.id === activeTabId
            ? { 
                ...tab, 
                isLoading: false,
                response: {
                  requestId: tab.request._id || tab.request.id || '',
                  status: 0,
                  statusText: 'Error',
                  responseTime: 0,
                  responseSize: 0,
                  responseHeaders: {},
                  responseBody: '',
                  error: error.message || '请求发送失败',
                  timestamp: new Date().toISOString()
                } 
              }
            : tab
        ));
        
        // 显示错误提示
        toast({
          title: t('workspace.toast.requestFailed', '请求失败'),
          description: error.message || t('workspace.toast.requestError', '发送请求时出错'),
          variant: 'destructive',
        });
      }
      
      // 重置AbortController
      setAbortController(null);
    }
  };
  
  // 创建新请求
  const createNewRequest = (collectionId?: string, parentId?: string) => {
    // 如果未指定集合ID，使用当前选中的集合
    const targetCollectionId = collectionId || selectedCollectionId;
    
    // 如果还是没有集合ID，显示错误提示
    if (!targetCollectionId) {
      toast({
        title: t('workspace.toast.cannotCreateRequest', '无法创建请求'),
        description: t('workspace.toast.chooseCollection', '请先选择一个集合'),
        variant: 'destructive'
      });
      return;
    }
    
    // 生成唯一ID，确保新请求与其他请求不冲突
    const uniqueId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // 创建全新的空白请求对象，确保所有字段都重置为默认值
    const newRequest: ApiRequest = {
      _id: uniqueId,
      id: uniqueId,
      name: t('workspace.editor.newRequest', '新建请求'),
      method: 'GET',
      url: 'https://api.example.com',
      headers: [],
      queryParams: [],
      body: {
        mode: 'raw',
        contentType: 'application/json',
        raw: ''
      },
      // 显式清空所有测试相关字段
      tests: [],
      assertions: [],
      preRequest: {
        script: '',
        enabled: false
      },
      collectionId: targetCollectionId, // 指定集合ID
      parentId: parentId, // 可选的父文件夹ID
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // 创建新标签
    const newTab: TabItem = {
      id: uniqueId,
      title: t('workspace.editor.newRequest', '新建请求'),
      request: newRequest,
      isActive: true,
      isDirty: false
    };
    
    // 将所有现有标签设为非活动，并添加新标签
    setTabs(prev => [
      ...prev.map(tab => ({
        ...tab,
        isActive: false // 将现有标签设为非活动
      })),
      newTab // 添加新标签
    ]);
    
    // 设置活动标签ID并隐藏响应面板
    setActiveTabId(uniqueId);
    setShowResponse(false);
    
    console.log('创建新请求，保留现有标签', { id: uniqueId });
  };
  
  // 使用 useMemo 来确保 activeTab 总是基于最新状态计算
  const activeTab = useMemo(() => {
    const tab = tabs.find(tab => tab.id === activeTabId);
    // console.log('计算activeTab:', { 
    //   activeTabId, 
    //   tabFound: !!tab,
    //   requestName: tab?.request?.name || '无请求',
    //   tabsCount: tabs.length
    // });
    return tab;
  }, [tabs, activeTabId]); // 依赖项包含 tabs 和 activeTabId
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between border-b p-2">
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => createNewRequest()}
            title={t('workspace.editor.newRequest', '新建请求')}
            className="group relative"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden md:inline-block md:ml-1">{t('workspace.editor.newRequest', '新建请求')}</span>
            <span className="absolute left-1/2 -translate-x-1/2 -bottom-8 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap md:hidden z-10">{t('workspace.editor.newRequest', '新建请求')}</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchCollections}
            title={t('workspace.tree.refresh', '刷新集合')}
            className="group relative"
          >
            <Repeat className="h-4 w-4" />
            <span className="hidden md:inline-block md:ml-1">{t('workspace.tree.refresh', '刷新集合')}</span>
            <span className="absolute left-1/2 -translate-x-1/2 -bottom-8 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap md:hidden z-10">{t('workspace.tree.refresh', '刷新集合')}</span>
          </Button>
          
          {/* 运行集合功能已移到ApiTestPanel.tsx */}
          {activeTab && activeTab.isDirty && selectedCollectionId && (
            <Button
              variant="outline"
              size="sm"
              className="ml-1 group relative"
              onClick={() => saveApiRequestToCollection(selectedCollectionId, activeTab.request)}
              title="保存请求"
            >
              <Save className="h-4 w-4" /> 
              <span className="hidden md:inline-block md:ml-1">保存请求</span>
              <span className="absolute left-1/2 -translate-x-1/2 -bottom-8 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap md:hidden z-10">保存请求</span>
            </Button>
          )}
        </div>
      </div>

      {/* 集合运行结果已移到ApiTestPanel.tsx */}

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* 左侧集合列表 */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
          {/* 注意：运行集合功能已移到ApiTestPanel */}
          <CollectionTree
            collections={collections}
            selectedCollectionId={selectedCollectionId}
            onSelectCollection={setSelectedCollectionId}
            onSelectRequest={openRequest}
            onRefresh={fetchCollections}
            onCreateRequest={createNewRequest}
          />
        </ResizablePanel>

        <ResizableHandle />

        {/* 中间请求区域 */}
        <ResizablePanel defaultSize={55} minSize={30}>
          <div className="h-full flex flex-col">
            {/* 标签栏 */}
            <RequestTabs 
              tabs={tabs} 
              activeTabId={activeTabId}
              onSelectTab={(tabId) => {
                console.log('点击切换标签', { tabId });
                // 首先找到目标标签的完整数据
                const targetTab = tabs.find(t => t.id === tabId);
                if (!targetTab) {
                  console.error('找不到目标标签:', tabId);
                  return;
                }
                
                // 更新标签状态
                const newTabs = tabs.map(tab => ({
                  ...tab,
                  isActive: tab.id === tabId
                }));
                
                // 设置状态
                setTabs(newTabs);
                setActiveTabId(tabId);
                
                // 打印日志
                console.log('已切换到标签', { 
                  targetId: tabId,
                  targetName: targetTab.request.name,
                  targetMethod: targetTab.request.method,
                  targetUrl: targetTab.request.url
                });
              }}
              onCloseTab={closeTab}
            />
            
            {/* 请求编辑区域 - 添加key属性强制组件重新创建 */}
            {activeTab ? (
              <RequestEditor
                key={`editor-${activeTab.id}`} // 添加key强制重新渲染
                request={activeTab.request}
                onUpdateRequest={(updatedRequest) => updateRequest(activeTab.id, updatedRequest)}
                onSendRequest={() => sendRequest(activeTab.request)}
                onSaveRequest={saveActiveRequest}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center flex-col p-4 text-center text-muted-foreground">
                <AlertCircle className="h-12 w-12 mb-4" />
                <h3 className="text-lg font-medium">{t('workspace.empty.noOpenRequest', '没有打开的请求')}</h3>
                <p className="mb-4">{t('workspace.empty.hint', '从左侧集合中选择一个请求，或创建新请求')}</p>
                <Button onClick={() => createNewRequest()}>
                  <Plus className="h-4 w-4 mr-2" /> {t('workspace.editor.newRequest', '新建请求')}
                </Button>
              </div>
            )}
          </div>
        </ResizablePanel>
        
        {activeTab && showResponse && (
          <>
            <ResizableHandle />
            
            {/* 右侧响应区域 */}
            <ResizablePanel defaultSize={25} minSize={20}>
              <ResponseViewer 
                response={{
                  status: activeTab.response?.status || 0,
                  statusText: activeTab.response?.statusText || '',
                  headers: activeTab.response?.responseHeaders || {},
                  data: activeTab.response?.responseBody || '',
                  time: activeTab.response?.responseTime,
                  size: activeTab.response?.responseSize ? `${activeTab.response.responseSize} bytes` : undefined,
                  // 添加测试结果，确保从响应中获取
                  testResults: activeTab.response?.testResults || [],
                  allTestsPassed: activeTab.response?.allTestsPassed
                }}
                isLoading={activeTab.isLoading}
                onCancelRequest={cancelRequest}
                tests={activeTab.request.tests || []}
                preRequest={activeTab.request.preRequest}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
