'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { Globe, Clock, Zap, RefreshCw } from 'lucide-react';
import { getI18nInstance } from '@/i18n/client';

interface GeneralSettingsData {
  language: string;
  timezone: string;
  defaultTimeout: number;
  maxConcurrentRequests: number;
  maxRetries: number;
  enableRequestLogging: boolean;
  enableAutoUpdate: boolean;
  collectionResultsStorage: 'browser' | 'database'; // 集合运行结果存储位置
}

const GeneralSettings: React.FC = () => {
  const { toast } = useToast();
  const i18n = getI18nInstance();
  const t = (key: string, fallback: string) => i18n.t(key, { defaultValue: fallback });
  const [settings, setSettings] = useState<GeneralSettingsData>({
    language: 'zh-CN',
    timezone: 'Asia/Shanghai',
    defaultTimeout: 30000,
    maxConcurrentRequests: 10,
    maxRetries: 3,
    enableRequestLogging: true,
    enableAutoUpdate: false,
    collectionResultsStorage: 'browser' // 默认使用浏览器存储
  });
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [updateCheckStatus, setUpdateCheckStatus] = useState<'idle' | 'checking' | 'available' | 'latest'>('idle');
  const [latestVersion, setLatestVersion] = useState<string>('');

  // 模拟从本地存储加载设置
  useEffect(() => {
    const loadSettings = () => {
      try {
        const savedSettings = localStorage.getItem('abyss-general-settings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          setSettings(prev => ({ ...prev, ...parsed }));
          if (parsed.language) {
            const i18n = getI18nInstance();
            i18n.changeLanguage(parsed.language);
          }
        }
      } catch (error) {
        console.error('加载通用设置失败:', error);
      }
    };
    loadSettings();
  }, []);

  // 同步 <html lang> 属性
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = settings.language || 'zh-CN';
    }
  }, [settings.language]);

  // 实时更新时间显示
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 自动检查更新
  useEffect(() => {
    if (settings.enableAutoUpdate) {
      checkForUpdates();
    }
  }, [settings.enableAutoUpdate]);

  // 格式化时区时间
  const formatTimeInTimezone = (timezone: string) => {
    try {
      return new Intl.DateTimeFormat('zh-CN', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(currentTime);
    } catch (error) {
      return currentTime.toLocaleString('zh-CN');
    }
  };

  // 获取时区偏移信息
  const getTimezoneOffset = (timezone: string) => {
    try {
      const now = new Date();
      const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
      const targetTime = new Date(utcTime + (getTimezoneOffsetHours(timezone) * 3600000));
      const offsetHours = getTimezoneOffsetHours(timezone);
      const sign = offsetHours >= 0 ? '+' : '';
      return `UTC${sign}${offsetHours}`;
    } catch (error) {
      return 'UTC+8';
    }
  };

  const getTimezoneOffsetHours = (timezone: string) => {
    const offsetMap: Record<string, number> = {
      'Asia/Shanghai': 8,
      'America/New_York': -5,
      'Europe/London': 0,
      'Asia/Tokyo': 9,
      'America/Los_Angeles': -8,
      'Europe/Paris': 1,
      'Australia/Sydney': 11,
      'Asia/Dubai': 4,
      'Asia/Singapore': 8,
      'America/Chicago': -6
    };
    return offsetMap[timezone] || 8;
  };

  // 检查更新功能
  const checkForUpdates = async () => {
    if (updateCheckStatus === 'checking') return;
    
    setUpdateCheckStatus('checking');
    try {
      const response = await fetch('https://api.github.com/repos/qqv/Abyss/releases/latest');
      if (!response.ok) {
        throw new Error('Failed to fetch release info');
      }
      
      const releaseInfo = await response.json();
      const latestVersionTag = releaseInfo.tag_name?.replace(/^v/, '') || '';
      const currentVersion = '0.1.0'; // 从package.json获取
      
      setLatestVersion(latestVersionTag);
      
      if (latestVersionTag && latestVersionTag !== currentVersion) {
        setUpdateCheckStatus('available');
        toast({
          title: '发现新版本',
          description: `最新版本 ${latestVersionTag} 可用，当前版本 ${currentVersion}`,
        });
      } else {
        setUpdateCheckStatus('latest');
      }
    } catch (error) {
      // 静默处理错误，不在控制台输出
      setUpdateCheckStatus('idle');
      toast({
        title: '检查更新失败',
        description: '无法连接到更新服务器',
        variant: 'destructive',
      });
    }
  };

  // 手动检查更新
  const handleManualUpdateCheck = () => {
    checkForUpdates();
  };

  // 更新设置
  const updateSetting = <K extends keyof GeneralSettingsData>(
    key: K,
    value: GeneralSettingsData[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
    if (key === 'language') {
      // 同步切换语言
      const i18n = getI18nInstance();
      i18n.changeLanguage(String(value));
      try {
        // 同步写入localStorage，保持刷新后的语言一致
        const saved = localStorage.getItem('abyss-general-settings');
        const parsed = saved ? JSON.parse(saved) : {};
        localStorage.setItem('abyss-general-settings', JSON.stringify({ ...parsed, language: value }));
      } catch {}
    }
  };

  // 保存设置
  const handleSave = async () => {
    setIsLoading(true);
    try {
      // 保存到本地存储
      localStorage.setItem('abyss-general-settings', JSON.stringify(settings));
      
      // 同步请求日志记录设置到服务端
      try {
        await fetch('/api/v1/logs/global-setting', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            enableRequestLogging: settings.enableRequestLogging
          })
        });
      } catch (logError) {
        console.warn('同步全局日志设置失败:', logError);
        // 即使日志设置同步失败，也不阻止整体保存流程
      }
      
      setHasChanges(false);
      toast({
        title: '设置已保存',
        description: '通用设置已成功保存',
      });
    } catch (error) {
      toast({
        title: '保存失败',
        description: '保存设置时发生错误，请重试',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 重置设置
  const handleReset = () => {
    setSettings({
      language: 'zh-CN',
      timezone: 'Asia/Shanghai',
      defaultTimeout: 30000,
      maxConcurrentRequests: 10,
      maxRetries: 3,
      enableRequestLogging: true,
      enableAutoUpdate: false,
      collectionResultsStorage: 'browser'
    });
    setHasChanges(true);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h2 className="text-xl font-semibold flex items-center space-x-2">
          <Globe className="h-5 w-5" />
          <span>{t('general.title', '通用设置')}</span>
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t('general.subtitle', '配置语言、时区、超时等基础设置')}
        </p>
      </div>

      {/* 语言和地区设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('general.localeSection', '语言和地区')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="language">{t('general.language', '界面语言')}</Label>
              <Select
                value={settings.language}
                onValueChange={(value) => updateSetting('language', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zh-CN">{t('languages.zhCN', '简体中文')}</SelectItem>
                  <SelectItem value="en">{t('languages.en', 'English')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">{t('general.timezone', '时区')}</Label>
              <Select
                value={settings.timezone}
                onValueChange={(value) => updateSetting('timezone', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Shanghai">中国标准时间 (UTC+8)</SelectItem>
                  <SelectItem value="America/New_York">美国东部时间 (UTC-5)</SelectItem>
                  <SelectItem value="America/Los_Angeles">美国西部时间 (UTC-8)</SelectItem>
                  <SelectItem value="America/Chicago">美国中部时间 (UTC-6)</SelectItem>
                  <SelectItem value="Europe/London">格林威治时间 (UTC+0)</SelectItem>
                  <SelectItem value="Europe/Paris">欧洲中部时间 (UTC+1)</SelectItem>
                  <SelectItem value="Asia/Tokyo">日本标准时间 (UTC+9)</SelectItem>
                  <SelectItem value="Asia/Singapore">新加坡时间 (UTC+8)</SelectItem>
                  <SelectItem value="Asia/Dubai">阿联酋时间 (UTC+4)</SelectItem>
                  <SelectItem value="Australia/Sydney">澳大利亚东部时间 (UTC+11)</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex items-center justify-between">
                  <span>当前时区时间:</span>
                  <span className="font-mono">{formatTimeInTimezone(settings.timezone)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>时区偏移:</span>
                  <span className="font-mono">{getTimezoneOffset(settings.timezone)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 系统行为设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <Zap className="h-4 w-4" />
            <span>{t('general.systemBehavior', '系统行为')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('general.enableRequestLogging', '启用请求日志记录')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('general.enableRequestLogging.desc', '记录所有API请求的详细信息')}
              </p>
            </div>
            <Switch
              checked={settings.enableRequestLogging}
              onCheckedChange={(checked) => updateSetting('enableRequestLogging', checked)}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('general.collectionResultsStorage', '集合运行结果存储位置')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('general.collectionResultsStorage.desc', '选择集合运行结果的存储方式')}
              </p>
            </div>
            <Select
              value={settings.collectionResultsStorage}
              onValueChange={(value: 'browser' | 'database') => updateSetting('collectionResultsStorage', value)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="browser">
                  <div className="flex flex-col">
                    <span>{t('general.storage.browser', '浏览器存储')}</span>
                    <span className="text-xs text-muted-foreground">{t('general.storage.browser.desc', '存储在本地浏览器中，快速访问')}</span>
                  </div>
                </SelectItem>
                <SelectItem value="database">
                  <div className="flex flex-col">
                    <span>{t('general.storage.database', '数据库存储')}</span>
                    <span className="text-xs text-muted-foreground">{t('general.storage.database.desc', '存储在MongoDB中，持久保存')}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('general.autoUpdate', '自动检查更新')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('general.autoUpdate.desc', '自动检查并提示可用的更新')}
              </p>
            </div>
            <Switch
              checked={settings.enableAutoUpdate}
              onCheckedChange={(checked) => updateSetting('enableAutoUpdate', checked)}
            />
          </div>
          {settings.enableAutoUpdate && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">版本信息</div>
                    <div className="text-xs text-muted-foreground">
                      当前版本: v0.1.0
                    </div>
                    {latestVersion && (
                      <div className="text-xs text-muted-foreground">
                        最新版本: v{latestVersion}
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={handleManualUpdateCheck}
                    disabled={updateCheckStatus === 'checking'}
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    {updateCheckStatus === 'checking' ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    <span>{updateCheckStatus === 'checking' ? '检查中...' : '检查更新'}</span>
                  </Button>
                </div>
                {updateCheckStatus === 'available' && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start space-x-2">
                      <div className="h-4 w-4 bg-blue-500 rounded-full mt-0.5 flex-shrink-0"></div>
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          发现新版本
                        </div>
                        <div className="text-xs text-blue-700 dark:text-blue-300">
                          新版本 v{latestVersion} 已可用，建议及时更新以获取最新功能和安全修复。
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {updateCheckStatus === 'latest' && (
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center space-x-2">
                      <div className="h-4 w-4 bg-green-500 rounded-full"></div>
                      <div className="text-sm text-green-900 dark:text-green-100">
                        当前已是最新版本
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <div className="flex items-center justify-between pt-4">
        <Button
          variant="outline"
          onClick={handleReset}
          className="flex items-center space-x-2"
        >
          <RefreshCw className="h-4 w-4" />
          <span>{t('actions.reset', '重置为默认')}</span>
        </Button>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isLoading}
          className="flex items-center space-x-2"
        >
          {isLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
          <span>{isLoading ? t('actions.saving', '保存中...') : t('actions.save', '保存设置')}</span>
        </Button>
      </div>
    </div>
  );
};

export default GeneralSettings;
