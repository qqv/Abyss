import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
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
  Play,
  Save,
  Download,
  Code,
  FileJson,
  Eye,
  EyeOff,
  Copy,
  Check,
  AlertCircle
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// HTTP方法对应的颜色
const methodColors: Record<string, string> = {
  GET: 'bg-green-100 text-green-700',
  POST: 'bg-blue-100 text-blue-700',
  PUT: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700',
  PATCH: 'bg-purple-100 text-purple-700',
  HEAD: 'bg-slate-100 text-slate-700',
  OPTIONS: 'bg-cyan-100 text-cyan-700',
};

// 请求表单验证架构
const formSchema = z.object({
  name: z.string().min(1, {
    message: '请求名称不能为空',
  }),
  method: z.string(),
  url: z.string().min(1, {
    message: 'URL不能为空',
  }),
  headers: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
      enabled: z.boolean().default(true),
    })
  ).optional(),
  params: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
      enabled: z.boolean().default(true),
    })
  ).optional(),
  body: z.object({
    mode: z.string().default('none'),
    raw: z.string().optional(),
    contentType: z.string().optional(),
    formData: z.array(
      z.object({
        key: z.string(),
        value: z.string(),
        enabled: z.boolean().default(true),
      })
    ).optional(),
    urlencoded: z.array(
      z.object({
        key: z.string(),
        value: z.string(),
        enabled: z.boolean().default(true),
      })
    ).optional(),
  }).optional(),
  preRequestScript: z.string().optional(),
  tests: z.array(
    z.object({
      name: z.string(),
      script: z.string(),
      enabled: z.boolean().default(true),
    })
  ).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Response {
  status: number;
  statusText: string;
  time: number;
  size: number;
  headers: { [key: string]: string };
  data: any;
}

interface RequestPanelProps {
  requestId?: string;
}

