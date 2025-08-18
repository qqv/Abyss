'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Check, AlertTriangle, RotateCw, Clock, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ProxyStatusCardProps {
  proxyId: string;
  onTest?: () => void;
  className?: string;
}

export function ProxyStatusCard({ proxyId, onTest, className }: ProxyStatusCardProps) {
  const [proxy, setProxy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // 加载代理详情
  useEffect(() => {
    const fetchProxy = async () => {
      if (!proxyId) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/v1/proxies/${proxyId}`);
        if (!response.ok) {
          throw new Error(`获取代理详情失败: ${response.status}`);
        }
        const data = await response.json();
        setProxy(data);
        setError(null);
      } catch (err) {
        console.error('获取代理详情错误:', err);
        setError('无法加载代理详情');
      } finally {
        setLoading(false);
      }
    };

    fetchProxy();
  }, [proxyId]);

  // 测试代理
  const handleTestProxy = async () => {
    if (!proxy) return;
    
    try {
      setIsTesting(true);
      const response = await fetch(`/api/v1/proxies/${proxyId}/test`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`测试代理失败: ${response.status}`);
      }
      
      const result = await response.json();
      
      // 更新代理状态
      setProxy({
        ...proxy,
        isValid: result.success,
        responseTime: result.responseTime,
        lastChecked: new Date().toISOString()
      });
      
    } catch (err) {
      console.error('测试代理错误:', err);
    } finally {
      setIsTesting(false);
      // 调用外部测试处理函数（如果存在）
      if (onTest) onTest();
    }
  };

  // 渲染代理状态标识
  const renderProxyStatus = () => {
    if (!proxy) return null;
    
    if (proxy.isValid === undefined) {
      return (
        <Badge variant="outline" className="bg-gray-100">
          <Clock className="h-4 w-4 mr-1" />
          未测试
        </Badge>
      );
    }

    if (proxy.isValid) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <Check className="h-4 w-4 mr-1" />
          可用
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <AlertTriangle className="h-4 w-4 mr-1" />
          不可用
        </Badge>
      );
    }
  };

  // 计算速度评级（基于响应时间）
  const getSpeedRating = () => {
    if (!proxy || proxy.responseTime === undefined) return 'N/A';
    
    const time = proxy.responseTime;
    
    if (time < 200) return '极快';
    if (time < 500) return '快速';
    if (time < 1000) return '良好';
    if (time < 2000) return '一般';
    return '较慢';
  };

  // 计算速度进度条值
  const getSpeedProgress = () => {
    if (!proxy || proxy.responseTime === undefined || !proxy.isValid) return 0;
    
    const time = proxy.responseTime;
    // 响应时间越低越好，最大值设为2000ms
    return Math.max(0, 100 - (time / 20));
  };

  if (loading) {
    return <Skeleton className="h-[200px] w-full" />;
  }

  if (error || !proxy) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-red-500">加载错误</CardTitle>
          <CardDescription>{error || '无法加载代理详情'}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">{proxy.protocol}://{proxy.host}:{proxy.port}</CardTitle>
          {renderProxyStatus()}
        </div>
        <CardDescription>
          {proxy.username ? `认证: ${proxy.username}:******` : '无认证'}
          {proxy.lastChecked && (
            <div className="mt-1 text-xs">
              最后检查: {new Date(proxy.lastChecked).toLocaleString()}
            </div>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">速度</span>
            <span className="text-sm">{getSpeedRating()}</span>
          </div>
          <Progress value={getSpeedProgress()} />
          <div className="text-xs text-muted-foreground">
            响应时间: {proxy.responseTime !== undefined ? `${proxy.responseTime} ms` : 'N/A'}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {proxy.failureCount === 0 ? '无失败记录' : `失败次数: ${proxy.failureCount}`}
          </span>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          disabled={isTesting}
          onClick={handleTestProxy}
        >
          {isTesting ? (
            <>
              <RotateCw className="h-4 w-4 mr-2 animate-spin" />
              测试中...
            </>
          ) : (
            <>
              <RotateCw className="h-4 w-4 mr-2" />
              测试连接
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
