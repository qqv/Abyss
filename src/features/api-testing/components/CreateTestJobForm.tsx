'use client';

import { useState, useEffect } from 'react';
import { fetchParameterSets } from '../services/parameter-service';
import { fetchProxyPools } from '../services/proxy-pool-service';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// 定义表单类型
type FormData = {
  name: string;
  collectionId: string;
  requests?: string[];
  parameterSetId?: string;
  proxyPoolId?: string;
  concurrency: number;
  runAllRequests: boolean;
};

// 表单验证模式
const formSchema = z.object({
  name: z.string().min(2, {
    message: '测试任务名称至少需要2个字符',
  }),
  collectionId: z.string().min(1, {
    message: '请选择API集合',
  }),
  requests: z.array(z.string()).optional(),
  parameterSetId: z.string().optional(),
  proxyPoolId: z.string().optional(),
  concurrency: z.number().min(1).max(20),
  runAllRequests: z.boolean().default(true),
});

interface CreateTestJobFormProps {
  onSubmit: (data: FormData) => Promise<void>;
}

export default function CreateTestJobForm({ onSubmit }: CreateTestJobFormProps) {
  const [collections, setCollections] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [parameterSets, setParameterSets] = useState<any[]>([]);
  const [proxyPools, setProxyPools] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);

  // 初始化表单
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: '',
      collectionId: '',
      requests: [],
      parameterSetId: '',
      proxyPoolId: '',
      concurrency: 5,
      runAllRequests: true,
    },
  });

  // 监听运行所有请求的变化
  const runAllRequests = form.watch('runAllRequests');
  const selectedCollectionId = form.watch('collectionId');

  // 获取API集合列表
  useEffect(() => {
    const fetchCollections = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/v1/collections');
        if (response.ok) {
          const data = await response.json();
          setCollections(data);
        } else {
          console.error('获取API集合失败:', response.status);
        }
      } catch (err) {
        console.error('获取API集合错误:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCollections();
  }, []);

  // 当选择的集合变更时，获取请求列表
  useEffect(() => {
    if (!selectedCollectionId) {
      setRequests([]);
      return;
    }

    const fetchRequests = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/v1/requests/collection/${selectedCollectionId}`);
        if (response.ok) {
          const data = await response.json();
          setRequests(data);
        } else {
          console.error('获取请求列表失败:', response.status);
        }
      } catch (err) {
        console.error('获取请求列表错误:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequests();
  }, [selectedCollectionId]);

  // 获取参数集列表
  useEffect(() => {
    const loadParameterSets = async () => {
      try {
        const data = await fetchParameterSets();
        setParameterSets(data);
      } catch (err) {
        console.error('获取参数集错误:', err);
      }
    };

    loadParameterSets();
  }, []);

  // 获取代理池列表
  useEffect(() => {
    const loadProxyPools = async () => {
      try {
        const data = await fetchProxyPools();
        setProxyPools(data);
      } catch (err) {
        console.error('获取代理池错误:', err);
      }
    };

    loadProxyPools();
  }, []);

  // 处理请求选择变化
  const handleRequestSelectionChange = (requestId: string, checked: boolean) => {
    setSelectedRequests((prev: string[]) => {
      if (checked) {
        return [...prev, requestId];
      } else {
        return prev.filter(id => id !== requestId);
      }
    });
  };

  // 提交表单
  const onFormSubmit = async (values: FormData) => {
    // 如果选择了运行所有请求，不需要指定请求ID
    const formData = {
      ...values,
      requests: values.runAllRequests ? [] : selectedRequests,
    };

    onSubmit(formData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onFormSubmit as any)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 测试任务名称 */}
          <FormField
            control={form.control as any}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>测试任务名称</FormLabel>
                <FormControl>
                  <Input placeholder="输入测试任务名称" {...field} />
                </FormControl>
                <FormDescription>
                  为您的测试任务指定一个有意义的名称
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* API集合选择 */}
          <FormField
            control={form.control as any}
            name="collectionId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>API集合</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="选择API集合" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {collections.map((collection: any) => (
                      <SelectItem key={collection._id} value={collection._id}>
                        {collection.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  选择要测试的API集合
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 参数集选择 */}
          <FormField
            control={form.control as any}
            name="parameterSetId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>参数集 (可选)</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="选择参数集" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">无</SelectItem>
                    {parameterSets.map((paramSet: any) => (
                      <SelectItem key={paramSet._id} value={paramSet._id}>
                        {paramSet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  选择参数变量集，用于测试不同的参数组合
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 代理池选择 */}
          <FormField
            control={form.control as any}
            name="proxyPoolId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>代理池 (可选)</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="选择代理池" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">无</SelectItem>
                    {proxyPools.map((proxyPool: any, index: number) => (
                      <SelectItem 
                        key={proxyPool.id || proxyPool._id || `proxy-pool-${index}`} 
                        value={proxyPool.id || proxyPool._id || `proxy-pool-${index}`}
                      >
                        {proxyPool.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  选择代理池，用于通过不同代理发送请求
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 并发数 */}
          <FormField
            control={form.control as any}
            name="concurrency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>并发请求数: {field.value}</FormLabel>
                <FormControl>
                  <Slider
                    min={1}
                    max={20}
                    step={1}
                    defaultValue={[field.value]}
                    onValueChange={(vals) => field.onChange(vals[0])}
                  />
                </FormControl>
                <FormDescription>
                  设置同时执行的请求数量，过高的值可能导致性能问题
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 运行所有请求选项 */}
          <FormField
            control={form.control as any}
            name="runAllRequests"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>运行所有请求</FormLabel>
                  <FormDescription>
                    选中此项将测试集合中的所有请求，否则需要手动选择特定请求
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </div>

        {/* 请求选择区域 */}
        {!runAllRequests && selectedCollectionId && (
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">选择要测试的请求</h3>
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>加载请求列表...</span>
                </div>
              ) : requests.length === 0 ? (
                <p className="text-muted-foreground">该集合中没有请求</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {requests.map((request: any) => (
                    <div key={request._id} className="flex items-center space-x-2">
                      <Checkbox
                        id={request._id}
                        checked={selectedRequests.includes(request._id)}
                        onCheckedChange={(checked) => 
                          handleRequestSelectionChange(request._id, !!checked)
                        }
                      />
                      <label
                        htmlFor={request._id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {request.name} ({request.method} {request.url.substring(0, 30)}{request.url.length > 30 ? '...' : ''})
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              处理中...
            </>
          ) : (
            '创建测试任务'
          )}
        </Button>
      </form>
    </Form>
  );
}
