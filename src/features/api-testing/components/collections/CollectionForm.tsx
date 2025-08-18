import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

// 集合表单验证架构
const formSchema = z.object({
  name: z.string().min(1, {
    message: '集合名称不能为空',
  }),
  description: z.string().optional().default(''),
  isPublic: z.boolean().default(false),
});

// 创建可选版本的表单架构
const partialFormSchema = formSchema.partial();

type FormData = z.infer<typeof formSchema>;

interface CollectionFormProps {
  initialData?: {
    name: string;
    description: string;
    isPublic: boolean;
  };
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
}

export const CollectionForm = ({
  initialData,
  onSubmit,
  onCancel,
}: CollectionFormProps) => {
  // 初始化表单
  const form = useForm({
    resolver: zodResolver(partialFormSchema),
    defaultValues: initialData || {
      name: '',
      description: '',
      isPublic: false,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => {
        // 确保数据符合 FormData 类型
        const formattedData: FormData = {
          name: data.name || '',
          description: data.description || '',
          isPublic: data.isPublic ?? false
        };
        onSubmit(formattedData);
      })} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>集合名称</FormLabel>
              <FormControl>
                <Input placeholder="我的 API 集合" {...field} />
              </FormControl>
              <FormDescription>
                为您的 API 集合指定一个唯一的名称
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>描述（可选）</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="这个集合包含..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                简要描述集合的用途和包含的 API
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="isPublic"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>公开集合</FormLabel>
                <FormDescription>
                  允许团队中的其他成员查看这个集合
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            取消
          </Button>
          <Button type="submit">
            {initialData ? '更新集合' : '创建集合'}
          </Button>
        </div>
      </form>
    </Form>
  );
};
