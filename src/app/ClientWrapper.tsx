"use client";

import { useState, useEffect } from "react";
import ApiCollectionView from "@/components/api-collection-view";
import ScanResultsView from "@/components/scan-results-view";
import { ProxyPoolPanel } from "@/features/proxy-pool/components";
import { ApiTestPanel } from "@/features/api-testing/components";
import SystemSettings from "@/features/settings/components/SystemSettings";
import { ApiCollection, ApiScanJob, ApiResult } from "@/lib/api-data";
import { fetchApiJobs } from "@/components/services/job-service";
import { v4 as uuidv4 } from "uuid";

// API平台视图模式
export type ViewMode = "api" | "scan-results" | "proxy-pool" | "tunnel-management" | "proxy-settings" | "api-testing" | "env-management" | "system-settings";

export interface ClientWrapperProps {
  children?: React.ReactNode;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  currentApiTestTab?: 'collections' | 'history';
  onApiTestTabChange?: (tab: 'collections' | 'history') => void;
  onProxyTabChange?: (tab: string) => void;
}

export default function ClientWrapper({
  children,
  viewMode = "api",
  onViewModeChange,
  currentApiTestTab = 'collections',
  onApiTestTabChange,
  onProxyTabChange
}: ClientWrapperProps): JSX.Element {
  // API扫描状态
  const [apiJobs, setApiJobs] = useState<ApiScanJob[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentJobId, setCurrentJobId] = useState<string | undefined>(undefined);
  // API测试初始标签页
  const [apiTestInitialTab, setApiTestInitialTab] = useState<'collections' | 'history'>('collections');

  // 代理池当前标签页
  const [currentProxyTab, setCurrentProxyTab] = useState<string>('proxies');
  
  // 代理和隧道数据
  const [proxies, setProxies] = useState<any[]>([]);
  const [proxyLoading, setProxyLoading] = useState<boolean>(false);
  
  // 从API获取作业数据
  useEffect(() => {
    const loadJobs = async () => {
      setLoading(true);
      try {
        const jobs = await fetchApiJobs();
        setApiJobs(jobs);
        
        // 如果有作业数据，选择第一个作业
        if (jobs.length > 0 && !currentJobId) {
          setCurrentJobId(jobs[0].id);
        }
      } catch (error) {
        console.error('加载API测试作业失败:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadJobs();
    
    // 每5分钟刷新一次
    const interval = setInterval(loadJobs, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  
  // 获取代理数据
  useEffect(() => {
    const loadProxies = async () => {
      if (viewMode === 'tunnel-management' || viewMode === 'proxy-pool') {
        try {
          setProxyLoading(true);
          const response = await fetch('/api/v1/proxies');
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          const data = await response.json();
          setProxies(data.proxies || []);
        } catch (error) {
          console.error('Failed to load proxies:', error);
        } finally {
          setProxyLoading(false);
        }
      }
    };

    loadProxies();
  }, [viewMode]);
  
  // API集合状态
  const [collections, setCollections] = useState<ApiCollection[]>([]);
  
  // 当前选择的集合
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | undefined>();

  // API扫描相关处理函数
  const handleCollectionSelect = (collectionId: string) => {
    setSelectedCollectionId(collectionId);
  };
  
  const handleJobSelect = (jobId: string) => {
    setCurrentJobId(jobId);
  };

  // Handle view mode change
  const handleViewModeChange = (mode: ViewMode) => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    }
  };

  // Handle proxy tab change
  const handleProxyTabChange = (tab: string) => {
    setCurrentProxyTab(tab);
    if (onProxyTabChange) {
      onProxyTabChange(tab);
    }
  };
  
  // Run API collection
  const handleRunCollection = (collectionId: string, parameterSetId?: string) => {
    // 生成一个唯一ID
    const jobId = uuidv4();
    
    // Create a new scan job
    const newJob: ApiScanJob = {
      _id: jobId,             // 添加标准的_id字段
      id: jobId,              // 保留id字段作为兼容
      name: `扫描任务 ${new Date().toLocaleString()}`,
      collectionId,
      parameterSetId: parameterSetId || '',  // 确保不会是undefined
      concurrency: 2, // 默认并发数
      status: "running",
      progress: 0,
      startTime: new Date().toISOString(),
      endTime: null,
      results: []
    };
    
    setApiJobs(prev => [newJob, ...prev]);
    setCurrentJobId(jobId);
    
    // Switch to scan results view
    if (onViewModeChange) {
      onViewModeChange("scan-results");
    }
    
    // Simulate job progress
    simulateJobProgress(jobId);
  };
  
  // View scan results
  const handleViewResults = (jobId: string) => {
    setCurrentJobId(jobId);
    
    if (onViewModeChange) {
      onViewModeChange("scan-results");
    }
  };
  
  useEffect(() => {
    if (viewMode === "api-testing") {
      // 检查是否有从侧边栏设置的标签页
      const initialTabFromSidebar = localStorage.getItem('api-test-initial-tab');
      if (initialTabFromSidebar === 'history') {
        setApiTestInitialTab('history');
        // 清除标志，防止下次访问时仍然跳转到历史页面
        localStorage.removeItem('api-test-initial-tab');
      } else if (initialTabFromSidebar === 'collections') {
        setApiTestInitialTab('collections');
        localStorage.removeItem('api-test-initial-tab');
      } else {
        // 如果存在创建模式标志，则设置初始标签页为"collections"
        const createMode = localStorage.getItem('api-test-create-mode');
        if (createMode === 'true') {
          setApiTestInitialTab('collections');
          // 清除标志，防止下次访问时仍然跳转到创建页面
          localStorage.removeItem('api-test-create-mode');
        } else {
          // 默认显示集合页面
          setApiTestInitialTab('collections');
        }
      }
    }

    // 处理代理池相关的视图模式
    if (viewMode === "proxy-pool") {
      setCurrentProxyTab('proxies');
    } else if (viewMode === "tunnel-management") {
      setCurrentProxyTab('tunnels');
    } else if (viewMode === "proxy-settings") {
      setCurrentProxyTab('settings');
    }
  }, [viewMode]);

  // 添加一个新的useEffect来监听currentApiTestTab的变化
  useEffect(() => {
    if (viewMode === "api-testing") {
      setApiTestInitialTab(currentApiTestTab);
    }
  }, [currentApiTestTab, viewMode]);
  
  // Simulate job progress (for demo purposes only)
  const simulateJobProgress = (jobId: string) => {
    const interval = setInterval(() => {
      setApiJobs(prev => {
        const updatedJobs = prev.map(job => {
          if (job.id === jobId) {
            const newProgress = Math.min(100, (job.progress || 0) + 10);
            const isComplete = newProgress >= 100;
            
            return {
              ...job,
              progress: newProgress,
              status: isComplete ? "completed" as const : "running" as const,
              endTime: isComplete ? new Date().toISOString() : null,
              // In a real app, we would update results as they come in
              results: isComplete ? mockApiResults(job) : job.results
            };
          }
          return job;
        });
        
        const job = updatedJobs.find(j => j.id === jobId);
        if (job && job.status === "completed") {
          clearInterval(interval);
        }
        
        return updatedJobs;
      });
    }, 500);
  };
  
  // Mock API results (would be real results in a production app)
  const mockApiResults = (job: ApiScanJob) => {
    // Generate between 5-15 random results
    const resultCount = Math.floor(Math.random() * 10) + 5;
    const results: ApiResult[] = [];
    const baseTime = new Date().getTime();
    
    for (let i = 0; i < resultCount; i++) {
      const statusCode = [200, 201, 400, 404, 500, 429][Math.floor(Math.random() * 6)];
      // 为每个结果设置不同的时间戳，模拟真实的执行时间间隔
      const executionTime = new Date(baseTime + (i * 1000) + Math.random() * 500); // 每个请求间隔1-1.5秒
      
      results.push({
        requestId: `req-${uuidv4()}`,
        requestName: `测试请求 ${i + 1}`,
        url: `https://api.example.com/endpoint${i}`,
        method: ["GET", "POST", "PUT"][Math.floor(Math.random() * 3)] as any,
        status: statusCode,
        statusText: getStatusText(statusCode),
        responseTime: Math.floor(Math.random() * 1000) + 50, // 50-1050ms
        responseSize: Math.floor(Math.random() * 5000) + 500,
        responseHeaders: { "Content-Type": "application/json" },
        responseBody: JSON.stringify({ result: `data-${i}`, success: statusCode < 400 }),
        parameterValues: {
          "domain": [`example${i}.com`, "test.org", "demo.net"][i % 3],
          "userId": `user${i + 1}`,
          "apiKey": `key-${Math.floor(Math.random() * 1000)}`
        },
        timestamp: executionTime.toISOString(),
        // 模拟网络错误
        isNetworkError: statusCode === 0 ? true : undefined,
        testResults: i % 3 === 0 ? [{
          name: "验证响应状态码",
          passed: statusCode < 400,
          error: statusCode >= 400 ? "Status code indicates error" : undefined,
          duration: Math.floor(Math.random() * 50)
        }, {
          name: "验证响应数据",
          passed: statusCode === 200 && Math.random() > 0.3,
          error: Math.random() > 0.7 ? "Data validation failed" : undefined,
          duration: Math.floor(Math.random() * 30)
        }] : undefined,
        ...(i % 5 === 0 ? { error: "Connection timeout" } : {})
      });
    }
    
    console.log(`🎭 生成模拟结果 ${results.length} 个，时间范围:`, {
      first: results[0]?.timestamp,
      last: results[results.length - 1]?.timestamp,
      responseTimeRange: `${Math.min(...results.map(r => r.responseTime))}-${Math.max(...results.map(r => r.responseTime))}ms`
    });
    
    return results;
  };

  // 获取HTTP状态码对应的文本
  const getStatusText = (statusCode: number): string => {
    const statusTexts: Record<number, string> = {
      200: "OK",
      201: "Created",
      400: "Bad Request",
      404: "Not Found",
      500: "Internal Server Error"
    };
    return statusTexts[statusCode] || "Unknown";
  };

  // 处理API测试面板标签页变化
  const handleApiTestTabChange = (tab: 'collections' | 'history') => {
    setApiTestInitialTab(tab);
    if (onApiTestTabChange) {
      onApiTestTabChange(tab);
    }
  };

  // 根据视图模式渲染内容
  const renderContent = () => {
    switch (viewMode) {
      case "api":
        return (
          <ApiCollectionView 
            onRunCollection={handleRunCollection}
            onViewResults={handleViewResults}
          />
        );
      case "scan-results":
        return (
          <ScanResultsView 
            jobId={currentJobId} 
            jobs={apiJobs}
            onSelectJob={setCurrentJobId}
          />
        );
      case "proxy-pool":
      case "tunnel-management":
      case "proxy-settings":
        return <ProxyPoolPanel initialTab={currentProxyTab} onTabChange={handleProxyTabChange} />;
      case "api-testing":
        return <ApiTestPanel initialTab={apiTestInitialTab} onTabChange={handleApiTestTabChange} />;
      case "system-settings":
        return <SystemSettings />;
      default:
        return (
          <ApiCollectionView 
            onRunCollection={handleRunCollection}
            onViewResults={handleViewResults}
          />
        );
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-background">
      {renderContent()}
    </div>
  );
}
