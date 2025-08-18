"use client";

import React, { useState, useMemo } from "react";
import { ApiResult, ApiCollection } from "@/lib/api-data";
import { Check, X, ChevronDown, ChevronRight, Folder, FolderOpen, FileText, Grid3X3, List } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// 视图模式类型
type ViewMode = 'list' | 'grid';

interface CollectionRunResultsProps {
  results: ApiResult[];
  onClose: () => void;
  collection?: ApiCollection;
}

// 按文件夹分组结果的数据结构
interface GroupedResults {
  rootRequests: ApiResult[];
  folders: Array<{
    id: string;
    name: string;
    results: ApiResult[];
    subFolders?: Array<{
      id: string;
      name: string;
      results: ApiResult[];
      subFolders?: Array<{
        id: string;
        name: string;
        results: ApiResult[];
      }>;
    }>;
  }>;
}

interface FolderResult {
  id: string;
  name: string;
  results: ApiResult[];
  subFolders?: FolderResult[];
}

export function CollectionRunResults({ results, onClose, collection }: CollectionRunResultsProps) {
  const [expandedResults, setExpandedResults] = useState<Record<string, boolean>>({});
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  // 排序相关state
  const [sortBy, setSortBy] = useState<'execution-order' | 'response-time' | 'status-code' | 'test-results'>('execution-order');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  // 视图模式状态，默认为简略视图
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  // 详细信息对话框状态
  const [selectedResult, setSelectedResult] = useState<ApiResult | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  
  // 按文件夹分组结果
  const groupResultsByFolder = (results: ApiResult[]): GroupedResults => {
    const grouped: GroupedResults = {
      rootRequests: [],
      folders: []
    };
    
    // 如果没有提供结构信息，则返回所有结果作为根级请求
    if (!collection) {
      return {
        rootRequests: results,
        folders: []
      };
    }
    
    // 创建结果映射，便于查找
    const resultMap = new Map<string, ApiResult>();
    results.forEach(result => {
      resultMap.set(result.requestId, result);
    });
    
    // 处理根级请求
    collection.requests?.forEach(request => {
      const requestId = request.id || request._id;
      if (requestId) {
        const result = resultMap.get(requestId);
        if (result) {
          grouped.rootRequests.push(result);
        }
      }
    });
    
    // 递归处理文件夹的函数
    const processFolder = (folder: any): FolderResult | null => {
      const folderResults: ApiResult[] = [];
      const subFolders: FolderResult[] = [];
      
      // 处理文件夹中的项目
      folder.items?.forEach((item: any) => {
        const itemId = item.id || item._id;
        if (!itemId) return;
        
        if ('url' in item) {
          // 是请求
          const result = resultMap.get(itemId);
          if (result) {
            folderResults.push(result);
          }
        } else {
          // 是子文件夹，递归处理
          const subFolder = processFolder(item);
          if (subFolder) {
            subFolders.push(subFolder);
          }
        }
      });
      
      // 如果文件夹包含结果或子文件夹，则返回文件夹结果
      if (folderResults.length > 0 || subFolders.length > 0) {
        return {
          id: folder.id || folder._id,
          name: folder.name,
          results: folderResults,
          subFolders
        };
      }
      
      return null;
    };
    
    // 处理根级文件夹
    collection.folders?.forEach(folder => {
      const folderResult = processFolder(folder);
      if (folderResult) {
        grouped.folders.push(folderResult);
      }
    });
    
    // 处理items数组（兼容性处理）
    collection.items?.forEach(item => {
      const itemId = item.id || item._id;
      if (!itemId) return;
      
      if ('url' in item) {
        // 是请求
        const result = resultMap.get(itemId);
        if (result) {
          grouped.rootRequests.push(result);
        }
      } else {
        // 是文件夹
        const folderResult = processFolder(item);
        if (folderResult) {
          grouped.folders.push(folderResult);
        }
      }
    });
    
    return grouped;
  };
  
  const groupedResults = groupResultsByFolder(results);

  // 排序逻辑
  const sortedResults = useMemo(() => {
    const arr = [...results];
    arr.sort((a, b) => {
      let aValue: any, bValue: any;
      switch (sortBy) {
        case 'response-time':
          aValue = a.responseTime;
          bValue = b.responseTime;
          break;
        case 'status-code':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'test-results':
          const aPassed = a.testResults?.filter(t => t.passed).length || 0;
          const bPassed = b.testResults?.filter(t => t.passed).length || 0;
          const aTotal = a.testResults?.length || 0;
          const bTotal = b.testResults?.length || 0;
          const aAll = aTotal > 0 && aPassed === aTotal;
          const bAll = bTotal > 0 && bPassed === bTotal;
          if (aAll !== bAll) return bAll ? 1 : -1;
          aValue = aTotal > 0 ? aPassed / aTotal : 0;
          bValue = bTotal > 0 ? bPassed / bTotal : 0;
          break;
        case 'execution-order':
        default:
          aValue = new Date(a.timestamp).getTime();
          bValue = new Date(b.timestamp).getTime();
          break;
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      const aStr = String(aValue || '');
      const bStr = String(bValue || '');
      const comparison = aStr.localeCompare(bStr);
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return arr;
  }, [results, sortBy, sortDirection]);
  
  // 统计请求结果
  const successCount = results.filter(r => r.status >= 200 && r.status < 300).length;
  const errorCount = results.filter(r => r.status >= 400 || r.status === 0).length;
  const redirectCount = results.filter(r => r.status >= 300 && r.status < 400).length;
  const otherCount = results.length - (successCount + errorCount + redirectCount);
  
  // 统计测试结果
  const testsCount = results.reduce((acc, result) => {
    return acc + (result.testResults?.length || 0);
  }, 0);
  
  const passedTestsCount = results.reduce((acc, result) => {
    return acc + (result.testResults?.filter(test => test.passed)?.length || 0);
  }, 0);
  
  const toggleExpand = (requestId: string) => {
    setExpandedResults(prev => ({
      ...prev,
      [requestId]: !prev[requestId]
    }));
  };
  
  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  // 处理方块点击，显示详细信息
  const handleGridItemClick = (result: ApiResult) => {
    setSelectedResult(result);
    setIsDetailDialogOpen(true);
  };

  // 关闭详细信息对话框
  const closeDetailDialog = () => {
    setIsDetailDialogOpen(false);
    setSelectedResult(null);
  };
  
  // 渲染单个请求结果行
  const renderRequestResult = (result: ApiResult, level: number = 0, context: string = 'root') => {
    const isExpanded = expandedResults[result.requestId];
    const isSuccess = result.status >= 200 && result.status < 300;
    const isError = result.status >= 400 || result.status === 0;
    const isRedirect = result.status >= 300 && result.status < 400;
    
    const testsPassed = result.testResults?.every(t => t.passed) || false;
    const testsExist = (result.testResults?.length || 0) > 0;
    
    return (
      <React.Fragment key={`${context}-${result.requestId}`}>
        <TableRow className="cursor-pointer" onClick={() => toggleExpand(result.requestId)}>
          <TableCell>
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </TableCell>
          <TableCell className="font-medium" style={{ paddingLeft: `${level * 16 + 8}px` }}>
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-green-600" />
              <span>{result.requestName || result.url?.split('?')[0] || '未命名请求'}</span>
            </div>
          </TableCell>
          <TableCell>
            <Badge variant={
              result.method === 'GET' ? 'default' : 
              result.method === 'POST' ? 'secondary' : 
              result.method === 'PUT' ? 'outline' : 
              'destructive'
            }>
              {result.method}
            </Badge>
          </TableCell>
          <TableCell>
            <span className={`font-mono ${
              isSuccess ? 'text-green-600 dark:text-green-400' : 
              isError ? 'text-red-600 dark:text-red-400' :
              isRedirect ? 'text-orange-600 dark:text-orange-400' : ''
            }`}>
              {result.status}
            </span>
          </TableCell>
          <TableCell>{result.responseTime}ms</TableCell>
          <TableCell>{formatBytes(result.responseSize)}</TableCell>
          <TableCell>
            {testsExist ? (
              <div className="flex items-center space-x-2">
                {testsPassed ? (
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                )}
                <span className={testsPassed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                  {result.testResults?.filter(t => t.passed).length || 0}/{result.testResults?.length || 0}
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground">无测试</span>
            )}
          </TableCell>
        </TableRow>
        
        {isExpanded && (
          <TableRow>
            <TableCell colSpan={7} className="p-4 bg-muted/20">
              <div className="space-y-4">
                {/* 请求信息 */}
                {/* 请求头信息 */}
                {result.requestHeaders && Object.keys(result.requestHeaders).length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">请求头信息</h4>
                    <div className="text-xs font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 max-h-[100px] overflow-auto">
                      {Object.entries(result.requestHeaders).map(([key, value]) => (
                        <div key={`${context}-${result.requestId}-req-header-${key}`}>
                          <span className="text-green-600 dark:text-green-400">{key}</span>: {value}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* 请求体 */}
                {result.requestBody && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">请求体</h4>
                    <div className="text-xs font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 max-h-[200px] overflow-auto">
                      {result.requestBody}
                    </div>
                  </div>
                )}
                
                {/* 测试结果详情 */}
                {result.testResults && result.testResults.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">测试结果</h4>
                    <div className="space-y-2">
                      {result.testResults.map((test, index) => (
                        <div 
                          key={`${context}-${result.requestId}-test-${index}`}
                          className={`p-2 rounded border ${
                            test.passed 
                              ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20' 
                              : 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20'
                          }`}
                        >
                          <div className="flex items-center">
                            {test.passed ? (
                              <Check className="h-4 w-4 text-green-600 dark:text-green-400 mr-2" />
                            ) : (
                              <X className="h-4 w-4 text-red-600 dark:text-red-400 mr-2" />
                            )}
                            <span>{test.name}</span>
                          </div>
                          {!test.passed && test.error && (
                            <div className="text-sm mt-1 text-red-600 dark:text-red-400">
                              {test.error}
                            </div>
                          )}
                          {test.duration !== undefined && (
                            <div className="text-xs text-muted-foreground mt-1">
                              执行时间: {test.duration}ms
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* 错误消息 */}
                {result.error && (
                  <div className="mt-4">
                    <h4 className="font-medium text-red-600 dark:text-red-400">错误</h4>
                    <div className="p-2 rounded border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20 text-sm font-mono">
                      {result.error}
                    </div>
                  </div>
                )}
                
                {/* 响应头信息 */}
                {Object.keys(result.responseHeaders).length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">响应头信息</h4>
                    <div className="text-xs font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 max-h-[100px] overflow-auto">
                      {Object.entries(result.responseHeaders).map(([key, value]) => (
                        <div key={`${context}-${result.requestId}-header-${key}`}>
                          <span className="text-blue-600 dark:text-blue-400">{key}</span>: {value}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* 代理信息 */}
                {result.proxyInfo && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">代理信息</h4>
                    <div className="text-xs font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 max-h-[120px] overflow-auto space-y-1">
                      <div>
                        <span className="text-blue-600 dark:text-blue-400">隧道</span>: {result.proxyInfo.tunnelName || result.proxyInfo.tunnelId || 'N/A'}
                      </div>
                      <div>
                        <span className="text-blue-600 dark:text-blue-400">代理</span>: {result.proxyInfo.proxy ? `${result.proxyInfo.proxy.protocol || ''}://${result.proxyInfo.proxy.host}:${result.proxyInfo.proxy.port}` : '未使用代理'}
                      </div>
                    </div>
                  </div>
                )}

                {/* 响应内容预览 */}
                {result.responseBody && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">响应内容</h4>
                    <div className="text-xs font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 max-h-[200px] overflow-auto">
                      {result.responseBody}
                    </div>
                  </div>
                )}
              </div>
            </TableCell>
          </TableRow>
        )}
      </React.Fragment>
    );
  };
  
  // 渲染文件夹行
  const renderFolderHeader = (folder: FolderResult, level: number = 0, context: string = 'root') => {
    const isExpanded = expandedFolders[folder.id] !== false; // 默认展开
    const folderSuccess = folder.results.filter(r => r.status >= 200 && r.status < 300).length;
    const folderError = folder.results.filter(r => r.status >= 400 || r.status === 0).length;
    const folderTests = folder.results.reduce((acc, r) => acc + (r.testResults?.length || 0), 0);
    const folderPassedTests = folder.results.reduce((acc, r) => acc + (r.testResults?.filter(t => t.passed)?.length || 0), 0);
    
    return (
      <React.Fragment key={`${context}-folder-${folder.id}`}>
        <TableRow className="bg-muted/10 cursor-pointer" onClick={() => toggleFolder(folder.id)}>
          <TableCell>
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </TableCell>
          <TableCell className="font-semibold" style={{ paddingLeft: `${level * 16 + 8}px` }}>
            <div className="flex items-center space-x-2">
              {isExpanded ? <FolderOpen className="w-4 h-4 text-blue-600" /> : <Folder className="w-4 h-4 text-blue-600" />}
              <span>{folder.name}</span>
              <span className="text-sm text-muted-foreground">({folder.results.length} 个请求)</span>
            </div>
          </TableCell>
          <TableCell>-</TableCell>
          <TableCell>
            <div className="flex space-x-1">
              <span className="text-green-600 dark:text-green-400 text-sm">{folderSuccess}</span>
              {folderError > 0 && <span className="text-red-600 dark:text-red-400 text-sm">/{folderError}</span>}
            </div>
          </TableCell>
          <TableCell>-</TableCell>
          <TableCell>-</TableCell>
          <TableCell>
            {folderTests > 0 && (
              <span className="text-sm">
                {folderPassedTests}/{folderTests}
              </span>
            )}
          </TableCell>
        </TableRow>
        
        {/* 渲染文件夹内的请求 */}
        {isExpanded && folder.results.map(result => renderRequestResult(result, level + 1, `${context}-folder-${folder.id}`))}
        
        {/* 渲染子文件夹 */}
        {isExpanded && folder.subFolders?.map(subFolder => renderFolderHeader(subFolder, level + 1, `${context}-folder-${folder.id}`))}
      </React.Fragment>
    );
  };

  return (
    <>
      <Card className="w-full max-w-[1200px] mx-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>集合运行结果</CardTitle>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>简略视图</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>详细视图</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant="outline" size="sm" onClick={onClose}>
              关闭
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-md min-w-[120px]">
              <div className="text-green-600 dark:text-green-400 font-medium">成功</div>
              <div className="text-2xl font-bold">{successCount}</div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-md min-w-[120px]">
              <div className="text-red-600 dark:text-red-400 font-medium">错误</div>
              <div className="text-2xl font-bold">{errorCount}</div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded-md min-w-[120px]">
              <div className="text-orange-600 dark:text-orange-400 font-medium">重定向</div>
              <div className="text-2xl font-bold">{redirectCount}</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-md min-w-[120px]">
              <div className="text-blue-600 dark:text-blue-400 font-medium">测试</div>
              <div className="text-2xl font-bold">{passedTestsCount}/{testsCount}</div>
            </div>
          </div>

          {/* 根据视图模式渲染不同内容 */}
          {viewMode === 'grid' ? renderGridView() : renderListView()}
        </CardContent>
      </Card>

      {/* 详细信息对话框 */}
      {selectedResult && (
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedResult.requestName || selectedResult.url?.split('?')[0] || '请求详情'}
              </DialogTitle>
            </DialogHeader>
            {renderRequestDetails(selectedResult)}
          </DialogContent>
        </Dialog>
      )}
    </>
  );

  // 渲染简略视图（网格视图）
  function renderGridView() {
    const itemsPerRow = 30; // 固定每行30个格子

    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground mb-2">
          每个方块代表一个请求：
          <span className="inline-flex items-center ml-2 space-x-4">
            <span className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-sm mr-1"></div>
              成功
            </span>
            <span className="flex items-center">
              <div className="w-3 h-3 bg-blue-600 rounded-sm mr-1"></div>
              测试通过
            </span>
            <span className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-sm mr-1"></div>
              错误
            </span>
          </span>
        </div>

        <div
          className="grid gap-1 p-4 rounded-lg border border-gray-200 dark:border-gray-600"
          style={{
            gridTemplateColumns: `repeat(${itemsPerRow}, minmax(0, 1fr))`,
            maxWidth: '100%'
          }}
        >
          {results.map((result, index) => {
            const isSuccess = result.status >= 200 && result.status < 300;
            const isError = result.status >= 400 || result.status === 0;
            const testsExist = (result.testResults?.length || 0) > 0;
            const testsPassed = testsExist && result.testResults?.every(t => t.passed);

            // 确定方块颜色 - 使用强对比度颜色，参考统计区域的蓝色
            let bgColor = 'bg-gray-400'; // 默认颜色
            if (isError) {
              bgColor = 'bg-red-500';
            } else if (testsPassed) {
              bgColor = 'bg-blue-600'; // 使用更强的蓝色，与统计区域一致
            } else if (isSuccess) {
              bgColor = 'bg-green-500';
            }

            return (
              <TooltipProvider key={result.requestId}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`w-4 h-4 rounded-sm cursor-pointer transition-all hover:scale-110 ${bgColor}`}
                      onClick={() => handleGridItemClick(result)}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-sm">
                      <div className="font-medium">{result.requestName || result.url?.split('?')[0] || '未命名请求'}</div>
                      <div>状态: {result.status}</div>
                      <div>耗时: {result.responseTime}ms</div>
                      {testsExist && (
                        <div>测试: {testsPassed ? '通过' : '失败'}</div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </div>
    );
  }

  // 渲染详细视图（列表视图）
  function renderListView() {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]"></TableHead>
            <TableHead className="w-[280px]">请求</TableHead>
            <TableHead className="w-[100px]">方法</TableHead>
            <TableHead className="w-[80px] cursor-pointer" onClick={() => { setSortBy('status-code'); setSortDirection(sortBy === 'status-code' && sortDirection === 'asc' ? 'desc' : 'asc'); }}>状态码 {sortBy === 'status-code' && (sortDirection === 'asc' ? '🔼' : '🔽')}</TableHead>
            <TableHead className="w-[100px] cursor-pointer" onClick={() => { setSortBy('response-time'); setSortDirection(sortBy === 'response-time' && sortDirection === 'asc' ? 'desc' : 'asc'); }}>响应时间 {sortBy === 'response-time' && (sortDirection === 'asc' ? '🔼' : '🔽')}</TableHead>
            <TableHead className="w-[100px]">响应大小</TableHead>
            <TableHead className="cursor-pointer" onClick={() => { setSortBy('test-results'); setSortDirection(sortBy === 'test-results' && sortDirection === 'asc' ? 'desc' : 'asc'); }}>测试 {sortBy === 'test-results' && (sortDirection === 'asc' ? '🔼' : '🔽')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* 渲染排序后的根级请求 */}
          {groupedResults.rootRequests.length > 0
            ? sortedResults.filter(r => groupedResults.rootRequests.some(gr => gr.requestId === r.requestId)).map(result => renderRequestResult(result, 0, 'root'))
            : null}
          {/* 渲染文件夹和文件夹内的请求（保持原有分组和展开） */}
          {groupedResults.folders.map(folder => renderFolderHeader(folder, 0, 'root'))}
        </TableBody>
      </Table>
    );
  }

  // 渲染请求详细信息
  function renderRequestDetails(result: ApiResult) {
    const testsExist = (result.testResults?.length || 0) > 0;
    const testsPassed = testsExist && result.testResults?.every(t => t.passed);

    return (
      <div className="space-y-6">
        {/* 基本信息 */}
        <div>
          <h3 className="text-lg font-semibold mb-3">基本信息</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">请求方法:</span>
              <Badge variant={
                result.method === 'GET' ? 'default' :
                result.method === 'POST' ? 'secondary' :
                result.method === 'PUT' ? 'outline' :
                'destructive'
              } className="ml-2">
                {result.method}
              </Badge>
            </div>
            <div>
              <span className="font-medium">状态码:</span>
              <Badge variant={
                result.status >= 200 && result.status < 300 ? 'default' :
                result.status >= 400 ? 'destructive' : 'secondary'
              } className="ml-2">
                {result.status} {result.statusText}
              </Badge>
            </div>
            <div>
              <span className="font-medium">响应时间:</span> {result.responseTime}ms
            </div>
            <div>
              <span className="font-medium">响应大小:</span> {formatBytes(result.responseSize)}
            </div>
            <div className="col-span-2">
              <span className="font-medium">URL:</span>
              <code className="ml-2 text-xs bg-muted px-2 py-1 rounded">{result.url}</code>
            </div>
          </div>
        </div>

        <Separator />

        {/* 请求头信息 */}
        {result.requestHeaders && Object.keys(result.requestHeaders).length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">请求头</h3>
            <div className="bg-muted/50 p-3 rounded-md max-h-60 overflow-auto">
              <pre className="text-xs whitespace-pre-wrap break-words">
                {JSON.stringify(result.requestHeaders, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* 请求体 */}
        {result.requestBody && (
          <div>
            <h3 className="text-lg font-semibold mb-3">请求体</h3>
            <div className="bg-muted/50 p-3 rounded-md max-h-60 overflow-auto">
              <pre className="text-xs whitespace-pre-wrap break-words">
                {result.requestBody}
              </pre>
            </div>
          </div>
        )}

        <Separator />

        {/* 测试结果 */}
        {testsExist && (
          <div>
            <h3 className="text-lg font-semibold mb-3">测试结果</h3>
            <div className="space-y-2">
              {result.testResults?.map((test, index) => (
                <div key={index} className="flex items-center space-x-2 p-2 rounded-md bg-muted/30">
                  {test.passed ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <X className="w-4 h-4 text-red-600" />
                  )}
                  <span className="flex-1">{test.name}</span>
                  {test.duration && (
                    <span className="text-xs text-muted-foreground">{test.duration}ms</span>
                  )}
                  {test.error && (
                    <span className="text-xs text-red-600">{test.error}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* 响应头信息 */}
        {result.responseHeaders && Object.keys(result.responseHeaders).length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">响应头</h3>
            <div className="bg-muted/50 p-3 rounded-md max-h-60 overflow-auto">
              <pre className="text-xs whitespace-pre-wrap break-words">
                {JSON.stringify(result.responseHeaders, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* 代理信息 */}
        {(result as any).proxyInfo && (
          <div>
            <h3 className="text-lg font-semibold mb-3">代理信息</h3>
            <div className="bg-muted/50 p-3 rounded-md max-h-60 overflow-auto">
              <pre className="text-xs whitespace-pre-wrap break-words">
                {JSON.stringify((result as any).proxyInfo, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* 响应内容 */}
        {result.responseBody && (
          <div>
            <h3 className="text-lg font-semibold mb-3">响应内容</h3>
            <div className="bg-muted/50 p-3 rounded-md max-h-80 overflow-auto">
              <pre className="text-xs whitespace-pre-wrap break-words">
                {result.responseBody}
              </pre>
            </div>
          </div>
        )}

        {/* 错误信息 */}
        {result.error && (
          <div>
            <h3 className="text-lg font-semibold mb-3 text-red-600">错误信息</h3>
            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-300">{result.error}</p>
            </div>
          </div>
        )}
      </div>
    );
  }
}

// 格式化字节大小为人类友好的格式
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
