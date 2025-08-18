import { NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb';
import { TestJob } from '@/models/TestJob';

// 配置路由为动态模式
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 取消测试任务
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
    
    // 检查任务是否可取消（只有pending或running状态的任务可取消）
    if (!['pending', 'running'].includes(testJob.status)) {
      return NextResponse.json(
        { error: `无法取消状态为 ${testJob.status} 的测试任务` },
        { status: 400 }
      );
    }
    
    // 更新任务状态为已取消
    testJob.status = 'cancelled';
    testJob.endTime = new Date();
    testJob.updatedAt = new Date();
    
    await testJob.save();
    
    return NextResponse.json({
      message: '测试任务已成功取消',
      job: testJob
    });
  } catch (error) {
    console.error(`取消测试任务 ${params.id} 失败:`, error);
    return NextResponse.json(
      { error: '取消测试任务失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
