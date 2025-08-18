'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Play, Plus, RefreshCw, ChevronDown, ChevronUp, List, Folder, FolderOpen, History, FolderSearch, CheckCircle, XCircle } from 'lucide-react';
import RunCollectionDialog from '@/components/run-collection-dialog';
import { CollectionRunResults } from '@/features/api-workspace/components/CollectionRunResults';
import { ApiCollection, ApiRequest, ApiResult } from "@/lib/api-data";
import { runCollection, RunCollectionOptions, SendRequestOptions } from "@/components/services/client-request-service";
import { useToast } from "@/components/ui/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { fetchApiCollections } from '@/components/services/collection-service';
import { useTranslation } from 'react-i18next';

// 已经从request-service中导入了RunCollectionOptions接口

// API测试面板组件 - 专注于集合运行功能
interface ApiTestPanelProps {
  initialTab?: 'history' | 'collections';
  onTabChange?: (tab: 'history' | 'collections') => void;
}

// 运行历史项目接口
interface RunHistoryItem {
  id: string;
  collectionName: string;
  timestamp: string;
  results?: ApiResult[]; // 完整结果（可选，用于向后兼容）
  // 精简存储字段
  totalRequests?: number;
  successCount?: number;
  failedResults?: Array<{
    requestName: string;
    url: string;
    status: number;
    error?: string;
    proxyInfo?: any;
  }>;
  options?: {
    concurrency: number;
    useProxy: boolean;
    selectedRequestsCount: number;
    variableFilesCount: number;
  };
}