const RequestPanel = ({ requestId }: RequestPanelProps) => {
  const [activeTab, setActiveTab] = useState('params');
  const [responseTab, setResponseTab] = useState('body');
  const [bodyMode, setBodyMode] = useState('none');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [requestDetails, setRequestDetails] = useState<FormData | null>(null);
  const [response, setResponse] = useState<Response | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRequestHeaders, setShowRequestHeaders] = useState(true);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [rawResponseFormat, setRawResponseFormat] = useState('json');
  const [environments, setEnvironments] = useState<any[]>([]);
  const [activeEnvironment, setActiveEnvironment] = useState<any>(null);
  const [showVariables, setShowVariables] = useState(false);
  const [variableSearchQuery, setVariableSearchQuery] = useState('');
  const [globalVariables, setGlobalVariables] = useState<any[]>([]);

  // 初始化表单
  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(formSchema),
    defaultValues: {
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
      tests: [{ name: '默认测试', script: '', enabled: true }],
    },
  });
  
  const { control, setValue, getValues, handleSubmit, reset, watch } = form;

  // 获取请求详情
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
        setError('获取请求详情失败');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRequestDetails();
  }, [requestId, form]);

  // 获取环境和全局变量
  useEffect(() => {
    const fetchEnvironments = async () => {
      try {
        // 获取环境列表
        const envsResponse = await fetch('/api/v1/environments');
        const envsData = await envsResponse.json();
        
        if (envsData.success) {
          setEnvironments(envsData.data);
          
          // 查找激活的环境
          const active = envsData.data.find((env: any) => env.isActive);
          if (active) {
            setActiveEnvironment(active);
          }
        }
        
        // 获取全局变量
        const globalsResponse = await fetch('/api/v1/globalVariables');
        const globalsData = await globalsResponse.json();
        
        if (globalsData.success) {
          setGlobalVariables(globalsData.data);
        }
      } catch (error) {
        console.error('Error fetching environments:', error);
      }
    };
    
    fetchEnvironments();
  }, []);

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

  // 处理发送请求
  const handleSendRequest = async () => {
    setIsSending(true);
    setError(null);
    setResponse(null);
    
    try {
      const formData = getValues();
      
      // 构建请求URL，包括查询参数
      let requestUrl = replaceVariables(formData.url);
      const enabledParams = formData.params?.filter(param => param.enabled && param.key.trim());
      
      if (enabledParams && enabledParams.length > 0) {
        const queryString = enabledParams
          .map(param => `${encodeURIComponent(replaceVariables(param.key))}=${encodeURIComponent(replaceVariables(param.value))}`)
          .join('&');
        
        requestUrl += requestUrl.includes('?') ? `&${queryString}` : `?${queryString}`;
      }
      
      // 构建请求头
      const headers: Record<string, string> = {};
      const enabledHeaders = formData.headers?.filter(header => header.enabled && header.key.trim());
      
      if (enabledHeaders) {
        enabledHeaders.forEach(header => {
          headers[replaceVariables(header.key)] = replaceVariables(header.value);
        });
      }
      
      // 根据 body 模式构建请求体
      let body: any = undefined;
      
      if (formData.body) {
        if (formData.body.mode === 'raw' && formData.body.raw) {
          body = replaceVariables(formData.body.raw);
          headers['Content-Type'] = formData.body.contentType || 'application/json';
        } else if (formData.body.mode === 'form-data' && formData.body.formData) {
          const formDataObj = new FormData();
          const enabledFormData = formData.body.formData.filter(item => item.enabled && item.key.trim());
          
          enabledFormData.forEach(item => {
            formDataObj.append(
              replaceVariables(item.key), 
              replaceVariables(item.value)
            );
          });
          
          body = formDataObj;
          // 让浏览器自动设置 Content-Type 为 multipart/form-data
        } else if (formData.body.mode === 'urlencoded' && formData.body.urlencoded) {
          const enabledUrlEncoded = formData.body.urlencoded.filter(item => item.enabled && item.key.trim());
          const urlEncodedBody = enabledUrlEncoded
            .map(item => `${encodeURIComponent(replaceVariables(item.key))}=${encodeURIComponent(replaceVariables(item.value))}`)
            .join('&');
          
          body = urlEncodedBody;
          headers['Content-Type'] = 'application/x-www-form-urlencoded';
        }
      }
      
      // 记录开始时间
      const startTime = performance.now();
      
      // 发送请求
      const response = await fetch(requestUrl, {
        method: formData.method,
        headers: headers,
        body: body,
      });
      
      // 计算请求时间
      const endTime = performance.now();
      const requestTime = endTime - startTime;
      
      // 获取响应头
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      
      // 根据Content-Type解析响应体
      let responseData: any;
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        responseData = await response.json();
        setRawResponseFormat('json');
      } else if (contentType.includes('text/html')) {
        responseData = await response.text();
        setRawResponseFormat('html');
      } else if (contentType.includes('text/xml') || contentType.includes('application/xml')) {
        responseData = await response.text();
        setRawResponseFormat('xml');
      } else {
        responseData = await response.text();
        setRawResponseFormat('text');
      }
      
      // 计算响应大小
      const responseSize = new TextEncoder().encode(JSON.stringify(responseData)).length;
      
      // 设置响应数据
      setResponse({
        status: response.status,
        statusText: response.statusText,
        time: requestTime,
        size: responseSize,
        headers: responseHeaders,
        data: responseData,
      });
      
      // 自动切换到响应选项卡
      setActiveTab('response');
    } catch (error) {
      console.error('请求发送错误:', error);
      setError(`请求发送失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsSending(false);
    }
  };

  // 变量替换
  const replaceVariables = (text: string): string => {
    if (!text) return text;
    
    // 替换变量，格式：{{variableName}}
    return text.replace(/\{\{([^}]+)\}\}/g, (match, variableName) => {
      // 查找环境变量
      if (activeEnvironment && activeEnvironment.variables) {
        const envVar = activeEnvironment.variables.find(
          (v: any) => v.key === variableName && v.enabled !== false
        );
        if (envVar) return envVar.value;
      }
      
      // 查找全局变量
      const globalVar = globalVariables.find(
        (v: any) => v.key === variableName && v.enabled !== false
      );
      if (globalVar) return globalVar.value;
      
      // 未找到变量，返回原始匹配
      return match;
    });
  };

  // 保存请求
  const handleSaveRequest = async () => {
    try {
      const formData = getValues();
      
      if (requestId) {
        // 更新现有请求
        const response = await fetch(`/api/v1/requests/${requestId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
        
        const data = await response.json();
        
        if (data.success) {
          // 更新成功，可以添加一些UI反馈
          console.log('请求已更新');
        }
      } else {
        // 创建新请求
        // 这里需要获取集合ID和可能的文件夹ID
        console.log('需要集合ID才能保存新请求');
      }
    } catch (error) {
      console.error('保存请求出错:', error);
    }
  };

  // 复制响应到剪贴板
  const copyResponseToClipboard = () => {
    if (!response) return;
    
    const textToCopy = typeof response.data === 'object' 
      ? JSON.stringify(response.data, null, 2) 
      : response.data.toString();
    
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        setCopiedToClipboard(true);
        setTimeout(() => setCopiedToClipboard(false), 2000);
      })
      .catch(err => console.error('复制到剪贴板失败:', err));
  };

  // 切换环境
  const handleEnvironmentChange = async (envId: string) => {
    try {
      if (envId === 'none') {
        // 停用所有环境
        setActiveEnvironment(null);
        
        // 调用API设置所有环境为非活动
        await fetch('/api/v1/environments/deactivateAll', {
          method: 'POST',
        });
      } else {
        // 激活选定的环境
        const env = environments.find(e => e._id === envId);
        if (env) {
          setActiveEnvironment(env);
          
          // 调用API设置环境为活动
          await fetch(`/api/v1/environments/${envId}/activate`, {
            method: 'POST',
          });
        }
      }
    } catch (error) {
      console.error('切换环境出错:', error);
    }
  };

  // 过滤变量
  const filteredVariables = () => {
    // 构建所有变量列表（环境变量和全局变量）
    const allVariables = [
      ...globalVariables.map((v: any) => ({ ...v, source: '全局' })),
      ...(activeEnvironment?.variables?.map((v: any) => ({ ...v, source: activeEnvironment.name })) || []),
    ];
    
    // 如果有搜索查询，过滤变量
    if (variableSearchQuery.trim()) {
      return allVariables.filter((v: any) => 
        v.key.toLowerCase().includes(variableSearchQuery.toLowerCase()) ||
        v.value.toString().toLowerCase().includes(variableSearchQuery.toLowerCase())
      );
    }
    
    return allVariables;
  };
  
  // 获取状态码对应的颜色
  const getStatusColor = (status: number): string => {
    if (status >= 200 && status < 300) return 'bg-green-100 text-green-700';
    if (status >= 300 && status < 400) return 'bg-blue-100 text-blue-700';
    if (status >= 400 && status < 500) return 'bg-amber-100 text-amber-700';
    if (status >= 500) return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  };

  if (isLoading) {
    return <div className="p-4 text-center">加载中...</div>;
  }
  
  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">请求面板</h2>
      {/* 这里可以根据需要添加实际的请求面板 UI 组件 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-medium mb-2">请求详情</h3>
          {/* 请求详情内容 */}
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-medium mb-2">响应结果</h3>
          {/* 响应结果内容 */}
          {response && (
            <div className="mt-2">
              <div className={`rounded-md px-2 py-1 inline-block mb-2 ${getStatusColor(response.status)}`}>
                {response.status} {response.statusText}
              </div>
              {/* 响应详情 */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestPanel;
