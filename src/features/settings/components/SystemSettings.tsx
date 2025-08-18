'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  FileText, 

  Palette, 
  Database, 
  Zap,
  Globe,
  Shield,
  Clock,
  Download,
  Upload
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

// 导入各个设置子组件
import GeneralSettings from './GeneralSettings';
import LogsManagement from './LogsManagement';

import ThemeSettings from './ThemeSettings';
import DataManagement from './DataManagement';
import AdvancedSettings from './AdvancedSettings';

export interface SystemSettingsProps {
  className?: string;
}

const SystemSettings: React.FC<SystemSettingsProps> = ({ className }) => {
  const [activeTab, setActiveTab] = useState('general');
  const { t } = useTranslation('common');

  // 设置选项卡配置
  const settingsTabs = [
    {
      id: 'general',
      label: t('system.tabs.general', '通用设置'),
      icon: Settings,
      description: t('system.tabs.generalDesc', '语言、时区、超时等基础设置')
    },
    {
      id: 'logs',
      label: t('system.tabs.logs', '日志管理'),
      icon: FileText,
      description: t('system.tabs.logsDesc', 'API测试日志、代理池日志管理')
    },

    {
      id: 'theme',
      label: t('system.tabs.theme', '主题界面'),
      icon: Palette,
      description: t('system.tabs.themeDesc', '主题、字体、界面布局设置')
    },
    {
      id: 'data',
      label: t('system.tabs.data', '数据管理'),
      icon: Database,
      description: t('system.tabs.dataDesc', '数据导出、备份恢复')
    },
    {
      id: 'advanced',
      label: t('system.tabs.advanced', '高级设置'),
      icon: Zap,
      description: t('system.tabs.advancedDesc', '代理、证书、性能优化设置')
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralSettings />;
      case 'logs':
        return <LogsManagement />;

      case 'theme':
        return <ThemeSettings />;
      case 'data':
        return <DataManagement />;
      case 'advanced':
        return <AdvancedSettings />;
      default:
        return <GeneralSettings />;
    }
  };

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* 页面标题 */}
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <Settings className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">{t('system.title', '系统设置')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('system.subtitle', '配置平台的各项设置和偏好')}
            </p>
          </div>
        </div>
      </div>

      {/* 设置内容 */}
      <div className="flex-1 flex">
        {/* 左侧导航 */}
        <div className="w-64 border-r border-border bg-muted/30">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              {settingsTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{tab.label}</div>
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {tab.description}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* 右侧内容区域 */}
        <div className="flex-1 flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-6">
              {renderTabContent()}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
