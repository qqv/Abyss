import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getI18nInstance } from '@/i18n/client';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';

// 请求表单验证架构
const i18n = getI18nInstance();
const formSchema = z.object({
  name: z.string().min(1, {
    message: i18n.t('apiTesting.request.validation.nameRequired', { defaultValue: '请求名称不能为空' }),
  }),
  method: z.string().min(1, {
    message: i18n.t('apiTesting.request.validation.methodRequired', { defaultValue: '请求方法不能为空' }),
  }),
  url: z.string().min(1, {
    message: i18n.t('apiTesting.request.validation.urlRequired', { defaultValue: 'URL不能为空' }),
  }),
  headers: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
      enabled: z.boolean().default(true),
    })
  ).default([]),
  params: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
      enabled: z.boolean().default(true),
    })
  ).default([]),
  body: z.object({
    mode: z.string().default('none'),
    raw: z.string().optional().default(''),
    contentType: z.string().optional().default('application/json'),
    formData: z.array(
      z.object({
        key: z.string(),
        value: z.string(),
        enabled: z.boolean().default(true),
      })
    ).default([]),
    urlencoded: z.array(
      z.object({
        key: z.string(),
        value: z.string(),
        enabled: z.boolean().default(true),
      })
    ).default([]),
  }).default({
    mode: 'none',
    raw: '',
    contentType: 'application/json',
    formData: [],
    urlencoded: [],
  }),
  preRequestScript: z.string().optional().default(''),
  tests: z.array(
    z.object({
      name: z.string(),
      script: z.string(),
      enabled: z.boolean().default(true),
    })
  ).default([]),
});

type FormData = z.infer<typeof formSchema>;

interface RequestFormProps {
  initialData?: Partial<FormData>;
  requestId?: string;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
}

// 克隆一下表单的验证架构，但所有字段设为可选
const partialFormSchema = formSchema.partial();

