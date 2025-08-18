"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiResult, ApiScanJob } from "@/lib/api-data";
import { fetchApiJobs, fetchApiJob } from "./services/job-service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  Clock, 
  Download, 
  Eye, 
  Filter, 
  RefreshCw, 
  XCircle 
} from "@/components/ui/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";

interface ScanResultsViewProps {
  jobId?: string;
  jobs?: ApiScanJob[];
  onSelectJob?: (jobId: string) => void;
}

export default function ScanResultsView({ jobId, jobs: initialJobs, onSelectJob }: ScanResultsViewProps): JSX.Element {
  const [jobs, setJobs] = useState<ApiScanJob[]>(initialJobs || []);
  const [loading, setLoading] = useState<boolean>(!initialJobs);
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>(jobId);
  const [filter, setFilter] = useState<"all" | "success" | "failed" | "network-errors" | "test-passed" | "test-failed">("all");
  const [sortBy, setSortBy] = useState<"execution-order" | "response-time" | "status-code" | "test-results">("execution-order");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<ApiResult | null>(null);
  
  // 如果没有提供初始作业数据，则从API获取数据
  useEffect(() => {
    if (!initialJobs) {
      const loadJobs = async () => {
        setLoading(true);
        try {
          const apiJobs = await fetchApiJobs();
          setJobs(apiJobs);
          
          // 如果有jobId但没有选中任何作业，自动选择该作业
          if (jobId && !selectedJobId) {
            setSelectedJobId(jobId);
          } else if (!selectedJobId && apiJobs.length > 0 && apiJobs[0].id) {
            // 如果没有选中任何作业且有作业数据，选择第一个作业
            // 确保id存在再设置
            setSelectedJobId(apiJobs[0].id);
            if (onSelectJob && apiJobs[0].id) onSelectJob(apiJobs[0].id);
          }
        } catch (error) {
          console.error('加载API测试作业失败:', error);
        } finally {
          setLoading(false);
        }
      };
      
      loadJobs();
    }
  }, [initialJobs, jobId, selectedJobId, onSelectJob]);
  
  // 处理作业选择变更
  const handleSelectJob = (id: string) => {
    setSelectedJobId(id);
    if (onSelectJob) {
      onSelectJob(id);
    }
  };

  // 当选择的任务ID变更时调用回调
  useEffect(() => {
    if (selectedJobId && onSelectJob) {
      onSelectJob(selectedJobId);
    }
  }, [selectedJobId, onSelectJob]);

  // 获取当前选择的任务
  const selectedJob = useMemo(() => {
    return jobs.find(job => job.id === selectedJobId) || jobs[0];
  }, [jobs, selectedJobId]);

  // 根据筛选条件过滤和排序结果
  const filteredAndSortedResults = useMemo(() => {
    if (!selectedJob) return [];
    
    console.log(`🔍 应用过滤和排序: 过滤条件="${filter}", 排序方式="${sortBy} ${sortDirection}", 原始结果数=${selectedJob.results.length}`);
    
    // 首先过滤
    let filtered = selectedJob.results.filter(result => {
      if (filter === "all") return true;
      
      // HTTP状态码过滤
      const isHttpSuccess = result.status >= 200 && result.status < 300;
      if (filter === "success") return isHttpSuccess;
      if (filter === "failed") return !isHttpSuccess;
      
      // 网络错误过滤
      if (filter === "network-errors") return result.isNetworkError === true || result.status === 0;
      
      // 测试结果过滤
      const hasTests = result.testResults && result.testResults.length > 0;
      if (filter === "test-passed") {
        return hasTests && result.testResults!.every(test => test.passed);
      }
      if (filter === "test-failed") {
        return hasTests && !result.testResults!.every(test => test.passed);
      }
      
      return true;
    });
    
    // 然后排序
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case "response-time":
          aValue = a.responseTime;
          bValue = b.responseTime;
          break;
        case "status-code":
          aValue = a.status;
          bValue = b.status;
          break;
        case "test-results":
          // 测试通过的排在前面，然后按通过的测试数量排序
          const aTestsPassed = a.testResults?.filter(t => t.passed).length || 0;
          const bTestsPassed = b.testResults?.filter(t => t.passed).length || 0;
          const aTotalTests = a.testResults?.length || 0;
          const bTotalTests = b.testResults?.length || 0;
          
          // 首先按是否全部测试通过排序
          const aAllPassed = aTotalTests > 0 && aTestsPassed === aTotalTests;
          const bAllPassed = bTotalTests > 0 && bTestsPassed === bTotalTests;
          
          if (aAllPassed !== bAllPassed) {
            return bAllPassed ? 1 : -1; // 全部通过的排在前面
          }
          
          // 然后按通过率排序
          const aPassRate = aTotalTests > 0 ? aTestsPassed / aTotalTests : 0;
          const bPassRate = bTotalTests > 0 ? bTestsPassed / bTotalTests : 0;
          aValue = aPassRate;
          bValue = bPassRate;
          break;
        case "execution-order":
        default:
          // 按时间戳排序（执行顺序）
          aValue = new Date(a.timestamp).getTime();
          bValue = new Date(b.timestamp).getTime();
          break;
      }
      
      // 处理数值比较
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }
      
      // 处理字符串比较
      const aStr = String(aValue || '');
      const bStr = String(bValue || '');
      const comparison = aStr.localeCompare(bStr);
      return sortDirection === "asc" ? comparison : -comparison;
    });
    
    console.log(`✅ 过滤和排序完成: 过滤后=${filtered.length}个结果`, {
      firstResult: filtered[0] ? {
        id: filtered[0].requestId,
        timestamp: filtered[0].timestamp,
        responseTime: filtered[0].responseTime,
        status: filtered[0].status
      } : null,
      lastResult: filtered[filtered.length - 1] ? {
        id: filtered[filtered.length - 1].requestId,
        timestamp: filtered[filtered.length - 1].timestamp,
        responseTime: filtered[filtered.length - 1].responseTime,
        status: filtered[filtered.length - 1].status
      } : null
    });
    
    return filtered;
  }, [selectedJob, filter, sortBy, sortDirection]);

  // 处理查看结果详情
  const handleViewResult = (result: ApiResult) => {
    setSelectedResult(result);
    setIsResultDialogOpen(true);
  };

  // 导出结果为CSV
  const handleExportCsv = () => {
    if (!selectedJob) return;
    
    const headers = ["参数", "状态码", "响应时间(ms)", "测试结果", "时间戳"];
    const rows = selectedJob.results.map(result => {
      const paramValues = Object.entries(result.parameterValues || {})
        .map(([key, value]) => `${key}=${value}`)
        .join(", ");
      
      const testStatus = result.testResults?.every(test => test.passed)
        ? "通过"
        : "失败";
      
      return [
        paramValues,
        result.status.toString(),
        result.responseTime.toString(),
        testStatus,
        new Date(result.timestamp).toLocaleString()
      ];
    });
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    link.setAttribute("href", url);
    link.setAttribute("download", `${selectedJob.name}-results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 space-y-4">
      {/* 任务列表 */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {jobs.map((job) => (
          <Card 
            key={job.id}
            className={`cursor-pointer min-w-[200px] ${selectedJobId === job.id ? 'border-primary' : ''}`}
            onClick={() => setSelectedJobId(job.id)}
          >
            <CardHeader className="p-3">
              <CardTitle className="text-sm">{job.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{job.results.length} 个结果</span>
                <Badge 
                  variant={job.status === 'completed' ? 'success' : (
                    job.status === 'running' ? 'default' : 'secondary'
                  )}
                >
                  {job.status === 'completed' ? '已完成' : (
                    job.status === 'running' ? '运行中' : '等待中'
                  )}
                </Badge>
              </div>
              {job.status === 'running' && (
                <Progress value={job.progress} className="h-1 mt-2" />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedJob && (
        <Card>
          <CardHeader className="pb-0">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{selectedJob.name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  显示 {filteredAndSortedResults.length} / {selectedJob.results.length} 个结果
                  {filter !== "all" && ` • 筛选: ${
                    filter === "success" ? "HTTP成功" :
                    filter === "failed" ? "HTTP失败" :
                    filter === "network-errors" ? "网络错误" :
                    filter === "test-passed" ? "测试通过" :
                    filter === "test-failed" ? "测试失败" : filter
                  }`}
                  {sortBy !== "execution-order" && ` • 排序: ${
                    sortBy === "response-time" ? "响应时间" :
                    sortBy === "status-code" ? "状态码" :
                    sortBy === "test-results" ? "测试结果" : sortBy
                  } ${sortDirection === "asc" ? "升序" : "降序"}`}
                </p>
              </div>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      筛选
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setFilter("all")}>
                      全部结果
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilter("success")}>
                      HTTP成功 (2xx)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilter("failed")}>
                      HTTP失败 (非2xx)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilter("network-errors")}>
                      网络错误
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilter("test-passed")}>
                      测试通过
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilter("test-failed")}>
                      测试失败
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant={sortBy !== "execution-order" ? "default" : "outline"} 
                      size="sm"
                      className={sortBy !== "execution-order" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      排序: {
                        sortBy === "execution-order" ? "执行顺序" :
                        sortBy === "response-time" ? "响应时间" :
                        sortBy === "status-code" ? "状态码" :
                        "测试结果"
                      } {sortDirection === "asc" ? "🔼" : "🔽"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => {setSortBy("execution-order"); setSortDirection("asc");}}>
                      执行顺序 ↑
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {setSortBy("execution-order"); setSortDirection("desc");}}>
                      执行顺序 ↓
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {setSortBy("response-time"); setSortDirection("asc");}}>
                      响应时间 ↑
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {setSortBy("response-time"); setSortDirection("desc");}}>
                      响应时间 ↓
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {setSortBy("status-code"); setSortDirection("asc");}}>
                      状态码 ↑
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {setSortBy("status-code"); setSortDirection("desc");}}>
                      状态码 ↓
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {setSortBy("test-results"); setSortDirection("desc");}}>
                      测试通过率 ↓
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {setSortBy("test-results"); setSortDirection("asc");}}>
                      测试通过率 ↑
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button variant="outline" size="sm" onClick={handleExportCsv}>
                  <Download className="h-4 w-4 mr-2" />
                  导出CSV
                </Button>
                
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  刷新
                </Button>
              </div>
            </div>
            
            <div className="flex gap-4 text-sm text-gray-500 mt-2">
              <div>总请求: {selectedJob.results.length}</div>
              <div>
                开始时间: {selectedJob.startTime 
                  ? format(new Date(selectedJob.startTime), "yyyy-MM-dd HH:mm:ss") 
                  : "-"
                }
              </div>
              <div>
                结束时间: {selectedJob.endTime 
                  ? format(new Date(selectedJob.endTime), "yyyy-MM-dd HH:mm:ss") 
                  : "-"
                }
              </div>
              <div>
                耗时: {selectedJob.startTime && selectedJob.endTime 
                  ? `${Math.round((new Date(selectedJob.endTime).getTime() - new Date(selectedJob.startTime).getTime()) / 1000)}秒` 
                  : "-"
                }
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">总体状态</TableHead>
                  <TableHead>参数值</TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => {
                    if (sortBy === "status-code") {
                      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                    } else {
                      setSortBy("status-code");
                      setSortDirection("asc");
                    }
                  }}>
                    HTTP状态 {sortBy === "status-code" && (sortDirection === "asc" ? "🔼" : "🔽")}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => {
                    if (sortBy === "response-time") {
                      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                    } else {
                      setSortBy("response-time");
                      setSortDirection("asc");
                    }
                  }}>
                    响应时间 {sortBy === "response-time" && (sortDirection === "asc" ? "🔼" : "🔽")}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => {
                    if (sortBy === "test-results") {
                      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                    } else {
                      setSortBy("test-results");
                      setSortDirection("desc"); // 测试结果默认降序（通过的在前）
                    }
                  }}>
                    脚本测试 {sortBy === "test-results" && (sortDirection === "asc" ? "🔼" : "🔽")}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => {
                    if (sortBy === "execution-order") {
                      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                    } else {
                      setSortBy("execution-order");
                      setSortDirection("asc");
                    }
                  }}>
                    时间戳 {sortBy === "execution-order" && (sortDirection === "asc" ? "🔼" : "🔽")}
                  </TableHead>
                  <TableHead className="w-20 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedResults.map((result: ApiResult, index: number) => {
                  const isPassed = result.testResults?.every((test: any) => test.passed) ?? false;
                  const isHttpSuccess = result.status >= 200 && result.status < 300;
                  const hasTests = result.testResults && result.testResults.length > 0;
                  
                  return (
                    <TableRow key={`${result.requestId}-${index}`}>
                      <TableCell>
                        {isPassed && isHttpSuccess
                          ? <CheckCircle className="h-5 w-5 text-green-500" /> 
                          : <XCircle className="h-5 w-5 text-red-500" />
                        }
                      </TableCell>
                      <TableCell className="font-mono">
                        {Object.entries(result.parameterValues || {}).map(([key, value]) => (
                          <div key={key}>
                            <span className="text-gray-500">{key}:</span> {value}
                          </div>
                        ))}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {result.isNetworkError ? (
                            <XCircle className="h-4 w-4 text-orange-500" />
                          ) : isHttpSuccess ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <Badge 
                            variant={
                              result.isNetworkError ? "secondary" : 
                              isHttpSuccess ? "default" : "destructive"
                            }
                            className={result.isNetworkError ? "bg-orange-100 text-orange-800 border-orange-300" : ""}
                          >
                            {result.status} {result.statusText}
                          </Badge>
                                                     {result.isNetworkError && (
                             <span className="text-xs text-orange-600" title={result.error || "网络连接错误"}>
                               网络错误
                             </span>
                           )}
                        </div>
                      </TableCell>
                      <TableCell>{result.responseTime}ms</TableCell>
                      <TableCell>
                        {hasTests ? (
                          <div className="space-y-1">
                            {result.testResults?.map((test: any, i: number) => (
                              <div key={i} className="flex items-center space-x-1">
                                {test.passed 
                                  ? <CheckCircle className="h-3 w-3 text-green-500" /> 
                                  : <XCircle className="h-3 w-3 text-red-500" />
                                }
                                <span className="text-xs truncate max-w-32" title={test.name}>
                                  {test.name}
                                </span>
                                {test.error && (
                                  <span className="text-xs text-red-500 truncate max-w-24" title={test.error}>
                                    ({test.error})
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">无测试脚本</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1 text-gray-500" />
                          <span className="text-xs">
                            {format(new Date(result.timestamp), "yyyy-MM-dd HH:mm:ss")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewResult(result)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 结果详情对话框 */}
      <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>请求结果详情</DialogTitle>
          </DialogHeader>
          
          {selectedResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm">请求信息</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">状态码:</span> 
                        <Badge 
                          className={`ml-2 ${selectedResult.isNetworkError ? "bg-orange-100 text-orange-800 border-orange-300" : ""}`}
                          variant={selectedResult.isNetworkError ? "secondary" : "default"}
                        >
                          {selectedResult.status} {selectedResult.statusText}
                        </Badge>
                        {selectedResult.isNetworkError && (
                          <span className="ml-2 text-xs text-orange-600">
                            (网络连接错误)
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="font-medium">响应时间:</span> 
                        <span className="ml-2">{selectedResult.responseTime}ms</span>
                      </div>
                      <div>
                        <span className="font-medium">响应大小:</span> 
                        <span className="ml-2">{(selectedResult.responseSize / 1024).toFixed(2)}KB</span>
                      </div>
                      <div>
                        <span className="font-medium">时间戳:</span> 
                        <span className="ml-2">
                          {format(new Date(selectedResult.timestamp), "yyyy-MM-dd HH:mm:ss")}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm">参数值</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="space-y-2 text-sm">
                      {Object.entries(selectedResult.parameterValues || {}).map(([key, value]) => (
                        <div key={key}>
                          <span className="font-medium">{key}:</span> 
                          <span className="ml-2 font-mono">{value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm">测试结果</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="space-y-2 text-sm">
                      {selectedResult.testResults?.map((test, index) => (
                        <div key={index} className="flex items-start">
                          {test.passed 
                            ? <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" /> 
                            : <XCircle className="h-4 w-4 text-red-500 mr-2 mt-0.5" />
                          }
                          <div>
                            <div className="font-medium">{test.name}</div>
                            {test.error && (
                              <div className="text-red-500 text-xs mt-1">{test.error}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader className="p-3">
                  <CardTitle className="text-sm">响应头</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(selectedResult.responseHeaders).map(([key, value]) => (
                      <div key={key}>
                        <span className="font-medium">{key}:</span> 
                        <span className="ml-2 font-mono truncate">{value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="p-3">
                  <CardTitle className="text-sm">响应体</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-xs font-mono whitespace-pre-wrap overflow-auto max-h-96">
                    {selectedResult.responseBody}
                  </pre>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
