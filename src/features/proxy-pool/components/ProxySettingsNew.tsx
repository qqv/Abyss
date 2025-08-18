"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { type ProxyPoolConfig, type ProxyStats } from "../types";

const proxySettingsSchema = z.object({
  // 代理验证设置
  checkProxiesOnStartup: z.boolean(),
  enableHealthCheck: z.boolean(),
  proxyHealthCheckInterval: z.number().min(1).max(1440),
  maxFailuresBeforeRemoval: z.number().min(1).max(50),
  
  // 性能设置
  connectionTimeout: z.number().min(1000).max(60000),
  requestTimeout: z.number().min(1000).max(120000),
  maxConcurrentChecks: z.number().min(1).max(100),
});

interface ProxySettingsProps {
  config: ProxyPoolConfig;
  stats: ProxyStats;
  onUpdateConfig: (config: Partial<ProxyPoolConfig>) => void;
}

const ProxySettings: React.FC<ProxySettingsProps> = ({
  config,
  stats,
  onUpdateConfig,
}) => {
  const { t } = useTranslation('common');
  const form = useForm<z.infer<typeof proxySettingsSchema>>({
    resolver: zodResolver(proxySettingsSchema),
    defaultValues: {
      checkProxiesOnStartup: config.checkProxiesOnStartup ?? true,
      enableHealthCheck: config.enableHealthCheck ?? false,
      proxyHealthCheckInterval: config.proxyHealthCheckInterval ?? 60,
      maxFailuresBeforeRemoval: config.maxFailuresBeforeRemoval ?? 5,
      connectionTimeout: config.connectionTimeout ?? 5000,
      requestTimeout: config.requestTimeout ?? 10000,
      maxConcurrentChecks: config.maxConcurrentChecks ?? 10,
    },
  });

  const handleSubmit = (values: z.infer<typeof proxySettingsSchema>) => {
    onUpdateConfig(values);
  };

  const enableHealthCheck = form.watch("enableHealthCheck");

  return (
    <div className="space-y-4">
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('proxyPool.settings.statusTitle', '代理池状态')}</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-muted-foreground">{t('proxyPool.settings.total', '总代理数')}</span>
              <span className="text-2xl font-bold">{stats.totalProxies}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-muted-foreground">{t('proxyPool.settings.active', '活跃代理数')}</span>
              <span className="text-2xl font-bold">{stats.activeProxies}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-muted-foreground">{t('proxyPool.settings.valid', '有效代理数')}</span>
              <span className="text-2xl font-bold">{stats.validProxies}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-muted-foreground">{t('proxyPool.settings.avgResponse', '平均响应时间')}</span>
              <span className="text-2xl font-bold">
                {stats.averageResponseTime ? `${stats.averageResponseTime}ms` : t('proxyPool.common.unknown', '未知')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('proxyPool.settings.verify.title', '代理验证设置')}</CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-3 space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <FormLabel className="text-base font-medium">{t('proxyPool.settings.verify.startup', '启动时检测代理')}</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      {t('proxyPool.settings.verify.startupDesc', '程序启动时自动检测所有代理的可用性')}
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="checkProxiesOnStartup"
                    render={({ field }: { field: any }) => (
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    )}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <FormLabel className="text-base font-medium">{t('proxyPool.settings.health.enable', '启用代理健康检查')}</FormLabel>
                    <p className="text.sm text-muted-foreground">
                      {t('proxyPool.settings.health.enableDesc', '定期检查代理的可用性状态')}
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="enableHealthCheck"
                    render={({ field }: { field: any }) => (
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    )}
                  />
                </div>
              </div>
              
              {enableHealthCheck && (
                <div className="space-y-4 pt-4 border-t">
                  <FormField
                    control={form.control}
                    name="proxyHealthCheckInterval"
                    render={({ field }: { field: any }) => (
                      <FormItem>
                        <FormLabel>{t('proxyPool.settings.health.interval', '健康检查间隔 (分钟)')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="1440"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormDescription>
                          {t('proxyPool.settings.health.intervalDesc', '检查代理健康状态的时间间隔 (1-1440分钟)')}
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maxFailuresBeforeRemoval"
                    render={({ field }: { field: any }) => (
                      <FormItem>
                        <FormLabel>{t('proxyPool.settings.health.maxFailures', '最大失败次数')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormDescription>
                          {t('proxyPool.settings.health.maxFailuresDesc', '代理失败次数达到此值后将被移除 (1-100)')}
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('proxyPool.settings.performance.title', '性能设置')}</CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-3 space-y-4">
              <FormField
                control={form.control}
                name="connectionTimeout"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>{t('proxyPool.settings.performance.connectionTimeout', '连接超时时间 (毫秒)')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1000"
                        max="60000"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      {t('proxyPool.settings.performance.connectionTimeoutDesc', '连接代理的超时时间 (1000-60000毫秒)')}
                    </FormDescription>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="requestTimeout"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>{t('proxyPool.settings.performance.requestTimeout', '请求超时时间 (毫秒)')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1000"
                        max="60000"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      {t('proxyPool.settings.performance.requestTimeoutDesc', '请求代理的超时时间 (1000-60000毫秒)')}
                    </FormDescription>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxConcurrentChecks"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>{t('proxyPool.settings.performance.maxConcurrentChecks', '最大并发检查数')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      {t('proxyPool.settings.performance.maxConcurrentChecksDesc', '最大并发检查代理的数量 (1-100)')}
                    </FormDescription>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit">{t('actions.save', '保存设置')}</Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default ProxySettings;
