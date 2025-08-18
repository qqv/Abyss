'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Play, StopCircle, Eye, Trash2, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// 任务状态标签颜色映射
const statusColorMap: Record<string, string> = {
  pending: 'bg-yellow-500',
  running: 'bg-blue-500',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
  cancelled: 'bg-gray-500'
};

// 格式化日期时间
const formatDateTime = (dateString: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN');
};

interface TestJobListProps {
  jobs: any[];
  isLoading: boolean;
  onSelectJob: (jobId: string) => void;
  onStartJob: (jobId: string) => void;
  onCancelJob: (jobId: string) => void;
  onDeleteJob: (jobId: string) => void;
}

export default function TestJobList({
  jobs,
  isLoading,
  onSelectJob,
  onStartJob,
  onCancelJob,
  onDeleteJob
}: TestJobListProps) {
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);
  const [processingJobIds, setProcessingJobIds] = useState<Set<string>>(new Set());

  // 处理启动任务
  const handleStartJob = async (jobId: string) => {
    // 添加到处理中任务列表
    setProcessingJobIds(prev => new Set(prev).add(jobId));
    await onStartJob(jobId);
    // 从处理中任务列表移除
    setProcessingJobIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(jobId);
      return newSet;
    });
  };

  // 处理取消任务
  const handleCancelJob = async (jobId: string) => {
    // 添加到处理中任务列表
    setProcessingJobIds(prev => new Set(prev).add(jobId));
    await onCancelJob(jobId);
    // 从处理中任务列表移除
    setProcessingJobIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(jobId);
      return newSet;
    });
  };

  // 处理删除任务
  const confirmDelete = (jobId: string) => {
    setJobToDelete(jobId);
  };

  // 执行删除
  const executeDelete = async () => {
    if (jobToDelete) {
      await onDeleteJob(jobToDelete);
      setJobToDelete(null);
    }
  };

  // 取消删除
  const cancelDelete = () => {
    setJobToDelete(null);
  };

  return (
    <div>
      {jobs.length === 0 && !isLoading ? (
        <div className="text-center py-10 text-muted-foreground">
          没有找到测试任务。点击"新建测试任务"创建一个新的测试任务。
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>进度</TableHead>
                <TableHead>开始时间</TableHead>
                <TableHead>结束时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    <p className="mt-2 text-sm text-muted-foreground">加载中...</p>
                  </TableCell>
                </TableRow>
              ) : (
                jobs.map((job) => (
                  <TableRow key={job._id}>
                    <TableCell className="font-medium">{job.name}</TableCell>
                    <TableCell>
                      <Badge className={statusColorMap[job.status] || 'bg-gray-500'}>
                        {job.status === 'pending' && '等待中'}
                        {job.status === 'running' && '运行中'}
                        {job.status === 'completed' && '已完成'}
                        {job.status === 'failed' && '失败'}
                        {job.status === 'cancelled' && '已取消'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Progress value={job.progress} className="w-[100px]" />
                        <span className="text-xs">{job.progress || 0}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{formatDateTime(job.startTime)}</TableCell>
                    <TableCell>{formatDateTime(job.endTime)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        {/* 运行按钮 */}
                        {job.status !== 'running' && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleStartJob(job._id)}
                            disabled={processingJobIds.has(job._id)}
                          >
                            {processingJobIds.has(job._id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        
                        {/* 取消按钮 */}
                        {job.status === 'running' && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleCancelJob(job._id)}
                            disabled={processingJobIds.has(job._id)}
                          >
                            {processingJobIds.has(job._id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <StopCircle className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        
                        {/* 查看结果按钮 */}
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => onSelectJob(job._id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {/* 删除按钮 */}
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => confirmDelete(job._id)}
                          disabled={job.status === 'running'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 删除确认对话框 */}
      <AlertDialog open={!!jobToDelete} onOpenChange={() => !jobToDelete && setJobToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除测试任务？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将永久删除该测试任务及其所有测试结果，并且无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
