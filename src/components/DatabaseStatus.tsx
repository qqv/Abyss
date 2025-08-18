import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';

interface DatabaseStatusProps {
  className?: string;
}

interface ConnectionStatus {
  success: boolean;
  message: string;
  error?: string;
}

export function DatabaseStatus({ className }: DatabaseStatusProps) {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const checkConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/db');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      setStatus({
        success: false,
        message: '无法连接到服务器',
        error: error instanceof Error ? error.message : '未知错误'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  // 根据数据库状态设置按钮颜色和图标
  const getButtonConfig = () => {
    if (!status) {
      return {
        variant: "outline" as const,
        icon: <RefreshCw className="h-4 w-4" />
      };
    }

    if (status.success) {
      return {
        variant: "outline" as const,
        className: "bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 border-green-200",
        icon: <CheckCircle className="h-4 w-4" />
      };
    } else {
      return {
        variant: "outline" as const,
        className: "bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border-red-200",
        icon: <XCircle className="h-4 w-4" />
      };
    }
  };

  const btnConfig = getButtonConfig();

  return (
    <div className={className}>
      <Button 
        variant={btnConfig.variant}
        size="icon" 
        onClick={checkConnection}
        disabled={loading}
        title={status ? status.message : '正在检查数据库连接'}
        className={`rounded-full h-10 w-10 shadow-md ${btnConfig.className || ''}`}
      >
        {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : btnConfig.icon}
      </Button>
    </div>
  );
}