export default function ApiTestPanel({ initialTab = 'collections', onTabChange }: ApiTestPanelProps) {
  const { t } = useTranslation('common');
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // 当 initialTab 属性变化时更新 activeTab
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  
  // 集合状态
  const [collections, setCollections] = useState<ApiCollection[]>([]);
  const [isLoading, setIsLoading] = useState(false); // 刷新集合的加载状态
  const [isRunning, setIsRunning] = useState(false); // 运行集合的加载状态
  const [error, setError] = useState<string | null>(null);
  
  // 运行进度状态
  const [runProgress, setRunProgress] = useState({
    completed: 0,
    total: 0,
    currentRequest: '',
    percentage: 0
  });
  
  // 运行对话框状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");
  const [selectedCollectionName, setSelectedCollectionName] = useState<string>("");
  
  // 运行结果状态
  const [runResults, setRunResults] = useState<ApiResult[]>([]);
  const [hasResults, setHasResults] = useState(false);
  const [resultCollapsed, setResultCollapsed] = useState(false);
  
  // 运行历史状态
  const [runHistory, setRunHistory] = useState<RunHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // 加载运行历史记录
  const loadRunHistory = async () => {
    setHistoryLoading(true);
    try {
      const { getStorageSettings } = await import('@/lib/storage-settings');
      const settings = getStorageSettings();
      
      if (settings.collectionResultsStorage === 'database') {
        // 从数据库加载
        await loadHistoryFromDatabase();
      } else {
        // 从浏览器localStorage加载
        loadHistoryFromBrowser();
      }
    } catch (error) {
      console.error('加载运行历史失败:', error);
      // 降级到浏览器存储
      loadHistoryFromBrowser();
    } finally {
      setHistoryLoading(false);
    }
  };
  
  // 从数据库加载历史记录
  const loadHistoryFromDatabase = async () => {
    try {
      const response = await fetch('/api/v1/tests');
      if (response.ok) {
        const testJobs = await response.json();
        
        // 转换数据库记录为历史记录格式
        const convertedHistory: RunHistoryItem[] = testJobs.map((job: any) => ({
          id: job._id,
          collectionName: job.collectionName || job.name,
          timestamp: job.createdAt,
          totalRequests: job.totalRequests || job.results?.length || 0,
          successCount: job.successCount || 0,
          failedResults: job.results?.filter((r: any) => r.status < 200 || r.status >= 300).map((r: any) => ({
            requestName: r.requestName,
            url: r.url,
            status: r.status,
            error: r.error,
            proxyInfo: r.proxyInfo
          })) || [],
          options: {
            concurrency: job.options?.concurrency || 1,
            useProxy: job.options?.useProxy || false,
            selectedRequestsCount: job.options?.selectedRequests?.length || 0,
            variableFilesCount: job.options?.variableFiles?.length || 0
          },
          results: job.results || []
        }));
        
        setRunHistory(convertedHistory);
        console.log(`从数据库加载了 ${convertedHistory.length} 条运行历史记录`);
      } else {
        throw new Error(`获取历史记录失败: ${response.status}`);
      }
    } catch (error) {
      console.error('从数据库加载历史记录失败:', error);
      throw error;
    }
  };
  
  // 从浏览器localStorage加载历史记录
  const loadHistoryFromBrowser = () => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('api-test-run-history');
        const browserHistory = saved ? JSON.parse(saved) : [];
        setRunHistory(browserHistory);
        console.log(`从浏览器存储加载了 ${browserHistory.length} 条运行历史记录`);
      } catch (error) {
        console.error('从浏览器存储加载历史记录失败:', error);
        setRunHistory([]);
      }
    }
  };
  
  // 在组件挂载时加载历史记录
  useEffect(() => {
    loadRunHistory();
  }, []);

  // 保存运行历史到localStorage，带有配额管理（仅在浏览器存储模式下）
  useEffect(() => {
    if (typeof window !== 'undefined' && runHistory.length > 0) {
      // 检查当前存储模式
      const checkAndSave = async () => {
        try {
          const { getStorageSettings } = await import('@/lib/storage-settings');
          const settings = getStorageSettings();
          
          // 只有在浏览器存储模式下才保存到localStorage
          if (settings.collectionResultsStorage === 'browser') {
            saveToLocalStorage();
          }
        } catch (error) {
          console.error('检查存储设置失败，使用默认浏览器存储:', error);
          saveToLocalStorage();
        }
      };
      
      const saveToLocalStorage = () => {
        try {
          // 限制历史记录数量，只保留最近的50条记录
          const maxHistoryCount = 50;
          const limitedHistory = runHistory.slice(-maxHistoryCount);

          // 精简历史数据，只保留必要信息
          const compactHistory = limitedHistory.map(item => ({
            id: item.id,
            timestamp: item.timestamp,
            collectionName: item.collectionName,
            totalRequests: item.results?.length || 0,
            successCount: item.results?.filter(r => r.status >= 200 && r.status < 300).length || 0,
            // 只保留失败请求的详细信息
            failedResults: item.results?.filter(r => r.status < 200 || r.status >= 300).map(r => ({
              requestName: r.requestName,
              url: r.url,
              status: r.status,
              error: r.error,
              proxyInfo: r.proxyInfo
            })) || []
          }));

          localStorage.setItem('api-test-run-history', JSON.stringify(compactHistory));
        } catch (error: any) {
          console.warn('localStorage配额不足，正在清理旧数据...', error.message);

          // 如果是配额错误，尝试清理并重新保存
          if (error.name === 'QuotaExceededError') {
            try {
              // 清理旧的历史记录
              localStorage.removeItem('api-test-run-history');

              // 只保留最近的10条记录
              const minimalHistory = runHistory.slice(-10).map(item => ({
                id: item.id,
                timestamp: item.timestamp,
                collectionName: item.collectionName,
                totalRequests: item.results?.length || 0,
                successCount: item.results?.filter(r => r.status >= 200 && r.status < 300).length || 0
              }));

              localStorage.setItem('api-test-run-history', JSON.stringify(minimalHistory));
              console.log('已清理localStorage并保存精简历史记录');
            } catch (retryError) {
              console.error('清理localStorage后仍然无法保存:', retryError);
              // 完全清空localStorage中的测试历史
              localStorage.removeItem('api-test-run-history');
            }
          }
        }
      };
      
      checkAndSave();
    }
  }, [runHistory]);

  const { toast } = useToast();
  
  // 关闭运行结果
  const closeResults = () => {
    setHasResults(false);
    setRunResults([]);
  };

  // 清理历史记录
  const clearHistory = async () => {
    try {
      const { getStorageSettings } = await import('@/lib/storage-settings');
      const settings = getStorageSettings();
      
      if (settings.collectionResultsStorage === 'database') {
        // 清理数据库中的历史记录
        await clearDatabaseHistory();
      } else {
        // 清理浏览器存储中的历史记录
        clearBrowserHistory();
      }
      
      setRunHistory([]);
      toast({
        title: "历史记录已清理",
        description: "所有运行历史记录已删除",
      });
    } catch (error) {
      console.error('清理历史记录失败:', error);
      toast({
        title: "清理失败",
        description: "清理历史记录时发生错误",
        variant: "destructive"
      });
    }
  };
  
  // 清理数据库历史记录
  const clearDatabaseHistory = async () => {
    // 这里应该调用删除所有测试任务的API
    // 目前先跳过，因为可能需要批量删除功能
    console.log('清理数据库历史记录功能待实现');
  };
  
  // 清理浏览器历史记录
  const clearBrowserHistory = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('api-test-run-history');
    }
  };



  // 获取localStorage使用情况
  const getStorageInfo = () => {
    if (typeof window === 'undefined') return null;

    try {
      const historyData = localStorage.getItem('api-test-run-history');
      if (!historyData) return { size: 0, count: 0 };

      const sizeInBytes = new Blob([historyData]).size;
      const sizeInKB = Math.round(sizeInBytes / 1024);
      const count = runHistory.length;

      return { size: sizeInKB, count };
    } catch (error) {
      return null;
    }
  };

  // 切换结果面板收起/展开
  const toggleResultPanel = () => {
    setResultCollapsed(!resultCollapsed);
  };
  
  // 加载 API 集合
  const fetchCollections = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const data = await fetchApiCollections();
      setCollections(data);
    } catch (err) {
      console.error(t('apiTesting.load.errorLog', '加载集合错误:'), err);
      setError(t('apiTesting.load.error', '加载集合失败，请稍后重试'));
      toast({
        title: t('apiTesting.toast.loadFailedTitle', '加载失败'),
        description: t('apiTesting.toast.loadFailedDesc', '无法加载 API 集合，请稍后重试。'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // 初始化时加载集合
  useEffect(() => {
    fetchCollections();
  }, []);

  // API 集合列表刷新按钮点击处理器
  const handleRefreshCollections = () => {
    fetchCollections();
  };

  // 处理开启运行集合对话框
  const handleOpenRunDialog = () => {
    if (!selectedCollectionId) {
      toast({
        title: t('apiTesting.toast.error', '错误'),
        description: t('apiTesting.toast.selectCollection', '请先选择一个集合')
      });
      return;
    }
    
    setDialogOpen(true);
  };
  
  // 处理执行集合运行
  const handleRunCollection = async (options: RunCollectionOptions) => {
    if (!selectedCollectionId) {
      toast({
        title: t('apiTesting.toast.runFailed', '运行失败'),
        description: t('apiTesting.toast.noCollection', '没有选择集合'),
        variant: "destructive",
      });
      return;
    }
    
    // 关闭对话框
    setDialogOpen(false);
    
    // 设置加载状态
    setIsRunning(true);
    
    // 初始化进度状态
    const totalRequestsEstimate = collections.find(c => c.id === selectedCollectionId || c._id === selectedCollectionId)?.requests?.length || 1;
      setRunProgress({
      completed: 0,
      total: totalRequestsEstimate,
        currentRequest: t('apiTesting.progress.preparing', '准备运行...'),
      percentage: 0
    });
    
    try {
      // 查找集合对象，同时检查id和_id字段
      const collection = collections.find(c => c.id === selectedCollectionId || c._id === selectedCollectionId);
      if (!collection) {
        throw new Error('找不到集合');
      }
      
      // 提取运行选项
      const { 
        concurrency = 1, 
        useProxy = false, 
        selectedRequests = [], 
        variableFiles = [],
        selectedTunnelId,
        parameterSetId = undefined 
      } = options;
      
      console.log('运行集合:', {
        collectionName: collection.name,
        concurrency,
        useProxy,
        selectedRequestsCount: selectedRequests.length,
        variableFilesCount: variableFiles.length
      });
      
      // 运行集合
      // 构建传递给runCollection的选项
      // 注意：runCollection函数期望的是SendRequestOptions类型
      // 我们需要实现runCollection函数来支持额外的选项
      
      // 先将使用已经兼容的SendRequestOptions类型
      const sendOptions: SendRequestOptions = {
        variables: parameterSetId ? { parameterSetId } : undefined
      };
      
      // 这里直接将额外的选项传递给runCollection
      // 需要在request-service.ts中实现对这些额外选项的处理
      // 我们先使用类型断言来解决调用参数的类型问题
      const results = await runCollection(collection, {
        ...sendOptions,
        // 基本选项
        concurrency,
        useProxy,
        selectedRequests,
        variableFiles,
        selectedTunnelId,
        // 重试参数
        timeoutSeconds: options.timeoutSeconds,
        maxRetries: options.maxRetries,
        retryDelayMs: options.retryDelayMs,
        retryStatusCodes: options.retryStatusCodes,
        // 进度回调
        onProgress: (progress) => {
          setRunProgress({
            ...progress,
            currentRequest: progress.currentRequest || t('apiTesting.progress.running', '运行中...')
          });
          console.log(t('apiTesting.progress.log', '运行进度: {{pct}}% ({{completed}}/{{total}})'), { pct: progress.percentage.toFixed(1), completed: progress.completed, total: progress.total });
        }
      });
      
      // 生成历史记录
      const historyItem: RunHistoryItem = {
        id: Date.now().toString(),
        collectionName: selectedCollectionName,
        timestamp: new Date().toLocaleString(),
        results,
        // 记录运行选项以便历史查看
        options: {
          concurrency,
          useProxy,
          selectedRequestsCount: selectedRequests.length,
          variableFilesCount: variableFiles.length
        }
      };
      
      // 更新结果和历史
      setRunResults(results);
      setHasResults(true);
      
      // 检查存储设置并相应更新历史记录
      try {
        const { getStorageSettings } = await import('@/lib/storage-settings');
        const settings = getStorageSettings();
        
        if (settings.collectionResultsStorage === 'database') {
          // 数据库存储模式：运行结果会通过runCollection函数自动保存到数据库
          // 这里重新加载历史记录以显示最新的数据库记录
          await loadRunHistory();
        } else {
          // 浏览器存储模式：添加到本地历史记录
          setRunHistory(prev => [historyItem, ...prev]);
        }
      } catch (error) {
        console.error('更新历史记录失败:', error);
        // 降级到浏览器存储
        setRunHistory(prev => [historyItem, ...prev]);
      }
      
      // 切换到历史标签
      setActiveTab("history");
      
      toast({
        title: t('apiTesting.toast.runCompleted', '集合运行完成'),
        description: t('apiTesting.toast.runCompletedDesc', '{{name}} 已成功运行', { name: selectedCollectionName }),
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(t('apiTesting.run.errorLog', '运行集合错误:'), errorMessage, {
        name: err instanceof Error ? err.name : 'Unknown',
        stack: err instanceof Error ? err.stack : undefined,
        details: err
      });
      toast({
        title: t('apiTesting.toast.runFailed', '运行失败'),
        description: errorMessage || t('apiTesting.toast.runError', '运行集合时发生错误'),
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  // 处理选择集合
  const handleSelectCollection = (collectionId: string, name: string) => {
    setSelectedCollectionId(collectionId);
    setSelectedCollectionName(name);
  };

  // 处理标签页切换
  const handleTabChange = (value: string) => {
    // 类型检查确保只接受有效的标签页值
    if (value === 'history' || value === 'collections') {
      setActiveTab(value);
      // 通知外部组件标签页变化
      if (onTabChange) {
        onTabChange(value);
      }
    }
  };

  return (
    <div className="container mx-auto p-4 max-h-screen overflow-auto space-y-6">
      <Card className="w-full shadow-md border-2 border-muted relative max-h-[calc(100vh-2rem)] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-card z-20 border-b">
          <CardTitle>{t('apiTesting.title', 'API 集合运行')}</CardTitle>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshCollections}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">{t('apiTesting.actions.refresh', '刷新集合')}</span>
            </Button>
            <div className="w-2"></div>
            <Button
              size="sm"
              onClick={handleOpenRunDialog}
              disabled={!selectedCollectionId || isRunning}
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('apiTesting.actions.running', '正在运行...')}
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  {t('apiTesting.actions.runCollection', '运行集合')}
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="relative z-0 overflow-visible">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 运行进度条 */}
          {isRunning && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">{t('apiTesting.progress.runningCollection', '正在运行集合...')}</span>
                </div>
                <span className="text-sm text-blue-600 font-mono">
                  {runProgress.percentage.toFixed(1)}%
                </span>
              </div>
              
              <div className="w-full bg-blue-100 rounded-full h-2 mb-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out" 
                  style={{ width: `${runProgress.percentage}%` }}
                />
              </div>
              
              <div className="flex justify-between text-xs text-blue-700">
                <span>
                  {t('apiTesting.progress.current', '当前请求')}: {runProgress.currentRequest}
                </span>
                <span>
                  {runProgress.completed} / {runProgress.total} {t('apiTesting.progress.completed', '完成')}
                </span>
              </div>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={isRunning ? undefined : handleTabChange}>
            <TabsList className="mb-4">
              <TabsTrigger value="collections" disabled={isRunning}>
                <FolderOpen className="h-4 w-4 mr-2" />
                {t('apiTesting.tabs.collections', '集合列表')}
              </TabsTrigger>
              <TabsTrigger value="history" disabled={isRunning}>
                <History className="h-4 w-4 mr-2" />
                {t('apiTesting.tabs.history', '运行历史')}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="collections" className="min-h-[200px] overflow-visible">
              <div className="max-h-[calc(100vh-320px)] overflow-auto space-y-2">
                {collections.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <FolderSearch className="h-10 w-10 mb-2" />
                    <p>{t('apiTesting.empty.noCollections', '没有可用的API集合')}</p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => fetchCollections()}
                      className="mt-2"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {t('apiTesting.actions.refreshList', '刷新列表')}
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-[calc(100vh-360px)]">
                    {collections.map((collection) => (
                      <div 
                        key={collection.id || collection._id}
                        className={`rounded-lg border bg-card text-card-foreground shadow-sm cursor-pointer transition-colors hover:bg-gray-50 p-4 mb-2 ${isRunning ? 'opacity-50 pointer-events-none' : ''}`} 
                        onClick={isRunning ? undefined : () => {
                          const id = collection.id || collection._id;
                          setSelectedCollectionId(id || "");
                          setSelectedCollectionName(collection.name);
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-medium">{collection.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {collection.requests?.length || 0} {t('apiTesting.collection.requests', '请求')}
                            </p>
                          </div>
                          {(collection.id || collection._id) === selectedCollectionId && (
                            <Button 
                              size="sm"
                              variant="outline" 
                              className="ml-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenRunDialog();
                              }}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              {t('apiTesting.actions.run', '运行')}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                )}
              </div>
            </TabsContent>

            <TabsContent value="history">
              {hasResults && (
                <div className="mb-6">
                  <h3 className="font-medium mb-2">{t('apiTesting.results.recent', '最近运行结果')}</h3>
                  <CollectionRunResults results={runResults} onClose={closeResults} />
                </div>
              )}
              
              <Separator className="my-4" />

              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-medium">{t('apiTesting.results.history', '运行历史')}</h3>
                  {(() => {
                    const storageInfo = getStorageInfo();
                    return storageInfo && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {storageInfo.count} {t('apiTesting.history.records', '条记录，占用')} {storageInfo.size} KB
                      </p>
                    );
                  })()}
                </div>
                {runHistory.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearHistory}
                    className="text-red-600 hover:text-red-700"
                  >
                    {t('apiTesting.actions.clearHistory', '清理历史')}
                  </Button>
                )}
              </div>
              <div className="space-y-4">
                {runHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <History className="h-10 w-10 mb-2" />
                    <p>{t('apiTesting.empty.noHistory', '没有运行历史记录')}</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[calc(100vh-420px)]">
                    {runHistory.map((item) => {
                      // 兼容新旧数据格式
                      const totalRequests = item.totalRequests || item.results?.length || 0;
                      const successCount = item.successCount || item.results?.filter(r => r.status >= 200 && r.status < 300).length || 0;
                      const failedCount = (item.failedResults?.length || 0) + (item.results?.filter(r => r.status >= 400 || r.status === 0).length || 0);

                      return (
                        <div
                          key={item.id}
                          className="p-4 rounded-md mb-2 border cursor-pointer hover:bg-muted"
                          onClick={() => {
                            // 如果有完整结果，显示完整结果；否则只显示失败的结果
                            if (item.results) {
                              setRunResults(item.results);
                            } else if (item.failedResults) {
                              // 为精简数据创建临时的ApiResult格式用于显示
                              const tempResults = item.failedResults.map(failed => ({
                                requestId: '',
                                requestName: failed.requestName,
                                url: failed.url,
                                method: 'GET',
                                status: failed.status,
                                statusText: failed.status >= 400 ? 'Error' : 'Unknown',
                                error: failed.error || '',
                                responseTime: 0,
                                responseSize: 0,
                                responseHeaders: {},
                                responseBody: failed.error || '请求失败',
                                timestamp: item.timestamp,
                                proxyInfo: failed.proxyInfo
                              }));
                              setRunResults(tempResults as ApiResult[]);
                            }
                            setHasResults(true);
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <h3 className="font-medium">{item.collectionName}</h3>
                              <span className="text-xs text-muted-foreground">{item.timestamp}</span>
                          </div>
                          <div className="mt-2 flex items-center text-sm">
                            <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                            <span className="mr-4">{t('apiTesting.results.success', '已完成')}: {successCount}</span>
                            <span className="mx-2">|</span>
                            <XCircle className="h-4 w-4 mr-1 text-red-500" />
                            <span>{t('apiTesting.results.failed', '失败')}: {failedCount}</span>
                            <span className="mx-2">|</span>
                            <span className="text-muted-foreground">{t('apiTesting.results.total', '总计')}: {totalRequests}</span>
                          </div>
                        </div>
                      );
                    })}
                  </ScrollArea>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 运行集合对话框 */}
      <RunCollectionDialog
        open={dialogOpen}
        onOpenChange={(open) => setDialogOpen(open)}
        collectionId={selectedCollectionId || ''}
        onRun={(options) => handleRunCollection(options)}
      />
    </div>
  );
}
