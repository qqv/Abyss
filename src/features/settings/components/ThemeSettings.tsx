'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { useTheme } from 'next-themes';
import { 
  Palette, 
  Sun, 
  Moon, 
  Monitor,
  Type,
  Layout,
  RefreshCw,
  CheckCircle,
  Eye
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ThemeSettingsData {
  fontSize: number; // 12-20px
  interfaceDensity: 'compact' | 'standard' | 'comfortable';
  sidebarWidth: number; // 200-400px
  enableAnimations: boolean;
  enableSounds: boolean;
  showLineNumbers: boolean;
  enableWordWrap: boolean;
  highlightCurrentLine: boolean;
}

const ThemeSettings: React.FC = () => {
  const { toast } = useToast();
  const { t } = useTranslation('common');
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<ThemeSettingsData>({
    fontSize: 14,
    interfaceDensity: 'standard',
    sidebarWidth: 256,
    enableAnimations: true,
    enableSounds: false,
    showLineNumbers: true,
    enableWordWrap: true,
    highlightCurrentLine: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // 加载设置
  useEffect(() => {
    const loadSettings = () => {
      try {
        const savedSettings = localStorage.getItem('abyss-theme-settings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          setSettings(prev => ({ ...prev, ...parsed }));
        }
      } catch (error) {
        console.error('加载主题设置失败:', error);
      }
    };
    loadSettings();
  }, []);

  // 更新设置
  const updateSetting = <K extends keyof ThemeSettingsData>(
    key: K,
    value: ThemeSettingsData[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // 保存设置
  const handleSave = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      localStorage.setItem('abyss-theme-settings', JSON.stringify(settings));
      
      // 应用CSS变量
      const root = document.documentElement;
      root.style.setProperty('--font-size', `${settings.fontSize}px`);
      root.style.setProperty('--sidebar-width', `${settings.sidebarWidth}px`);
      
      setHasChanges(false);
      toast({
        title: t('theme.toast.savedTitle', '设置已保存'),
        description: t('theme.toast.savedDesc', '主题设置已成功保存并应用'),
      });
    } catch (error) {
      toast({
        title: t('theme.toast.saveFailedTitle', '保存失败'),
        description: t('theme.toast.saveFailedDesc', '保存设置时发生错误，请重试'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 重置设置
  const handleReset = () => {
    setSettings({
      fontSize: 14,
      interfaceDensity: 'standard',
      sidebarWidth: 256,
      enableAnimations: true,
      enableSounds: false,
      showLineNumbers: true,
      enableWordWrap: true,
      highlightCurrentLine: true
    });
    setHasChanges(true);
  };

  // 主题选项
  const themeOptions = [
    { value: 'light', label: '浅色主题', icon: Sun },
    { value: 'dark', label: '深色主题', icon: Moon },
    { value: 'system', label: '跟随系统', icon: Monitor }
  ];

  // 界面密度选项
  const densityOptions = [
    { value: 'compact', label: '紧凑', description: '更小的间距和元素' },
    { value: 'standard', label: '标准', description: '平衡的间距和大小' },
    { value: 'comfortable', label: '宽松', description: '更大的间距和元素' }
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h2 className="text-xl font-semibold flex items-center space-x-2">
          <Palette className="h-5 w-5" />
          <span>{t('theme.title', '主题和界面')}</span>
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t('theme.subtitle', '自定义界面外观和交互体验')}
        </p>
      </div>

      {/* 主题选择 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('theme.mode.title', '主题模式')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    theme === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <Icon className="h-6 w-6" />
                     <span className="text-sm font-medium">{option.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 交互设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('theme.interaction.title', '交互设置')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('theme.interaction.sounds', '启用音效')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('theme.interaction.soundsDesc', '集合运行完成后发出音效')}
              </p>
            </div>
            <Switch
              checked={settings.enableSounds}
              onCheckedChange={(checked) => updateSetting('enableSounds', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* 编辑器设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <Eye className="h-4 w-4" />
            <span>{t('theme.editor.title', '编辑器设置')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('theme.editor.lineNumbers', '显示行号')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('theme.editor.lineNumbersDesc', '在代码编辑器中显示行号')}
              </p>
            </div>
            <Switch
              checked={settings.showLineNumbers}
              onCheckedChange={(checked) => updateSetting('showLineNumbers', checked)}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('theme.editor.highlightLine', '高亮当前行')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('theme.editor.highlightLineDesc', '高亮显示光标所在行')}
              </p>
            </div>
            <Switch
              checked={settings.highlightCurrentLine}
              onCheckedChange={(checked) => updateSetting('highlightCurrentLine', checked)}
            />
          </div>
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
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          <span>{isLoading ? t('actions.saving', '保存中...') : t('actions.save', '保存设置')}</span>
        </Button>
      </div>
    </div>
  );
};

export default ThemeSettings;
