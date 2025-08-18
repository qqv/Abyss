import { NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb';
import { Environment } from '@/models/Environment';

// 配置路由为动态模式
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 获取所有参数集
export async function GET() {
  try {
    await connectMongoDB();
    
    // 从Environment集合获取数据，因为参数集本质上是环境变量的集合
    const environments = await Environment.find({}).sort({ createdAt: -1 }).lean();
    
    // 转换为参数集格式
    const parameterSets = environments.map(env => ({
      id: env._id.toString(),
      name: env.name,
      variables: env.variables || {},
      createdAt: env.createdAt
    }));
    
    return NextResponse.json(parameterSets);
  } catch (error) {
    console.error('获取参数集失败:', error);
    return NextResponse.json(
      { error: '获取参数集失败', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// 创建新参数集
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    if (!data.name) {
      return NextResponse.json(
        { error: '参数集名称不能为空' },
        { status: 400 }
      );
    }
    
    await connectMongoDB();
    
    // 创建新环境，它将作为参数集使用
    const newEnvironment = new Environment({
      name: data.name,
      variables: data.variables || {},
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await newEnvironment.save();
    
    return NextResponse.json({
      id: newEnvironment._id.toString(),
      name: newEnvironment.name,
      variables: newEnvironment.variables,
      createdAt: newEnvironment.createdAt
    }, { status: 201 });
  } catch (error) {
    console.error('创建参数集失败:', error);
    return NextResponse.json(
      { error: '创建参数集失败', details: (error as Error).message },
      { status: 500 }
    );
  }
}
