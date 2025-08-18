"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiCollection, ApiRequest, ApiFolder, RequestParam, RequestHeader, AuthParams } from "@/lib/api-data";
import { toast } from "@/components/ui/use-toast";
import { createApiCollection, updateApiCollection } from "@/components/services/collection-service";
import { Download, FileJson } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PostmanImporterProps {
  onImportSuccess: () => void;  // 导入成功后的回调函数
}

export function PostmanImporter({ onImportSuccess }: PostmanImporterProps) {
  const [isOpen, setIsOpen] = useState(true); // 初始状态为打开
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importToNewCollection, setImportToNewCollection] = useState(true);
  const [collectionName, setCollectionName] = useState("");
  const { t } = useTranslation('common');
  
  // 文件选择处理
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // 如果是新集合，从文件名提取集合名称作为默认值
      if (importToNewCollection) {
        const nameFromFile = file.name.replace('.postman_collection.json', '').replace('.json', '');
        setCollectionName(nameFromFile);
      }
    }
  };
  
  // 将Postman请求转换为我们应用的请求格式
  const convertPostmanRequest = (postmanItem: any, collectionId: string): ApiRequest => {
    console.log('正在转换Postman请求:', postmanItem.name, '完整项目结构:', postmanItem);
    
    // 注意: Postman的请求存储在item中的request属性中
    const postmanRequest = postmanItem.request;
    const url = postmanRequest.url;
    let fullUrl = '';
    
    // 处理URL
    if (typeof url === 'string') {
      fullUrl = url;
    } else if (url && url.raw) {
      fullUrl = url.raw;
    }
    
    // 处理预请求脚本和测试脚本
    console.log('开始解析Postman脚本');
    console.log('原始项目数据:', JSON.stringify(postmanItem, null, 2));
    
    let preRequestScript = '';
    let testScript = '';
    
    try {
      // 直接获取测试脚本 - 确保存在event数组
      if (postmanItem.event && Array.isArray(postmanItem.event)) {
        // 定义一个通用的脚本提取函数
        const extractScript = (scriptObject: any): string => {
          if (!scriptObject) return '';
          
          console.log('正在提取脚本对象:', JSON.stringify(scriptObject, null, 2));
          
          // 处理Postman脚本对象
          if (scriptObject.exec && Array.isArray(scriptObject.exec)) {
            // 直接使用原始的exec数组行
            console.log('原始脚本行数组:', JSON.stringify(scriptObject.exec));
            
            // 直接返回原始格式的脚本代码
            const rawScript = scriptObject.exec.join('\n');
            
            // 实际返回脚本内容前进行检查
            console.log('原始脚本内容:', rawScript);
            
            return rawScript;
          }
          
          // 处理直接的字符串
          if (typeof scriptObject === 'string') {
            return scriptObject;
          }
          
          return '';
        };
        
        // 找到测试脚本事件
        const testEvent = postmanItem.event.find((e: any) => e.listen === 'test');
        if (testEvent && testEvent.script) {
          // 先获取原始脚本
          const rawScript = testEvent.script;
          
          // 直接获取exec数组
          if (rawScript.exec && Array.isArray(rawScript.exec)) {
            // 输出原始脚本行进行调试
            console.log('原始测试脚本行:', JSON.stringify(rawScript.exec));
            
            // 解析测试名称和脚本体
            let testName = '';
            
            // 查找第一个包含pm.test的行
            const testLine = rawScript.exec.find((line: string) => line.includes('pm.test('));
            if (testLine) {
              const nameMatch = testLine.match(/pm\.test\s*\(\s*(['"])(.+?)\1\s*,/);
              if (nameMatch && nameMatch[2]) {
                testName = nameMatch[2];
                console.log('从原始脚本提取到测试名称:', testName);
              }
            }
            
            // 合并脚本
            testScript = rawScript.exec.join('\n');
            console.log('最终合并的测试脚本:', testScript);
            
            // 将测试名称保存到临时字段，稍后用于创建test对象
            if (testName) {
              postmanItem._extractedTestName = testName;
            }
          } else {
            testScript = extractScript(testEvent.script);
          }
          
          // 尝试修复可能的格式问题
          testScript = testScript.replace(/\\r/g, '');
          
          // 如果脚本不以分号结尾，添加分号
          if (!testScript.trim().endsWith(';')) {
            testScript = testScript.trim() + ';';
          }
        }
        
        // 同样处理预请求脚本
        const preRequestEvent = postmanItem.event.find((e: any) => e.listen === 'prerequest');
        if (preRequestEvent && preRequestEvent.script) {
          preRequestScript = extractScript(preRequestEvent.script);
          console.log('提取到原始预请求脚本:', preRequestScript);
          
          // 尝试修复可能的格式问题
          preRequestScript = preRequestScript.replace(/\\r/g, '');
          
          // 如果脚本不以分号结尾，添加分号
          if (!preRequestScript.trim().endsWith(';')) {
            preRequestScript = preRequestScript.trim() + ';';
          }
        }
      }
    } catch (error) {
      console.error('提取脚本时出错:', error);
    }
    
    console.log('最终提取的测试脚本:', testScript);
    console.log('最终提取的预请求脚本:', preRequestScript);
    
    // 解析认证信息
    let auth: AuthParams = { type: 'none', enabled: false };
    if (postmanRequest.auth) {
      console.log('正在处理Postman认证信息:', JSON.stringify(postmanRequest.auth, null, 2));
      
      switch (postmanRequest.auth.type) {
        case 'bearer':
          // 兼容多种Postman Bearer Token格式
          let bearerToken = '';
          
          // 处理数组形式
          if (postmanRequest.auth.bearer && Array.isArray(postmanRequest.auth.bearer)) {
            const tokenItem = postmanRequest.auth.bearer.find((i: any) => i.key === 'token');
            if (tokenItem) {
              bearerToken = tokenItem.value || '';
            }
          } 
          // 处理对象形式
          else if (postmanRequest.auth.bearer && typeof postmanRequest.auth.bearer === 'object') {
            bearerToken = postmanRequest.auth.bearer.token || '';
          }
          // 处理直接存储在auth对象中的token
          else if (postmanRequest.auth.token) {
            bearerToken = postmanRequest.auth.token;
          }
          
          console.log('提取到Bearer Token:', bearerToken);
          
          auth = {
            type: 'bearer',
            enabled: true,
            token: bearerToken
          };
          break;
          
        case 'basic':
          let username = '';
          let password = '';
          
          // 处理数组形式
          if (postmanRequest.auth.basic && Array.isArray(postmanRequest.auth.basic)) {
            username = postmanRequest.auth.basic.find((i: any) => i.key === 'username')?.value || '';
            password = postmanRequest.auth.basic.find((i: any) => i.key === 'password')?.value || '';
          } 
          // 处理对象形式
          else if (postmanRequest.auth.basic && typeof postmanRequest.auth.basic === 'object') {
            username = postmanRequest.auth.basic.username || '';
            password = postmanRequest.auth.basic.password || '';
          }
          // 处理直接存储在auth对象中的凭证
          else {
            username = postmanRequest.auth.username || '';
            password = postmanRequest.auth.password || '';
          }
          
          auth = {
            type: 'basic',
            enabled: true,
            username,
            password
          };
          break;
          
        case 'apikey':
          let apiKey = '';
          let apiKeyName = '';
          // 使用明确的字面量类型
          let apiKeyIn: 'header' | 'query' = 'header';
          
          // 处理数组形式
          if (postmanRequest.auth.apikey && Array.isArray(postmanRequest.auth.apikey)) {
            apiKey = postmanRequest.auth.apikey.find((i: any) => i.key === 'value')?.value || '';
            apiKeyName = postmanRequest.auth.apikey.find((i: any) => i.key === 'key')?.value || '';
            apiKeyIn = postmanRequest.auth.apikey.find((i: any) => i.key === 'in')?.value === 'query' ? 'query' : 'header';
          }
          // 处理对象形式
          else if (postmanRequest.auth.apikey && typeof postmanRequest.auth.apikey === 'object') {
            apiKey = postmanRequest.auth.apikey.value || '';
            apiKeyName = postmanRequest.auth.apikey.key || '';
            // 确保是字面量类型
            apiKeyIn = postmanRequest.auth.apikey.in === 'query' ? 'query' as const : 'header' as const;
          }
          // 处理直接存储在auth对象中的内容
          else {
            apiKey = postmanRequest.auth.value || '';
            apiKeyName = postmanRequest.auth.key || '';
            // 确保是字面量类型
            apiKeyIn = postmanRequest.auth.in === 'query' ? 'query' as const : 'header' as const;
          }
          
          auth = {
            type: 'apikey',
            enabled: true,
            apiKey,
            apiKeyName,
            apiKeyIn
          };
          break;
          
        case 'oauth2':
          let accessToken = '';
          
          // 处理数组形式
          if (postmanRequest.auth.oauth2 && Array.isArray(postmanRequest.auth.oauth2)) {
            accessToken = postmanRequest.auth.oauth2.find((i: any) => i.key === 'accessToken')?.value || '';
          }
          // 处理对象形式
          else if (postmanRequest.auth.oauth2 && typeof postmanRequest.auth.oauth2 === 'object') {
            accessToken = postmanRequest.auth.oauth2.accessToken || '';
          }
          // 处理直接存储在auth对象中的token
          else {
            accessToken = postmanRequest.auth.accessToken || '';
          }
          
          auth = {
            type: 'oauth2',
            enabled: true,
            accessToken
          };
          break;
      }
      
      console.log('最终处理后的认证信息:', JSON.stringify(auth, null, 2));
    }
    
    // 处理请求体
    let body: any = {
      mode: 'raw' as const,
      raw: '',
      content: '', // 添加content字段以兼容MongoDB格式
      contentType: 'application/json',
      formData: [],
      urlencoded: []
    };
    
    // 检查请求体类型并解析
    if (postmanRequest.body) {
      console.log('解析Postman请求体:', postmanRequest.body);
      
      switch (postmanRequest.body.mode) {
        case 'raw':
          const rawContent = postmanRequest.body.raw || '';
          body = {
            mode: 'raw' as const,
            raw: rawContent,
            content: rawContent, // 保存到MongoDB的content字段
            contentType: postmanRequest.body.options?.raw?.language === 'json' 
              ? 'application/json' 
              : postmanRequest.header?.find((h: any) => h.key.toLowerCase() === 'content-type')?.value || 'text/plain',
            formData: [],
            urlencoded: []
          };
          break;
        case 'urlencoded':
          const urlencodedData = postmanRequest.body.urlencoded?.map((item: any) => ({
            key: item.key,
            value: item.value,
            enabled: !item.disabled
          })) || [];
          
          body = {
            mode: 'urlencoded' as const,
            urlencoded: urlencodedData,
            raw: '',
            content: '', // MongoDB字段
            contentType: 'application/x-www-form-urlencoded',
            formData: []
          };
          break;
        case 'formdata':
          const formData = postmanRequest.body.formdata?.map((item: any) => ({
            key: item.key,
            value: item.value,
            enabled: !item.disabled
          })) || [];
          
          body = {
            mode: 'form-data' as const,
            formData: formData,
            raw: '',
            content: '', // MongoDB字段
            contentType: 'multipart/form-data',
            urlencoded: []
          };
          break;
      }
      
      console.log('处理后的请求体:', body);
    }
    
    // 创建请求对象
    const request: ApiRequest = {
      _id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: postmanItem.name || 'Imported Request',
      method: (postmanRequest.method || 'GET').toUpperCase(),
      url: fullUrl,
      headers: postmanRequest.header?.filter((h: any) => !h.disabled).map((header: any) => ({
        key: header.key,
        value: header.value,
        enabled: true
      })) || [],
      queryParams: url?.query?.map((param: any) => ({
        key: param.key,
        value: param.value,
        enabled: !param.disabled
      })) || [],
      body,
      collectionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      auth,
      // 测试脚本 - 添加所有可能的字段格式以确保兼容性
      preRequest: {
        script: preRequestScript,
        enabled: !!preRequestScript
      },
      preRequestScript: preRequestScript,
      // 保存测试脚本到assertions字段 - 这是后端实际使用的字段
      assertions: testScript ? [
        {
          // 使用全部必要字段保存脚本内容
          type: "script",         // 添加type字段确保兼容性
          script: testScript,      // 完整脚本内容
          _script: testScript,     // 备用字段
          content: testScript,     // 兼容字段
          value: testScript,       // 增加value字段
          // 保留整个脚本作为target，不再截取
          target: testScript, 
          operation: "script",     // 标记为脚本类型
          enabled: true
        }
      ] : [],
      
      // 同时也保存到tests字段以兼容前端显示
      tests: testScript ? [{
        // 使用从原始脚本提取的名称，或者使用默认名称
        name: postmanItem._extractedTestName || 'Postman Imported Test',
        script: testScript,
        enabled: true
      }] : []
    };
    
    return request;
  };
  
  // 处理Postman集合导入
  const processPostmanCollection = async (collectionData: any, targetCollectionId?: string): Promise<ApiCollection> => {
    try {
      // 如果是新集合，创建新集合
      let collection: ApiCollection;
      
      if (!targetCollectionId) {
        const newCollection = await createApiCollection(
          collectionData.info?.name || collectionName || "Imported Collection",
          collectionData.info?.description || "Imported from Postman"
        );
        
        if (!newCollection) {
          throw new Error("创建集合失败");
        }
        
        collection = newCollection;
      } else {
        // 使用现有集合
        // 这里假设在外部已获取了集合数据
        collection = {
          _id: targetCollectionId,
          name: collectionName,
          description: "Updated with imported items",
          requests: [],
          folders: [],
          items: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as ApiCollection; // 显式类型转换以避免类型错误
      }
      
      // 处理所有请求项
      const processItems = (items: any[], parentId?: string): { requests: ApiRequest[], folders: ApiFolder[] } => {
        const requests: ApiRequest[] = [];
        const folders: ApiFolder[] = [];
        
        items.forEach((item: any) => {
          if (item.request) {
            // 这是一个请求
            try {
              console.log('正在处理请求:', item.name);
              const request = convertPostmanRequest(item, collection._id);
              
              if (parentId) {
                request.parentId = parentId;
              }
              
              // 打印转换后的请求对象，核实信息是否完整
              console.log('转换后的请求对象:', {
                _id: request._id,
                name: request.name,
                url: request.url,
                method: request.method,
                body: request.body,
                headers: request.headers?.length,
                queryParams: request.queryParams?.length,
                auth: request.auth,
                preRequest: request.preRequest,
                tests: request.tests?.length
              });
              
              requests.push(request);
            } catch (err) {
              console.error('转换请求失败:', err, item);
            }
          } else if (item.item) {
            // 这是一个文件夹
            const folderId = `folder-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            const processedItems = processItems(item.item, folderId);
            
            folders.push({
              _id: folderId,
              name: item.name || "Unnamed Folder",
              parentId,
              items: [] // 文件夹内的项会通过请求和子文件夹单独处理
            });
            
            requests.push(...processedItems.requests);
            folders.push(...processedItems.folders);
          }
        });
        
        return { requests, folders };
      };
      
      // 处理集合中的所有项
      if (collectionData.item && Array.isArray(collectionData.item)) {
        const processedItems = processItems(collectionData.item);
        collection.requests = [...(collection.requests || []), ...processedItems.requests];
        collection.folders = [...(collection.folders || []), ...processedItems.folders];
      }
      
      // 保存更新后的集合
      const updatedCollection = await updateApiCollection(collection);
      if (!updatedCollection) {
        throw new Error("保存集合失败");
      }
      
      return updatedCollection;
    } catch (error) {
      console.error("处理Postman集合失败:", error);
      throw error;
    }
  };
  
  // 导入处理函数
  const handleImport = async () => {
    if (!selectedFile) {
      toast({
        title: t('workspace.import.errorTitle', '导入错误'),
        description: t('workspace.import.pickFile', '请选择一个Postman集合文件'),
        variant: "destructive"
      });
      return;
    }
    
    setIsImporting(true);
    
    try {
      // 读取文件内容
      const fileContent = await selectedFile.text();
      let collectionData;
      
      try {
        collectionData = JSON.parse(fileContent);
      } catch (parseError) {
        console.error('解析JSON失败:', parseError);
        toast({
          title: t('workspace.import.fileError', '文件格式错误'),
          description: t('workspace.import.parseFailed', '无法解析Postman集合文件，请确保导出了正确的JSON格式'),
          variant: 'destructive'
        });
        return;
      }
      
      console.log('Postman集合数据结构:', collectionData);
      
      // 检查是否是Postman集合
      if (!collectionData.info || !collectionData.item) {
        toast({
          title: t('workspace.import.fileError', '文件格式错误'),
          description: t('workspace.import.invalidPostman', '不是有效的Postman集合文件，缺少必要的信息'),
          variant: 'destructive'
        });
        return;
      }
      
      // 处理Postman集合
      const importedCollection = await processPostmanCollection(collectionData);
      
      toast({
        title: t('workspace.import.successTitle', '导入成功'),
        description: t('workspace.import.successDesc', '成功导入集合 "{{name}}" 共包含 {{count}} 个请求', { name: importedCollection.name, count: importedCollection.requests?.length || 0 })
      });
      
      setIsOpen(false);
      onImportSuccess();
    } catch (error: any) {
      console.error("导入失败:", error);
      toast({
        title: t('workspace.import.failedTitle', '导入失败'),
        description: error.message || t('workspace.import.failedDesc', '无法导入Postman集合'),
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('workspace.import.postman.title', '导入Postman集合')}</DialogTitle>
          <DialogDescription>
            {t('workspace.import.postman.desc', '上传Postman导出的集合文件(.json)，导入请求到API工作区。')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="file">{t('workspace.import.pickFile', '选择集合文件')}</Label>
            <div className="flex items-center">
              <Input
                id="file"
                type="file"
                accept=".json"
                onChange={handleFileChange}
                disabled={isImporting}
              />
            </div>
            {selectedFile && (
              <div className="text-sm text-green-600 flex items-center">
                <FileJson className="h-4 w-4 mr-1" />
                {t('workspace.import.selected', '已选择')}: {selectedFile.name}
              </div>
            )}
          </div>
          
          {/* <div className="flex flex-col gap-2">
            <Label htmlFor="collectionName">集合名称</Label>
            <Input
              id="collectionName"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              placeholder="输入集合名称"
              disabled={isImporting || !importToNewCollection}
            />
          </div> */}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isImporting}>
            {t('actions.reset', '取消')}
          </Button>
          <Button onClick={handleImport} disabled={isImporting || !selectedFile}>
            {isImporting ? t('workspace.import.importing', '导入中...') : t('workspace.import.import', '导入')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
