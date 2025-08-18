'use client';

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Check, AlertTriangle, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ProxySelectorProps {
  onSelect: (proxyId: string | null) => void;
  selectedProxyId?: string | null;
  className?: string;
  label?: string;
  required?: boolean;
}

export function ProxySelector({
  onSelect,
  selectedProxyId,
  className,
  label = '选择代理',
  required = false
}: ProxySelectorProps) {
  const [proxies, setProxies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载代理列表
  useEffect(() => {
    const fetchProxies = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/v1/proxies');
        if (!response.ok) {
          throw new Error(`获取代理列表失败: ${response.status}`);
        }
        const data = await response.json();
        setProxies(data);
        setError(null);
      } catch (err) {
        console.error('获取代理列表错误:', err);
        setError('无法加载代理列表');
      } finally {
        setLoading(false);
      }
    };

    fetchProxies();
  }, []);

  // 格式化代理显示名称
  const formatProxyName = (proxy: any) => {
    return `${proxy.protocol}://${proxy.host}:${proxy.port}`;
  };

  // 渲染代理状态标识
  const renderProxyStatus = (proxy: any) => {
    if (proxy.isValid === undefined) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="ml-2 bg-gray-100">
                <Clock className="h-3 w-3 mr-1" />
                未测试
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>此代理尚未测试可用性</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    if (proxy.isValid) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                <Check className="h-3 w-3 mr-1" />
                可用
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>响应时间: {proxy.responseTime || 'N/A'} ms</p>
              <p>最后检查: {proxy.lastChecked ? new Date(proxy.lastChecked).toLocaleString() : '未知'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    } else {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="ml-2 bg-red-50 text-red-700 border-red-200">
                <AlertTriangle className="h-3 w-3 mr-1" />
                不可用
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>此代理已失败 {proxy.failureCount || 0} 次</p>
              <p>最后检查: {proxy.lastChecked ? new Date(proxy.lastChecked).toLocaleString() : '未知'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
  };

  if (loading) {
    return <Skeleton className="h-10 w-full" />;
  }

  if (error) {
    return (
      <Select disabled>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={`错误: ${error}`} />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <div className={className}>
      <Select
        value={selectedProxyId || ''}
        onValueChange={(value) => onSelect(value === 'none' ? null : value)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={`${label}${required ? ' *' : ''}`} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">不使用代理</SelectItem>
          {proxies.length === 0 && (
            <SelectItem disabled value="empty">
              没有可用的代理
            </SelectItem>
          )}
          {proxies.map((proxy) => (
            <SelectItem key={proxy._id} value={proxy._id} className="flex justify-between">
              <div className="flex items-center justify-between w-full">
                <span>{formatProxyName(proxy)}</span>
                {renderProxyStatus(proxy)}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
