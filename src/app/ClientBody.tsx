"use client";

import { useEffect, useState } from "react";
import { ThemeProvider } from "next-themes";
import { I18nextProvider } from "react-i18next";
import { getI18nInstance } from "@/i18n/client";
import { DatabaseStatus } from "@/components/DatabaseStatus";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";

export default function ClientBody({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [dbInitialized, setDbInitialized] = useState(false);
  const { toast } = useToast();

  // 初始化数据库连接
  useEffect(() => {
    if (mounted) {
      const checkDatabaseStatus = async () => {
        try {
          const response = await fetch('/api/db');
          const data = await response.json();
          
          if (data.success) {
            setDbInitialized(true);
            // 不再显示数据库连接成功toast通知
          } else {
            setDbInitialized(false);
            // 只在失败时显示通知
            toast({
              title: "数据库连接失败",
              description: data.message,
              variant: "destructive",
            });
          }
        } catch (error) {
          setDbInitialized(false);
          // 连接异常时显示通知
          toast({
            title: "数据库连接异常",
            description: "无法连接到数据库服务",
            variant: "destructive",
          });
        }
      };
      
      checkDatabaseStatus();
    }
  }, [mounted, toast]);

  // Remove any extension-added classes during hydration
  useEffect(() => {
    // This runs only on the client after hydration
    setMounted(true);
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <I18nextProvider i18n={getI18nInstance()}>
        <div className={`${mounted ? "" : "opacity-0"}`}>
          <div className="fixed bottom-4 right-4 z-50">
            <DatabaseStatus />
          </div>
          {children}
          <Toaster />
        </div>
      </I18nextProvider>
    </ThemeProvider>
  );
}
