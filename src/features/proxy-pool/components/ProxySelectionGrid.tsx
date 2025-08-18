"use client";

import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { type Proxy } from "../types";

interface ProxySelectionGridProps {
  proxies: Proxy[];
  selectedProxyIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
}

const ProxySelectionGrid: React.FC<ProxySelectionGridProps> = ({
  proxies,
  selectedProxyIds,
  onSelectionChange,
}) => {
  const { t } = useTranslation('common');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState("");

  // 过滤代理
  const filteredProxies = useMemo(() => {
    if (!searchTerm) return proxies;
    return proxies.filter(proxy => 
      proxy.host.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proxy.port.toString().includes(searchTerm) ||
      proxy.protocol.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [proxies, searchTerm]);

  // 计算分页
  const totalPages = Math.ceil(filteredProxies.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentPageProxies = filteredProxies.slice(startIndex, endIndex);

  // 重置页码当搜索或页面大小改变时
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  const handleToggleProxy = (proxyId: string) => {
    const newSelected = selectedProxyIds.includes(proxyId)
      ? selectedProxyIds.filter(id => id !== proxyId)
      : [...selectedProxyIds, proxyId];
    onSelectionChange(newSelected);
  };

  const handleToggleCurrentPage = () => {
    const currentPageIds = currentPageProxies.map(p => p.id);
    const currentPageSelectedCount = currentPageIds.filter(id => 
      selectedProxyIds.includes(id)
    ).length;
    
    if (currentPageSelectedCount === currentPageIds.length) {
      // 取消选中当前页所有项
      const newSelected = selectedProxyIds.filter(id => !currentPageIds.includes(id));
      onSelectionChange(newSelected);
    } else {
      // 选中当前页所有项
      const newSelected = [...new Set([...selectedProxyIds, ...currentPageIds])];
      onSelectionChange(newSelected);
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const currentPageSelectedCount = currentPageProxies.filter(proxy => 
    selectedProxyIds.includes(proxy.id)
  ).length;

  return (
    <div className="space-y-4">
      {/* 搜索和控制栏 */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('proxyPool.list.searchPlaceholder', '搜索代理...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">{t('proxyPool.list.perPage', '{{n}} 条/页', { n: 10 })}</SelectItem>
            <SelectItem value="20">{t('proxyPool.list.perPage', '{{n}} 条/页', { n: 20 })}</SelectItem>
            <SelectItem value="40">{t('proxyPool.list.perPage', '{{n}} 条/页', { n: 40 })}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 状态栏 */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          {t('proxyPool.list.showing', '显示 {{from}}-{{to}} / 共 {{total}} 个代理', { from: startIndex + 1, to: Math.min(endIndex, filteredProxies.length), total: filteredProxies.length })}
          {searchTerm && ` ${t('proxyPool.list.filtered', '(从 {{n}} 个中筛选)', { n: proxies.length })}`}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleToggleCurrentPage}
        >
          {currentPageSelectedCount === currentPageProxies.length && currentPageProxies.length > 0
            ? t('proxyPool.list.unselectCurrentPage', '取消选中当前页') 
            : t('proxyPool.list.selectCurrentPage', '选中当前页')}
        </Button>
      </div>

      {/* 代理网格 - 两列布局 */}
      <div className="border rounded-lg p-3 max-h-96 overflow-y-auto">
        {currentPageProxies.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {currentPageProxies.map((proxy) => (
              <div
                key={proxy.id}
                className={`
                  flex items-center space-x-2 p-2 rounded border transition-colors
                  ${selectedProxyIds.includes(proxy.id) 
                    ? "bg-primary/10 border-primary" 
                    : "hover:bg-muted/50"
                  }
                `}
              >
                <Checkbox
                  id={`proxy-${proxy.id}`}
                  checked={selectedProxyIds.includes(proxy.id)}
                  onCheckedChange={() => handleToggleProxy(proxy.id)}
                />
                <Label
                  htmlFor={`proxy-${proxy.id}`}
                  className="flex-1 cursor-pointer"
                >
                  <div className="space-y-1">
                    <div className="font-medium text-sm">
                      {proxy.protocol}://{proxy.host}:{proxy.port}
                    </div>
                    <div className="flex items-center gap-2">
                      {proxy.isValid && (
                        <Badge variant="default" className="text-xs bg-green-500">
                          {t('proxyPool.list.valid', '可用')}
                        </Badge>
                      )}
                      {proxy.isValid === false && (
                        <Badge variant="destructive" className="text-xs">
                          {t('proxyPool.list.invalid', '无效')}
                        </Badge>
                      )}
                      {proxy.isValid === undefined && (
                        <Badge variant="outline" className="text-xs">
                          {t('proxyPool.list.untested', '未测试')}
                        </Badge>
                      )}
                      {proxy.responseTime && (
                        <span className="text-xs text-muted-foreground">
                          {proxy.responseTime}ms
                        </span>
                      )}
                    </div>
                  </div>
                </Label>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            {searchTerm ? "没有找到匹配的代理" : "没有可用的代理"}
          </div>
        )}
      </div>

      {/* 分页控件 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              type="button"
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
                    type="button"
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
              type="button"
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

export default ProxySelectionGrid; 