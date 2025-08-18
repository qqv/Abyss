import { NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb';
import { TestJob } from '@/models/TestJob';

// 配置路由为动态模式
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 获取单个测试任务详情
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    await connectMongoDB();
    const testJob = await TestJob.findById(id).lean();
    
    if (!testJob) {
      return NextResponse.json(
        { error: '未找到测试任务' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(testJob);
  } catch (error) {
    console.error(`获取测试任务 ${params.id} 失败:`, error);
    return NextResponse.json(
      { error: '获取测试任务失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// 更新测试任务状态
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    await connectMongoDB();
    
    const testJob = await TestJob.findById(id);
    if (!testJob) {
      return NextResponse.json(
        { error: '未找到测试任务' },
        { status: 404 }
      );
    }
    
    // 根据请求更新不同的字段
    if (body.status) {
      testJob.status = body.status;
      
      // 如果开始运行，设置开始时间
      if (body.status === 'running' && !testJob.startTime) {
        testJob.startTime = new Date();
      }
      
      // 如果完成或失败，设置结束时间
      if (['completed', 'failed', 'cancelled'].includes(body.status) && !testJob.endTime) {
        testJob.endTime = new Date();
      }
    }
    
    if (typeof body.progress === 'number') {
      testJob.progress = body.progress;
    }
    
    if (body.results) {
      testJob.results = [...(testJob.results || []), ...body.results];
    }
    
    testJob.updatedAt = new Date();
    await testJob.save();
    
    return NextResponse.json(testJob);
  } catch (error) {
    console.error(`更新测试任务 ${params.id} 失败:`, error);
    return NextResponse.json(
      { error: '更新测试任务失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// 删除测试任务
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    await connectMongoDB();
    const testJob = await TestJob.findByIdAndDelete(id);
    
    if (!testJob) {
      return NextResponse.json(
        { error: '未找到测试任务' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { message: '测试任务已删除成功' },
      { status: 200 }
    );
  } catch (error) {
    console.error(`删除测试任务 ${params.id} 失败:`, error);
    return NextResponse.json(
      { error: '删除测试任务失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
