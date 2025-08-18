"use client";

import { useState, useEffect, useCallback } from "react";
import "./request-editor.css";
import { FormattedJsonEditor } from "./FormattedJsonEditor";
import { EnhancedEditor } from "./EnhancedEditor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { 
  Send, 
  Plus, 
  Trash, 
  Save, 
  Code, 
  FileJson, 
  FileCode, 
  FormInput, 
  LayoutGrid,
  Lock,
  FileText,
  Table as TableIcon,
  Edit,
  Copy
} from "lucide-react";
import { 
  ApiRequest, 
  HttpMethod, 
  RequestHeader, 
  RequestParam, 
  RequestTest, 
  RequestPreScript,
  AuthParams 
} from "@/lib/api-data";
import { AuthenticatorPanel } from "./auth/AuthenticatorPanel";
import { ScriptEditor } from "./scripts/ScriptEditor";
import { useTranslation } from "react-i18next";

interface RequestEditorProps {
  request: ApiRequest;
  onUpdateRequest: (updatedRequest: ApiRequest) => void;
  onSendRequest: () => void;
  onSaveRequest?: () => void;
}

export function RequestEditor({
  request,
  onUpdateRequest,
  onSendRequest,
  onSaveRequest
}: RequestEditorProps) {
  const [activeTab, setActiveTab] = useState("params");
  const { t } = useTranslation('common');
  
  // 读取主题设置
  const [editorSettings, setEditorSettings] = useState({
    showLineNumbers: false,
    highlightCurrentLine: false,
    enableSounds: false
  });

  // 加载主题设置
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('abyss-theme-settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setEditorSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.log('加载主题设置失败:', error);
    }
  }, []);
  // 确保认证信息被正确初始化，打印日志方便调试
  console.log('RequestEditor: 初始化请求认证信息', request.auth);
  
  const [localRequest, setLocalRequest] = useState<ApiRequest>({
    ...request,
    auth: request.auth || { type: 'none', enabled: false },
    tests: request.tests || [],
    preRequest: request.preRequest || { script: '', enabled: false }
  });
  
  // 立即打印本地请求状态中的认证信息
  console.log('RequestEditor: 本地请求认证信息初始化为', localRequest.auth);
  const [bodyMode, setBodyMode] = useState<'form-data' | 'urlencoded' | 'raw' | 'binary' | 'none'>(request.body?.mode || 'raw');
  const [formData, setFormData] = useState<RequestParam[]>([]);
  const [urlencodedData, setUrlEncodedData] = useState<RequestParam[]>([]);
  const [headerEditMode, setHeaderEditMode] = useState<'table' | 'bulk'>('table');
  const [bulkHeadersText, setBulkHeadersText] = useState<string>('');
  const [paramEditMode, setParamEditMode] = useState<'table' | 'bulk'>('table');
  const [bulkParamsText, setBulkParamsText] = useState('');

  // 更新请求并通知父组件
  const updateRequest = (updatedRequest: ApiRequest) => {
    setLocalRequest(updatedRequest);
    onUpdateRequest(updatedRequest);
  };

  // 初始化请求数据和设置请求体模式
  useEffect(() => {
    console.log('RequestEditor: 初始化请求数据', request);
    
    // 检测请求体类型并设置相应的模式
    if (request.body) {
      // 兼容导入的请求体格式 - 检测 MongoDB 中的 body.content
      if (request.body.content !== undefined && request.body.mode === undefined) {
        // 如果有content字段但没有mode字段，则转换为 raw 模式
        setBodyMode('raw');
        // 需要将content转换为raw
        updateRequest({
          ...request,
          body: {
            ...request.body,
            mode: 'raw',
            raw: request.body.content || ''
          }
        });
      } else if (request.body.mode) {
        // 正常设置请求体模式
        setBodyMode(request.body.mode);
      }
    }
    
    // 初始化表单数据
    if (request.body?.formData && request.body.formData.length > 0) {
      setFormData(request.body.formData);
    } else {
      setFormData([{ key: '', value: '', enabled: true }]);
    }

    // 初始化URL编码数据
    if (request.body?.urlencoded && request.body.urlencoded.length > 0) {
      setUrlEncodedData(request.body.urlencoded);
    } else {
      setUrlEncodedData([{ key: '', value: '', enabled: true }]);
    }
    
    // 从URL解析查询参数（如果URL中有查询参数但request.queryParams为空）
    if ((!request.queryParams || request.queryParams.length === 0) && request.url && request.url.includes('?')) {
      const parsedParams = parseQueryParamsFromUrl(request.url);
      if (parsedParams.length > 0 && parsedParams[0].key !== '') {
        console.log('从URL解析到查询参数:', parsedParams);
        updateRequest({
          ...request,
          queryParams: parsedParams
        });
      }
    }
    
    // 检查并处理认证信息
    if (request.auth) {
      // console.log('发现认证信息，初始化到UI:', request.auth);
      
      // 如果有Bearer Token认证，在浏览器控制台打印以方便调试
      if (request.auth.type === 'bearer' && request.auth.token) {
        // console.log('发现Bearer Token:', request.auth.token);
      }
      
      // 确保认证信息被正确保存到本地请求状态
      updateRequest({
        ...request,
        auth: request.auth
      });
      
      // 如果存在认证信息，自动切换到认证标签页
      if (request.auth.type !== 'none' && activeTab === 'params') {
        setActiveTab('auth');
      }
    }
  }, [request._id]); // 注意依赖项改为 request._id 以确保切换请求时重新初始化

  // 更新请求的 URL并解析查询参数
  const handleUrlChange = (url: string) => {
    // 解析URL中的查询参数
    const queryParams = parseQueryParamsFromUrl(url);
    
    updateRequest({
      ...localRequest,
      url,
      queryParams
    });
  };
  
  // 从URL中解析查询参数
  const parseQueryParamsFromUrl = (url: string): RequestParam[] => {
    try {
      const urlObj = new URL(url);
      const params: RequestParam[] = [];
      
      // 获取URL中的查询参数
      urlObj.searchParams.forEach((value, key) => {
        params.push({
          key,
          value,
          enabled: true
        });
      });
      
      // 如果没有参数，返回一个空的输入行
      if (params.length === 0) {
        return [{ key: '', value: '', enabled: true }];
      }
      
      return params;
    } catch (error) {
      // URL解析失败，可能是无效URL或相对路径
      console.log('URL解析失败，可能是相对路径或无效URL', error);
      return localRequest.queryParams || [{ key: '', value: '', enabled: true }];
    }
  };
  
  // 根据查询参数构建完整URL
  const buildUrlWithQueryParams = useCallback((baseUrl: string, params: RequestParam[]): string => {
    try {
      // 尝试解析URL以获取基本部分（不包括查询参数）
      let urlObj: URL;
      try {
        urlObj = new URL(baseUrl);
        // 清除现有的查询参数
        urlObj.search = '';
      } catch (e) {
        // 如果URL无效（可能是相对路径），则使用一个临时基础URL
        const tempBase = 'http://example.com';
        const fullUrl = baseUrl.startsWith('/') 
          ? `${tempBase}${baseUrl}` 
          : `${tempBase}/${baseUrl}`;
        urlObj = new URL(fullUrl);
        urlObj.search = '';
      }
      
      // 基本URL（不含查询参数）
      const baseUrlWithoutQuery = urlObj.origin + urlObj.pathname;
      
      // 构建查询字符串
      const enabledParams = params.filter(p => p.enabled && p.key.trim());
      if (enabledParams.length === 0) {
        return baseUrlWithoutQuery;
      }
      
      const searchParams = new URLSearchParams();
      enabledParams.forEach(param => {
        searchParams.append(param.key, param.value);
      });
      
      return `${baseUrlWithoutQuery}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    } catch (error) {
      console.error('构建URL失败:', error);
      return baseUrl; // 出错时返回原始URL
    }
  }, []);

  // 更新请求的 HTTP 方法
  const handleMethodChange = (method: string) => {
    updateRequest({
      ...localRequest,
      method: method as HttpMethod
    });
  };

  // 添加查询参数
  const addQueryParam = () => {
    const newParam: RequestParam = {
      key: "",
      value: "",
      enabled: true
    };
    
    const updatedParams = [...(localRequest.queryParams || []), newParam];
    
    // 重新构建URL
    const baseUrl = getBaseUrlWithoutQuery(localRequest.url);
    const newUrl = buildUrlWithQueryParams(baseUrl, updatedParams);

    updateRequest({
      ...localRequest,
      queryParams: updatedParams,
      url: newUrl
    });
  };
  
  // 获取不带查询参数的基础URL
  const getBaseUrlWithoutQuery = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.origin + urlObj.pathname;
    } catch (error) {
      // 处理无效URL或相对路径
      const questionMarkIndex = url.indexOf('?');
      if (questionMarkIndex !== -1) {
        return url.substring(0, questionMarkIndex);
      }
      return url;
    }
  };

  // 更新查询参数
  const updateQueryParam = (index: number, field: keyof RequestParam, value: string | boolean) => {
    const updatedParams = [...(localRequest.queryParams || [])];
    updatedParams[index] = {
      ...updatedParams[index],
      [field]: value
    };
    
    // 重新构建URL
    const baseUrl = getBaseUrlWithoutQuery(localRequest.url);
    const newUrl = buildUrlWithQueryParams(baseUrl, updatedParams);

    updateRequest({
      ...localRequest,
      queryParams: updatedParams,
      url: newUrl
    });
  };

  // 删除查询参数
  const removeQueryParam = (index: number) => {
    const updatedParams = [...(localRequest.queryParams || [])];
    updatedParams.splice(index, 1);
    
    // 如果删除后没有参数了，添加一个空白行
    if (updatedParams.length === 0) {
      updatedParams.push({ key: '', value: '', enabled: true });
    }
    
    // 重新构建URL
    const baseUrl = getBaseUrlWithoutQuery(localRequest.url);
    const newUrl = buildUrlWithQueryParams(baseUrl, updatedParams);

    updateRequest({
      ...localRequest,
      queryParams: updatedParams,
      url: newUrl
    });
  };

  // 添加请求头
  const addHeader = () => {
    const newHeader: RequestHeader = {
      key: "",
      value: "",
      enabled: true
    };

    updateRequest({
      ...localRequest,
      headers: [...(localRequest.headers || []), newHeader]
    });
  };

  // 更新请求头
  const updateHeader = (index: number, field: keyof RequestHeader, value: string | boolean) => {
    const updatedHeaders = [...(localRequest.headers || [])];
    updatedHeaders[index] = {
      ...updatedHeaders[index],
      [field]: value
    };

    updateRequest({
      ...localRequest,
      headers: updatedHeaders
    });
  };
  
  // 切换请求头编辑模式
  const toggleHeaderEditMode = () => {
    if (headerEditMode === 'table') {
      // 从表格模式切换到批量编辑模式，需要生成批量编辑文本
      const headersText = (localRequest.headers || [])
        .filter(h => h.enabled)
        .map(h => `${h.key}: ${h.value}`)
        .join('\n');
      setBulkHeadersText(headersText);
      setHeaderEditMode('bulk');
    } else {
      // 从批量编辑模式切换到表格模式，需要解析批量编辑文本
      setHeaderEditMode('table');
      applyBulkHeaders();
    }
  };
  
  // 切换参数编辑模式
  const toggleParamEditMode = () => {
    if (paramEditMode === 'table') {
      // 从表格模式切换到批量编辑模式，需要生成批量编辑文本
      const paramsText = (localRequest.queryParams || [])
        .filter(p => p.enabled)
        .map(p => `${p.key}=${p.value}`)
        .join('\n');
      setBulkParamsText(paramsText);
      setParamEditMode('bulk');
    } else {
      // 从批量编辑模式切换到表格模式，需要解析批量编辑文本
      setParamEditMode('table');
      applyBulkParams();
    }
  };

  // 应用批量编辑的头部
  const applyBulkHeaders = () => {
    const lines = bulkHeadersText.split('\n');
    const newHeaders: RequestHeader[] = [];
    
    // 将批量头部文本应用到请求中
    lines.forEach(line => {
      // 查找第一个冒号的位置
      const colonIndex = line.indexOf(':');
      
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        
        if (key) {
          newHeaders.push({
            key,
            value,
            enabled: true
          });
        }
      }
    });
    
    // 如果没有头部，添加一个空的
    if (newHeaders.length === 0) {
      newHeaders.push({ key: '', value: '', enabled: true });
    }
    
    // 更新请求对象
    updateRequest({
      ...localRequest,
      headers: newHeaders
    });
  };
  
  // 将批量参数文本应用到请求中
  const applyBulkParams = () => {
    // 将文本分割为行
    const lines = bulkParamsText.split('\n').filter(line => line.trim() !== '');
    
    // 将每行解析为参数对象
    const params: RequestParam[] = [];
    
    lines.forEach(line => {
      // 处理多种格式：key=value 或 key:value
      let key = '';
      let value = '';
      
      if (line.includes('=')) {
        const parts = line.split('=');
        key = parts[0].trim();
        value = parts.slice(1).join('=').trim();
      } else if (line.includes(':')) {
        const parts = line.split(':');
        key = parts[0].trim();
        value = parts.slice(1).join(':').trim();
      } else {
        // 如果没有分隔符，假设整行都是键
        key = line.trim();
      }
      
      if (key) {
        params.push({
          key,
          value,
          enabled: true
        });
      }
    });
    
    // 如果没有参数，添加一个空的
    if (params.length === 0) {
      params.push({ key: '', value: '', enabled: true });
    }
    
    // 更新请求对象和URL
    const updatedRequest = {
      ...localRequest,
      queryParams: params
    };
    
    // 基于新参数重新构建URL
    const baseUrl = getBaseUrlWithoutQuery(localRequest.url);
    const newUrl = buildUrlWithQueryParams(baseUrl, params);
    
    updateRequest({
      ...updatedRequest,
      url: newUrl
    });
  };

  // 删除请求头
  const removeHeader = (index: number) => {
    const updatedHeaders = [...(localRequest.headers || [])];
    updatedHeaders.splice(index, 1);

    updateRequest({
      ...localRequest,
      headers: updatedHeaders
    });
  };

  // 更新请求体
  const updateRequestBody = (value: string) => {
    updateRequest({
      ...localRequest,
      body: {
        ...localRequest.body,
        mode: 'raw',
        raw: value,
        content: value // 同时更新content字段以兼容MongoDB格式
      }
    });
  };

  // 更新表单数据
  const updateFormData = (index: number, field: 'key' | 'value' | 'enabled', value: any) => {
    const newFormData = [...formData];
    newFormData[index] = { ...newFormData[index], [field]: value };
    setFormData(newFormData);

    // 更新请求对象
    updateRequest({
      ...localRequest,
      body: {
        ...localRequest.body,
        mode: 'form-data',
        formData: newFormData
      }
    });
  };

  // 添加表单项
  const addFormItem = () => {
    setFormData([...formData, { key: '', value: '', enabled: true }]);
  };

  // 删除表单项
  const removeFormItem = (index: number) => {
    const newFormData = [...formData];
    newFormData.splice(index, 1);
    setFormData(newFormData);

    // 更新请求对象
    updateRequest({
      ...localRequest,
      body: {
        ...localRequest.body,
        mode: 'form-data',
        formData: newFormData
      }
    });
  };

  // 更新URL编码数据
  const updateUrlEncodedData = (index: number, field: 'key' | 'value' | 'enabled', value: any) => {
    const newUrlEncodedData = [...urlencodedData];
    newUrlEncodedData[index] = { ...newUrlEncodedData[index], [field]: value };
    setUrlEncodedData(newUrlEncodedData);

    // 更新请求对象
    updateRequest({
      ...localRequest,
      body: {
        ...localRequest.body,
        mode: 'urlencoded',
        urlencoded: newUrlEncodedData
      }
    });
  };

  // 添加URL编码项
  const addUrlEncodedItem = () => {
    setUrlEncodedData([...urlencodedData, { key: '', value: '', enabled: true }]);
  };

  // 删除URL编码项
  const removeUrlEncodedItem = (index: number) => {
    const newUrlEncodedData = [...urlencodedData];
    newUrlEncodedData.splice(index, 1);
    setUrlEncodedData(newUrlEncodedData);

    // 更新请求对象
    updateRequest({
      ...localRequest,
      body: {
        ...localRequest.body,
        mode: 'urlencoded',
        urlencoded: newUrlEncodedData
      }
    });
  };

  // 切换请求体模式
  const switchBodyMode = (mode: 'form-data' | 'urlencoded' | 'raw' | 'binary' | 'none') => {
    setBodyMode(mode);

    // 根据模式更新请求体对象
    let updatedBody = { ...localRequest.body, mode };

    // 设置对应模式所需的特定属性
    if (mode === 'form-data' && !updatedBody.formData) {
      updatedBody.formData = formData;
    } else if (mode === 'urlencoded' && !updatedBody.urlencoded) {
      updatedBody.urlencoded = urlencodedData;
    }

    // 更新请求对象
    updateRequest({
      ...localRequest,
      body: updatedBody
    });
  };

  // 更新请求体类型
  const updateBodyContentType = (contentType: string) => {
    updateRequest({
      ...localRequest,
      body: {
        ...localRequest.body,
        contentType
      }
    });
  };
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-2 border-b flex items-center space-x-2">
        <Select
          value={localRequest.method}
          onValueChange={handleMethodChange}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder={t('workspace.editor.method', '方法')} />
          </SelectTrigger>
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
        <Input
          className="flex-1"
          placeholder={t('workspace.editor.urlPlaceholder', '输入请求URL')}
          value={localRequest.url}
          onChange={(e) => handleUrlChange(e.target.value)}
        />
        <Button onClick={onSendRequest}>
          <Send className="h-4 w-4 mr-2" />
          {t('workspace.editor.send', '发送')}
        </Button>
        <Button variant="outline" onClick={onSaveRequest}>
          <Save className="h-4 w-4 mr-2" />
          {t('workspace.editor.save', '保存')}
        </Button>
      </div>
      
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col relative"
      >
        <TabsList className="mx-2 mt-2 justify-start">
          <TabsTrigger value="params" className="max-w-[120px]">
            <span className="truncate">{t('workspace.editor.tabs.params', '参数')}</span>
            {localRequest.queryParams?.length > 0 && (
              <span className="ml-1 bg-white text-black border border-gray-400 rounded-full w-4 h-4 text-[10px] flex items-center justify-center flex-shrink-0">{localRequest.queryParams.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="headers" className="max-w-[120px]">
            <span className="truncate">{t('workspace.editor.tabs.headers', '头部')}</span>
            {localRequest.headers?.length > 0 && (
              <span className="ml-1 bg-white text-black border border-gray-400 rounded-full w-4 h-4 text-[10px] flex items-center justify-center flex-shrink-0">{localRequest.headers.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="body" className="max-w-[120px]">
            <span className="truncate">{t('workspace.editor.tabs.body', '请求体')}</span>
          </TabsTrigger>
          <TabsTrigger value="auth" className="max-w-[120px]">
            <Lock className="h-4 w-4 mr-1 flex-shrink-0" />
            <span className="truncate">{t('workspace.editor.tabs.auth', '认证')}</span>
          </TabsTrigger>
          <TabsTrigger value="scripts" className="max-w-[120px]">
            <FileText className="h-4 w-4 mr-1 flex-shrink-0" />
            <span className="truncate">{t('workspace.editor.tabs.scripts', '脚本')}</span>
          </TabsTrigger>
        </TabsList>
        
        <div className="flex-1 overflow-auto">
          <TabsContent value="params" className="p-4 mt-0 h-full api-tabs-content">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium">{t('workspace.editor.params.title', '查询参数')}</h3>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={`${paramEditMode === 'table' ? 'bg-blue-50' : ''}`}
                  onClick={() => setParamEditMode('table')}
                >
                  <TableIcon className="h-4 w-4 mr-2" />
                  {t('workspace.editor.params.tableMode', '表格模式')}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className={`${paramEditMode === 'bulk' ? 'bg-blue-50' : ''}`}
                  onClick={() => toggleParamEditMode()}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {t('workspace.editor.params.bulkEdit', '批量编辑')}
                </Button>
                {paramEditMode === 'bulk' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      applyBulkParams();
                    }}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {t('workspace.editor.applyChanges', '应用更改')}
                  </Button>
                )}
              </div>
            </div>
            
            {paramEditMode === 'table' ? (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead style={{ width: 50 }}>{t('workspace.editor.common.enabled', '启用')}</TableHead>
                      <TableHead>{t('workspace.editor.common.key', '键')}</TableHead>
                      <TableHead>{t('workspace.editor.common.value', '值')}</TableHead>
                      <TableHead style={{ width: 80 }}></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {localRequest.queryParams && localRequest.queryParams.map((param, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Switch
                            checked={param.enabled}
                            onCheckedChange={(checked) => updateQueryParam(index, 'enabled', checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder={t('workspace.editor.params.keyPlaceholder', '参数名')}
                            value={param.key}
                            onChange={(e) => updateQueryParam(index, 'key', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder={t('workspace.editor.params.valuePlaceholder', '参数值')}
                            value={param.value}
                            onChange={(e) => updateQueryParam(index, 'value', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeQueryParam(index)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Button
                          variant="ghost"
                          className="w-full"
                          onClick={addQueryParam}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {t('workspace.editor.params.add', '添加参数')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden p-1">
                <div className="bg-muted/50 p-2 text-xs">
                  <p>{t('workspace.editor.params.bulkHelp1', '每行一个查询参数，格式为：')}<code>键名=键值</code> {t('workspace.editor.params.or', '或')} <code>键名:键值</code></p>
                  <p>{t('workspace.editor.params.bulkHelp2', '例如：')}<code>id=123</code> {t('workspace.editor.params.or', '或')} <code>sort=desc</code></p>
                </div>
                <Textarea 
                  className="min-h-[200px] border-0 focus-visible:ring-0 resize-none font-mono text-sm"
                  placeholder={t('workspace.editor.params.bulkPlaceholder', 'id=123\nsort=desc\nfilter=active\npage=1')}
                  value={bulkParamsText}
                  onChange={(e) => setBulkParamsText(e.target.value)}
                />
                <div className="flex justify-end p-2 border-t bg-muted/20">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      applyBulkParams();
                      setParamEditMode('table');
                    }}
                  >
                    {t('workspace.editor.params.applyAndReturn', '应用变更并返回表格')}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="headers" className="p-4 mt-0 h-full api-tabs-content">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium">{t('workspace.editor.headers.title', '请求头')}</h3>
              {/* headers toolbar */}
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={`${headerEditMode === 'table' ? 'bg-blue-50' : ''}`}
                  onClick={() => setHeaderEditMode('table')}
                >
                  <TableIcon className="h-4 w-4 mr-2" />
                  {t('workspace.editor.headers.tableMode', '表格模式')}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className={`${headerEditMode === 'bulk' ? 'bg-blue-50' : ''}`}
                  onClick={() => toggleHeaderEditMode()}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {t('workspace.editor.headers.bulkEdit', '批量编辑')}
                </Button>
                {headerEditMode === 'bulk' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      applyBulkHeaders();
                    }}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {t('workspace.editor.applyChanges', '应用更改')}
                  </Button>
                )}
              </div>
            </div>
            
            {headerEditMode === 'table' ? (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                    <TableHead style={{ width: 50 }}>{t('workspace.editor.common.enabled', '启用')}</TableHead>
                    <TableHead>{t('workspace.editor.common.key', '键')}</TableHead>
                    <TableHead>{t('workspace.editor.common.value', '值')}</TableHead>
                      <TableHead style={{ width: 80 }}></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {localRequest.headers && localRequest.headers.map((header, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Switch
                            checked={header.enabled}
                            onCheckedChange={(checked) => updateHeader(index, 'enabled', checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder={t('workspace.editor.headers.keyPlaceholder', '头部名')}
                            value={header.key}
                            onChange={(e) => updateHeader(index, 'key', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder={t('workspace.editor.headers.valuePlaceholder', '头部值')}
                            value={header.value}
                            onChange={(e) => updateHeader(index, 'value', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeHeader(index)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Button
                          variant="ghost"
                          className="w-full"
                          onClick={addHeader}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {t('workspace.editor.headers.add', '添加头部')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden p-1">
                <div className="bg-muted/50 p-2 text-xs">
                  <p>{t('workspace.editor.headers.bulkHelp1', '每行一个请求头，格式为：')}<code>键名: 键值</code></p>
                  <p>{t('workspace.editor.headers.bulkHelp2', '例如：')}<code>Content-Type: application/json</code></p>
                </div>
                <Textarea 
                  className="min-h-[200px] border-0 focus-visible:ring-0 resize-none font-mono text-sm"
                  placeholder={t('workspace.editor.headers.bulkPlaceholder', 'Content-Type: application/json\nAccept: application/json\nAuthorization: Bearer token')}
                  value={bulkHeadersText}
                  onChange={(e) => setBulkHeadersText(e.target.value)}
                />
                <div className="flex justify-end p-2 border-t bg-muted/20">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      applyBulkHeaders();
                      setHeaderEditMode('table');
                    }}
                  >
                    {t('workspace.editor.headers.applyAndReturn', '应用变更并返回表格')}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="body" className="api-tabs-content p-4 mt-2">
            <div className="flex flex-col h-full">
              {/* 选项卡按钮组 */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className={bodyMode === 'form-data' ? "bg-blue-50" : ""}
                    onClick={() => switchBodyMode('form-data')}
                  >
                    <FormInput className="h-4 w-4 mr-2" />
                    Form
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className={bodyMode === 'urlencoded' ? "bg-blue-50" : ""}
                    onClick={() => switchBodyMode('urlencoded')}
                  >
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    {t('workspace.editor.body.urlencoded', 'URL编码')}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={bodyMode === 'raw' ? "bg-blue-50" : ""}
                    onClick={() => switchBodyMode('raw')}
                  >
                    <Code className="h-4 w-4 mr-2" />
                    Raw
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className={bodyMode === 'binary' ? "bg-blue-50" : ""}
                    onClick={() => switchBodyMode('binary')}
                  >
                    <FileCode className="h-4 w-4 mr-2" />
                    {t('workspace.editor.body.binary', '二进制')}
                  </Button>
                </div>
                <Select
                  value={localRequest.body?.contentType || "application/json"}
                  onValueChange={updateBodyContentType}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t('workspace.editor.body.contentType', '内容类型')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="application/json">JSON</SelectItem>
                    <SelectItem value="application/xml">XML</SelectItem>
                    <SelectItem value="text/plain">Text</SelectItem>
                    <SelectItem value="application/javascript">JavaScript</SelectItem>
                    <SelectItem value="text/html">HTML</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* 内容区域 */}
              <div className="border rounded-md overflow-auto flex-1" style={{ minHeight: '300px' }}>
                {/* Form 模式 */}
                {bodyMode === 'form-data' && (
                  <div className="h-full overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead style={{ width: 50 }}>{t('workspace.editor.common.enabled', '启用')}</TableHead>
                          <TableHead>{t('workspace.editor.common.key', '键')}</TableHead>
                          <TableHead>{t('workspace.editor.common.value', '值')}</TableHead>
                          <TableHead style={{ width: 80 }}></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {formData.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Switch
                                checked={item.enabled}
                                onCheckedChange={(checked) => updateFormData(index, 'enabled', checked)}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                placeholder={t('workspace.editor.body.form.keyPlaceholder', '键名')}
                                value={item.key}
                                onChange={(e) => updateFormData(index, 'key', e.target.value)}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                placeholder={t('workspace.editor.body.form.valuePlaceholder', '键值')}
                                value={item.value}
                                onChange={(e) => updateFormData(index, 'value', e.target.value)}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeFormItem(index)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell colSpan={4}>
                            <Button
                              variant="ghost"
                              className="w-full"
                              onClick={addFormItem}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              {t('workspace.editor.body.form.add', '添加表单项')}
                            </Button>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
                
                {/* URL编码模式 */}
                {bodyMode === 'urlencoded' && (
                  <div className="h-full overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead style={{ width: 50 }}>启用</TableHead>
                          <TableHead>键</TableHead>
                          <TableHead>值</TableHead>
                          <TableHead style={{ width: 80 }}></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {urlencodedData.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Switch
                                checked={item.enabled}
                                onCheckedChange={(checked) => updateUrlEncodedData(index, 'enabled', checked)}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                placeholder="键名"
                                value={item.key}
                                onChange={(e) => updateUrlEncodedData(index, 'key', e.target.value)}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                placeholder="键值"
                                value={item.value}
                                onChange={(e) => updateUrlEncodedData(index, 'value', e.target.value)}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeUrlEncodedItem(index)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell colSpan={4}>
                            <Button
                              variant="ghost"
                              className="w-full"
                              onClick={addUrlEncodedItem}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              {t('workspace.editor.body.urlencodedAdd', '添加URL编码项')}
                            </Button>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
                
                {/* Raw模式 */}
                {bodyMode === 'raw' && (
                  <div className="h-full w-full">
                    {localRequest.body?.contentType === 'application/json' ? (
                      <FormattedJsonEditor
                        className="h-full w-full"
                        placeholder={t('workspace.editor.body.jsonPlaceholder', '请输入JSON格式的请求体内容')}
                        value={localRequest.body?.raw || ""}
                        onChange={updateRequestBody}
                        showLineNumbers={editorSettings.showLineNumbers}
                        highlightCurrentLine={editorSettings.highlightCurrentLine}
                      />
                    ) : (
                      <EnhancedEditor
                        className="h-full w-full"
                        placeholder={t('workspace.editor.body.rawPlaceholder', '请求体内容')}
                        value={localRequest.body?.raw || ""}
                        onChange={updateRequestBody}
                        showLineNumbers={editorSettings.showLineNumbers}
                        highlightCurrentLine={editorSettings.highlightCurrentLine}
                        language="text"
                      />
                    )}
                  </div>
                )}
                
                {/* 二进制模式 */}
                {bodyMode === 'binary' && (
                  <div className="h-full flex items-center justify-center p-6">
                    <div className="text-center">
                      <FileCode className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="mb-4">{t('workspace.editor.body.uploadBinary', '上传二进制文件')}</p>
                      <Button variant="outline">
                        {t('workspace.editor.body.chooseFile', '选择文件')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="auth" className="p-0 mt-0 h-full overflow-y-auto api-tabs-content">
            <div className="p-4">
              {/* 开发调试信息 - 更新版本 */}
              <div className="mb-4 p-2 border rounded bg-blue-50 text-xs">
                <p><strong>{t('workspace.editor.auth.debugTitle', '认证状态调试信息')}</strong></p>
                <p>{t('workspace.editor.auth.currentType', '当前认证类型:')} {localRequest.auth?.type || t('workspace.editor.auth.none', '无')}</p>
                <p>{t('workspace.editor.auth.enabled', '是否已启用:')} {localRequest.auth?.enabled ? t('workspace.editor.auth.yes', '是') : t('workspace.editor.auth.no', '否')}</p>
                {localRequest.auth?.type === 'bearer' && (
                  <p>Bearer Token: {localRequest.auth?.token ? t('workspace.editor.auth.set', '已设置') : t('workspace.editor.auth.unset', '未设置')}</p>
                )}
              </div>
              
              <AuthenticatorPanel 
                auth={localRequest.auth || { type: 'none', enabled: false }}
                onAuthChange={(auth) => {
                  console.log('更新认证信息:', auth);
                  updateRequest({
                    ...localRequest,
                    auth
                  });
                }}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="scripts" className="p-0 mt-0 h-full overflow-y-auto api-tabs-content">
            <div className="p-4">
              <ScriptEditor 
                preRequest={localRequest.preRequest || {
                  script: localRequest.preRequestScript || '',
                  enabled: !!localRequest.preRequestScript
                }}
                tests={
                  // 优先使用tests数组
                  localRequest.tests?.length ? localRequest.tests : 
                  // 如果没有tests，尝试使用assertions
                  localRequest.assertions?.length ? 
                    // 将assertions转换为测试脚本格式
                    localRequest.assertions.map(assertion => {
                      console.log('发现assertion:', assertion);
                      
                      // 特殊处理：如果Postman导入的脚本
                      if (assertion.operation === 'script') {
                        // 尝试从多个可能的字段读取脚本内容
                        // 第一优先级：script字段
                        // 第二优先级：_script字段(下划线前缀版本)
                        // 第三优先级：content字段
                        const scriptContent = assertion.script || assertion._script || assertion.content;
                        
                        if (scriptContent) {
                          console.log('使用脚本内容:', scriptContent);
                          return {
                            name: assertion.target || 'Imported Test',
                            script: scriptContent,
                            enabled: assertion.enabled === undefined ? true : assertion.enabled
                          };
                        }
                      }
                      
                      // 正常处理其他assertions
                      return {
                        name: assertion.target || 'Status code check',
                        // 直接使用script字段如果存在，否则生成默认脚本
                        script: `${assertion.target || 'Status code'} ${assertion.operation || 'check'}", function() {
  // 自动转换的测试脚本
  pm.response.to.have.status(200);
})`,
                        enabled: assertion.enabled === undefined ? true : assertion.enabled
                      };
                    }) : 
                    // 如果都没有，返回空数组
                    []
                }
                onPreRequestChange={(preRequest) => {
                  updateRequest({
                    ...localRequest,
                    preRequest,
                    // 同时更新后端字段
                    preRequestScript: preRequest.script
                  });
                }}
                onTestsChange={(tests) => {
                  // 更新tests的同时，也更新assertions
                  updateRequest({
                    ...localRequest,
                    tests,
                    // 更新assertions数组
                    assertions: tests.map(test => ({
                      target: test.name,
                      operation: 'equals',
                      enabled: test.enabled,
                      script: test.script
                    }))
                  });
                }}
              />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
