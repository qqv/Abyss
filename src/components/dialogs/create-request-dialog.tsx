"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HttpMethod, ApiRequest } from "@/lib/api-data";

// 创建请求表单验证规则
const formSchema = z.object({
  name: z.string().min(1, { message: '请求名称不能为空' }),
  method: z.string().min(1, { message: '请选择请求方法' }),
  url: z.string().min(1, { message: 'URL不能为空' }),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateRequest: (request: ApiRequest) => void;
  collectionId: string;
}

export default function CreateRequestDialog({
  open,
  onOpenChange,
  onCreateRequest,
  collectionId
}: CreateRequestDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      method: 'GET',
      url: ''
    },
  });

  const handleSubmit = (data: FormValues) => {
    try {
      // 创建请求ID
      const requestId = `req-${Date.now()}`;

      // 创建新请求对象
      const newRequest: ApiRequest = {
        _id: requestId,
        id: requestId,
        name: data.name,
        method: data.method as HttpMethod,
        url: data.url,
        headers: [],
        queryParams: [],
        body: {
          mode: 'raw',
          contentType: 'application/json',
          raw: ''
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      onCreateRequest(newRequest);
      form.reset();
    } catch (error) {
      console.error('创建请求失败:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>创建新的API请求</DialogTitle>
          <DialogDescription>
            请填写API请求的基本信息，稍后可以进一步编辑详细参数。
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>请求名称</FormLabel>
                  <FormControl>
                    <Input placeholder="输入请求名称" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>请求方法</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择请求方法" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].map((method) => (
                        <SelectItem key={method} value={method}>{method}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://api.example.com/endpoint" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="submit">创建请求</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
