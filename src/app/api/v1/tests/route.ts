import { NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb';
import { TestJob } from '@/models/TestJob';
import { LogMiddleware } from '@/lib/log-middleware';

// 配置路由为动态模式
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 获取所有测试任务
export async function GET() {
  try {
    await connectMongoDB();
    const testJobs = await TestJob.find({}).sort({ createdAt: -1 }).lean();
    
    // 记录获取日志
    await LogMiddleware.logInfo('api', `获取集合运行历史成功，共 ${testJobs.length} 条记录`, {
      action: 'list_test_jobs',
      count: testJobs.length,
      endpoint: '/api/v1/tests'
    });
    
    return NextResponse.json(testJobs);
  } catch (error) {
    // 记录错误日志
    await LogMiddleware.logError('api', error as Error, {
      action: 'list_test_jobs',
      endpoint: '/api/v1/tests'
    });
    
    console.error('获取测试任务失败:', error);
    return NextResponse.json(
      { error: '获取测试任务失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// 创建新测试任务（集合运行结果）
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 验证必要字段
    if (!body.name || !body.collectionId) {
      await LogMiddleware.logWarning('api', '创建集合运行任务失败：缺少必要字段', {
        action: 'create_test_job',
        error: '缺少必要字段：name, collectionId',
        provided_fields: Object.keys(body)
      });
      
      return NextResponse.json(
        { error: '缺少必要字段：name, collectionId' },
        { status: 400 }
      );
    }
    
    await connectMongoDB();
    
    // 创建测试任务
    const testJob = new TestJob({
      name: body.name,
      description: body.description || '',
      collectionId: body.collectionId,
      collectionName: body.collectionName || '',
      
      // 运行选项
      options: {
        concurrency: body.options?.concurrency || 1,
        useProxy: body.options?.useProxy || false,
        selectedTunnelId: body.options?.selectedTunnelId,
        selectedRequests: body.options?.selectedRequests || [],
        variableFiles: body.options?.variableFiles || [],
        timeoutSeconds: body.options?.timeoutSeconds || 30,
        maxRetries: body.options?.maxRetries || 1,
        retryDelayMs: body.options?.retryDelayMs || 500,
        retryStatusCodes: body.options?.retryStatusCodes || [429]
      },
      
      status: body.status || 'pending',
      progress: body.progress || 0,
      
      // 统计信息
      totalRequests: body.totalRequests || 0,
      successCount: body.successCount || 0,
      failedCount: body.failedCount || 0,
      
      startTime: body.startTime ? new Date(body.startTime) : undefined,
      endTime: body.endTime ? new Date(body.endTime) : undefined,
      duration: body.duration || 0,
      
      results: body.results || [],
      
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await testJob.save();
    
    // 记录成功日志
    await LogMiddleware.logInfo('api', `集合运行任务创建成功：${body.name}`, {
      action: 'create_test_job',
      job_id: testJob._id,
      collection_id: body.collectionId,
      collection_name: body.collectionName,
      total_requests: body.totalRequests || 0,
      success_count: body.successCount || 0,
      failed_count: body.failedCount || 0,
      duration: body.duration || 0,
      status: body.status || 'pending'
    });
    
    return NextResponse.json(testJob, { status: 201 });
  } catch (error) {
    // 记录错误日志
    await LogMiddleware.logError('api', error as Error, {
      action: 'create_test_job',
      endpoint: '/api/v1/tests',
      collection_id: body?.collectionId,
      collection_name: body?.collectionName
    });
    
    console.error('创建测试任务失败:', error);
    return NextResponse.json(
      { error: '创建测试任务失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
