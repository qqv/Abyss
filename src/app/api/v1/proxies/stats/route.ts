import { NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb';
import { Proxy } from '@/models/Proxy';

// 配置路由为动态模式
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 获取代理池统计数据
export async function GET() {
  try {
    await connectMongoDB();
    
    // 获取所有代理
    const proxies = await Proxy.find({}).lean();
    
    // 计算统计数据
    const totalProxies = proxies.length;
    const activeProxies = proxies.filter(proxy => proxy.isActive).length;
    const validProxies = proxies.filter(proxy => proxy.isValid === true).length;
    
    // 计算平均响应时间
    const proxiesWithResponseTime = proxies.filter(proxy => 
      proxy.responseTime && proxy.responseTime > 0
    );
    const averageResponseTime = proxiesWithResponseTime.length > 0
      ? Math.round(proxiesWithResponseTime.reduce((sum, proxy) => sum + proxy.responseTime, 0) / proxiesWithResponseTime.length)
      : undefined;
    
    // 获取最后一次轮换时间（这里可以从日志或配置中获取，目前返回undefined）
    const lastRotation = undefined;
    
    const stats = {
      totalProxies,
      activeProxies,
      validProxies,
      averageResponseTime,
      lastRotation
    };
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('获取代理池统计失败:', error);
    return NextResponse.json(
      { error: '获取代理池统计失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