export const RequestForm = ({
  initialData,
  requestId,
  onSubmit,
  onCancel,
}: RequestFormProps) => {
  const { t } = useTranslation('common');
  const [activeTab, setActiveTab] = useState('params');
  const [bodyMode, setBodyMode] = useState(initialData?.body?.mode || 'none');
  const [isLoading, setIsLoading] = useState(false);
  const [requestDetails, setRequestDetails] = useState<FormData | null>(null);

  // 初始化表单
  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(partialFormSchema),
    defaultValues: requestDetails || initialData || {
      name: '',
      method: 'GET',
      url: '',
      headers: [{ key: '', value: '', enabled: true }],
      params: [{ key: '', value: '', enabled: true }],
      body: {
        mode: 'none',
        raw: '',
        contentType: 'application/json',
        formData: [{ key: '', value: '', enabled: true }],
        urlencoded: [{ key: '', value: '', enabled: true }],
      },
      preRequestScript: '',
      tests: [{ name: i18n.t('apiTesting.request.tests.defaultName', { defaultValue: '默认测试' }), script: '', enabled: true }],
    },
  });
  
  const { control, setValue, getValues, handleSubmit, reset, watch } = form;

  // 如果有requestId，获取请求详情
  useEffect(() => {
    const fetchRequestDetails = async () => {
      if (!requestId) return;
      
      try {
        setIsLoading(true);
        const response = await fetch(`/api/v1/requests/${requestId}`);
        const data = await response.json();
        
        if (data.success) {
          setRequestDetails(data.data);
          
          // 初始化body模式
          if (data.data.body && data.data.body.mode) {
            setBodyMode(data.data.body.mode);
          }
          
          // 重置表单值
          reset(data.data);
        }
      } catch (error) {
        console.error('Error fetching request details:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRequestDetails();
  }, [requestId]);

  // 监听body模式变化
  useEffect(() => {
    setValue('body.mode', bodyMode);
  }, [bodyMode, form]);

  // 添加请求头
  const addHeader = () => {
    const headers = getValues('headers') || [];
    setValue('headers', [...headers, { key: '', value: '', enabled: true }]);
  };

  // 移除请求头
  const removeHeader = (index: number) => {
    const headers = getValues('headers') || [];
    setValue('headers', headers.filter((_, i) => i !== index));
  };

  // 添加查询参数
  const addParam = () => {
    const params = getValues('params') || [];
    setValue('params', [...params, { key: '', value: '', enabled: true }]);
  };

  // 移除查询参数
  const removeParam = (index: number) => {
    const params = getValues('params') || [];
    setValue('params', params.filter((_, i) => i !== index));
  };

  // 添加表单数据
  const addFormData = () => {
    const formData = getValues('body.formData') || [];
    setValue('body.formData', [...formData, { key: '', value: '', enabled: true }]);
  };

  // 移除表单数据
  const removeFormData = (index: number) => {
    const formData = getValues('body.formData') || [];
    setValue('body.formData', formData.filter((_, i) => i !== index));
  };

  // 添加URL编码数据
  const addUrlEncoded = () => {
    const urlencoded = getValues('body.urlencoded') || [];
    setValue('body.urlencoded', [...urlencoded, { key: '', value: '', enabled: true }]);
  };

  // 移除URL编码数据
  const removeUrlEncoded = (index: number) => {
    const urlencoded = getValues('body.urlencoded') || [];
    setValue('body.urlencoded', urlencoded.filter((_, i) => i !== index));
  };

  // 添加测试
  const addTest = () => {
    const tests = getValues('tests') || [];
    setValue('tests', [
      ...tests,
      {
        name: i18n.t('apiTesting.request.tests.autoName', { defaultValue: '测试 {{n}}', n: tests.length + 1 }),
        script: '',
        enabled: true,
      },
    ]);
  };

  // 移除测试
  const removeTest = (index: number) => {
    const tests = getValues('tests') || [];
    setValue('tests', tests.filter((_, i) => i !== index));
  };

  // 处理表单提交
  const handleFormSubmit = (data: any) => {
    // 确保必要的字段都存在
    const formattedData: FormData = {
      name: data.name,
      method: data.method,
      url: data.url,
      headers: data.headers || [],
      params: data.params || [],
      body: data.body || {
        mode: 'none',
        raw: '',
        contentType: 'application/json',
        formData: [],
        urlencoded: []
      },
      preRequestScript: data.preRequestScript || '',
      tests: data.tests || []
    };
    
    onSubmit(formattedData);
  };

  if (isLoading) {
    return <div className="p-4 text-center">{t('proxyPool.common.loading', '加载中...')}</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {/* 请求名称 */}
          <FormField
            control={control}
            name="name"
            render={({ field }) => (
              <FormItem className="col-span-4">
                <FormLabel>{t('workspace.tree.newRequest', '新建请求')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('apiTesting.request.namePlaceholder', '我的API请求')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* HTTP方法和URL */}
          <FormField
            control={control}
            name="method"
            render={({ field }) => (
              <FormItem className="col-span-1">
                <FormLabel>{t('apiTesting.request.method', '请求方法')}</FormLabel>
                <Select 
                  value={field.value} 
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('apiTesting.request.selectMethod', '选择方法')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                    <SelectItem value="HEAD">HEAD</SelectItem>
                    <SelectItem value="OPTIONS">OPTIONS</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="url"
            render={({ field }) => (
              <FormItem className="col-span-3">
                <FormLabel>{t('apiTesting.request.url', '请求URL')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('apiTesting.request.urlPlaceholder', 'https://api.example.com/endpoint')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 请求配置选项卡 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-5">
              <TabsTrigger value="params">{t('workspace.editor.tabs.params', '参数')}</TabsTrigger>
              <TabsTrigger value="headers">{t('workspace.editor.tabs.headers', '头部')}</TabsTrigger>
              <TabsTrigger value="body">{t('workspace.editor.tabs.body', '请求体')}</TabsTrigger>
              <TabsTrigger value="pre-request">{t('workspace.script.tabs.preRequest', '预请求脚本')}</TabsTrigger>
              <TabsTrigger value="tests">{t('workspace.script.tabs.tests', '测试脚本')}</TabsTrigger>
          </TabsList>

          {/* 查询参数选项卡 */}
          <TabsContent value="params" className="border rounded-md p-4" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">{t('workspace.editor.params.title', '查询参数')}</h3>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addParam}
                >
                  <Plus className="h-4 w-4 mr-1" /> {t('workspace.editor.params.add', '添加参数')}
                </Button>
              </div>
              
              <div className="space-y-2">
                {watch('params')?.map((_, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center">
                    <FormField
                      control={control}
                      name={`params.${index}.enabled`}
                      render={({ field }) => (
                        <FormItem className="col-span-1 flex items-center justify-center">
                          <FormControl>
                            <Switch 
                              checked={field.value} 
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={control}
                      name={`params.${index}.key`}
                      render={({ field }) => (
                        <FormItem className="col-span-5">
                          <FormControl>
                             <Input placeholder={t('workspace.editor.params.keyPlaceholder', '参数名')} {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={control}
                      name={`params.${index}.value`}
                      render={({ field }) => (
                        <FormItem className="col-span-5">
                          <FormControl>
                             <Input placeholder={t('workspace.editor.params.valuePlaceholder', '参数值')} {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon"
                      className="col-span-1"
                      onClick={() => removeParam(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* 请求头选项卡 */}
          <TabsContent value="headers" className="border rounded-md p-4" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">{t('workspace.editor.headers.tableMode', '请求头')}</h3>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addHeader}
                >
                  <Plus className="h-4 w-4 mr-1" /> {t('workspace.editor.headers.add', '添加头部')}
                </Button>
              </div>
              
              <div className="space-y-2">
                {watch('headers')?.map((_, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center">
                    <FormField
                      control={control}
                      name={`headers.${index}.enabled`}
                      render={({ field }) => (
                        <FormItem className="col-span-1 flex items-center justify-center">
                          <FormControl>
                            <Switch 
                              checked={field.value} 
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={control}
                      name={`headers.${index}.key`}
                      render={({ field }) => (
                        <FormItem className="col-span-5">
                          <FormControl>
                             <Input placeholder={t('workspace.editor.headers.keyPlaceholder', '头部名')} {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={control}
                      name={`headers.${index}.value`}
                      render={({ field }) => (
                        <FormItem className="col-span-5">
                          <FormControl>
                             <Input placeholder={t('workspace.editor.headers.valuePlaceholder', '头部值')} {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon"
                      className="col-span-1"
                      onClick={() => removeHeader(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* 请求体选项卡 */}
          <TabsContent value="body" className="border rounded-md p-4" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">{t('apiTesting.request.bodyType', '请求体类型')}</h3>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    type="button" 
                    variant={bodyMode === 'none' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => setBodyMode('none')}
                  >
                    {t('apiTesting.request.body.none', '无')}
                  </Button>
                  <Button 
                    type="button" 
                    variant={bodyMode === 'raw' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => setBodyMode('raw')}
                  >
                    {t('workspace.editor.body.rawPlaceholder', '原始数据')}
                  </Button>
                  <Button 
                    type="button" 
                    variant={bodyMode === 'form-data' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => setBodyMode('form-data')}
                  >
                    {t('apiTesting.request.body.form', '表单数据')}
                  </Button>
                  <Button 
                    type="button" 
                    variant={bodyMode === 'urlencoded' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => setBodyMode('urlencoded')}
                  >
                    {t('workspace.editor.body.urlencoded', 'URL编码')}
                  </Button>
                </div>
              </div>
              
              {bodyMode === 'raw' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium">{t('workspace.editor.body.contentType', '内容类型')}</h3>
                    <Select 
                      value={watch('body.contentType') || 'application/json'} 
                      onValueChange={(value) => setValue('body.contentType', value)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder={t('apiTesting.request.selectContentType', '选择内容类型')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="application/json">JSON</SelectItem>
                        <SelectItem value="application/xml">XML</SelectItem>
                        <SelectItem value="text/plain">{t('apiTesting.request.contentType.plainText', '纯文本')}</SelectItem>
                        <SelectItem value="text/html">HTML</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <FormField
                    control={control}
                    name="body.raw"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea 
                            placeholder={t('workspace.editor.body.rawPlaceholder', '请求体内容')}
                            className="font-mono h-[200px]"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              )}
              
              {bodyMode === 'form-data' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">{t('apiTesting.request.formData', '表单数据')}</h3>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={addFormData}
                    >
                      <Plus className="h-4 w-4 mr-1" /> {t('apiTesting.request.addField', '添加字段')}
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {watch('body.formData')?.map((_, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-center">
                        <FormField
                          control={control}
                          name={`body.formData.${index}.enabled`}
                          render={({ field }) => (
                            <FormItem className="col-span-1 flex items-center justify-center">
                              <FormControl>
                                <Switch 
                                  checked={field.value} 
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={control}
                          name={`body.formData.${index}.key`}
                          render={({ field }) => (
                            <FormItem className="col-span-5">
                              <FormControl>
                                 <Input placeholder={t('apiTesting.request.fieldName', '字段名')} {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={control}
                          name={`body.formData.${index}.value`}
                          render={({ field }) => (
                            <FormItem className="col-span-5">
                              <FormControl>
                                 <Input placeholder={t('apiTesting.request.fieldValue', '字段值')} {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon"
                          className="col-span-1"
                          onClick={() => removeFormData(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {bodyMode === 'urlencoded' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">{t('apiTesting.request.urlencoded', 'URL编码参数')}</h3>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={addUrlEncoded}
                    >
                      <Plus className="h-4 w-4 mr-1" /> {t('workspace.editor.params.add', '添加参数')}
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {watch('body.urlencoded')?.map((_, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-center">
                        <FormField
                          control={control}
                          name={`body.urlencoded.${index}.enabled`}
                          render={({ field }) => (
                            <FormItem className="col-span-1 flex items-center justify-center">
                              <FormControl>
                                <Switch 
                                  checked={field.value} 
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={control}
                          name={`body.urlencoded.${index}.key`}
                          render={({ field }) => (
                            <FormItem className="col-span-5">
                              <FormControl>
                                 <Input placeholder={t('workspace.editor.params.keyPlaceholder', '参数名')} {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={control}
                          name={`body.urlencoded.${index}.value`}
                          render={({ field }) => (
                            <FormItem className="col-span-5">
                              <FormControl>
                                 <Input placeholder={t('workspace.editor.params.valuePlaceholder', '参数值')} {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon"
                          className="col-span-1"
                          onClick={() => removeUrlEncoded(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* 前置脚本选项卡 */}
          <TabsContent value="pre-request" className="border rounded-md p-4" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <div className="space-y-2">
              <h3 className="text-sm font-medium">{t('workspace.script.tabs.preRequest', '预请求脚本')}</h3>
              <p className="text-xs text-muted-foreground">{t('workspace.script.pre.helpDesc', '预请求脚本在请求发送前执行，可用于动态设置请求参数和执行认证流程')}</p>
              
              <FormField
                control={control}
                name="preRequestScript"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                       <Textarea 
                         placeholder={t('workspace.script.pre.placeholder', '// 在此处编写预请求脚本')}
                        className="font-mono h-[200px]"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>

          {/* 测试脚本选项卡 */}
          <TabsContent value="tests" className="border rounded-md p-4" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">{t('workspace.script.tabs.tests', '测试脚本')}</h3>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addTest}
                >
                  <Plus className="h-4 w-4 mr-1" /> {t('workspace.script.tests.add', '添加测试')}
                </Button>
              </div>
              
              <div className="space-y-4">
                {watch('tests')?.map((_, index) => (
                  <div key={index} className="border rounded-md p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <FormField
                        control={control}
                        name={`tests.${index}.name`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                               <Input placeholder={t('workspace.script.tests.namePlaceholder', '测试名称')} {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex items-center space-x-2">
                        <FormField
                          control={control}
                          name={`tests.${index}.enabled`}
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2">
                               <span className="text-sm">{t('workspace.script.tests.enable', '启用')}</span>
                              <FormControl>
                                <Switch 
                                  checked={field.value} 
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeTest(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <FormField
                      control={control}
                      name={`tests.${index}.script`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                             <Textarea 
                               placeholder={t('workspace.script.tests.placeholder', '// 在此处编写测试代码')}
                              className="font-mono h-[150px]"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2">
            <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            {t('actions.reset', '取消')}
          </Button>
          <Button type="submit">
            {requestId ? t('apiTesting.request.update', '更新请求') : t('apiTesting.request.create', '创建请求')}
          </Button>
        </div>
      </form>
    </Form>
  );
};
