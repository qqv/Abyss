'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Loader2, CheckCircle, XCircle, AlertCircle, Download, Clock } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// 响应状态标签颜色映射
const statusColorMap = {
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
};

// 获取响应状态类型
const getStatusType = (status: number) => {
  if (status >= 200 && status < 300) return 'success';
  if (status >= 400 && status < 500) return 'warning';
  if (status >= 500 || status === 0) return 'error';
  return 'warning';
};

// 格式化日期时间
const formatDateTime = (dateString: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN');
};

interface TestResultsViewProps {
  jobId: string;
}

export default function TestResultsView({ jobId }: TestResultsViewProps) {
  const [testJob, setTestJob] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(10);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  const [expandedHeaders, setExpandedHeaders] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('summary');

  // 获取测试任务详情
  useEffect(() => {
    const fetchTestJob = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/v1/tests/${jobId}`);
        if (!response.ok) {
          throw new Error(`获取测试任务失败: ${response.status}`);
        }
        const data = await response.json();
        setTestJob(data);
      } catch (err) {
        setError('获取测试任务详情失败');
        console.error('获取测试任务详情错误:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (jobId) {
      fetchTestJob();
    }
  }, [jobId]);

  // 获取测试结果
  useEffect(() => {
    const fetchResults = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/v1/tests/${jobId}/results?page=${page}&limit=${limit}`);
        if (!response.ok) {
          throw new Error(`获取测试结果失败: ${response.status}`);
        }
        const data = await response.json();
        setResults(data.results);
        setTotalPages(data.pagination.pages);
      } catch (err) {
        setError('获取测试结果失败');
        console.error('获取测试结果错误:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (jobId && activeTab === 'results') {
      fetchResults();
    }
  }, [jobId, page, limit, activeTab]);

  // 切换结果展开/折叠
  const toggleResultExpanded = (resultId: string) => {
    setExpandedResults(prev => {
      const newSet = new Set(prev);
      if (newSet.has(resultId)) {
        newSet.delete(resultId);
      } else {
        newSet.add(resultId);
      }
      return newSet;
    });
  };

  // 切换头部展开状态
  const toggleHeaders = (id: string) => {
    setExpandedHeaders((prev: string[]) =>
      prev.includes(id) ? prev.filter((headerId: string) => headerId !== id) : [...prev, id]
    );
  };

  // 下载测试结果
  const downloadResults = async () => {
    try {
      const response = await fetch(`/api/v1/tests/${jobId}/results/download`);
      if (!response.ok) {
        throw new Error(`下载测试结果失败: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `test-results-${jobId}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('下载测试结果错误:', err);
    }
  };

  // 计算测试统计数据
  const calculateStats = () => {
    if (!results || results.length === 0) {
      return {
        total: 0,
        success: 0,
        failed: 0,
        avgResponseTime: 0,
      };
    }

    const successCount = results.filter(r => r.status >= 200 && r.status < 300).length;
    const failedCount = results.length - successCount;
    const totalResponseTime = results.reduce((sum, r) => sum + (r.responseTime || 0), 0);
    const avgResponseTime = totalResponseTime / results.length;

    return {
      total: results.length,
      success: successCount,
      failed: failedCount,
      avgResponseTime: Math.round(avgResponseTime),
    };
  };

  const stats = calculateStats();

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading && !testJob ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>加载测试结果...</span>
        </div>
      ) : testJob ? (
        <>
          {/* 测试任务基本信息 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{testJob.name}</CardTitle>
              <Badge className={statusColorMap[getStatusType(testJob.status)] || 'bg-gray-500'}>
                {testJob.status === 'pending' && '等待中'}
                {testJob.status === 'running' && '运行中'}
                {testJob.status === 'completed' && '已完成'}
                {testJob.status === 'failed' && '失败'}
                {testJob.status === 'cancelled' && '已取消'}
              </Badge>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="font-medium text-gray-500">状态</dt>
                  <dd>{testJob.status}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500">进度</dt>
                  <dd>{testJob.progress || 0}%</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500">开始时间</dt>
                  <dd>{formatDateTime(testJob.startTime)}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500">结束时间</dt>
                  <dd>{formatDateTime(testJob.endTime)}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500">并发数</dt>
                  <dd>{testJob.concurrency}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* 测试结果内容标签页 */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="summary">
                结果摘要
              </TabsTrigger>
              <TabsTrigger value="results">
                详细结果
              </TabsTrigger>
            </TabsList>

            {/* 摘要标签内容 */}
            <TabsContent value="summary">
              <Card>
                <CardHeader>
                  <CardTitle>测试结果摘要</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              总请求数
                            </p>
                            <h3 className="text-2xl font-bold mt-1">
                              {stats.total}
                            </h3>
                          </div>
                          <AlertCircle className="h-8 w-8 text-blue-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              成功请求
                            </p>
                            <h3 className="text-2xl font-bold mt-1">
                              {stats.success} ({stats.total ? Math.round((stats.success / stats.total) * 100) : 0}%)
                            </h3>
                          </div>
                          <CheckCircle className="h-8 w-8 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              失败请求
                            </p>
                            <h3 className="text-2xl font-bold mt-1">
                              {stats.failed} ({stats.total ? Math.round((stats.failed / stats.total) * 100) : 0}%)
                            </h3>
                          </div>
                          <XCircle className="h-8 w-8 text-red-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              平均响应时间
                            </p>
                            <h3 className="text-2xl font-bold mt-1">
                              {stats.avgResponseTime} ms
                            </h3>
                          </div>
                          <Clock className="h-8 w-8 text-yellow-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <Button 
                      variant="outline" 
                      onClick={downloadResults}
                      disabled={stats.total === 0}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      下载测试报告
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 详细结果标签内容 */}
            <TabsContent value="results">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>详细测试结果</CardTitle>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">每页显示:</span>
                      <Select
                        value={limit.toString()}
                        onValueChange={(value) => {
                          setLimit(parseInt(value));
                          setPage(1);
                        }}
                      >
                        <SelectTrigger className="w-16">
                          <SelectValue placeholder="10" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="outline" onClick={downloadResults}>
                      <Download className="h-4 w-4 mr-2" />
                      下载
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-8 w-8 animate-spin mr-2" />
                      <span>加载测试结果...</span>
                    </div>
                  ) : results.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      暂无测试结果数据
                    </div>
                  ) : (
                    <>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-8"></TableHead>
                              <TableHead>请求</TableHead>
                              <TableHead>URL</TableHead>
                              <TableHead>方法</TableHead>
                              <TableHead>状态</TableHead>
                              <TableHead>响应时间</TableHead>
                              <TableHead>测试结果</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {results.map((result) => (
                              <React.Fragment key={result._id}>
                                <TableRow
                                  className="cursor-pointer hover:bg-secondary/20"
                                  onClick={() => toggleResultExpanded(result._id)}
                                >
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleResultExpanded(result._id);
                                      }}
                                    >
                                      {expandedResults.has(result._id) ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {result.request?.name || '未知请求'}
                                  </TableCell>
                                  <TableCell className="max-w-xs truncate">
                                    {result.url}
                                  </TableCell>
                                  <TableCell>{result.method}</TableCell>
                                  <TableCell>
                                    <Badge
                                      className={
                                        statusColorMap[getStatusType(result.status)] || 'bg-gray-500'
                                      }
                                    >
                                      {result.status} {result.statusText}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{result.responseTime || '-'} ms</TableCell>
                                  <TableCell>
                                    {result.testResults && result.testResults.length > 0 ? (
                                      <div className="flex items-center">
                                        <Badge
                                          variant={
                                            result.testResults.every((t: any) => t.passed)
                                              ? 'success'
                                              : 'destructive'
                                          }
                                          className="mr-1"
                                        >
                                          {result.testResults.filter((t: any) => t.passed).length}/
                                          {result.testResults.length}
                                        </Badge>
                                        通过
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground">无测试</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                                {expandedResults.has(result._id) && (
                                  <TableRow className="bg-secondary/10">
                                    <TableCell colSpan={7} className="p-4">
                                      <div className="space-y-4">
                                        {/* 请求详情 */}
                                        <div>
                                          <h4 className="font-medium mb-2">请求详情</h4>
                                          <div className="bg-secondary/20 p-3 rounded text-sm">
                                            <p>
                                              <span className="font-medium">URL:</span> {result.url}
                                            </p>
                                            <p>
                                              <span className="font-medium">方法:</span>{' '}
                                              {result.method}
                                            </p>
                                            {result.parameterValues && 
                                             Object.keys(result.parameterValues).length > 0 && (
                                              <div>
                                                <span className="font-medium">参数值:</span>
                                                <pre className="mt-1 bg-black/10 p-2 rounded text-xs overflow-auto">
                                                  {JSON.stringify(result.parameterValues, null, 2)}
                                                </pre>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {/* 响应详情 */}
                                        <div>
                                          <h4 className="font-medium mb-2">响应详情</h4>
                                          <div className="bg-secondary/20 p-3 rounded text-sm">
                                            <p>
                                              <span className="font-medium">状态:</span>{' '}
                                              {result.status} {result.statusText}
                                            </p>
                                            <p>
                                              <span className="font-medium">响应时间:</span>{' '}
                                              {result.responseTime} ms
                                            </p>
                                            <p>
                                              <span className="font-medium">响应大小:</span>{' '}
                                              {result.responseSize
                                                ? `${Math.round(
                                                    result.responseSize / 1024
                                                  )} KB`
                                                : '未知'}
                                            </p>
                                            {result.responseHeaders && (
                                              <Collapsible className="mt-2">
                                                <CollapsibleTrigger asChild>
                                                  <Button variant="outline" size="sm">
                                                    {expandedHeaders.includes(result._id)
                                                      ? '隐藏响应头'
                                                      : '显示响应头'}
                                                  </Button>
                                                </CollapsibleTrigger>
                                                <CollapsibleContent>
                                                  <pre className="mt-2 bg-black/10 p-2 rounded text-xs overflow-auto">
                                                    {JSON.stringify(result.responseHeaders, null, 2)}
                                                  </pre>
                                                </CollapsibleContent>
                                              </Collapsible>
                                            )}
                                            {result.responseBody && (
                                              <div className="mt-2">
                                                <h5 className="font-medium mb-1">响应体:</h5>
                                                <pre className="bg-black/10 p-2 rounded text-xs overflow-auto max-h-64">
                                                  {typeof result.responseBody === 'object'
                                                    ? JSON.stringify(result.responseBody, null, 2)
                                                    : result.responseBody}
                                                </pre>
                                              </div>
                                            )}
                                            {result.error && (
                                              <div className="mt-2">
                                                <h5 className="font-medium mb-1 text-red-500">
                                                  错误:
                                                </h5>
                                                <pre className="bg-red-50 text-red-500 p-2 rounded text-xs">
                                                  {result.error}
                                                </pre>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {/* 测试结果 */}
                                        {result.testResults && result.testResults.length > 0 && (
                                          <div>
                                            <h4 className="font-medium mb-2">测试结果</h4>
                                            <div className="space-y-2">
                                              {result.testResults.map((test: any, index: number) => (
                                                <div
                                                  key={index}
                                                  className={`p-3 rounded-md flex items-start ${
                                                    test.passed
                                                      ? 'bg-green-50 text-green-700'
                                                      : 'bg-red-50 text-red-700'
                                                  }`}
                                                >
                                                  {test.passed ? (
                                                    <CheckCircle className="h-5 w-5 mr-2 shrink-0" />
                                                  ) : (
                                                    <XCircle className="h-5 w-5 mr-2 shrink-0" />
                                                  )}
                                                  <div>
                                                    <p className="font-medium">{test.name}</p>
                                                    <p className="text-sm mt-1">{test.message}</p>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </React.Fragment>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* 分页控件 */}
                      {totalPages > 1 && (
                        <Pagination className="mt-4">
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                onClick={() => page > 1 ? setPage(Math.max(1, page - 1)) : undefined}
                                className={page === 1 ? "pointer-events-none opacity-50" : ""}
                              />
                            </PaginationItem>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                              <PaginationItem key={p}>
                                <PaginationLink
                                  onClick={() => setPage(p)}
                                  isActive={page === p}
                                >
                                  {p}
                                </PaginationLink>
                              </PaginationItem>
                            ))}
                            <PaginationItem>
                              <PaginationNext
                                onClick={() => page < totalPages ? setPage(Math.min(totalPages, page + 1)) : undefined}
                                className={page === totalPages ? "pointer-events-none opacity-50" : ""}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <div className="text-center py-10 text-muted-foreground">
          未找到测试任务信息
        </div>
      )}
    </div>
  );
}
