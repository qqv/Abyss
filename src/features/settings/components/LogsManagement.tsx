'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from '@/components/ui/pagination';
import { 
  FileText, 
  Download, 
  Trash2, 
  Search, 
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: 'api' | 'proxy' | 'system';
  message: string;
  details?: any;
}

interface LogsSettings {
  enableApiLogs: boolean;
  enableProxyLogs: boolean;
  enableSystemLogs: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  retentionDays: number;
  maxLogSize: number; // MB
}

const LogsManagement: React.FC = () => {
  const { toast } = useToast();
  const { t } = useTranslation('common');
  const [activeTab, setActiveTab] = useState('view');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  
  // 日志设置
  const [settings, setSettings] = useState<LogsSettings>({
    enableApiLogs: true,
    enableProxyLogs: true,
    enableSystemLogs: true,
    logLevel: 'info',
    retentionDays: 30,
    maxLogSize: 100
  });

  // 日志数据
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage] = useState(50);

  // 加载设置和日志
  useEffect(() => {
    loadSettings();
    loadLogs();
  }, []);

  // 当过滤条件或分页改变时重新加载日志
  useEffect(() => {
    loadLogs();
  }, [searchTerm, filterLevel, filterCategory, currentPage]);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/v1/logs/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSettings(data.data);
        }
      } else {
        // 如果API不可用，尝试从localStorage加载
        const savedSettings = localStorage.getItem('abyss-logs-settings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          setSettings(prev => ({ ...prev, ...parsed }));
        }
      }
    } catch (error) {
      console.error('加载日志设置失败:', error);
      // 回退到localStorage
      try {
        const savedSettings = localStorage.getItem('abyss-logs-settings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          setSettings(prev => ({ ...prev, ...parsed }));
        }
      } catch (localError) {
        console.error('从本地存储加载设置失败:', localError);
      }
    }
  };

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: logsPerPage.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(filterLevel !== 'all' && { level: filterLevel }),
        ...(filterCategory !== 'all' && { category: filterCategory })
      });

      const response = await fetch(`/api/v1/logs?${params}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLogs(data.data);
          setTotalLogs(data.pagination.total);
        } else {
          throw new Error(data.error || '获取日志失败');
        }
      } else {
        throw new Error('网络请求失败');
      }
    } catch (error) {
      console.error('加载日志失败:', error);
      toast({
        title: '加载失败',
        description: '无法加载日志数据',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 由于过滤在服务器端进行，这里直接使用logs
  const filteredLogs = logs;

  // 获取日志级别样式
  const getLevelBadgeVariant = (level: string) => {
    switch (level) {
      case 'error': return 'destructive';
      case 'warn': return 'secondary';
      case 'info': return 'default';
      case 'debug': return 'outline';
      default: return 'default';
    }
  };

  // 获取日志级别图标
  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <XCircle className="h-4 w-4" />;
      case 'warn': return <AlertCircle className="h-4 w-4" />;
      case 'info': return <CheckCircle className="h-4 w-4" />;
      case 'debug': return <Clock className="h-4 w-4" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  // 导出日志
  const handleExportLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        format: 'json',
        ...(searchTerm && { search: searchTerm }),
        ...(filterLevel !== 'all' && { level: filterLevel }),
        ...(filterCategory !== 'all' && { category: filterCategory })
      });

      const response = await fetch(`/api/v1/logs/export?${params}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // 从响应头获取文件名
        const contentDisposition = response.headers.get('content-disposition');
        const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || 
                        `abyss-logs-${new Date().toISOString().split('T')[0]}.json`;
        
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
        
        toast({
          title: t('logs.toast.exportSuccessTitle', '导出成功'),
          description: t('logs.toast.exportSuccessDesc', '日志已成功导出'),
        });
      } else {
        throw new Error('导出请求失败');
      }
    } catch (error) {
      console.error('导出日志失败:', error);
      toast({
        title: t('logs.toast.exportFailedTitle', '导出失败'),
        description: t('logs.toast.exportFailedDesc', '导出日志时发生错误'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 清理日志
  const handleClearLogs = async () => {
    if (!confirm('确定要清理所有日志吗？此操作不可撤销。')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/logs', {
        method: 'DELETE'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLogs([]);
          setTotalLogs(0);
          toast({
            title: t('logs.toast.clearSuccessTitle', '清理成功'),
            description: t('logs.toast.clearSuccessDesc', '所有日志已清理'),
          });
        } else {
          throw new Error(data.error || '清理日志失败');
        }
      } else {
        throw new Error('网络请求失败');
      }
    } catch (error) {
      console.error('清理日志失败:', error);
      toast({
        title: t('logs.toast.clearFailedTitle', '清理失败'),
        description: t('logs.toast.clearFailedDesc', '清理日志时发生错误'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 保存设置
  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/logs/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // 同时保存到localStorage作为备份
          localStorage.setItem('abyss-logs-settings', JSON.stringify(settings));
          
          toast({
            title: '设置已保存',
            description: '日志设置已成功保存',
          });
        } else {
          throw new Error(data.error || '保存设置失败');
        }
      } else {
        throw new Error('网络请求失败');
      }
    } catch (error) {
      console.error('保存设置失败:', error);
      // 即使API失败也要保存到localStorage
      try {
        localStorage.setItem('abyss-logs-settings', JSON.stringify(settings));
        toast({
          title: '设置已保存到本地',
          description: '服务器不可用，设置已保存到本地存储',
          variant: 'default',
        });
      } catch (localError) {
        toast({
          title: '保存失败',
          description: '保存设置时发生错误',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h2 className="text-xl font-semibold flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>{t('logs.title', '日志管理')}</span>
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t('logs.subtitle', '查看、管理和配置系统日志')}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="view">{t('logs.tabs.view', '查看日志')}</TabsTrigger>
          <TabsTrigger value="settings">{t('logs.tabs.settings', '日志设置')}</TabsTrigger>
        </TabsList>

        {/* 查看日志 */}
        <TabsContent value="view" className="space-y-4">
          {/* 搜索和过滤 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('logs.searchPlaceholder', '搜索日志...')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterLevel} onValueChange={setFilterLevel}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                     <SelectItem value="all">{t('logs.level.all', '所有级别')}</SelectItem>
                     <SelectItem value="error">{t('logs.level.error', '错误')}</SelectItem>
                     <SelectItem value="warn">{t('logs.level.warn', '警告')}</SelectItem>
                     <SelectItem value="info">{t('logs.level.info', '信息')}</SelectItem>
                     <SelectItem value="debug">{t('logs.level.debug', '调试')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                     <SelectItem value="all">{t('logs.category.all', '所有类别')}</SelectItem>
                     <SelectItem value="api">API</SelectItem>
                     <SelectItem value="proxy">{t('logs.category.proxy', '代理')}</SelectItem>
                     <SelectItem value="system">{t('logs.category.system', '系统')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleExportLogs}
                  disabled={isLoading}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                   <span>{t('logs.export', '导出')}</span>
                </Button>
                <Button
                  onClick={handleClearLogs}
                  disabled={isLoading}
                  variant="destructive"
                  className="flex items-center space-x-2"
                >
                  <Trash2 className="h-4 w-4" />
                   <span>{t('logs.clear', '清理')}</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 日志列表 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{t('logs.records', '日志记录 ({{count}})', { count: filteredLogs.length })}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadLogs}
                  disabled={isLoading}
                  className="flex items-center space-x-1"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                   <span>{t('logs.refresh', '刷新')}</span>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50"
                    >
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        {getLevelIcon(log.level)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge variant={getLevelBadgeVariant(log.level)}>
                              {log.level.toUpperCase()}
                            </Badge>
                            <Badge variant="outline">
                              {log.category.toUpperCase()}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {log.timestamp}
                            </span>
                          </div>
                          <p className="text-sm">{log.message}</p>
                          {log.details && (
                            <pre className="text-xs text-muted-foreground mt-1 bg-muted p-2 rounded overflow-x-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                   {filteredLogs.length === 0 && !isLoading && (
                    <div className="text-center py-8 text-muted-foreground">
                       {t('logs.noMatch', '没有找到匹配的日志记录')}
                    </div>
                  )}
                  {isLoading && (
                    <div className="text-center py-8 text-muted-foreground">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      加载中...
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              {/* 分页控件 */}
              {totalLogs > logsPerPage && (
                <div className="mt-4 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                          className={currentPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: Math.min(5, Math.ceil(totalLogs / logsPerPage)) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => currentPage < Math.ceil(totalLogs / logsPerPage) && setCurrentPage(currentPage + 1)}
                          className={currentPage >= Math.ceil(totalLogs / logsPerPage) ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 日志设置 */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('logs.settings.title', '日志记录设置')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('logs.settings.api', 'API请求日志')}</Label>
                    <p className="text-sm text-muted-foreground">{t('logs.settings.apiDesc', '记录所有API请求和响应')}</p>
                  </div>
                  <Switch
                    checked={settings.enableApiLogs}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, enableApiLogs: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('logs.settings.proxy', '代理池日志')}</Label>
                    <p className="text-sm text-muted-foreground">{t('logs.settings.proxyDesc', '记录代理池操作和状态')}</p>
                  </div>
                  <Switch
                    checked={settings.enableProxyLogs}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, enableProxyLogs: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('logs.settings.system', '系统日志')}</Label>
                    <p className="text-sm text-muted-foreground">{t('logs.settings.systemDesc', '记录系统操作和错误')}</p>
                  </div>
                  <Switch
                    checked={settings.enableSystemLogs}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, enableSystemLogs: checked }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('logs.config.title', '日志配置')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('logs.config.level', '日志级别')}</Label>
                  <Select
                    value={settings.logLevel}
                    onValueChange={(value: any) => 
                      setSettings(prev => ({ ...prev, logLevel: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                       <SelectItem value="debug">{t('logs.level.debug', '调试')} (Debug)</SelectItem>
                       <SelectItem value="info">{t('logs.level.info', '信息')} (Info)</SelectItem>
                       <SelectItem value="warn">{t('logs.level.warn', '警告')} (Warn)</SelectItem>
                       <SelectItem value="error">{t('logs.level.error', '错误')} (Error)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('logs.config.retention', '保留天数')}</Label>
                  <Input
                    type="number"
                    min="1"
                    max="365"
                    value={settings.retentionDays}
                    onChange={(e) => 
                      setSettings(prev => ({ 
                        ...prev, 
                        retentionDays: parseInt(e.target.value) || 30 
                      }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('logs.config.maxSize', '最大日志文件大小 (MB)')}</Label>
                <Input
                  type="number"
                  min="10"
                  max="1000"
                  value={settings.maxLogSize}
                  onChange={(e) => 
                    setSettings(prev => ({ 
                      ...prev, 
                      maxLogSize: parseInt(e.target.value) || 100 
                    }))
                  }
                  className="w-32"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={handleSaveSettings}
              disabled={isLoading}
              className="flex items-center space-x-2"
            >
              {isLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
              <span>{isLoading ? t('actions.saving', '保存中...') : t('actions.save', '保存设置')}</span>
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LogsManagement;
