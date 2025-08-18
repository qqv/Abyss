"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusCircle, RotateCw, Settings2, Upload, FileUp, Globe, Download, CheckSquare, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import ProxyList from "./ProxyList";
import ProxyForm from "./ProxyForm";
import ProxySettings from "./ProxySettingsNew";
import TunnelList from "./TunnelList";
import { type Proxy, type ProxyPoolConfig, type ProxyStats } from "../types";

// 导入代理服务函数
import {
  fetchProxies,
  fetchProxyConfig,
  fetchProxyStats,
  addProxy as addProxyService,
  deleteProxy as deleteProxyService,
  toggleProxyActive as toggleProxyActiveService,
  testAllProxies as testAllProxiesService,
  updateProxyConfig as updateProxyConfigService,
  bulkAddProxies as bulkAddProxiesService
} from '../services/proxy-service';

interface ProxyPoolPanelProps {
  initialTab?: string;
  onTabChange?: (tab: string) => void;
}

const ProxyPoolPanel: React.FC<ProxyPoolPanelProps> = ({ initialTab = "proxies", onTabChange }) => {
  const { t } = useTranslation('common');
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // 当initialTab发生变化时，更新activeTab并通知父组件
  useEffect(() => {
    setActiveTab(initialTab);
    // 通知父组件当前的tab状态，确保状态同步
    if (onTabChange) {
      onTabChange(initialTab);
    }
  }, [initialTab, onTabChange]);

  // 处理tab切换
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };
  const [showAddProxy, setShowAddProxy] = useState<boolean>(false);
  const [showBulkImport, setShowBulkImport] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  
  // 批量导入相关状态
  const [bulkProxiesText, setBulkProxiesText] = useState<string>("");
  const [externalSourceUrl, setExternalSourceUrl] = useState<string>("");
  const [isBulkImporting, setIsBulkImporting] = useState<boolean>(false);
  const [isLoadingExternalSource, setIsLoadingExternalSource] = useState<boolean>(false);
  const [defaultProtocol, setDefaultProtocol] = useState<string>("http");
  
  // 初始化空数据
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [proxyConfig, setProxyConfig] = useState<ProxyPoolConfig>(() => ({
    // 代理验证设置
    checkProxiesOnStartup: true,
    enableHealthCheck: false,
    proxyHealthCheckInterval: 60, // 60分钟
    maxFailuresBeforeRemoval: 5,
    maxRetries: 3, // 添加缺失的maxRetries属性
    retryDelay: 1000, // 添加缺失的retryDelay属性
    enableConnectionRetry: true, // 添加缺失的enableConnectionRetry属性
    
    // 性能设置
    connectionTimeout: 5000, // 5秒
    requestTimeout: 10000, // 10秒
    maxConcurrentChecks: 10,
    
    // 自动管理设置
    autoRemoveInvalidProxies: false,
    retryFailedProxies: true,
    
    // 日志和监控
    enableDetailedLogging: false,
    keepStatisticsHistory: true,
  }));
  const [stats, setStats] = useState<ProxyStats>({
    totalProxies: 0,
    activeProxies: 0,
    validProxies: 0,
    averageResponseTime: 0
  });
  const [isTestingProxies, setIsTestingProxies] = useState(false);
  const [testProgress, setTestProgress] = useState({ inProgress: false, completed: 0, total: 0 });
  const [selectedProxyIds, setSelectedProxyIds] = useState<string[]>([]);
  
  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // 并行加载数据
        const [proxiesData, configData, statsData] = await Promise.all([
          fetchProxies(),
          fetchProxyConfig(),
          fetchProxyStats()
        ]);
        
        setProxies(proxiesData);
        setProxyConfig(configData);
        setStats(statsData);
        
        // 如果配置启用了启动时检测代理，并且有代理存在，自动开始测试
        if (configData.checkProxiesOnStartup && proxiesData.length > 0) {
          console.log('启动时自动检测代理功能已启用，开始测试代理...');
          // 延迟1秒后开始测试，确保UI已经渲染完成
          setTimeout(() => {
            testProxies('all');
          }, 1000);
        }
      } catch (error) {
        console.error(t('proxyPool.load.errorLog', '加载代理数据失败:'), error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const handleAddProxy = (proxy: Omit<Proxy, "id" | "isActive" | "lastChecked" | "isValid">) => {
    const newProxy: Proxy = {
      ...proxy,
      id: Date.now().toString(),
      isActive: true,
      lastChecked: new Date(),
      isValid: undefined,
    };
    setProxies([...proxies, newProxy]);
    setShowAddProxy(false);
  };

  const handleDeleteProxy = async (id: string) => {
    console.log('开始删除代理', id);
    if (!id) {
      console.error('删除代理失败：无效的ID');
      alert(t('proxyPool.alert.deleteInvalidId', '删除失败：无效的ID'));
      return;
    }

    try {
      // 直接发送请求到后端，不使用服务函数以防出错
      const response = await fetch(`/api/v1/proxies/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
      });

      console.log('删除代理响应：', response.status);
      
      if (response.ok) {
        // 仅在API删除成功后更新UI
        setProxies(proxies.filter((proxy) => proxy.id !== id));
        console.log('删除代理成功，已更新UI');
      } else {
        const errorText = await response.text();
        console.error('删除代理失败：', response.status, errorText);
        alert(t('proxyPool.alert.deleteFailed', '删除代理失败: {{status}}', { status: response.status }));
      }
    } catch (error) {
      console.error('删除代理出错:', error);
      alert(t('proxyPool.alert.deleteError', '删除代理出错，请检查网络连接或服务器状态'));
    }
  };
  
  // 批量删除代理的处理函数
  const handleBatchDeleteProxies = async (ids: string[]) => {
    if (!ids || ids.length === 0) {
      console.error(t('proxyPool.alert.batchDeleteInvalid', '批量删除失败：无效的ID列表'));
      return;
    }
    
    console.log(t('proxyPool.batch.start', '开始批量删除代理，总计{{count}}个'), { count: ids.length });
    
    try {
      // 发送批量删除请求到后端
      const response = await fetch('/api/v1/proxies/batch-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids })
      });
      
      console.log('批量删除代理响应：', response.status);
      
      if (response.ok) {
        // 批量删除成功，更新UI
        setProxies(proxies.filter(proxy => !ids.includes(proxy.id)));
        console.log('批量删除成功，已更新UI');
      } else {
        const errorData = await response.json();
        console.error('批量删除失败：', errorData);
        alert(t('proxyPool.alert.batchDeleteFailed', '批量删除失败: {{msg}}', { msg: errorData.message || response.status }));
      }
    } catch (error) {
      console.error('批量删除出错:', error);
      alert(t('proxyPool.alert.batchDeleteError', '批量删除出错，请检查网络连接或服务器状态'));
    }
  };

  const handleToggleProxyActive = (id: string) => {
    setProxies(
      proxies.map((proxy) =>
        proxy.id === id ? { ...proxy, isActive: !proxy.isActive } : proxy
      )
    );
  };

  // 轮询测试状态的函数
  const pollTestStatus = useCallback(async () => {
    try {
      const { getTestStatus } = await import('../services/proxy-service');
      const status = await getTestStatus();
      
      // 只有当获取到有效状态时才更新
      if (status && typeof status.total === 'number' && typeof status.completed === 'number') {
        setTestProgress(status);
        
        // 如果测试仍然在进行中，继续轮询
        if (status.inProgress && status.total > 0) {
          setTimeout(pollTestStatus, 1000); // 每秒1次轮询
        } else if (status.completed >= status.total && status.total > 0) {
          // 测试完成，重新加载代理列表
          const updatedProxies = await fetchProxies();
          setProxies(updatedProxies);
          setIsTestingProxies(false);
          console.log('代理测试完成');
        }
      } else {
        // 如果状态无效，继续轮询但不重置本地状态
        if (isTestingProxies) {
          setTimeout(pollTestStatus, 1000);
        }
      }
    } catch (error) {
      console.error('轮询测试状态失败:', error);
      // 如果轮询失败，5秒后重试，但只在测试进行中时
      if (isTestingProxies) {
        setTimeout(pollTestStatus, 5000);
      }
    }
  }, [isTestingProxies]);

  const testProxies = async (testType: 'all' | 'selected' | 'invalid' = 'all') => {
    try {
      let proxiesToTest: string[] | undefined;
      let testDescription = t('proxyPool.test.all', '所有代理');
      
      if (testType === 'selected') {
        if (selectedProxyIds.length === 0) {
          alert(t('proxyPool.alert.selectProxies', '请先选择要测试的代理'));
          return;
        }
        proxiesToTest = selectedProxyIds;
        testDescription = t('proxyPool.test.selected', '选中的{{count}}个代理', { count: selectedProxyIds.length });
      } else if (testType === 'invalid') {
        const invalidProxies = proxies.filter(proxy => proxy.isValid === false);
        if (invalidProxies.length === 0) {
          alert(t('proxyPool.alert.noInvalid', '没有无效的代理需要测试'));
          return;
        }
        proxiesToTest = invalidProxies.map(proxy => proxy.id);
        testDescription = t('proxyPool.test.invalid', '无效的{{count}}个代理', { count: invalidProxies.length });
      }
      
      console.log(t('proxyPool.test.start', '开始测试{{desc}}...'), { desc: testDescription });
      
      // 从当前代理列表获取预计的代理总数
      const estimatedTotal = proxiesToTest ? proxiesToTest.length : proxies.filter(p => p.isActive).length; 
      
      // 设置测试标志，使用当前代理数作为初始总数
      setIsTestingProxies(true);
      setTestProgress({ inProgress: true, completed: 0, total: estimatedTotal });
      setProxies(proxies.map(proxy => ({ ...proxy, isTesting: true })));
      
      // 调用API测试代理
      let result;
      if (testType === 'all') {
        result = await testAllProxiesService();
      } else {
        // 调用批量测试API，传递要测试的代理IDs
        const { bulkTestProxies } = await import('../services/proxy-bulk-service');
        await bulkTestProxies(proxiesToTest);
        result = { success: true, proxiesCount: estimatedTotal };
      }
      
      // 如果测试成功启动，等待一小段时间后开始轮询以确保API状态已初始化
      if (result.success) {
        // 等待200ms后开始轮询，让API有时间初始化状态
        setTimeout(() => {
          if (isTestingProxies) {
            pollTestStatus();
          }
        }, 200);
      } else {
        setIsTestingProxies(false);
        setProxies(proxies.map(proxy => ({ ...proxy, isTesting: false })));
        alert(t('proxyPool.alert.testStartFailed', '启动代理测试失败'));
      }
    } catch (error) {
      console.error('测试代理失败:', error);
      alert(t('proxyPool.alert.testError', '测试代理失败，请检查网络连接或服务器状态'));
      
      // 恢复状态
      setIsTestingProxies(false);
      setTestProgress({ inProgress: false, completed: 0, total: 0 });
      setProxies(proxies.map(proxy => ({ ...proxy, isTesting: false })));
    }
  };

  // 包装函数用于处理不同类型的测试
  const handleTestAllProxies = () => testProxies('all');
  const handleTestSelectedProxies = () => testProxies('selected');
  const handleTestInvalidProxies = () => testProxies('invalid');

  const handleUpdateConfig = async (newConfig: Partial<ProxyPoolConfig>) => {
    try {
      // 更新本地状态
      const updatedConfig = { ...proxyConfig, ...newConfig };
      setProxyConfig(updatedConfig);
      
      // 调用API保存配置
      const { updateProxyConfig } = await import('../services/proxy-service');
      const savedConfig = await updateProxyConfig(newConfig);
      
      if (savedConfig) {
        // 如果保存成功，使用服务器返回的配置更新本地状态
        setProxyConfig(savedConfig);
        alert(t('proxyPool.alert.saveSuccess', '设置保存成功！'));
      } else {
        // 如果保存失败，回滚本地状态
        setProxyConfig(proxyConfig);
        alert(t('proxyPool.alert.saveFailed', '设置保存失败，请重试'));
      }
    } catch (error) {
      console.error('保存设置失败:', error);
      // 回滚本地状态
      setProxyConfig(proxyConfig);
      alert(t('proxyPool.alert.saveFailedWithMsg', '设置保存失败: {{msg}}', { msg: error instanceof Error ? error.message : '未知错误' }));
    }
  };

  // 从外部源加载代理
  const handleLoadFromExternalSource = async () => {
    if (!externalSourceUrl.trim()) {
      return;
    }

    try {
      setIsLoadingExternalSource(true);
      
      // 获取外部代理数据
      const response = await fetch(`/api/v1/proxies/fetch-external?url=${encodeURIComponent(externalSourceUrl)}`, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(t('proxyPool.external.loadFailed', '无法加载外部源: {{msg}}', { msg: response.statusText }));
      }

      const data = await response.text();
      
      // 清理和标准化数据
      const cleanedData = processExternalProxyData(data);
      
      // 设置到文本区
      setBulkProxiesText(cleanedData);
      
      // 如果获取成功，清空 URL字段
      setExternalSourceUrl("");
      
    } catch (error) {
      console.error('加载外部代理源失败:', error);
      const errorMsg = error instanceof Error ? error.message : t('proxyPool.common.unknown', '未知错误');
      alert(t('proxyPool.external.loadError', '加载外部代理源失败: {{msg}}', { msg: errorMsg }));
    } finally {
      setIsLoadingExternalSource(false);
    }
  };
  
  // 处理外部代理数据，识别不同格式并标准化
  const processExternalProxyData = (data: string): string => {
    // 按行分割
    const lines = data.split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#')); // 过滤空行和注释
    
    // 标准化每一行
    const standardizedLines = lines.map(line => {
      // 检查是否为 IP:PORT 格式
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/.test(line)) {
        return `${defaultProtocol}://${line}`; // 使用选定的协议
      }
      
      // 检查是否只有IP和端口，用空格或制表符分隔
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}[\s\t]+\d+$/.test(line)) {
        const [ip, port] = line.split(/\s+/);
        return `${defaultProtocol}://${ip}:${port}`;
      }
      
      // 新增：检查是否为 IP:PORT:COUNTRY 格式
      const countryMatch = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d+):(.+)$/.exec(line);
      if (countryMatch) {
        const ip = countryMatch[1];
        const port = countryMatch[2];
        const country = countryMatch[3].trim();
        
        // 验证这不是 IP:PORT:PROTOCOL 格式
        const commonProtocols = ['http', 'https', 'socks4', 'socks5'];
        if (!commonProtocols.includes(country.toLowerCase())) {
          // 这是国家信息，忽略它，只保留IP和端口
          return `${defaultProtocol}://${ip}:${port}`;
        }
      }
      
      // 如果是其他格式，直接保留
      return line;
    });
    
    return standardizedLines.join('\n');
  };

  // 批量导入代理处理函数
  const handleBulkImport = async () => {
    if (!bulkProxiesText.trim()) {
      return;
    }

    try {
      setIsBulkImporting(true);
      
      // 调用批量导入API，传递用户选择的默认协议
      const result = await bulkAddProxiesService(bulkProxiesText, defaultProtocol);
      
      // 显示导入结果
      alert(t('proxyPool.bulk.importResult', '导入完成! 成功: {{s}}, 失败: {{f}}', { s: result.success, f: result.failed }));
      
      // 重新加载代理列表
      const updatedProxies = await fetchProxies();
      setProxies(updatedProxies);
      
      // 清空输入并返回代理列表页
      setBulkProxiesText("");
      setShowBulkImport(false);
    } catch (error) {
      console.error('批量导入失败:', error);
      alert('批量导入失败，请查看控制台日志');
    } finally {
      setIsBulkImporting(false);
    }
  };

  return (
    <div className="flex flex-col">
      <Card className="flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle>{t('proxyPool.title', '代理池管理')}</CardTitle>
          <div className="flex items-center space-x-3">
            {activeTab === "proxies" && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={isTestingProxies}
                      className="relative"
                    >
                      {isTestingProxies ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {t('proxyPool.testing.progress', '测试中 ({{c}}/{{t}})', { c: testProgress.completed, t: testProgress.total })}
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <RotateCw className="mr-2 h-4 w-4" />
                          {t('proxyPool.actions.testProxy', '测试代理')}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={handleTestAllProxies} disabled={isTestingProxies}>
                      <RotateCw className="mr-2 h-4 w-4" />
                      {t('proxyPool.actions.testAll', '测试所有代理')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleTestSelectedProxies} disabled={isTestingProxies || selectedProxyIds.length === 0}>
                      <CheckSquare className="mr-2 h-4 w-4" />
                      {t('proxyPool.actions.testSelected', '测试选中代理 ({{count}})', { count: selectedProxyIds.length })}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleTestInvalidProxies} disabled={isTestingProxies}>
                      <AlertCircle className="mr-2 h-4 w-4" />
                      {t('proxyPool.actions.testInvalid', '测试无效代理')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {/* Add some space */}
                <div className="w-2"></div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("settings")}
                >
                  <Settings2 className="mr-2 h-4 w-4" />
                  {t('proxyPool.tabs.settings', '配置')}
                </Button>
                <div className="w-2"></div>
              </>
            )}
            {activeTab === "proxies" && (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowAddProxy(true)}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {t('proxyPool.tabs.addProxy', '添加代理')}
                </Button>
                <div className="w-2"></div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkImport(true)}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {t('proxyPool.tabs.bulkImport', '批量导入')}
                </Button>
              </>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6 h-[calc(100vh-200px)]">
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="w-full h-full flex flex-col"
          >
              <TabsList className="mb-4 flex-shrink-0">
                <TabsTrigger value="proxies">{t('proxyPool.tabs.proxies', '代理列表')}</TabsTrigger>
                <TabsTrigger value="tunnels">{t('proxyPool.tabs.tunnels', '隧道管理')}</TabsTrigger>
                <TabsTrigger value="settings">{t('proxyPool.tabs.settings', '设置')}</TabsTrigger>
            </TabsList>
            <TabsContent value="proxies" className="overflow-hidden">
              {showAddProxy ? (
                <ProxyForm onSubmit={handleAddProxy} onCancel={() => setShowAddProxy(false)} />
              ) : (
                <ProxyList
                  proxies={proxies}
                  onDelete={handleDeleteProxy}
                  onToggleActive={handleToggleProxyActive}
                  onBatchDelete={handleBatchDeleteProxies}
                  onSelectedProxiesChange={setSelectedProxyIds}
                />
              )}
            </TabsContent>
            <TabsContent value="tunnels" className="overflow-hidden">
              <TunnelList proxies={proxies} />
            </TabsContent>
            <TabsContent value="settings" className="flex-1 overflow-y-auto">
              <ProxySettings
                config={proxyConfig}
                stats={stats}
                onUpdateConfig={handleUpdateConfig}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <Dialog open={showBulkImport} onOpenChange={setShowBulkImport}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('proxyPool.bulk.title', '批量导入代理')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid w-full gap-4">
              <div>
                <Label htmlFor="external-source">{t('proxyPool.bulk.fromExternal', '从外部源导入')}</Label>
                <div className="flex mt-1.5 space-x-2">
                  <Input
                    id="external-source"
                    placeholder={t('proxyPool.bulk.urlPlaceholder', '输入代理列表的网址链接，如 https://raw.githubusercontent.com/...')}
                    value={externalSourceUrl}
                    onChange={(e) => setExternalSourceUrl(e.target.value)}
                    disabled={isLoadingExternalSource}
                    className="flex-1"
                  />
                  <Button 
                    variant="outline" 
                    onClick={handleLoadFromExternalSource}
                    disabled={!externalSourceUrl.trim() || isLoadingExternalSource}
                  >
                    {isLoadingExternalSource ? (
                      <div className="flex items-center">
                        <Download className="mr-2 h-4 w-4 animate-spin" />
                        {t('proxyPool.common.loading', '加载中...')}
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Globe className="mr-2 h-4 w-4" />
                        {t('proxyPool.bulk.loadList', '加载列表')}
                      </div>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t('proxyPool.bulk.example', '例如：https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/http.txt')}</p>
              </div>
              
              <div className="grid grid-cols-5 gap-4 mb-4">
              <div className="col-span-1">
                <Label htmlFor="default-protocol">{t('proxyPool.bulk.defaultProtocol', '默认协议')}</Label>
                <select 
                  id="default-protocol"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1.5"
                  value={defaultProtocol}
                  onChange={(e) => setDefaultProtocol(e.target.value)}
                >
                  <option value="http">HTTP</option>
                  <option value="https">HTTPS</option>
                  <option value="socks4">SOCKS4</option>
                  <option value="socks5">SOCKS5</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">{t('proxyPool.bulk.defaultProtocolTip', '用于没有明确指定协议的地址')}</p>
              </div>
            </div>
            
            <div className="grid w-full gap-1.5">
              <Label htmlFor="bulk-proxies">{t('proxyPool.bulk.list', '代理地址列表')}</Label>
              <Textarea
                id="bulk-proxies"
                placeholder={t('proxyPool.bulk.textPlaceholder', '请输入代理地址，每行一个。支持格式：\nhost:port（将使用上方选择的默认协议）\nhost:port:country（忽略国家信息）\nhttp://host:port\nhttp://username:password@host:port\nhost:port:protocol\nhost:port:protocol:username:password')}
                className="min-h-[200px]"
                value={bulkProxiesText}
                onChange={(e) => setBulkProxiesText(e.target.value)}
                disabled={isBulkImporting}
              />
            </div>
          </div>
          <div className="flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('proxyPool.bulk.supported', '支持的格式：')}</p>
                <ul className="text-xs text-muted-foreground list-disc list-inside">
                  <li>{t('proxyPool.bulk.support1', 'host:port (使用默认协议)')}</li>
                  <li>{t('proxyPool.bulk.support2', 'host:port:country (忽略国家信息)')}</li>
                  <li>protocol://host:port</li>
                  <li>protocol://username:password@host:port</li>
                  <li>host:port:protocol</li>
                  <li>host:port:protocol:username:password</li>
                </ul>
              </div>
              <Button 
                onClick={handleBulkImport} 
                disabled={!bulkProxiesText.trim() || isBulkImporting}
                className="self-end"
              >
                {isBulkImporting ? (
                  <>
                    <FileUp className="mr-2 h-4 w-4 animate-spin" />
                    {t('proxyPool.bulk.importing', '正在导入...')}
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {t('proxyPool.tabs.bulkImport', '批量导入')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProxyPoolPanel;

