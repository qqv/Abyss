"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PlusCircle, Edit2, Trash2, Power, RefreshCw } from "lucide-react";
import { type Proxy, type Tunnel, type TunnelRotationType } from "../types";
import { Separator } from "@/components/ui/separator";
import { fetchTunnels, createTunnel, updateTunnel, deleteTunnel, toggleTunnelActive } from "../services/tunnel-service";
import { toast } from "@/components/ui/use-toast";
import ProxySelectionGrid from "./ProxySelectionGrid";

interface TunnelListProps {
  proxies: Proxy[];
}

const TunnelList: React.FC<TunnelListProps> = ({ proxies }) => {
  const { t } = useTranslation('common');
  const [tunnels, setTunnels] = useState<Tunnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tunnelName, setTunnelName] = useState("");
  const [selectedProxyIds, setSelectedProxyIds] = useState<string[]>([]);
  const [editingTunnelId, setEditingTunnelId] = useState<string | null>(null);
  const [taskId, setTaskId] = useState("");
  
  // 隧道配置状态
  const [rotationType, setRotationType] = useState<TunnelRotationType>("sequential");
  const [rotationInterval, setRotationInterval] = useState<number>(300);
  const [maxRotations, setMaxRotations] = useState<number>(0);
  const [validityDuration, setValidityDuration] = useState<number>(0);
  const [maxConcurrentRequests, setMaxConcurrentRequests] = useState<number>(10);
  const [retryCount, setRetryCount] = useState<number>(3);

  // 辅助函数
  const getTunnelProxyCount = (tunnel: Tunnel) => {
    // 只计算实际存在的代理数量
    const validProxyIds = tunnel.proxyIds.filter(proxyId => 
      proxies.some(proxy => proxy.id === proxyId)
    );
    return validProxyIds.length;
  };

  const getProxyNamesForTunnel = (tunnel: Tunnel) => {
    // 只返回实际存在的代理
    const matchedProxies = proxies.filter((proxy) => 
      tunnel.proxyIds.includes(proxy.id)
    );
    return matchedProxies;
  };

  const [selectedTunnelForDetails, setSelectedTunnelForDetails] = useState<Tunnel | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  const handleShowDetails = (tunnel: Tunnel) => {
    setSelectedTunnelForDetails(tunnel);
    setIsDetailsDialogOpen(true);
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 加载隧道数据
  const loadTunnels = async () => {
    try {
      setLoading(true);
      const tunnelData = await fetchTunnels();
      setTunnels(tunnelData);
    } catch (error) {
      console.error('加载隧道数据失败:', error);
      toast({
        title: t('proxyPool.alert.deleteFailed', '错误'),
        description: t('proxyPool.tunnel.loadFailed', '加载隧道数据失败'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时加载数据
  useEffect(() => {
    loadTunnels();
  }, []);

  const handleCreateTunnel = async () => {
    if (!tunnelName.trim() || selectedProxyIds.length === 0) {
      toast({
        title: t('proxyPool.tunnel.tip', '提示'),
        description: t('proxyPool.tunnel.fillNameAndSelect', '请填写隧道名称并选择至少一个代理'),
        variant: "destructive",
      });
      return;
    }

    try {
      const tunnelData = {
        name: tunnelName,
        proxyIds: [...selectedProxyIds],
        active: false,
        taskId,
        rotationType,
        rotationInterval,
        maxRotations,
        validityDuration,
        maxConcurrentRequests,
        retryCount,
      };

      if (editingTunnelId) {
        // 更新现有隧道
        await updateTunnel(editingTunnelId, tunnelData);
        toast({
          title: t('proxyPool.alert.updateSuccess', '更新成功'),
          description: t('proxyPool.tunnel.updateSuccess', '隧道更新成功'),
        });
      } else {
        // 创建新隧道
        const newTunnel = await createTunnel(tunnelData);
        toast({
          title: t('proxyPool.alert.updateSuccess', '更新成功'),
          description: t('proxyPool.tunnel.createSuccess', '隧道创建成功'),
        });
        setTunnels([...tunnels, newTunnel]);
      }

      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('保存隧道失败:', error);
      toast({
        title: t('proxyPool.alert.deleteFailed', '错误'),
        description: editingTunnelId ? t('proxyPool.tunnel.updateFailed', '更新隧道失败') : t('proxyPool.tunnel.createFailed', '创建隧道失败'),
        variant: "destructive",
      });
    }
  };

  const handleDeleteTunnel = async (id: string) => {
    try {
      await deleteTunnel(id);
      toast({
        title: t('proxyPool.alert.updateSuccess', '更新成功'),
        description: t('proxyPool.tunnel.deleteSuccess', '隧道删除成功'),
      });
      setTunnels(tunnels.filter(tunnel => tunnel.id !== id));
    } catch (error) {
      console.error('删除隧道失败:', error);
      toast({
        title: t('proxyPool.alert.deleteFailed', '错误'),
        description: t('proxyPool.tunnel.deleteFailed', '删除隧道失败'),
        variant: "destructive",
      });
    }
  };

  const handleEditTunnel = (tunnel: Tunnel) => {
    setTunnelName(tunnel.name);
    setSelectedProxyIds(tunnel.proxyIds);
    setTaskId(tunnel.taskId || "");
    setRotationType(tunnel.rotationType);
    setRotationInterval(tunnel.rotationInterval);
    setMaxRotations(tunnel.maxRotations);
    setValidityDuration(tunnel.validityDuration);
    setMaxConcurrentRequests(tunnel.maxConcurrentRequests);
    setRetryCount(tunnel.retryCount);
    setEditingTunnelId(tunnel.id);
    setIsDialogOpen(true);
  };

  const handleToggleTunnelActive = async (id: string) => {
    try {
      const tunnel = tunnels.find(t => t.id === id);
      if (!tunnel) return;
      
      await toggleTunnelActive(id, !tunnel.active);
      toast({
        title: t('proxyPool.alert.updateSuccess', '更新成功'),
        description: !tunnel.active ? t('proxyPool.tunnel.activated', '隧道已激活') : t('proxyPool.tunnel.deactivated', '隧道已停用'),
      });
      setTunnels(tunnels.map(tunnel => tunnel.id === id ? {...tunnel, active: !tunnel.active} : tunnel));
    } catch (error) {
      console.error('切换隧道状态失败:', error);
      toast({
        title: t('proxyPool.alert.deleteFailed', '错误'),
        description: t('proxyPool.tunnel.toggleFailed', '切换隧道状态失败'),
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setTunnelName("");
    setTaskId("");
    setSelectedProxyIds([]);
    setRotationType("sequential");
    setRotationInterval(300);
    setMaxRotations(0);
    setValidityDuration(0);
    setMaxConcurrentRequests(10);
    setRetryCount(3);
    setEditingTunnelId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{t('proxyPool.tabs.tunnels', '代理隧道')}</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadTunnels} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('proxyPool.list.refresh', '刷新')}
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={resetForm}>
                <PlusCircle className="h-4 w-4 mr-2" />
                {t('proxyPool.tunnel.create', '创建隧道')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTunnelId ? t('proxyPool.tunnel.edit', '编辑隧道') : t('proxyPool.tunnel.createNew', '创建新隧道')}</DialogTitle>
                <DialogDescription>
                  {t('proxyPool.tunnel.desc', '配置代理隧道的基本信息和高级选项')}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* 基本信息 */}
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="tunnel-name">{t('proxyPool.tunnel.name', '隧道名称')}</Label>
                    <Input
                      id="tunnel-name"
                      value={tunnelName}
                      onChange={(e) => setTunnelName(e.target.value)}
                      placeholder={t('proxyPool.tunnel.namePlaceholder', '输入隧道名称')}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="task-id">{t('proxyPool.tunnel.taskId', '关联任务ID（可选）')}</Label>
                    <Input
                      id="task-id"
                      value={taskId}
                      onChange={(e) => setTaskId(e.target.value)}
                      placeholder={t('proxyPool.tunnel.taskIdPlaceholder', '输入关联的任务ID')}
                    />
                  </div>
                </div>

                <Separator />

                {/* 轮换配置 */}
                <div className="space-y-3">
                  <h4 className="font-medium">{t('proxyPool.tunnel.rotation.title', '轮换配置')}</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="rotation-type">{t('proxyPool.tunnel.rotation.type', '轮换类型')}</Label>
                      <Select value={rotationType} onValueChange={(value) => setRotationType(value as TunnelRotationType)}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('proxyPool.tunnel.rotation.selectType', '选择轮换类型')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sequential">{t('proxyPool.tunnel.rotation.sequential', '顺序轮换')}</SelectItem>
                          <SelectItem value="random">{t('proxyPool.tunnel.rotation.random', '随机轮换')}</SelectItem>
                          <SelectItem value="failover">{t('proxyPool.tunnel.rotation.failover', '故障转移')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="rotation-interval">{t('proxyPool.tunnel.rotation.interval', '轮换间隔（秒）')}</Label>
                      <Input
                        id="rotation-interval"
                        type="number"
                        value={rotationInterval}
                        onChange={(e) => setRotationInterval(Number(e.target.value))}
                        placeholder="300"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="max-rotations">{t('proxyPool.tunnel.rotation.max', '最大轮换次数（0=无限制）')}</Label>
                      <Input
                        id="max-rotations"
                        type="number"
                        value={maxRotations}
                        onChange={(e) => setMaxRotations(Number(e.target.value))}
                        placeholder="0"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="validity-duration">{t('proxyPool.tunnel.rotation.validity', '有效时间（小时，0=无限制）')}</Label>
                      <Input
                        id="validity-duration"
                        type="number"
                        value={validityDuration}
                        onChange={(e) => setValidityDuration(Number(e.target.value))}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* 并发和重试配置 */}
                <div className="space-y-3">
                  <h4 className="font-medium">{t('proxyPool.tunnel.concurrent.title', '并发和重试配置')}</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="max-concurrent">{t('proxyPool.tunnel.concurrent.max', '最大并发请求数')}</Label>
                      <Input
                        id="max-concurrent"
                        type="number"
                        value={maxConcurrentRequests}
                        onChange={(e) => setMaxConcurrentRequests(Number(e.target.value))}
                        placeholder="10"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="retry-count">{t('proxyPool.tunnel.concurrent.retry', '重试次数')}</Label>
                      <Input
                        id="retry-count"
                        type="number"
                        value={retryCount}
                        onChange={(e) => setRetryCount(Number(e.target.value))}
                        placeholder="3"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* 代理选择 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>{t('proxyPool.tunnel.selectProxies', '选择代理（{{n}} 个已选择）', { n: selectedProxyIds.length })}</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (selectedProxyIds.length === proxies.length) {
                            setSelectedProxyIds([]);
                          } else {
                            setSelectedProxyIds(proxies.map(p => p.id));
                          }
                        }}
                      >
                          {selectedProxyIds.length === proxies.length ? t('proxyPool.tunnel.unselectAll', '取消全选') : t('proxyPool.tunnel.selectAll', '全选')}
                      </Button>
                    </div>
                  </div>
                  
                  {/* 代理选择区域 */}
                  <ProxySelectionGrid
                    proxies={proxies}
                    selectedProxyIds={selectedProxyIds}
                    onSelectionChange={setSelectedProxyIds}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t('actions.reset', '取消')}
                </Button>
                <Button onClick={handleCreateTunnel} disabled={!tunnelName.trim() || selectedProxyIds.length === 0}>
                  {editingTunnelId ? t('actions.save', '保存') : t('actions.create', '创建')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">{t('proxyPool.tunnel.col.name', '隧道名称')}</TableHead>
              <TableHead>{t('proxyPool.tunnel.col.proxies', '代理')}</TableHead>
              <TableHead className="w-[100px]">{t('proxyPool.tunnel.col.count', '数量')}</TableHead>
              <TableHead className="w-[120px]">{t('proxyPool.tunnel.col.rotation', '轮换类型')}</TableHead>
              <TableHead className="w-[100px]">{t('proxyPool.tunnel.col.status', '状态')}</TableHead>
              <TableHead className="w-[150px]">{t('proxyPool.tunnel.col.updatedAt', '更新时间')}</TableHead>
              <TableHead className="text-right">{t('proxyPool.tunnel.col.actions', '操作')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin inline mr-2" />
                  {t('proxyPool.common.loading', '加载中...')}
                </TableCell>
              </TableRow>
            ) : tunnels.length > 0 ? (
              tunnels.map((tunnel) => (
                <TableRow
                  key={tunnel.id}
                  className={!tunnel.active ? "opacity-60" : ""}
                >
                  <TableCell>
                    <div className="font-medium">{tunnel.name}</div>
                    {tunnel.taskId && (
                      <div className="text-xs text-muted-foreground">
                        {t('proxyPool.tunnel.linkedTask', '关联任务')}: {tunnel.taskId}
                      </div>
                    )}
                      <div className="text-xs text-muted-foreground">
                        {t('proxyPool.tunnel.createdAt', '创建于')}: {tunnel.createdAt.toLocaleDateString()}
                      </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleShowDetails(tunnel)}>{t('proxyPool.tunnel.viewProxies', '查看代理')}</Button>
                  </TableCell>
                  <TableCell>{getTunnelProxyCount(tunnel)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {tunnel.rotationType === 'sequential' ? t('proxyPool.tunnel.rotation.sequential', '顺序') :
                       tunnel.rotationType === 'random' ? t('proxyPool.tunnel.rotation.random', '随机') : t('proxyPool.tunnel.rotation.failover', '故障转移')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                      {tunnel.active ? (
                      <Badge className="bg-green-500 hover:bg-green-600">
                        {t('proxyPool.tunnel.active', '活跃')}
                      </Badge>
                    ) : (
                        <Badge variant="outline">{t('proxyPool.tunnel.inactive', '未使用')}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {formatDateTime(tunnel.updatedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleTunnelActive(tunnel.id)}
                        title={tunnel.active ? t('proxyPool.tunnel.deactivate', '停用隧道') : t('proxyPool.tunnel.activate', '激活隧道')}
                      >
                        <Power className={`h-4 w-4 ${tunnel.active ? 'text-green-500' : 'text-muted-foreground'}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditTunnel(tunnel)}
                        title={t('proxyPool.tunnel.edit', '编辑隧道')}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTunnel(tunnel.id)}
                        title={t('proxyPool.tunnel.delete', '删除隧道')}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-6 text-muted-foreground"
                >
                  {t('proxyPool.tunnel.empty', '暂无隧道，请创建新的隧道')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('proxyPool.tunnel.proxyDetails', '代理详情')}</DialogTitle>
          </DialogHeader>
          {selectedTunnelForDetails && (
            <div className="space-y-4">
              <div className="space-y-3">
                <h4 className="font-medium">{t('proxyPool.tunnel.proxyList', '代理列表')}</h4>
                <div className="max-h-40 overflow-y-auto border rounded-md p-3">
                  {getProxyNamesForTunnel(selectedTunnelForDetails).map((proxy) => (
                    <div key={proxy.id} className="flex items-center space-x-2 py-1">
                      <span>
                        {proxy.protocol}://{proxy.host}:{proxy.port}
                      </span>
                      {proxy.isValid && (
                        <Badge variant="default" className="ml-2 bg-green-500">
                          {t('proxyPool.list.valid', '可用')}
                        </Badge>
                      )}
                      {proxy.responseTime && (
                        <span className="text-xs text-muted-foreground ml-2">
                          {proxy.responseTime}ms
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TunnelList;
