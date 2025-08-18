'use client';

import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { RotateCw, Plus, Server, Settings, Trash2, Upload, FileUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ProxyStatusCard } from '@/components/proxy/ProxyStatusCard';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function ProxyPoolPage() {
  const { t } = useTranslation('common');
  const [activeTab, setActiveTab] = useState('proxies');
  const [proxies, setProxies] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [isBatchImporting, setIsBatchImporting] = useState(false);
  const [batchProxiesText, setBatchProxiesText] = useState('');
  const [proxyToDelete, setProxyToDelete] = useState<string | null>(null);
  const [newProxy, setNewProxy] = useState({
    host: '',
    port: '',
    protocol: 'http',
    username: '',
    password: '',
  });
  const { toast } = useToast();

  // 获取代理列表
  const fetchProxies = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/proxies');
      if (!response.ok) {
        throw new Error(`获取代理列表失败: ${response.status}`);
      }
      const data = await response.json();
      setProxies(data);
    } catch (err) {
      console.error('获取代理列表错误:', err);
      toast({
        title: t('proxy.toast.fetchFailedTitle', '获取代理失败'),
        description: err instanceof Error ? err.message : t('proxy.toast.fetchFailedDesc', '无法获取代理列表'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 获取代理池配置
  const fetchConfig = async () => {
    setIsConfigLoading(true);
    try {
      const response = await fetch('/api/v1/proxy-config');
      if (!response.ok) {
        throw new Error(`获取代理池配置失败: ${response.status}`);
      }
      const data = await response.json();
      setConfig(data);
    } catch (err) {
      console.error('获取代理池配置错误:', err);
      toast({
        title: t('proxy.toast.configFetchFailedTitle', '获取配置失败'),
        description: err instanceof Error ? err.message : t('proxy.toast.configFetchFailedDesc', '无法获取代理池配置'),
        variant: 'destructive',
      });
    } finally {
      setIsConfigLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchProxies();
    fetchConfig();
  }, []);

  // 批量导入代理
  const handleBatchImport = async () => {
    if (!batchProxiesText.trim()) {
      toast({
        title: t('proxy.toast.invalidInput', '无效的输入'),
        description: t('proxy.toast.enterAtLeastOne', '请输入至少一个代理'),
        variant: 'destructive',
      });
      return;
    }

    setIsBatchImporting(true);
    try {
      // 按行分割文本
      const lines = batchProxiesText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      // 解析每行代理
      const parsedProxies = [];
      for (const line of lines) {
        try {
          let proxy: any = {};
          
          if (line.includes('://')) {
            // 格式: protocol://[username:password@]host:port
            const url = new URL(line);
            proxy = {
              protocol: url.protocol.replace(':', ''),
              host: url.hostname,
              port: parseInt(url.port),
            };
            
            if (url.username) {
              proxy.username = url.username;
              proxy.password = url.password;
            }
          } else {
            // 格式: host:port:protocol[:username:password] 或 host:port:country
            const parts = line.split(':');
            if (parts.length < 3) {
              console.error('Invalid proxy format:', line);
              continue;
            }
            
            const [host, port, thirdPart] = parts;
            
            // 检查第三部分是否为已知协议
            const commonProtocols = ['http', 'https', 'socks4', 'socks5'];
            if (commonProtocols.includes(thirdPart.toLowerCase())) {
              // 这是 host:port:protocol 格式
              proxy = {
                host: host,
                port: parseInt(port),
                protocol: thirdPart.toLowerCase(),
              };
              
              if (parts.length >= 5) {
                proxy.username = parts[3];
                proxy.password = parts[4];
              }
            } else {
              // 这是 host:port:country 格式，忽略国家部分，使用默认协议
              proxy = {
                host: host,
                port: parseInt(port),
                protocol: 'http', // 使用默认协议
              };
            }
          }
          
          parsedProxies.push(proxy);
        } catch (err) {
          console.error('解析代理失败:', line, err);
          // 继续处理下一行
        }
      }
      
      if (parsedProxies.length === 0) {
        throw new Error('没有有效的代理可导入');
      }
      
      // 发送批量导入请求
      const response = await fetch('/api/v1/proxies/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ proxies: parsedProxies }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `批量导入失败: ${response.status}`);
      }
      
      const result = await response.json();
      
      // 刷新代理列表
      fetchProxies();
      
      // 重置表单
      setBatchProxiesText('');
      
      // 显示成功消息
      toast({
        title: '批量导入成功',
        description: `成功导入 ${result.success} 个代理，失败 ${result.failed} 个`,
      });
      
      // 切换到代理列表标签
      setActiveTab('proxies');
    } catch (err) {
      console.error('批量导入代理错误:', err);
      toast({
        title: '批量导入失败',
        description: err instanceof Error ? err.message : '批量导入代理时发生错误',
        variant: 'destructive',
      });
    } finally {
      setIsBatchImporting(false);
    }
  };

  // 测试所有代理
  const handleTestAllProxies = async () => {
    setIsTestingAll(true);
    try {
      const response = await fetch('/api/v1/proxies/test-all', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`测试代理失败: ${response.status}`);
      }
      
      const result = await response.json();
      
      toast({
        title: t('proxy.toast.testStarted', '测试已启动'),
        description: t('proxy.toast.testStartedDesc', '开始测试 {{count}} 个代理，这可能需要一些时间', { count: result.proxiesCount }),
      });
      
      // 等待10秒后刷新代理列表，以获取测试结果
      setTimeout(fetchProxies, 10000);
    } catch (err) {
      console.error('测试代理错误:', err);
      toast({
        title: t('proxy.toast.testFailed', '测试失败'),
        description: err instanceof Error ? err.message : t('proxy.toast.testFailedDesc', '测试代理时发生错误'),
        variant: 'destructive',
      });
    } finally {
      setIsTestingAll(false);
    }
  };

  // 添加新代理
  const handleAddProxy = async () => {
    try {
      if (!newProxy.host || !newProxy.port) {
      toast({
        title: t('proxy.toast.missingRequired', '缺少必填信息'),
        description: t('proxy.toast.hostPortRequired', '代理主机和端口是必填项'),
        variant: 'destructive',
      });
        return;
      }
      
      const response = await fetch('/api/v1/proxies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: newProxy.host,
          port: parseInt(newProxy.port),
          protocol: newProxy.protocol,
          username: newProxy.username || undefined,
          password: newProxy.password || undefined,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `添加代理失败: ${response.status}`);
      }
      
      const addedProxy = await response.json();
      
      // 重置表单
      setNewProxy({
        host: '',
        port: '',
        protocol: 'http',
        username: '',
        password: '',
      });
      
      // 刷新代理列表
      fetchProxies();
      
      toast({
        title: t('proxy.toast.addSuccess', '添加成功'),
        description: t('proxy.toast.addSuccessDesc', '代理 {{host}}:{{port}} 已添加', { host: addedProxy.host, port: addedProxy.port }),
      });
      
      // 切换到代理列表标签
      setActiveTab('proxies');
    } catch (err) {
      console.error('添加代理错误:', err);
      toast({
        title: t('proxy.toast.addFailed', '添加失败'),
        description: err instanceof Error ? err.message : t('proxy.toast.addFailedDesc', '添加代理时发生错误'),
        variant: 'destructive',
      });
    }
  };

  // 删除代理
  const handleDeleteProxy = async (proxyId: string) => {
    try {
      const response = await fetch(`/api/v1/proxies/${proxyId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `删除代理失败: ${response.status}`);
      }
      
      // 刷新代理列表
      fetchProxies();
      
      toast({
        title: t('proxy.toast.deleteSuccess', '删除成功'),
        description: t('proxy.toast.deleteSuccessDesc', '代理已成功删除'),
      });
    } catch (err) {
      console.error('删除代理错误:', err);
      toast({
        title: t('proxy.toast.deleteFailed', '删除失败'),
        description: err instanceof Error ? err.message : t('proxy.toast.deleteFailedDesc', '删除代理时发生错误'),
        variant: 'destructive',
      });
    } finally {
      // 关闭确认对话框
      setProxyToDelete(null);
    }
  };

  // 更新代理池配置
  const handleUpdateConfig = async () => {
    if (!config) return;
    
    try {
      const response = await fetch('/api/v1/proxy-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `更新配置失败: ${response.status}`);
      }
      
      const updatedConfig = await response.json();
      setConfig(updatedConfig);
      
      toast({
        title: t('proxy.toast.updateSuccess', '更新成功'),
        description: t('proxy.toast.updateSuccessDesc', '代理池配置已更新'),
      });
    } catch (err) {
      console.error('更新配置错误:', err);
      toast({
        title: t('proxy.toast.updateFailed', '更新失败'),
        description: err instanceof Error ? err.message : t('proxy.toast.updateFailedDesc', '更新配置时发生错误'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card className="w-full shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl">{t('proxy.title', '代理池管理')}</CardTitle>
          <CardDescription>
            {t('proxy.subtitle', '管理、测试和配置用于API请求的代理服务器')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs 
            defaultValue="proxies" 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="mb-4">
              <TabsTrigger value="proxies" className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                {t('proxy.tabs.list', '代理列表')}
              </TabsTrigger>
              <TabsTrigger value="add" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {t('proxy.tabs.add', '添加代理')}
              </TabsTrigger>
              <TabsTrigger value="batch" className="flex items-center gap-2">
                <FileUp className="h-4 w-4" />
                {t('proxy.tabs.batch', '批量导入')}
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                {t('proxy.tabs.settings', '代理池设置')}
              </TabsTrigger>
            </TabsList>
            
            {/* 代理列表 */}
            <TabsContent value="proxies" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">
                  {isLoading ? t('proxy.loading', '加载中...') : t('proxy.available', '可用代理 ({{count}})', { count: proxies.length })}
                </h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={isTestingAll || proxies.length === 0}
                  onClick={handleTestAllProxies}
                >
                  {isTestingAll ? (
                    <>
                      <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                      {t('proxy.testing', '测试中...')}
                    </>
                  ) : (
                    <>
                      <RotateCw className="h-4 w-4 mr-2" />
                      {t('proxy.testAll', '测试所有代理')}
                    </>
                  )}
                </Button>
              </div>
              
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-[200px] w-full" />
                  ))}
                </div>
              ) : proxies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="mb-2">{t('proxy.noProxies', '还没有添加任何代理')}</div>
                  <Button variant="secondary" size="sm" onClick={() => setActiveTab('add')}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('proxy.tabs.add', '添加代理')}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {proxies.map(proxy => (
                    <div key={proxy._id} className="relative">
                      <ProxyStatusCard 
                        proxyId={proxy._id} 
                        onTest={fetchProxies}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 rounded-full opacity-70 hover:opacity-100 hover:bg-red-100 hover:text-red-600"
                        onClick={() => setProxyToDelete(proxy._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            {/* 添加代理 */}
            <TabsContent value="add" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('proxy.addTitle', '添加新代理')}</CardTitle>
                  <CardDescription>
                    {t('proxy.addSubtitle', '添加一个新的代理服务器到代理池')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="protocol">{t('proxy.form.protocol', '代理协议 *')}</Label>
                      <Select 
                        value={newProxy.protocol} 
                        onValueChange={value => setNewProxy({...newProxy, protocol: value})}
                      >
                        <SelectTrigger id="protocol">
                          <SelectValue placeholder={t('proxy.form.selectProtocol', '选择协议')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="http">HTTP</SelectItem>
                          <SelectItem value="https">HTTPS</SelectItem>
                          <SelectItem value="socks4">SOCKS4</SelectItem>
                          <SelectItem value="socks5">SOCKS5</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="host">{t('proxy.form.host', '主机地址 *')}</Label>
                      <Input 
                        id="host" 
                        placeholder="127.0.0.1" 
                        value={newProxy.host}
                        onChange={e => setNewProxy({...newProxy, host: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="port">{t('proxy.form.port', '端口 *')}</Label>
                      <Input 
                        id="port" 
                        placeholder="8080" 
                        type="number"
                        value={newProxy.port}
                        onChange={e => setNewProxy({...newProxy, port: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="username">{t('proxy.form.username', '用户名 (可选)')}</Label>
                      <Input 
                        id="username" 
                        placeholder="username" 
                        value={newProxy.username}
                        onChange={e => setNewProxy({...newProxy, username: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password">{t('proxy.form.password', '密码 (可选)')}</Label>
                      <Input 
                        id="password" 
                        type="password" 
                        placeholder="password" 
                        value={newProxy.password}
                        onChange={e => setNewProxy({...newProxy, password: e.target.value})}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardContent className="flex justify-end">
                  <Button onClick={handleAddProxy}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('proxy.tabs.add', '添加代理')}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* 批量导入代理 */}
            <TabsContent value="batch" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('proxy.batchTitle', '批量导入代理')}</CardTitle>
                  <CardDescription>
                    {t('proxy.batchSubtitle', '一次性添加多个代理服务器到代理池')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 border rounded-lg bg-secondary/20">
                    <h3 className="text-sm font-medium mb-2">{t('proxy.batchFormats', '支持的格式 (每行一个代理)')}</h3>
                    <ul className="list-disc pl-5 text-sm space-y-1 text-muted-foreground">
                      <li><code>主机:端口</code> (例如 <code>127.0.0.1:8080</code>，使用HTTP协议)</li>
                      <li><code>主机:端口:国家</code> (例如 <code>84.17.47.150:9002:The Netherlands</code>，忽略国家信息)</li>
                      <li><code>协议://主机:端口</code> (例如 <code>http://127.0.0.1:8080</code>)</li>
                      <li><code>协议://用户名:密码@主机:端口</code> (例如 <code>http://user:pass@127.0.0.1:8080</code>)</li>
                      <li><code>主机:端口:协议</code> (例如 <code>127.0.0.1:8080:http</code>)</li>
                      <li><code>主机:端口:协议:用户名:密码</code> (例如 <code>127.0.0.1:8080:http:user:pass</code>)</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="batchProxies">{t('proxy.batchList', '代理列表')}</Label>
                    <Textarea
                      id="batchProxies"
                      placeholder={t('proxy.batchPlaceholder', '输入代理列表，每行一个')}
                      rows={10}
                      value={batchProxiesText}
                      onChange={(e) => setBatchProxiesText(e.target.value)}
                    />
                  </div>
                </CardContent>
                <CardContent className="flex justify-end">
                  <Button
                    onClick={handleBatchImport}
                    disabled={isBatchImporting || !batchProxiesText.trim()}
                  >
                    {isBatchImporting ? (
                      <>
                        <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                        {t('proxy.importing', '导入中...')}
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        {t('proxy.tabs.batch', '批量导入')}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* 代理池设置 */}
            <TabsContent value="settings" className="space-y-4">
              {isConfigLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : !config ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('proxy.configLoadFailed', '无法加载配置')}
                </div>
              ) : (
                <Card>
                  <CardHeader>
                  <CardTitle>{t('proxy.configTitle', '代理池配置')}</CardTitle>
                    <CardDescription>
                    {t('proxy.configSubtitle', '自定义代理池的行为和设置')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div>
                      <Label htmlFor="selectionMode">{t('proxy.selectionMode', '代理选择模式')}</Label>
                        <Select 
                          value={config.selectionMode} 
                          onValueChange={value => setConfig({...config, selectionMode: value})}
                        >
                          <SelectTrigger id="selectionMode">
                          <SelectValue placeholder={t('proxy.selectMode', '选择模式')} />
                          </SelectTrigger>
                          <SelectContent>
                          <SelectItem value="random">{t('proxy.mode.random', '随机选择')}</SelectItem>
                          <SelectItem value="roundRobin">{t('proxy.mode.roundRobin', '轮询选择')}</SelectItem>
                          <SelectItem value="fastest">{t('proxy.mode.fastest', '最快优先')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground mt-1">
                        {t('proxy.selectionModeDesc', '决定如何从可用代理中选择一个')}
                        </p>
                      </div>
                      
                      <div>
                      <Label htmlFor="autoRotationInterval">{t('proxy.autoRotate', '自动轮换间隔 (秒)')}</Label>
                        <Input 
                          id="autoRotationInterval" 
                          type="number" 
                          min="0"
                          max="3600"
                          value={config.autoRotationInterval}
                          onChange={e => setConfig({...config, autoRotationInterval: parseInt(e.target.value)})}
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                        {t('proxy.autoRotateDesc', '设置为0禁用自动轮换，否则每隔指定秒数自动切换代理')}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between space-y-2">
                        <div>
                        <Label htmlFor="checkProxiesOnStartup">{t('proxy.checkOnStartup', '启动时测试代理')}</Label>
                          <p className="text-sm text-muted-foreground">
                          {t('proxy.checkOnStartupDesc', '应用启动时自动测试所有代理')}
                          </p>
                        </div>
                        <Switch 
                          id="checkProxiesOnStartup"
                          checked={config.checkProxiesOnStartup}
                          onCheckedChange={checked => setConfig({...config, checkProxiesOnStartup: checked})}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between space-y-2">
                        <div>
                        <Label htmlFor="validateOnFailure">{t('proxy.validateOnFailure', '失败时验证')}</Label>
                          <p className="text-sm text-muted-foreground">
                          {t('proxy.validateOnFailureDesc', '当代理请求失败时自动验证代理有效性')}
                          </p>
                        </div>
                        <Switch 
                          id="validateOnFailure"
                          checked={config.validateOnFailure}
                          onCheckedChange={checked => setConfig({...config, validateOnFailure: checked})}
                        />
                      </div>
                      
                      <div>
                      <Label htmlFor="maxFailures">{t('proxy.maxFailures', '最大失败次数')}</Label>
                        <Input 
                          id="maxFailures" 
                          type="number" 
                          min="1"
                          max="10"
                          value={config.maxFailures}
                          onChange={e => setConfig({...config, maxFailures: parseInt(e.target.value)})}
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                        {t('proxy.maxFailuresDesc', '代理达到此失败次数后将被自动禁用')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                  <CardContent className="flex justify-end">
                  <Button onClick={handleUpdateConfig}>
                    {t('actions.save', '保存设置')}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* 删除确认对话框 */}
      <AlertDialog open={!!proxyToDelete} onOpenChange={(open) => !open && setProxyToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              你确定要删除这个代理吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-500 hover:bg-red-600"
              onClick={() => proxyToDelete && handleDeleteProxy(proxyToDelete)}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
