"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "./ui/select";
import { Slider } from "./ui/slider";
import { Checkbox } from "./ui/checkbox";
import { Switch } from "./ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import { FilePlus, Folder, FolderOpen, FileText } from "lucide-react";
import { 
  ApiCollection,
  ApiRequest,
  ApiFolder
} from "@/lib/api-data";
import { Tunnel } from "@/features/proxy-pool/types";
import { fetchTunnels } from "@/features/proxy-pool/services/tunnel-service";

// 服务函数：从文件内容中提取变量值
const extractValuesFromText = (text: string): string[] => {
  if (!text) return [];
  return text.split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
};

interface RunCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: string;
  onRun: (options: RunCollectionOptions) => void;
}

// 运行集合的选项接口 - 重构：移除参数集，增加隧道选择
interface RunCollectionOptions {
  name: string;                  // 运行任务名称
  concurrency?: number;          // 并发请求数量
  useProxy?: boolean;            // 是否启用代理
  selectedTunnelId?: string;     // 选择的隧道ID
  selectedRequests?: string[];   // 选择运行的请求ID列表
  variableFiles?: Array<{        // 变量文件列表
    variableName: string;
    values: string[];
  }>;
  // 高级设置
  timeoutSeconds?: number;       // 单次请求超时（秒）
  maxRetries?: number;           // 最大重试次数
  retryDelayMs?: number;         // 重试间隔（毫秒）
  retryStatusCodes?: number[];   // 触发重试的状态码列表
  collection?: ApiCollection;    // 集合结构信息
}

interface VariableFile {
  variableName: string;
  content: string;
  values: string[];
}

