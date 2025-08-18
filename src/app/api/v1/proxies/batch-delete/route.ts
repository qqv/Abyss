import { NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb';
import { Proxy } from '@/models/Proxy';
import mongoose from 'mongoose';

// 配置路由为动态模式
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 批量删除代理
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { ids } = body;
    
    // 验证ids是否为数组
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: '无效的请求，ids必须是非空数组' },
        { status: 400 }
      );
    }
    
    // 过滤无效的ObjectId
    const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
    const invalidCount = ids.length - validIds.length;
    
    if (validIds.length === 0) {
      return NextResponse.json(
        { error: '所有ID格式均无效' },
        { status: 400 }
      );
    }
    
    await connectMongoDB();
    
    // 使用deleteMany批量删除
    const result = await Proxy.deleteMany({ _id: { $in: validIds } });
    
    console.log(`批量删除代理结果: ${result.deletedCount}/${validIds.length} 个代理已删除`);
    
    return NextResponse.json({
      message: `成功删除 ${result.deletedCount} 个代理`,
      deletedCount: result.deletedCount,
      invalidCount: invalidCount,
      totalRequested: ids.length
    });
  } catch (error) {
    console.error('批量删除代理失败:', error);
    return NextResponse.json(
      { error: '批量删除代理失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
