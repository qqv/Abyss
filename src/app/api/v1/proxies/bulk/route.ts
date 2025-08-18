import { NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb';
import { Proxy } from '@/models/Proxy';

// 配置路由为动态模式
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 批量导入代理
export async function POST(request: Request) {
  try {
    const { proxies } = await request.json();

    if (!Array.isArray(proxies) || proxies.length === 0) {
      return NextResponse.json({ error: '代理列表为空或格式不正确' }, { status: 400 });
    }

    await connectMongoDB();
    let success = 0;
    let failed = 0;

    // 批量处理代理
    for (const proxyData of proxies) {
      try {
        // 验证必需字段
        if (!proxyData.host || !proxyData.port || !proxyData.protocol) {
          failed++;
          continue;
        }

        // 检查是否已存在相同的代理
        const existingProxy = await Proxy.findOne({
          host: proxyData.host,
          port: proxyData.port,
          protocol: proxyData.protocol,
        });

        if (existingProxy) {
          // 如果已存在，更新而不是创建新记录
          await Proxy.updateOne(
            { _id: existingProxy._id },
            {
              $set: {
                username: proxyData.username || '',
                password: proxyData.password || '',
                updatedAt: new Date(),
              },
            }
          );
        } else {
          // 创建新代理记录
          await Proxy.create({
            host: proxyData.host,
            port: proxyData.port,
            protocol: proxyData.protocol,
            username: proxyData.username || '',
            password: proxyData.password || '',
            isActive: true,
            isValid: undefined, // 尚未测试
            lastChecked: null,
            failureCount: 0,
          });
        }
        success++;
      } catch (error) {
        console.error('添加代理失败:', error);
        failed++;
      }
    }

    return NextResponse.json({
      message: `批量导入完成: ${success}个成功, ${failed}个失败`,
      success,
      failed,
    });
  } catch (error) {
    console.error('批量导入代理失败:', error);
    return NextResponse.json({ 
      error: '服务器错误', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
