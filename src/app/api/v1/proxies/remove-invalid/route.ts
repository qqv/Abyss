import { NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb';
import { Proxy } from '@/models/Proxy';

// 配置路由为动态模式
export const dynamic = 'force-dynamic';

// 移除无效代理
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { maxFailures } = body;
    
    // 验证参数
    if (!maxFailures || maxFailures < 1) {
      return NextResponse.json(
        { error: '无效的最大失败次数参数' },
        { status: 400 }
      );
    }
    
    await connectMongoDB();
    
    // 查找符合移除条件的代理
    const proxiesToRemove = await Proxy.find({
      $or: [
        { isValid: false, failureCount: { $gte: maxFailures } },
        { isValid: false, failureCount: { $exists: false } }, // 兼容没有failureCount字段的旧数据
      ]
    });
    
    if (proxiesToRemove.length === 0) {
      return NextResponse.json({
        message: '没有需要移除的无效代理',
        removed: 0,
        remaining: await Proxy.countDocuments({})
      });
    }
    
    // 执行删除
    const deleteResult = await Proxy.deleteMany({
      _id: { $in: proxiesToRemove.map(p => p._id) }
    });
    
    const remainingCount = await Proxy.countDocuments({});
    
    console.log(`自动移除了 ${deleteResult.deletedCount} 个无效代理`);
    
    return NextResponse.json({
      message: `成功移除 ${deleteResult.deletedCount} 个无效代理`,
      removed: deleteResult.deletedCount,
      remaining: remainingCount
    });
  } catch (error) {
    console.error('移除无效代理失败:', error);
    return NextResponse.json(
      { error: '移除无效代理失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 