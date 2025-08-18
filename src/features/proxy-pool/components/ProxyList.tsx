"use client";

import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, Trash, AlertCircle, CheckSquare, Clock, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { type Proxy } from "../types";
import { formatDistanceToNow } from "date-fns";

interface ProxyListProps {
  proxies: Proxy[];
  onDelete: (id: string) => void;
  onToggleActive: (id: string) => void;
  onEdit?: (proxy: Proxy) => void;
  onBatchDelete?: (ids: string[]) => void;
  onSelectedProxiesChange?: (selectedIds: string[]) => void;
}

const ProxyList: React.FC<ProxyListProps> = ({
  proxies,
  onDelete,
  onToggleActive,
  onEdit,
  onBatchDelete,
  onSelectedProxiesChange,
}) => {
  const { t } = useTranslation('common');
  const [expandedProxyId, setExpandedProxyId] = useState<string | null>(null);
  const [selectedProxies, setSelectedProxies] = useState<Set<string>>(new Set());
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState("");
  
  // 筛选状态
  const [protocolFilter, setProtocolFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // 过滤代理
  const filteredProxies = useMemo(() => {
    return proxies.filter(proxy => {
      // 搜索过滤
      const matchesSearch = !searchTerm || 
        proxy.host.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proxy.port.toString().includes(searchTerm) ||
        proxy.protocol.toLowerCase().includes(searchTerm.toLowerCase());
      
      // 协议过滤
      const matchesProtocol = protocolFilter === "all" || proxy.protocol === protocolFilter;
      
      // 状态过滤
      let matchesStatus = true;
      if (statusFilter === "valid") {
        matchesStatus = proxy.isValid === true;
      } else if (statusFilter === "invalid") {
        matchesStatus = proxy.isValid === false;
      } else if (statusFilter === "untested") {
        matchesStatus = proxy.isValid === undefined;
      } else if (statusFilter === "active") {
        matchesStatus = proxy.isActive === true;
      } else if (statusFilter === "inactive") {
        matchesStatus = proxy.isActive === false;
      }
      
      return matchesSearch && matchesProtocol && matchesStatus;
    });
  }, [proxies, searchTerm, protocolFilter, statusFilter]);
  
  // 计算分页
  const totalPages = Math.ceil(filteredProxies.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentPageProxies = filteredProxies.slice(startIndex, endIndex);
  
  // 重置页码当搜索或页面大小改变时
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize, protocolFilter, statusFilter]);
  
  // 通知父组件选中代理的变化
  React.useEffect(() => {
    if (onSelectedProxiesChange) {
      onSelectedProxiesChange(Array.from(selectedProxies));
    }
  }, [selectedProxies, onSelectedProxiesChange]);
  
  const invalidProxies = useMemo(() => {
    return proxies.filter(proxy => proxy.isValid === false).map(proxy => proxy.id);
  }, [proxies]);

  const hasInvalidProxies = useMemo(() => {
    return invalidProxies.length > 0;
  }, [invalidProxies]);

  const toggleExpand = (id: string) => {
    setExpandedProxyId(expandedProxyId === id ? null : id);
  };

  const formatLastChecked = (date?: Date) => {
    if (!date) return t('proxyPool.list.neverChecked', '从未检查');
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const getStatusBadge = (proxy: Proxy) => {
    if (proxy.isValid === undefined) {
      return <Badge variant="outline">{t('proxyPool.list.untested', '未测试')}</Badge>;
    }
    if (proxy.isValid) {
      return <Badge className="bg-green-500 hover:bg-green-600">{t('proxyPool.list.valid', '有效')}</Badge>;
    }
    return <Badge variant="destructive">{t('proxyPool.list.invalid', '无效')}</Badge>;
  };

  const toggleSelectAll = () => {
    if (selectedProxies.size === currentPageProxies.length) {
      // 取消选中当前页所有项
      const newSelected = new Set(selectedProxies);
      currentPageProxies.forEach(proxy => newSelected.delete(proxy.id));
      setSelectedProxies(newSelected);
    } else {
      // 选中当前页所有项
      const newSelected = new Set(selectedProxies);
      currentPageProxies.forEach(proxy => newSelected.add(proxy.id));
      setSelectedProxies(newSelected);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedProxies);
    if (selectedProxies.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedProxies(newSelected);
  };

  const handleBatchDelete = () => {
    if (onBatchDelete && selectedProxies.size > 0) {
      onBatchDelete(Array.from(selectedProxies));
      setSelectedProxies(new Set());
    }
  };

  const handleDeleteInvalid = () => {
    if (onBatchDelete && invalidProxies.length > 0) {
      onBatchDelete(invalidProxies);
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const currentPageSelectedCount = currentPageProxies.filter(proxy => 
    selectedProxies.has(proxy.id)
  ).length;

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* 搜索和控制栏 */}
      <div className="flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-2 flex-1">
          <Input
            placeholder={t('proxyPool.list.searchPlaceholder', '搜索代理...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
          
          {/* 协议筛选 */}
          <Select value={protocolFilter} onValueChange={setProtocolFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder={t('proxyPool.list.protocol', '协议')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('proxyPool.list.allProtocols', '所有协议')}</SelectItem>
              <SelectItem value="http">HTTP</SelectItem>
              <SelectItem value="https">HTTPS</SelectItem>
              <SelectItem value="socks4">SOCKS4</SelectItem>
              <SelectItem value="socks5">SOCKS5</SelectItem>
            </SelectContent>
          </Select>
          
          {/* 状态筛选 */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder={t('proxyPool.list.status', '状态')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('proxyPool.list.allStatus', '所有状态')}</SelectItem>
              <SelectItem value="valid">{t('proxyPool.list.valid', '有效')}</SelectItem>
              <SelectItem value="invalid">{t('proxyPool.list.invalid', '无效')}</SelectItem>
              <SelectItem value="untested">{t('proxyPool.list.untested', '未测试')}</SelectItem>
              <SelectItem value="active">{t('proxyPool.list.active', '已启用')}</SelectItem>
              <SelectItem value="inactive">{t('proxyPool.list.inactive', '已禁用')}</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">{t('proxyPool.list.perPage', '{{n}} 条/页', { n: 10 })}</SelectItem>
              <SelectItem value="20">{t('proxyPool.list.perPage', '{{n}} 条/页', { n: 20 })}</SelectItem>
              <SelectItem value="50">{t('proxyPool.list.perPage', '{{n}} 条/页', { n: 50 })}</SelectItem>
              <SelectItem value="100">{t('proxyPool.list.perPage', '{{n}} 条/页', { n: 100 })}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* 状态信息 */}
        <div className="text-sm text-muted-foreground">
          {t('proxyPool.list.showing', '显示 {{from}}-{{to}} / 共 {{total}} 个代理', { from: startIndex + 1, to: Math.min(endIndex, filteredProxies.length), total: filteredProxies.length })}
          {(searchTerm || protocolFilter !== "all" || statusFilter !== "all") && ` ${t('proxyPool.list.filtered', '(从 {{n}} 个中筛选)', { n: proxies.length })}`}
        </div>
      </div>

      {/* 批量操作栏 */}
      {proxies.length > 0 && (
        <div className="flex items-center justify-between mb-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={currentPageSelectedCount > 0 && currentPageSelectedCount === currentPageProxies.length}
              onCheckedChange={toggleSelectAll}
              id="select-all"
              className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
            />
            <label 
              htmlFor="select-all"
              className="text-sm text-muted-foreground cursor-pointer"
            >
              {selectedProxies.size > 0 
                ? t('proxyPool.list.selectedCount', '已选择 {{n}} 个代理', { n: selectedProxies.size }) 
                : t('proxyPool.list.selectCurrentPage', '全选当前页')}
            </label>
          </div>
          
          <div className="flex items-center gap-2">
            {selectedProxies.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBatchDelete}
              >
                <Trash className="mr-2 h-4 w-4" />
                {t('proxyPool.list.deleteSelected', '删除选中')} ({selectedProxies.size})
              </Button>
            )}
            
            {hasInvalidProxies && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteInvalid}
                    >
                      <AlertCircle className="mr-2 h-4 w-4 text-red-500" />
                      {t('proxyPool.list.cleanupInvalid', '清理无效代理')} ({invalidProxies.length})
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('proxyPool.list.cleanupInvalidTip', '删除所有标记为无效的代理')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead className="w-[100px]">{t('proxyPool.list.col.protocol', '协议')}</TableHead>
              <TableHead>{t('proxyPool.list.col.address', '代理地址')}</TableHead>
              <TableHead>{t('proxyPool.list.col.credentials', '登录凭据')}</TableHead>
              <TableHead>{t('proxyPool.list.col.status', '状态')}</TableHead>
              <TableHead>{t('proxyPool.list.col.latency', '延时')}</TableHead>
              <TableHead>{t('proxyPool.list.col.lastChecked', '上次检查')}</TableHead>
              <TableHead>{t('proxyPool.list.col.active', '启用')}</TableHead>
              <TableHead className="text-right">{t('proxyPool.list.col.actions', '操作')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
          {currentPageProxies.length > 0 ? (
            currentPageProxies.map((proxy) => (
              <React.Fragment key={proxy.id}>
                <TableRow 
                  className={
                    `${selectedProxies.has(proxy.id) ? "bg-muted/40" : ""} ${
                      !proxy.isActive 
                        ? "opacity-60" 
                        : proxy.isValid === false 
                        ? "bg-red-50 dark:bg-red-900/10" 
                        : ""
                    }`
                  }
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedProxies.has(proxy.id)}
                      onCheckedChange={() => toggleSelect(proxy.id)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="uppercase">
                      {proxy.protocol}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {proxy.host}:{proxy.port}
                    </div>
                  </TableCell>
                  <TableCell>
                    {proxy.username ? (
                      <div className="text-sm">
                        <div className="font-medium">{proxy.username}</div>
                        <div className="text-xs text-muted-foreground">
                          {proxy.password ? '••••••••' : t('proxyPool.list.noPassword', '(无密码)')}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">{t('proxyPool.list.noCredentials', '无凭据')}</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(proxy)}</TableCell>
                  <TableCell>
                    {proxy.responseTime !== undefined && proxy.responseTime > 0 ? (
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
                        <span className={`text-xs ${proxy.responseTime > 1000 ? 'text-amber-500' : 'text-green-500'}`}>
                          {proxy.responseTime}ms
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">{t('proxyPool.list.untested', '未测试')}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatLastChecked(proxy.lastChecked)}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={proxy.isActive}
                      onCheckedChange={() => onToggleActive(proxy.id)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(proxy)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          // 阻止事件冒泡
                          e.preventDefault();
                          e.stopPropagation();
                          // 添加调试日志
                          console.log('删除代理按钮点击', proxy.id);
                          // 调用删除函数
                          onDelete(proxy.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                {searchTerm || protocolFilter !== "all" || statusFilter !== "all" 
                  ? t('proxyPool.list.noMatch', '没有找到匹配的代理') 
                  : t('proxyPool.list.empty', '暂无代理服务器，请添加新代理')}
              </TableCell>
            </TableRow>
          )}
          </TableBody>
        </Table>
      </div>

      {/* 分页控件 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              {t('proxyPool.list.prev', '上一页')}
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              {t('proxyPool.list.next', '下一页')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            {t('proxyPool.list.pageInfo', '第 {{cur}} 页，共 {{total}} 页', { cur: currentPage, total: totalPages })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProxyList;
