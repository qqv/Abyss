"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import * as z from "zod";
import { type Proxy } from "../types";

// schema 将在组件内根据 t 生成校验消息

interface ProxyFormProps {
  initialData?: Partial<Proxy>;
  onSubmit: (data: Omit<Proxy, "id" | "isActive" | "lastChecked" | "isValid">) => void;
  onCancel: () => void;
}

const ProxyForm: React.FC<ProxyFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
}) => {
  const { t } = useTranslation('common');

  const proxyFormSchema = z.object({
    host: z.string().min(1, t('proxy.form.validation.hostRequired', '必须提供主机地址')),
    port: z
      .string()
      .refine((val: string) => !isNaN(parseInt(val)), { message: t('proxy.form.validation.portNumeric', '端口必须是数字') })
      .refine(
        (val: string) => {
          const port = parseInt(val);
          return port > 0 && port <= 65535;
        },
        { message: t('proxy.form.validation.portRange', '端口必须在1-65535范围内') }
      ),
    protocol: z.enum(["http", "https", "socks4", "socks5"], {
      required_error: t('proxy.form.validation.protocolRequired', '请选择代理协议'),
    }),
    username: z.string().optional(),
    password: z.string().optional(),
  });
  const form = useForm<z.infer<typeof proxyFormSchema>>({
    resolver: zodResolver(proxyFormSchema),
    defaultValues: {
      host: initialData?.host || "",
      port: initialData?.port ? initialData.port.toString() : "",
      protocol: initialData?.protocol || "http",
      username: initialData?.username || "",
      password: initialData?.password || "",
    },
  });

  const handleSubmit: SubmitHandler<z.infer<typeof proxyFormSchema>> = (values) => {
    onSubmit({
      host: values.host,
      port: parseInt(values.port),
      protocol: values.protocol,
      username: values.username || undefined,
      password: values.password || undefined,
    });
  };

  return (
    <div className="border rounded-md p-4 bg-card">
      <h3 className="text-lg font-medium mb-1">
        {initialData ? t('proxy.tabs.add', '添加代理') : t('proxy.addTitle', '添加新代理')}
      </h3>
      {!initialData && (
        <p className="text-sm text-muted-foreground mb-3">{t('proxy.addSubtitle', '添加一个新的代理服务器到代理池')}</p>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="protocol"
              render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel>{t('proxy.form.protocol', '代理协议 *')}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('proxy.form.selectProtocol', '选择协议')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="http">HTTP</SelectItem>
                      <SelectItem value="https">HTTPS</SelectItem>
                      <SelectItem value="socks4">SOCKS4</SelectItem>
                      <SelectItem value="socks5">SOCKS5</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="port"
              render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel>{t('proxy.form.port', '端口 *')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      max="65535"
                      placeholder="8080"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="host"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>{t('proxy.form.host', '主机地址 *')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('proxy.form.hostPlaceholder', '例如: proxy.example.com')} {...field} />
                </FormControl>
                <FormDescription>
                  {t('proxy.form.hostDesc', '输入代理服务器的IP地址或域名')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Separator className="my-4" />
          
          <h4 className="text-sm font-medium mb-2">{t('proxy.addSubtitle', '身份验证（可选）')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel>{t('proxy.form.username', '用户名 (可选)')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('proxy.form.username', '用户名 (可选)')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel>{t('proxy.form.password', '密码 (可选)')}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={t('proxy.form.password', '密码 (可选)')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              {t('actions.reset', '取消')}
            </Button>
            <Button type="submit">
              {initialData ? t('actions.save', '保存') : t('actions.create', '创建')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default ProxyForm;
