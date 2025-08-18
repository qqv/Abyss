'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { 
  Database, 
  Download, 
  Upload, 
  Trash2,
  RefreshCw,
  FileText,
  Archive,
  AlertTriangle,
  CheckCircle,
  FolderOpen,
  HardDrive
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ExportData {
  collections: number;
  environments: number;
  testResults: number;
  proxyConfigs: number;
  totalSize: string;
}

const DataManagement: React.FC = () => {
  const { toast } = useToast();
  const { t } = useTranslation('common');
  const [isLoading, setIsLoading] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [importProgress, setImportProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('export');
  const [dataStatsLoading, setDataStatsLoading] = useState(true);

  // 真实数据统计
  const [dataStats, setDataStats] = useState<ExportData>({
    collections: 0,
    environments: 0,
    testResults: 0,
    proxyConfigs: 0,
    totalSize: '0 B'
  });

  // 获取数据统计
  const fetchDataStats = async () => {
    try {
      setDataStatsLoading(true);
      const response = await fetch('/api/v1/data/stats');
      const result = await response.json();
      
      if (result.success) {
        setDataStats(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch data stats');
      }
    } catch (error) {
      console.error('Error fetching data stats:', error);
      toast({
        title: t('data.toast.statsFailedTitle', '获取数据统计失败'),
        description: t('data.toast.statsFailedDesc', '无法获取数据统计信息'),
        variant: 'destructive',
      });
    } finally {
      setDataStatsLoading(false);
    }
  };

  // 组件挂载时获取数据统计
  useEffect(() => {
    fetchDataStats();
  }, []);

  // 导出数据
  const handleExportData = async (type: 'all' | 'collections' | 'environments' | 'results' | 'proxies', format: 'json' | 'csv' = 'json') => {
    setIsLoading(true);
    setExportProgress(0);
    
    try {
      // 模拟导出进度
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 10;
        });
      }, 200);

      // 调用导出API
      const response = await fetch('/api/v1/data/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, format }),
      });

      clearInterval(progressInterval);
      setExportProgress(100);

      if (!response.ok) {
        throw new Error('Export request failed');
      }

      // 获取文件名
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `abyss-${type}-${new Date().toISOString().split('T')[0]}.${format}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // 下载文件
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: t('data.toast.exportSuccessTitle', '导出成功'),
        description: t('data.toast.exportSuccessDesc', '{{which}}已成功导出', { which: type === 'all' ? t('data.all', '所有数据') : t('data.selected', '选定数据') }),
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: t('data.toast.exportFailedTitle', '导出失败'),
        description: t('data.toast.exportFailedDesc', '导出过程中发生错误，请重试'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setExportProgress(0);
    }
  };

  // 导入数据
  const handleImportData = async (file: File) => {
    setIsLoading(true);
    setImportProgress(0);
    
    try {
      // 模拟导入进度
      const progressInterval = setInterval(() => {
        setImportProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 15;
        });
      }, 300);

      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 读取文件内容
      const fileContent = await file.text();
      const importData = JSON.parse(fileContent);
      
      // 验证数据格式
      if (!importData || typeof importData !== 'object') {
        throw new Error('无效的数据格式');
      }

      toast({
        title: t('data.toast.importSuccessTitle', '导入成功'),
        description: t('data.toast.importSuccessDesc', '已成功导入数据文件: {{name}}', { name: file.name }),
      });
    } catch (error) {
      toast({
        title: t('data.toast.importFailedTitle', '导入失败'),
        description: error instanceof Error ? error.message : t('data.toast.importFailedDesc', '导入过程中发生错误'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setImportProgress(0);
    }
  };

  // 清理数据
  const handleClearData = async (type: 'cache' | 'logs' | 'history' | 'all') => {
    setIsLoading(true);
    
    try {
      // 调用清理API
      const response = await fetch('/api/v1/data/clear', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Clear request failed');
      }

      toast({
        title: t('data.toast.clearSuccessTitle', '清理成功'),
        description: result.message || t('data.toast.cleared', '数据已清理'),
      });

      // 清理完成后刷新数据统计
      await fetchDataStats();
    } catch (error) {
      console.error('Clear error:', error);
      toast({
        title: t('data.toast.clearFailedTitle', '清理失败'),
        description: t('data.toast.clearFailedDesc', '清理过程中发生错误'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h2 className="text-xl font-semibold flex items-center space-x-2">
          <Database className="h-5 w-5" />
          <span>{t('data.title', '数据管理')}</span>
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t('data.subtitle', '导入导出数据、备份恢复和数据清理')}
        </p>
      </div>

      {/* 数据统计 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <HardDrive className="h-4 w-4" />
            <span>{t('data.stats.title', '数据统计')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dataStatsLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>{t('data.stats.loading', '正在加载数据统计...')}</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{dataStats.collections}</div>
                  <div className="text-sm text-muted-foreground">{t('data.stats.collections', 'API集合')}</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{dataStats.environments}</div>
                  <div className="text-sm text-muted-foreground">{t('data.stats.environments', '环境配置')}</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{dataStats.testResults}</div>
                  <div className="text-sm text-muted-foreground">{t('data.stats.results', '测试结果')}</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{dataStats.proxyConfigs}</div>
                  <div className="text-sm text-muted-foreground">{t('data.stats.proxyConfigs', '代理配置')}</div>
                </div>
              </div>
              <div className="mt-4 text-center">
                <span className="text-sm text-muted-foreground">{t('data.stats.total', '总数据大小: ')}</span>
                <span className="font-medium">{dataStats.totalSize}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchDataStats}
                  className="ml-2"
                  disabled={dataStatsLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${dataStatsLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="export">{t('data.tabs.export', '数据导出')}</TabsTrigger>
          <TabsTrigger value="cleanup">{t('data.tabs.cleanup', '数据清理')}</TabsTrigger>
        </TabsList>

        {/* 数据导出 */}
        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Download className="h-4 w-4" />
                <span>{t('data.export.title', '导出数据')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {exportProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t('data.export.progress', '导出进度')}</span>
                    <span>{exportProgress}%</span>
                  </div>
                  <Progress value={exportProgress} />
                </div>
              )}
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    onClick={() => handleExportData('all')}
                    disabled={isLoading}
                    className="h-auto p-4 flex flex-col items-center space-y-2"
                  >
                    <Archive className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-medium">{t('data.export.all', '导出所有数据')}</div>
                      <div className="text-xs opacity-80">{t('data.export.allDesc', '包含所有集合、环境、结果等')}</div>
                    </div>
                  </Button>
                  
                  <Button
                    onClick={() => handleExportData('collections')}
                    disabled={isLoading}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center space-y-2"
                  >
                    <FolderOpen className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-medium">{t('data.export.collections', '导出API集合')}</div>
                      <div className="text-xs opacity-80">{t('data.export.collectionsDesc', '仅导出API集合数据')}</div>
                    </div>
                  </Button>
                  
                  <Button
                    onClick={() => handleExportData('environments')}
                    disabled={isLoading}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center space-y-2"
                  >
                    <Database className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-medium">{t('data.export.environments', '导出环境配置')}</div>
                      <div className="text-xs opacity-80">{t('data.export.environmentsDesc', '仅导出环境变量')}</div>
                    </div>
                  </Button>
                  
                  <Button
                    onClick={() => handleExportData('results')}
                    disabled={isLoading}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center space-y-2"
                  >
                    <FileText className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-medium">{t('data.export.results', '导出测试结果')}</div>
                      <div className="text-xs opacity-80">{t('data.export.resultsDesc', '仅导出测试历史')}</div>
                    </div>
                  </Button>
                </div>
                
                <div className="flex items-center space-x-4 p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm font-medium">{t('data.export.format', '导出格式:')}</span>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {/* TODO: 可以添加格式选择逻辑 */}}
                      className="text-xs"
                    >
                      JSON
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {/* TODO: 可以添加CSV格式选择 */}}
                      className="text-xs"
                    >
                      CSV
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-4 w-4" />
                <span>{t('data.import.title', '导入数据')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {t('data.import.warning', '导入数据将会覆盖现有的同名数据，请确保已备份重要数据。')}
                </AlertDescription>
              </Alert>
              
              {importProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t('data.import.progress', '导入进度')}</span>
                    <span>{importProgress}%</span>
                  </div>
                  <Progress value={importProgress} />
                </div>
              )}
              
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <div className="space-y-2">
                  <p className="text-lg font-medium">{t('data.import.pickFile', '选择要导入的数据文件')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('data.import.supported', '支持 JSON 格式的数据文件')}
                  </p>
                </div>
                <Input
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleImportData(file);
                    }
                  }}
                  disabled={isLoading}
                  className="mt-4 max-w-xs mx-auto"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent> */}

        {/* 数据清理 */}
        <TabsContent value="cleanup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trash2 className="h-4 w-4" />
                <span>{t('data.cleanup.title', '数据清理')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {t('data.cleanup.warning', '数据清理操作不可撤销，请谨慎操作。建议在清理前先导出备份。')}
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={() => handleClearData('cache')}
                  disabled={isLoading}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center space-y-2"
                >
                  <RefreshCw className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">{t('data.cleanup.cache', '清理缓存')}</div>
                    <div className="text-xs opacity-80">{t('data.cleanup.cacheDesc', '清理临时缓存数据')}</div>
                  </div>
                </Button>
                
                <Button
                  onClick={() => handleClearData('logs')}
                  disabled={isLoading}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center space-y-2"
                >
                  <FileText className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">{t('data.cleanup.logs', '清理日志')}</div>
                    <div className="text-xs opacity-80">{t('data.cleanup.logsDesc', '清理所有日志记录')}</div>
                  </div>
                </Button>
                
                <Button
                  onClick={() => handleClearData('history')}
                  disabled={isLoading}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center space-y-2"
                >
                  <Archive className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">{t('data.cleanup.history', '清理历史记录')}</div>
                    <div className="text-xs opacity-80">{t('data.cleanup.historyDesc', '清理测试历史记录')}</div>
                  </div>
                </Button>
                
                <Button
                  onClick={() => handleClearData('all')}
                  disabled={isLoading}
                  variant="destructive"
                  className="h-auto p-4 flex flex-col items-center space-y-2"
                >
                  <Trash2 className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">{t('data.cleanup.all', '清理所有临时数据')}</div>
                    <div className="text-xs opacity-80">{t('data.cleanup.allDesc', '清理缓存、日志和历史')}</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DataManagement;
