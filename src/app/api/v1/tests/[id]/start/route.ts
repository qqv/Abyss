import { NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb';
import { TestJob } from '@/models/TestJob';
import { Collection } from '@/models/Collection';

// 配置路由为动态模式
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 启动测试任务
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    await connectMongoDB();
    
    // 获取测试任务
    const testJob = await TestJob.findById(id);
    if (!testJob) {
      return NextResponse.json(
        { error: '未找到测试任务' },
        { status: 404 }
      );
    }
    
    // 检查任务是否已在运行
    if (testJob.status === 'running') {
      return NextResponse.json(
        { error: '测试任务已在运行中' },
        { status: 400 }
      );
    }
    
    // 验证所需的集合存在
    const collection = await Collection.findById(testJob.collectionId);
    if (!collection) {
      return NextResponse.json(
        { error: '未找到关联的API集合' },
        { status: 404 }
      );
    }
    
    // 注意：环境变量功能已被弃用，移除相关检查代码
    // 如果任务中存在环境ID，只记录一个日志即可
    if (testJob.environmentId) {
      console.log(`测试任务 ${id} 输入了环境ID ${testJob.environmentId}，但环境变量功能已弃用`);
      // 清空环境ID防止后续引用
      testJob.environmentId = undefined;
    }
    
    // 更新任务状态为运行中
    testJob.status = 'running';
    testJob.progress = 0;
    testJob.startTime = new Date();
    testJob.endTime = undefined;
    testJob.updatedAt = new Date();
    
    await testJob.save();
    
    // 这里可以启动一个后台任务来执行测试
    // 在实际应用中，你可能会使用消息队列或异步任务处理
    // 为了演示，我们使用一个简单的模拟执行过程
    simulateTestExecution(id);
    
    return NextResponse.json({
      message: '测试任务已成功启动',
      job: testJob
    });
  } catch (error) {
    console.error(`启动测试任务 ${params.id} 失败:`, error);
    return NextResponse.json(
      { error: '启动测试任务失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// 模拟测试执行过程
// 注意：这是一个简化的模拟，实际应用中应该使用更健壮的异步任务处理机制
async function simulateTestExecution(jobId: string) {
  try {
    const totalSteps = 5;
    
    // 模拟测试进度更新
    for (let step = 1; step <= totalSteps; step++) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 每步等待2秒
      
      // 计算进度百分比
      const progress = Math.floor((step / totalSteps) * 100);
      
      // 更新任务进度
      await TestJob.findByIdAndUpdate(jobId, {
        progress,
        updatedAt: new Date(),
        // 模拟添加测试结果
        $push: {
          results: {
            requestId: `req-${Math.floor(Math.random() * 1000)}`,
            status: Math.random() > 0.2 ? 'success' : 'failed', // 80%成功率
            statusCode: 200,
            responseTime: Math.floor(Math.random() * 500 + 100),
            responseSize: Math.floor(Math.random() * 10000),
            timestamp: new Date()
          }
        }
      });
    }
    
    // 测试完成，更新状态
    await TestJob.findByIdAndUpdate(jobId, {
      status: 'completed',
      progress: 100,
      endTime: new Date(),
      updatedAt: new Date()
    });
    
  } catch (error) {
    console.error(`执行测试任务 ${jobId} 过程中出错:`, error);
    
    // 更新为失败状态
    await TestJob.findByIdAndUpdate(jobId, {
      status: 'failed',
      endTime: new Date(),
      updatedAt: new Date()
    });
  }
}
