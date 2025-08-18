"use client";

import { X } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

// 截断URL以适应选项卡显示
function truncateUrl(url: string, maxLength: number): string {
  if (url.length <= maxLength) return url;
  
  // 尝试提取域名和路径的重要部分
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    
    // 如果只有域名就已经接近最大长度，则只显示域名部分
    if (domain.length > maxLength - 10) {
      return domain.substring(0, maxLength - 3) + '...';
    }
    
    // 否则尝试保留域名和路径的部分内容
    const path = urlObj.pathname + urlObj.search;
    if (path.length > maxLength - domain.length - 5) {
      // 路径太长，需要截断
      const availableChars = maxLength - domain.length - 5;
      const firstPart = Math.ceil(availableChars * 0.3); // 保留开头部分
      const lastPart = availableChars - firstPart; // 保留结尾部分
      
      return domain + path.substring(0, firstPart) + '...' + 
             path.substring(path.length - lastPart);
    }
    
    return url;
  } catch (e) {
    // 如果不是有效URL或解析出错，简单截断
    return url.substring(0, maxLength - 3) + '...';
  }
}

interface TabItemProps {
  id: string;
  title: string;
  isActive: boolean;
  isDirty: boolean;
}

interface RequestTabsProps {
  tabs: TabItemProps[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
}

export function RequestTabs({ 
  tabs, 
  activeTabId, 
  onSelectTab, 
  onCloseTab 
}: RequestTabsProps) {
  const { t } = useTranslation('common');
  if (tabs.length === 0) {
    return null;
  }
  
  return (
    <div className="border-b">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={cn(
                "inline-flex items-center h-9 px-4 py-1 border-r border-b-2 text-sm transition-colors",
                tab.isActive 
                  ? "border-b-primary bg-gray-50 dark:bg-gray-800 font-medium" 
                  : "border-b-transparent text-gray-500 dark:text-gray-400 bg-transparent hover:bg-gray-50/50 dark:hover:bg-gray-800/50"
              )}
              style={{ marginBottom: "-1px" }}
            >
              <button
                className="mr-1 flex items-center max-w-[300px]"
                onClick={() => onSelectTab(tab.id)}
                title={tab.title}
              >
                <span className="truncate">{truncateUrl(tab.title, 40)}</span>
                {tab.isDirty && <span className="ml-1 text-yellow-500 flex-shrink-0">•</span>}
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 rounded-full opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="h-2" />
      </ScrollArea>
    </div>
  );
}
