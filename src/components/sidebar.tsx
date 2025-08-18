"use client";

import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { ViewMode } from "@/app/ClientWrapper";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  FolderTree, 
  Play, 
  Database,
  Import,
  Plus,
  FileText,
  Network,
} from "@/components/ui/icons";
import { Beaker } from "lucide-react";
import { useTranslation } from "react-i18next";
import { fetchSidebarCollections } from "./services/sidebar-service";

// 定义侧边栏组件属性接口
interface SidebarProps {
  onViewModeChange?: (mode: ViewMode) => void;
  currentViewMode?: ViewMode;
  currentApiTestTab?: 'collections' | 'history';
  currentProxyTab?: string;
  onApiTestTabChange?: (tab: 'collections' | 'history') => void;
}

export default function Sidebar({ onViewModeChange, currentViewMode = "api", currentApiTestTab = 'collections', currentProxyTab = 'proxies', onApiTestTabChange }: SidebarProps) {
  const { t, i18n } = useTranslation("common");
  const [searchTerm, setSearchTerm] = useState("");
  const [apiCollections, setApiCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    "collections": true,
    "proxy-pool": false,
    "api-testing": false
  });
  
  // 添加对话框状态
  const [showAddCollectionDialog, setShowAddCollectionDialog] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const { toast } = useToast();
  
  // 处理添加集合按钮点击
  const handleAddCollectionClick = () => {
    setShowAddCollectionDialog(true);
  };
  
  // 已移除环境变量相关功能
  
  // 创建新集合
  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) {
      toast({
        title: "请输入集合名称",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const response = await fetch('/api/v1/collections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newCollectionName }),
      });
      
      if (response.ok) {
        const newCollection = await response.json();
        setApiCollections([...apiCollections, newCollection]);
        setNewCollectionName("");
        setShowAddCollectionDialog(false);
        toast({
          title: "创建成功",
          description: `已创建集合: ${newCollectionName}`,
        });
      } else {
        toast({
          title: "创建失败",
          description: `错误代码: ${response.status}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("创建集合失败:", error);
      toast({
        title: "创建失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    }
  };
  
  // 获取API集合数据
  useEffect(() => {
    const getCollections = async () => {
      setLoading(true);
      try {
        const collections = await fetchSidebarCollections();
        setApiCollections(collections);
      } catch (error) {
        console.error('加载侧边栏集合失败:', error);
        // 出错时设置为空数组
        setApiCollections([]);
      } finally {
        setLoading(false);
      }
    };
    
    getCollections();
  }, []);
  
  // 环境变量功能已移除

  // 根据搜索条件过滤集合
  const filteredCollections = apiCollections.filter(collection =>
    collection.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 处理视图模式变更
  const handleViewModeChange = (mode: ViewMode) => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    }
  };

  // 切换文件夹展开/折叠状态
  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  // 计算每个集合中的请求数量
  const getRequestCount = (collection: any) => {
    if (!collection.items) return 0;
    return collection.items.filter((item: any) => 'url' in item).length;
  };

  return (
    <div className={`${collapsed ? 'w-12' : 'w-64'} border-r border-border flex flex-col h-full bg-background transition-all duration-300`}>
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Abyss Logo" className="h-5 w-5" />
            <h1 className="text-md font-bold">Abyss</h1>
          </div>
        )}
        <div className="flex items-center ml-auto space-x-2">
          {!collapsed && <ThemeToggle />}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? t('sidebar.expand', '展开侧边栏') : t('sidebar.collapse', '折叠侧边栏')}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-2">
          <div className="relative">
            <Input
              placeholder={t('sidebar.searchPlaceholder', '搜索API或集合...')}
              className="text-sm pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg 
              className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.3-4.3"></path>
            </svg>
          </div>
        </div>
      )}

      {!collapsed ? (
        <div className="px-3 py-2 flex space-x-1 overflow-x-auto scrollbar-hide">
          <button 
            className={`shrink-0 px-3 py-1.5 rounded-md text-xs flex items-center space-x-1.5 ${currentViewMode === "api" ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
            onClick={() => handleViewModeChange("api")}
          >
            <FolderTree className="h-3.5 w-3.5" />
            <span>{t('sidebar.tabs.collections', '集合')}</span>
          </button>
          <button 
            className={`shrink-0 px-3 py-1.5 rounded-md text-xs flex items-center space-x-1.5 ${currentViewMode === "api-testing" ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
            onClick={() => handleViewModeChange("api-testing")}
          >
            <Play className="h-3.5 w-3.5" />
            <span>{t('sidebar.tabs.run', '运行')}</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-2">
          <button 
            className={`w-8 h-8 rounded-md flex items-center justify-center ${currentViewMode === "api" ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
            onClick={() => handleViewModeChange("api")}
            title={t('sidebar.tabs.collections', '集合')}
          >
            <FolderTree className="h-4 w-4" />
          </button>
          <button 
            className={`w-8 h-8 rounded-md flex items-center justify-center ${currentViewMode === "api-testing" ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
            onClick={() => handleViewModeChange("api-testing")}
            title={t('sidebar.tabs.run', '运行')}
          >
            <Play className="h-4 w-4" />
          </button>
        </div>
      )}

      <Separator className="mb-2" />

      <ScrollArea className="flex-1 px-2">
        {/* 集合部分 */}
        <div className="mb-4">
          <div 
            className="flex items-center justify-between py-1.5 px-2 text-sm font-medium cursor-pointer hover:bg-muted/50 rounded-md"
            onClick={() => toggleFolder("collections")}
          >
            <div className="flex items-center space-x-1">
              <FolderTree className="h-4 w-4 text-blue-500" />
              {!collapsed && <span>{t('sidebar.section.collections', '集合')}</span>}
            </div>
            {!collapsed && (
              <div className="flex items-center space-x-1">
                <Plus 
                  className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-pointer" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddCollectionClick();
                  }}
                />
                {/* <Import className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" /> */}
                <span className="text-xs">{expandedFolders["collections"] ? "▼" : "▶"}</span>
              </div>
            )}
          </div>

          {!collapsed && expandedFolders["collections"] && (
            <div className="pl-4">
              {filteredCollections.length > 0 ? (
                <button
                  className={`w-full py-1.5 px-2 text-sm flex items-center space-x-1.5 cursor-pointer hover:bg-muted/50 rounded-md text-left ${currentViewMode === "api" ? "bg-primary/10 text-primary" : ""}`}
                  onClick={() => handleViewModeChange("api")}
                >
                  <span className="truncate">{t('sidebar.collectionManage', '集合管理')}</span>
                </button>
              ) : (
                <div className="py-2 px-2 text-sm text-muted-foreground italic">{t('sidebar.noCollections', '没有集合')}</div>
              )}
            </div>
          )}
        </div>

        {/* 环境变量功能已移除 */}

        {/* 代理池部分 */}
        <div className="mb-4">
          <div 
            className="flex items-center justify-between py-1.5 px-2 text-sm font-medium cursor-pointer hover:bg-muted/50 rounded-md"
            onClick={() => toggleFolder("proxy-pool")}
          >
            <div className="flex items-center space-x-1">
              <Network className="h-4 w-4 text-purple-500" />
              {!collapsed && <span>{t('sidebar.section.proxyPool', '代理池')}</span>}
            </div>
            {!collapsed && (
              <div className="flex items-center space-x-1">
                <span className="text-xs">{expandedFolders["proxy-pool"] ? "▼" : "▶"}</span>
              </div>
            )}
          </div>

          {!collapsed && expandedFolders["proxy-pool"] && (
            <div className="pl-4">
              <button
                className={`w-full py-1.5 px-2 text-sm flex items-center space-x-1.5 cursor-pointer hover:bg-muted/50 rounded-md text-left ${["proxy-pool", "tunnel-management", "proxy-settings"].includes(currentViewMode) && currentProxyTab === "proxies" ? "bg-primary/10 text-primary" : ""}`}
                onClick={() => handleViewModeChange("proxy-pool")}
              >
                <span className="truncate">{t('sidebar.proxy.manage', '代理管理')}</span>
              </button>
              <button
                className={`w-full py-1.5 px-2 text-sm flex items-center space-x-1.5 cursor-pointer hover:bg-muted/50 rounded-md text-left ${["proxy-pool", "tunnel-management", "proxy-settings"].includes(currentViewMode) && currentProxyTab === "tunnels" ? "bg-primary/10 text-primary" : ""}`}
                onClick={() => handleViewModeChange("tunnel-management")}
              >
                <span className="truncate">{t('sidebar.proxy.tunnel', '隧道管理')}</span>
              </button>
              <button
                className={`w-full py-1.5 px-2 text-sm flex items-center space-x-1.5 cursor-pointer hover:bg-muted/50 rounded-md text-left ${["proxy-pool", "tunnel-management", "proxy-settings"].includes(currentViewMode) && currentProxyTab === "settings" ? "bg-primary/10 text-primary" : ""}`}
                onClick={() => handleViewModeChange("proxy-settings")}
              >
                <span className="truncate">{t('sidebar.settings', '代理池设置')}</span>
              </button>
            </div>
          )}
        </div>

        {/* API测试部分 */}
        <div className="mb-4">
          <div 
            className="flex items-center justify-between py-1.5 px-2 text-sm font-medium cursor-pointer hover:bg-muted/50 rounded-md"
            onClick={() => toggleFolder("api-testing")}
          >
            <div className="flex items-center space-x-1">
              <Beaker className="h-4 w-4 text-amber-500" />
              {!collapsed && <span>{t('sidebar.section.apiTest', 'API测试')}</span>}
            </div>
            {!collapsed && (
              <div className="flex items-center space-x-1">
                <Plus 
                  className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" 
                  onClick={(e) => {
                    e.stopPropagation();
                    // 我们需要访问 ClientWrapper 中的 setApiTestInitialTab
                    // 可以通过事件发送或其他方式来实现
                    // 这里的解决方案是将特殊状态存入本地存储
                    
                    // 将创建标志存入本地存储
                    localStorage.setItem('api-test-create-mode', 'true');
                    
                    // 导航到API测试页面
                    handleViewModeChange("api-testing");
                  }}
                />
                <span className="text-xs">{expandedFolders["api-testing"] ? "▼" : "▶"}</span>
              </div>
            )}
          </div>

          {!collapsed && expandedFolders["api-testing"] && (
            <div className="pl-4">
              <button
                className={`w-full py-1.5 px-2 text-sm flex items-center space-x-1.5 cursor-pointer hover:bg-muted/50 rounded-md text-left ${currentViewMode === "api-testing" && currentApiTestTab === 'collections' ? "bg-primary/10 text-primary" : ""}`}
                onClick={() => {
                  // 先设置localStorage指示应该显示集合标签页，然后切换到API测试视图
                  localStorage.setItem('api-test-initial-tab', 'collections');
                  // 更新当前API测试标签页状态
                  if (onApiTestTabChange) {
                    onApiTestTabChange('collections');
                  }
                  handleViewModeChange("api-testing");
                }}
              >
                <span className="truncate">{t('sidebar.runCollection', '运行集合')}</span>
              </button>
              <button
                className={`w-full py-1.5 px-2 text-sm flex items-center space-x-1.5 cursor-pointer hover:bg-muted/50 rounded-md text-left ${currentViewMode === "api-testing" && currentApiTestTab === 'history' ? "bg-primary/10 text-primary" : ""}`}
                onClick={() => {
                  // 先切换到 API 测试视图，然后通过设置 localStorage 来指示应该显示历史标签页
                  localStorage.setItem('api-test-initial-tab', 'history');
                  // 更新当前API测试标签页状态
                  if (onApiTestTabChange) {
                    onApiTestTabChange('history');
                  }
                  handleViewModeChange("api-testing");
                }}
                >
                <span className="truncate">{t('sidebar.runHistory', '运行历史')}</span>
              </button>
            </div>
          )}
        </div>
      </ScrollArea>

      <Separator />

      {!collapsed ? (
        <div className="p-2">
          <button
            className={`w-full py-1.5 text-xs flex justify-center items-center space-x-1 rounded-md ${currentViewMode === "system-settings" ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
            onClick={() => handleViewModeChange("system-settings")}
          >
            <svg
              className="h-3.5 w-3.5"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>{t('sidebar.settings', '设置')}</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-2">
          <button
            className={`w-8 h-8 rounded-md flex items-center justify-center ${currentViewMode === "system-settings" ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
            onClick={() => handleViewModeChange("system-settings")}
            title={t('sidebar.settings', '设置')}
          >
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      )}
      
      {/* 添加集合对话框 */}
      <Dialog open={showAddCollectionDialog} onOpenChange={setShowAddCollectionDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('sidebar.dialog.addCollectionTitle', '添加新集合')}</DialogTitle>
            <DialogDescription>
              {t('sidebar.dialog.addCollectionDesc', '创建一个新的API集合来组织您的API测试。')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                {t('sidebar.dialog.name', '名称')}
              </Label>
              <Input
                id="name"
                placeholder={t('sidebar.dialog.namePlaceholder', '输入集合名称')}
                className="col-span-3"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleCreateCollection}>{t('sidebar.dialog.create', '创建')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 环境变量功能已移除 */}
    </div>
  );
}