export default function RunCollectionDialog({
  open,
  onOpenChange,
  collectionId,
  onRun,
}: RunCollectionDialogProps) {
  // 基本设置
  const [name, setName] = useState(`运行任务-${new Date().toLocaleString()}`);
  const [concurrency, setConcurrency] = useState(5);

  // 隧道选择（替代原来的代理选择）
  const [tunnels, setTunnels] = useState<Tunnel[]>([]);
  const [selectedTunnelId, setSelectedTunnelId] = useState<string>("none");
  const [loadingTunnels, setLoadingTunnels] = useState(false);

  // 集合和请求选择
  const [collection, setCollection] = useState<ApiCollection | null>(null);
  const [requests, setRequests] = useState<ApiRequest[]>([]);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [loadingCollection, setLoadingCollection] = useState(false);

  // 变量文件导入
  const [activeTab, setActiveTab] = useState("basic");
  const [variableFiles, setVariableFiles] = useState<VariableFile[]>([]);
  const [currentVariable, setCurrentVariable] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // 高级设置 state
  const [timeoutSeconds, setTimeoutSeconds] = useState(30); // 默认 30 秒
  const [maxRetries, setMaxRetries] = useState(1); // 默认 1
  const [retryDelayMs, setRetryDelayMs] = useState(500); // 默认 500ms
  const [retryStatusCodesInput, setRetryStatusCodesInput] = useState("429");

  // 加载隧道列表
  const loadTunnels = async () => {
    try {
      setLoadingTunnels(true);
      const tunnelData = await fetchTunnels();
      // 只显示激活的隧道
      const activeTunnels = tunnelData.filter((tunnel) => tunnel.active);
      setTunnels(activeTunnels);
    } catch (error) {
      console.error("加载隧道列表失败:", error);
      setTunnels([]);
    } finally {
      setLoadingTunnels(false);
    }
  };

  // 获取选中隧道的配置
  const selectedTunnel = tunnels.find(tunnel => tunnel.id === selectedTunnelId);

  // 获取推荐的并发数
  const getRecommendedConcurrency = () => {
    if (selectedTunnel && selectedTunnelId !== "none") {
      return Math.min(concurrency, selectedTunnel.maxConcurrentRequests);
    }
    return concurrency;
  };

  // 处理隧道变更时的并发数调整
  const handleTunnelChange = (tunnelId: string) => {
    setSelectedTunnelId(tunnelId);
    
    if (tunnelId !== "none") {
      const tunnel = tunnels.find(t => t.id === tunnelId);
      if (tunnel && concurrency > tunnel.maxConcurrentRequests) {
        // 自动调整并发数到隧道允许的最大值
        setConcurrency(tunnel.maxConcurrentRequests);
      }
    }
  };

  // 加载集合详情和请求列表 - 使用真实API
  const loadCollection = async () => {
    if (!collectionId) return;

    try {
      setLoadingCollection(true);

      // 获取集合详情
      const collectionResponse = await fetch(`/api/v1/collections/${collectionId}`);
      if (!collectionResponse.ok) {
        throw new Error(`获取集合详情失败: ${collectionResponse.status}`);
      }
      const collectionData = await collectionResponse.json();
      setCollection(collectionData);

      // 递归收集所有请求（用于统计和全选功能）
      const allRequests = collectAllRequests(collectionData);
      setRequests(allRequests);

      // 默认选择所有请求
      setSelectedRequests(
        allRequests.map((req: ApiRequest) => req.id || req._id).filter((id: string | undefined): id is string => Boolean(id))
      );

      // 调试信息
      console.log("Real Collection Data:", collectionData);
      console.log("All Requests:", allRequests);
      console.log("Collection Folders:", collectionData.folders);
      console.log("Collection Requests:", collectionData.requests);
    } catch (error) {
      console.error("加载集合数据失败:", error);
      // 如果真实API失败，可以显示错误提示，但不使用模拟数据
      setCollection(null);
      setRequests([]);
      setSelectedRequests([]);
    } finally {
      setLoadingCollection(false);
    }
  };

  // 递归收集集合中的所有请求
  const collectAllRequests = (collection: ApiCollection): ApiRequest[] => {
    const allRequests: ApiRequest[] = [];

    // 收集根级请求
    if (collection.requests && collection.requests.length > 0) {
      allRequests.push(...collection.requests);
    }

    // 递归收集文件夹中的请求
    const collectFromFolder = (folder: ApiFolder) => {
      if (folder.items) {
        folder.items.forEach((item) => {
          if ("url" in item) {
            // 是请求
            allRequests.push(item);
          } else {
            // 是子文件夹
            collectFromFolder(item);
          }
        });
      }
    };

    // 处理集合中的文件夹
    if (collection.folders && collection.folders.length > 0) {
      collection.folders.forEach((folder) => collectFromFolder(folder));
    }

    // 处理items属性（兼容性考虑）
    if (collection.items) {
      collection.items.forEach((item) => {
        if ("url" in item) {
          // 是请求
          allRequests.push(item);
        } else {
          // 是文件夹
          collectFromFolder(item);
        }
      });
    }

    return allRequests;
  };

  // 递归渲染文件夹和请求的组件
  const FolderRequestTree = ({
    folder,
    level = 0,
  }: {
    folder: ApiFolder;
    level?: number;
  }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
      <div className="space-y-1">
        {/* 文件夹标题 */}
        <div
          className="flex items-center space-x-2 p-2 hover:bg-muted rounded-md cursor-pointer"
          style={{ marginLeft: `${level * 16}px` }}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 text-blue-600" />
          ) : (
            <Folder className="h-4 w-4 text-blue-600" />
          )}
          <span className="font-medium text-sm">{folder.name}</span>
        </div>

        {/* 文件夹内容 */}
        {isExpanded && (
          <div className="space-y-1">
            {folder.items?.map((item) => {
              const itemId = item.id || item._id;
              if (!itemId) return null;

              if ("url" in item) {
                // 渲染请求
                return (
                  <div
                    key={itemId}
                    className="flex items-center space-x-2 p-2 border rounded-md hover:bg-muted"
                    style={{ marginLeft: `${(level + 1) * 16}px` }}
                  >
                    <Checkbox
                      id={`request-${itemId}`}
                      checked={selectedRequests.includes(itemId)}
                      onCheckedChange={(checked) =>
                        handleRequestSelectionChange(itemId, checked === true)
                      }
                    />
                    <FileText className="h-4 w-4 text-green-600" />
                    <div className="flex-1">
                      <Label
                        htmlFor={`request-${itemId}`}
                        className="font-medium cursor-pointer text-sm"
                      >
                        {item.name}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {item.method} {item.url}
                      </p>
                    </div>
                  </div>
                );
              } else {
                // 渲染子文件夹（递归）
                return (
                  <FolderRequestTree
                    key={itemId}
                    folder={item}
                    level={level + 1}
                  />
                );
              }
            })}
          </div>
        )}
      </div>
    );
  };

  // 渲染根级请求
  const RootRequestItem = ({ request }: { request: ApiRequest }) => {
    const requestId = request.id || request._id;
    if (!requestId) return null;

    return (
      <div className="flex items-center space-x-2 p-2 border rounded-md hover:bg-muted">
        <Checkbox
          id={`request-${requestId}`}
          checked={selectedRequests.includes(requestId)}
          onCheckedChange={(checked) =>
            handleRequestSelectionChange(requestId, checked === true)
          }
        />
        <FileText className="h-4 w-4 text-green-600" />
        <div className="flex-1">
          <Label
            htmlFor={`request-${requestId}`}
            className="font-medium cursor-pointer text-sm"
          >
            {request.name}
          </Label>
          <p className="text-xs text-muted-foreground">
            {request.method} {request.url}
          </p>
        </div>
      </div>
    );
  };

  // 在对话框打开时加载数据
  useEffect(() => {
    if (open) {
      setName(`运行任务-${new Date().toLocaleString()}`);
      setSelectedTunnelId("none");
      setVariableFiles([]);
      setActiveTab("basic");

      // 加载隧道列表和集合数据
      loadTunnels();
      loadCollection();
    }
  }, [open, collectionId]);

  // 处理变量文件内容变化
  const handleFileContentChange = useCallback((content: string) => {
    setFileContent(content);
  }, []);

  // 处理文件上传
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    if (!file.name.endsWith(".txt") && file.type !== "text/plain") {
      alert("只支持上传 .txt 文件");
      return;
    }

    setIsUploading(true);

    try {
      const content = await file.text();
      setFileContent(content);

      // 如果变量名为空，尝试从文件名推断
      if (!currentVariable) {
        const baseName = file.name.replace(/\.[^/.]+$/, ""); // 移除文件扩展名
        setCurrentVariable(baseName);
      }
    } catch (error) {
      console.error("读取文件失败:", error);
      alert("读取文件失败，请重试");
    } finally {
      setIsUploading(false);
    }
  };

  // 添加变量文件
  const handleAddVariableFile = () => {
    if (!currentVariable || !fileContent) return;

    const values = extractValuesFromText(fileContent);
    if (values.length === 0) return;

    const newVariableFile: VariableFile = {
      variableName: currentVariable,
      content: fileContent,
      values,
    };

    // 如果已存在同名变量，则替换
    setVariableFiles((prev) => {
      const filtered = prev.filter((vf) => vf.variableName !== currentVariable);
      return [...filtered, newVariableFile];
    });

    // 清空输入
    setCurrentVariable("");
    setFileContent("");
  };

  // 移除变量文件
  const handleRemoveVariableFile = (variableName: string) => {
    setVariableFiles((prev) => prev.filter((vf) => vf.variableName !== variableName));
  };

  // 处理请求选择变化
  const handleRequestSelectionChange = (requestId: string, checked: boolean) => {
    setSelectedRequests((prev) => {
      if (checked) {
        return [...prev, requestId];
      } else {
        return prev.filter((id) => id !== requestId);
      }
    });
  };

  // 处理全选/取消全选
  const handleSelectAllRequests = (checked: boolean) => {
    if (checked) {
      setSelectedRequests(
        requests.map((req) => req.id || req._id).filter((id: string | undefined): id is string => Boolean(id))
      );
    } else {
      setSelectedRequests([]);
    }
  };

  // 处理运行集合
  const handleRun = () => {
    // 判断是否选择了隧道
    const hasSelectedTunnel = selectedTunnelId !== "none";

    // 计算实际的重试次数（考虑隧道配置）
    const effectiveRetries = selectedTunnel && hasSelectedTunnel && selectedTunnel.retryCount > 0 
      ? Math.max(maxRetries, selectedTunnel.retryCount)
      : maxRetries;

    // 准备运行选项，包含集合结构信息
    const options: RunCollectionOptions = {
      name,
      concurrency: getRecommendedConcurrency(), // 使用推荐的并发数
      useProxy: hasSelectedTunnel, // 选择了隧道时自动启用代理
      selectedTunnelId: hasSelectedTunnel ? selectedTunnelId : undefined,
      selectedRequests,
      variableFiles,
      // 高级设置字段
      timeoutSeconds,
      maxRetries: effectiveRetries,
      retryDelayMs,
      retryStatusCodes: retryStatusCodesInput
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => !isNaN(n)),
      collection: collection || undefined,
    };

    console.log("🚀 集合运行选项:", {
      name,
      concurrency,
      useProxy: options.useProxy,
      selectedTunnelId: options.selectedTunnelId,
      selectedRequestsCount: selectedRequests.length,
      variableFilesCount: variableFiles.length,
      // 重试参数
      timeoutSeconds: options.timeoutSeconds,
      maxRetries: options.maxRetries,
      retryDelayMs: options.retryDelayMs,
      retryStatusCodes: options.retryStatusCodes,
    });

    // 调用onRun函数
    onRun(options);

    // 关闭对话框
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>运行集合</DialogTitle>
          <DialogDescription>
            设置参数并运行API集合
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="basic">基本设置</TabsTrigger>
            <TabsTrigger value="requests">请求选择</TabsTrigger>
            <TabsTrigger value="variables">变量文件</TabsTrigger>
            <TabsTrigger value="advanced">高级设置</TabsTrigger>
          </TabsList>

          {/* 基本设置选项卡 */}
          <TabsContent value="basic" className="space-y-4">
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="run-name" className="text-right">
                  任务名称
                </Label>
                <Input
                  id="run-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="concurrency" className="text-right">
                  并发数 ({concurrency})
                  {selectedTunnel && selectedTunnelId !== "none" && (
                    <span className="text-sm text-muted-foreground block">
                      (最大: {selectedTunnel.maxConcurrentRequests})
                    </span>
                  )}
                </Label>
                <div className="col-span-3">
                  <Slider
                    id="concurrency"
                    value={[concurrency]}
                    min={1}
                    max={selectedTunnel && selectedTunnelId !== "none" 
                      ? selectedTunnel.maxConcurrentRequests 
                      : 20
                    }
                    step={1}
                    onValueChange={(values) => setConcurrency(values[0])}
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tunnel" className="text-right">
                  隧道选择
                </Label>
                <Select
                  value={selectedTunnelId}
                  onValueChange={handleTunnelChange}
                >
                  <SelectTrigger id="tunnel" className="col-span-3">
                    <SelectValue placeholder="选择隧道" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">不使用隧道</SelectItem>
                    {tunnels.map((tunnel) => (
                      <SelectItem key={tunnel.id} value={tunnel.id}>
                        {tunnel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
              </div>
            </div>
          </TabsContent>

          {/* 请求选择选项卡 */}
          <TabsContent value="requests" className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-md font-medium">
                请求选择 ({selectedRequests.length}/{requests.length})
              </h3>
              <div className="space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedRequests([])}
                >
                  清除选择
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectAllRequests(true)}
                >
                  全选
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[300px] border rounded-md p-2">
              {requests.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  没有找到请求
                </div>
              ) : (
                <div className="space-y-2">
                  {/* 渲染根级请求 */}
                  {collection?.requests?.map((request) => {
                    const requestId = request.id || request._id;
                    if (!requestId) return null;

                    return (
                      <RootRequestItem
                        key={requestId}
                        request={request}
                      />
                    );
                  })}

                  {/* 渲染文件夹 */}
                  {collection?.folders?.map((folder) => (
                    <FolderRequestTree
                      key={folder.id || folder._id}
                      folder={folder}
                    />
                  ))}

                  {/* 渲染items（兼容性处理） */}
                  {collection?.items?.map((item) => {
                    const itemId = item.id || item._id;
                    if (!itemId) return null;

                    if ("url" in item) {
                      // 是请求
                      return (
                        <RootRequestItem
                          key={itemId}
                          request={item}
                        />
                      );
                    } else {
                      // 是文件夹
                      return (
                        <FolderRequestTree
                          key={itemId}
                          folder={item}
                        />
                      );
                    }
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* 高级设置选项卡 */}
          <TabsContent value="advanced" className="space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="timeout" className="text-right">
                  超时时间 (秒)
                </Label>
                <Input
                  id="timeout"
                  type="number"
                  min={1}
                  value={timeoutSeconds}
                  onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="max-retries" className="text-right">
                  最大重试次数
                  {selectedTunnel && selectedTunnelId !== "none" && selectedTunnel.retryCount > 0 && (
                    <span className="text-sm text-muted-foreground block">
                      (隧道最低: {selectedTunnel.retryCount})
                    </span>
                  )}
                </Label>
                <Input
                  id="max-retries"
                  type="number"
                  min={selectedTunnel && selectedTunnelId !== "none" && selectedTunnel.retryCount > 0 
                    ? selectedTunnel.retryCount 
                    : 0
                  }
                  value={maxRetries}
                  onChange={(e) => setMaxRetries(Number(e.target.value))}
                  className="col-span-3"
                />
                {selectedTunnel && selectedTunnelId !== "none" && selectedTunnel.retryCount > maxRetries && (
                  <p className="text-sm text-yellow-500 col-span-4 text-right">
                    注意：隧道配置了最少 {selectedTunnel.retryCount} 次重试，实际将使用 {selectedTunnel.retryCount} 次。
                  </p>
                )}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="retry-delay" className="text-right">
                  重试间隔 (ms)
                </Label>
                <Input
                  id="retry-delay"
                  type="number"
                  min={0}
                  value={retryDelayMs}
                  onChange={(e) => setRetryDelayMs(Number(e.target.value))}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="retry-status" className="text-right">
                  重试状态码 (逗号分隔)
                </Label>
                <Input
                  id="retry-status"
                  value={retryStatusCodesInput}
                  onChange={(e) => setRetryStatusCodesInput(e.target.value)}
                  placeholder="例如: 429,503"
                  className="col-span-3"
                />
              </div>
            </div>
          </TabsContent>

          {/* 变量文件选项卡 */}
          <TabsContent value="variables" className="space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="variable-name" className="text-right">
                  变量名称
                </Label>
                <Input
                  id="variable-name"
                  value={currentVariable}
                  onChange={(e) => setCurrentVariable(e.target.value)}
                  placeholder="例如: attribute"
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 gap-4">
                <Label htmlFor="file-content" className="text-right pt-2">
                  变量内容
                </Label>
                <div className="col-span-3">
                  <Textarea
                    id="file-content"
                    value={fileContent}
                    onChange={(e) => handleFileContentChange(e.target.value)}
                    placeholder="每行一个值，例如:
domain1.com
domain2.com
domain3.net"
                    rows={5}
                    className="resize-none font-mono"
                  />
                  <div className="mt-2 flex gap-2">
                    <Button 
                      onClick={handleAddVariableFile} 
                      disabled={!currentVariable || !fileContent}
                      size="sm"
                    >
                      <FilePlus className="mr-1 h-4 w-4" />
                      添加变量
                    </Button>
                    <div className="relative">
                      <input 
                        type="file" 
                        accept=".txt,text/plain" 
                        onChange={handleFileUpload}
                        disabled={isUploading}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        id="variable-file-upload"
                      />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={isUploading}
                        asChild
                      >
                        <label htmlFor="variable-file-upload" className="cursor-pointer">
                          {isUploading ? "上传中..." : "上传 .txt 文件"}
                        </label>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 已添加的变量文件列表 */}
              <div className="mt-4">
                <h3 className="text-md font-medium mb-2">已添加的变量文件</h3>
                {variableFiles.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    暂无变量文件。添加变量后将在运行时替代请求中的 {`{{变量名}}`} 占位符。
                  </div>
                ) : (
                  <ScrollArea className="h-[200px] border rounded-md p-2">
                    <div className="space-y-2">
                      {variableFiles.map((vf) => (
                        <div 
                          key={vf.variableName} 
                          className="flex justify-between items-center p-2 border rounded-md hover:bg-muted"
                        >
                          <div>
                            <p className="font-medium">{`{{`}<span className="text-primary">{vf.variableName}</span>{`}}`}</p>
                            <p className="text-xs text-muted-foreground">
                              {vf.values.length} 个值，将运行 {vf.values.length} 次
                            </p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleRemoveVariableFile(vf.variableName)}
                          >
                            移除
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleRun} disabled={requests.length > 0 && selectedRequests.length === 0}>
            运行
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
