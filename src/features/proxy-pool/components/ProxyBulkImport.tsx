"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { AlertCircle, Download, FileInput, RotateCw, CheckCheck } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

// 代理格式: [protocol://][username:password@]host:port
const PROXY_REGEX = /^(https?|socks[45]):\/\/(?:([^:@]+):([^@]+)@)?([^:]+):(\d+)$/i;
const SIMPLE_PROXY_REGEX = /^([^:]+):(\d+)$/;

interface ParsedProxy {
  protocol: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  isValid: boolean;
  error?: string;
}

interface ProxyBulkImportProps {
  onImport: (proxies: Omit<ParsedProxy, "isValid" | "error">[]) => Promise<void>;
  onTestAll: () => Promise<void>;
}

export function ProxyBulkImport({ onImport, onTestAll }: ProxyBulkImportProps) {
  const { t } = useTranslation('common');
  const [importMode, setImportMode] = useState<string>("text");
  const [proxyUrl, setProxyUrl] = useState<string>("");
  const [proxyText, setProxyText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [parsedProxies, setParsedProxies] = useState<ParsedProxy[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [protocol, setProtocol] = useState<string>("http");

  // 解析单行代理
  const parseProxyLine = (line: string): ParsedProxy | null => {
    line = line.trim();
    if (!line) return null;

    let match = PROXY_REGEX.exec(line);
    if (match) {
      return {
        protocol: match[1].toLowerCase(),
        host: match[4],
        port: parseInt(match[5], 10),
        username: match[2] || undefined,
        password: match[3] || undefined,
        isValid: true
      };
    }

    // 尝试简单格式 host:port
    match = SIMPLE_PROXY_REGEX.exec(line);
    if (match) {
      // 确保当前选择的协议被正确应用到简单格式的代理上
      return {
        protocol: protocol.toLowerCase(), // 使用当前选择的协议并确保小写
        host: match[1],
        port: parseInt(match[2], 10),
        isValid: true
      };
    }

    // 尝试解析 host:port:protocol 或 host:port:country 格式
    const threePartMatch = /^([^:]+):(\d+):(.+)$/.exec(line);
    if (threePartMatch) {
      const host = threePartMatch[1];
      const port = parseInt(threePartMatch[2], 10);
      const thirdPart = threePartMatch[3].trim();
      
      // 检查第三部分是否为协议名称
      const commonProtocols = ['http', 'https', 'socks4', 'socks5'];
      if (commonProtocols.includes(thirdPart.toLowerCase())) {
        // 这是 host:port:protocol 格式
        return {
          protocol: thirdPart.toLowerCase(),
          host: host,
          port: port,
          isValid: true
        };
      } else {
        // 这是 host:port:country 格式，忽略国家部分，使用默认协议
        return {
          protocol: protocol.toLowerCase(),
          host: host,
          port: port,
          isValid: true
        };
      }
    }

    return {
      protocol: "",
      host: "",
      port: 0,
      isValid: false,
      error: `格式无效: ${line}`
    };
  };

  // 解析多行代理文本
  const parseProxyText = (text: string): ParsedProxy[] => {
    const lines = text.split("\n");
    const results: ParsedProxy[] = [];

    for (const line of lines) {
      const proxy = parseProxyLine(line);
      if (proxy) results.push(proxy);
    }

    return results;
  };

  // 处理文本导入
  const handleTextImport = () => {
    try {
      setImportError(null);
      const parsed = parseProxyText(proxyText);
      setParsedProxies(parsed);
      
      const validProxies = parsed.filter(p => p.isValid);
      if (validProxies.length === 0) {
        setImportError("没有找到有效的代理");
        return;
      }

      toast({
        title: t('proxyPool.bulk.parseSuccessTitle', '解析成功'),
        description: t('proxyPool.bulk.parseSuccessDesc', '解析了 {{total}} 个代理，有效代理 {{valid}} 个', { total: parsed.length, valid: validProxies.length }),
      });
    } catch (error) {
      setImportError(t('proxyPool.bulk.parseFailed', '解析代理文本失败: {{msg}}', { msg: error instanceof Error ? error.message : String(error) }));
    }
  };

  // 从URL导入
  const handleUrlImport = async () => {
    if (!proxyUrl) {
      setImportError(t('proxyPool.bulk.enterUrl', '请输入代理列表URL'));
      return;
    }

    setLoading(true);
    setImportError(null);
    
    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error(t('proxyPool.bulk.requestFailed', '请求失败: {{status}}', { status: response.status }));
      }
      
      const text = await response.text();
      setProxyText(text);
      
      // 解析代理
      const parsed = parseProxyText(text);
      setParsedProxies(parsed);
      
      const validProxies = parsed.filter(p => p.isValid);
      if (validProxies.length === 0) {
        setImportError(t('proxyPool.bulk.noValid', '没有找到有效的代理'));
        return;
      }

      toast({
        title: t('proxyPool.bulk.urlImportSuccessTitle', '导入成功'),
        description: t('proxyPool.bulk.urlImportSuccessDesc', '从URL导入了 {{total}} 个代理，有效代理 {{valid}} 个', { total: parsed.length, valid: validProxies.length }),
      });
    } catch (error) {
      setImportError(t('proxyPool.bulk.urlImportFailed', '从URL导入代理失败: {{msg}}', { msg: error instanceof Error ? error.message : String(error) }));
    } finally {
      setLoading(false);
    }
  };

  // 提交导入
  const handleImport = async () => {
    const validProxies = parsedProxies.filter(p => p.isValid);
    
    if (validProxies.length === 0) {
      setImportError(t('proxyPool.bulk.noValidToImport', '没有找到有效的代理可导入'));
      return;
    }
    
    setLoading(true);
    try {
      // 移除错误和验证标志
      const proxiesToImport = validProxies.map(({ isValid, error, ...proxy }) => proxy);
      
      await onImport(proxiesToImport);
      
      toast({
        title: t('proxyPool.bulk.importDoneTitle', '导入完成'),
        description: t('proxyPool.bulk.importDoneDesc', '成功导入 {{n}} 个代理', { n: validProxies.length }),
      });
      
      // 清空表单
      setProxyText("");
      setProxyUrl("");
      setParsedProxies([]);
    } catch (error) {
      setImportError(t('proxyPool.bulk.importFailed', '导入代理失败: {{msg}}', { msg: error instanceof Error ? error.message : String(error) }));
    } finally {
      setLoading(false);
    }
  };

  // 测试所有代理
  const handleTestAll = async () => {
    setLoading(true);
    try {
      await onTestAll();
      toast({
        title: t('proxyPool.bulk.testStartedTitle', '测试已启动'),
        description: t('proxyPool.bulk.testStartedDesc', '已启动所有代理测试，请等待测试完成'),
      });
    } catch (error) {
      toast({
        title: t('proxyPool.bulk.testFailedTitle', '测试失败'),
        description: t('proxyPool.bulk.testFailedDesc', '测试代理失败: {{msg}}', { msg: error instanceof Error ? error.message : String(error) }),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{t('proxyPool.bulk.title', '代理批量导入')}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestAll}
            disabled={loading}
          >
            <RotateCw className="mr-2 h-4 w-4" />
            {t('proxyPool.actions.testAll', '测试所有代理')}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="text" onValueChange={setImportMode}>
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="text">{t('proxyPool.bulk.textImport', '文本导入')}</TabsTrigger>
            <TabsTrigger value="url">{t('proxyPool.bulk.urlImportTab', 'URL导入')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="text" className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="proxy-protocol">{t('proxyPool.bulk.defaultProtocol', '默认协议 (用于简单格式)')}</Label>
                <select 
                  id="proxy-protocol"
                  className="mt-1 block w-full p-2 border rounded-md"
                  value={protocol}
                  onChange={(e) => setProtocol(e.target.value)}
                >
                  <option value="http">HTTP</option>
                  <option value="https">HTTPS</option>
                  <option value="socks4">SOCKS4</option>
                  <option value="socks5">SOCKS5</option>
                </select>
              </div>
              <div>
                <Label htmlFor="proxy-text">{t('proxyPool.bulk.list', '代理列表 (每行一个)')}</Label>
                <Textarea
                  id="proxy-text"
                  placeholder={t('proxyPool.bulk.textPlaceholder', '支持格式：\nhost:port (使用默认协议)\nprotocol://username:password@host:port\nhost:port:country (忽略国家信息)\nhost:port:protocol\nhost:port:protocol:username:password')}
                  className="h-[200px] font-mono text-sm"
                  value={proxyText}
                  onChange={(e) => setProxyText(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleTextImport} 
                disabled={!proxyText.trim() || loading}
              >
                {t('proxyPool.bulk.parse', '解析代理')}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="url" className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="proxy-url">{t('proxyPool.bulk.url', '代理列表URL')}</Label>
                <Input
                  id="proxy-url"
                  placeholder="https://example.com/proxies.txt"
                  value={proxyUrl}
                  onChange={(e) => setProxyUrl(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="proxy-protocol">{t('proxyPool.bulk.defaultProtocol', '默认协议 (用于简单格式)')}</Label>
                <select 
                  id="proxy-protocol"
                  className="mt-1 block w-full p-2 border rounded-md"
                  value={protocol}
                  onChange={(e) => setProtocol(e.target.value)}
                >
                  <option value="http">HTTP</option>
                  <option value="https">HTTPS</option>
                  <option value="socks4">SOCKS4</option>
                  <option value="socks5">SOCKS5</option>
                </select>
              </div>
              <Button 
                onClick={handleUrlImport} 
                disabled={!proxyUrl.trim() || loading}
              >
                <Download className="mr-2 h-4 w-4" />
                {t('proxyPool.bulk.fromExternal', '从URL导入')}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        
        {loading && (
          <div className="my-4">
            <Progress value={progress} className="h-1" />
            <p className="text-sm text-center mt-2">{t('proxyPool.bulk.importing', '正在导入...')}</p>
          </div>
        )}
        
        {importError && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{importError}</AlertDescription>
          </Alert>
        )}
        
        {parsedProxies.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">
                {t('proxyPool.bulk.importResult', '导入完成! 成功: {{s}}, 失败: {{f}}', { s: parsedProxies.filter(p => p.isValid).length, f: parsedProxies.filter(p => !p.isValid).length })}
              </h3>
              <Button 
                size="sm" 
                onClick={handleImport} 
                disabled={loading || parsedProxies.filter(p => p.isValid).length === 0}
              >
                <CheckCheck className="mr-2 h-3 w-3" />
                {t('proxyPool.bulk.importValid', '导入有效代理')}
              </Button>
            </div>
            
            <div className="bg-muted rounded-md p-2 max-h-[200px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-1">{t('proxyPool.bulk.col.protocol', '协议')}</th>
                    <th className="text-left p-1">{t('proxyPool.bulk.col.host', '主机')}</th>
                    <th className="text-left p-1">{t('proxyPool.bulk.col.port', '端口')}</th>
                    <th className="text-left p-1">{t('proxyPool.bulk.col.status', '状态')}</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedProxies.map((proxy, idx) => (
                    <tr key={idx} className={!proxy.isValid ? "text-red-500" : ""}>
                      <td className="p-1">{proxy.protocol}</td>
                      <td className="p-1">{proxy.host}</td>
                      <td className="p-1">{proxy.port}</td>
                      <td className="p-1">
                        {proxy.isValid ? t('proxyPool.list.valid', '有效') : proxy.error}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ProxyBulkImport;
