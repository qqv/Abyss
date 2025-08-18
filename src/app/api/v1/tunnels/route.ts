import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';

// 示例隧道数据
// const initialTunnels = [
//   {
//     _id: new ObjectId(),
//     name: "线路A",
//     proxyIds: ["proxy-1", "proxy-3"],
//     active: true,
//     taskId: "",
//     rotationType: 'sequential',
//     rotationInterval: 300,
//     maxRotations: 0,
//     validityDuration: 0,
//     maxConcurrentRequests: 10,
//     retryCount: 3,
//     createdAt: new Date(),
//     updatedAt: new Date(),
//     totalRequests: 0,
//     successfulRequests: 0,
//     currentProxyIndex: 0,
//     rotationCount: 0,
//   },
//   {
//     _id: new ObjectId(),
//     name: "线路B",
//     proxyIds: ["proxy-2", "proxy-4"],
//     active: false,
//     taskId: "",
//     rotationType: 'sequential',
//     rotationInterval: 300,
//     maxRotations: 0,
//     validityDuration: 0,
//     maxConcurrentRequests: 10,
//     retryCount: 3,
//     createdAt: new Date(),
//     updatedAt: new Date(),
//     totalRequests: 0,
//     successfulRequests: 0,
//     currentProxyIndex: 0,
//     rotationCount: 0,
//   }
// ];

// 获取所有隧道
export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const tunnels = await db.collection('tunnels').find({}).toArray();
    
    return NextResponse.json(tunnels);
  } catch (error) {
    console.error('获取隧道失败:', error);
    return NextResponse.json(
      { error: '获取隧道失败' },
      { status: 500 }
    );
  }
}

// 创建新隧道
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    const newTunnel = {
      name: data.name,
      proxyIds: data.proxyIds || [],
      active: data.active !== undefined ? data.active : false,
      taskId: data.taskId,
      rotationType: data.rotationType || 'sequential',
      rotationInterval: data.rotationInterval || 300,
      maxRotations: data.maxRotations || 0,
      validityDuration: data.validityDuration || 0,
      maxConcurrentRequests: data.maxConcurrentRequests || 10,
      retryCount: data.retryCount || 3,
      createdAt: new Date(),
      updatedAt: new Date(),
      totalRequests: 0,
      successfulRequests: 0,
      currentProxyIndex: 0,
      rotationCount: 0,
    };
    
    try {
      const { db } = await connectToDatabase();
      const result = await db.collection('tunnels').insertOne(newTunnel);
      
      // 返回创建的隧道（包含数据库生成的_id）
      const createdTunnel = { ...newTunnel, _id: result.insertedId };
      
      return NextResponse.json(createdTunnel, { status: 201 });
    } catch (dbError) {
      console.error('保存隧道到数据库失败:', dbError);
      // 数据库操作失败，但仍返回创建的隧道
      return NextResponse.json(newTunnel, { status: 201 });
    }
  } catch (error) {
    console.error('创建隧道失败:', error);
    return NextResponse.json(
      { error: '创建隧道失败' },
      { status: 500 }
    );
  }
}

// 更新隧道
export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const { id, updateActiveOnly, ...updateData } = data;
    
    if (!id) {
      return NextResponse.json(
        { error: '缺少隧道ID' },
        { status: 400 }
      );
    }
    
    const { db } = await connectToDatabase();
    
    // 根据updateActiveOnly标记决定更新字段
    const fieldsToUpdate = updateActiveOnly 
      ? { active: updateData.active, updatedAt: new Date() }
      : { ...updateData, updatedAt: new Date() };
    
    const result = await db.collection('tunnels').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: fieldsToUpdate
      }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: '隧道不存在' },
        { status: 404 }
      );
    }
    
    // 返回更新后的隧道数据
    const updatedTunnel = await db.collection('tunnels').findOne({ _id: new ObjectId(id) });
    
    return NextResponse.json(updatedTunnel);
  } catch (error) {
    console.error('更新隧道失败:', error);
    return NextResponse.json(
      { error: '更新隧道失败' },
      { status: 500 }
    );
  }
}

// 删除隧道
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: '缺少隧道ID' },
        { status: 400 }
      );
    }
    
    const { db } = await connectToDatabase();
    const result = await db.collection('tunnels').deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: '隧道不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除隧道失败:', error);
    return NextResponse.json(
      { error: '删除隧道失败' },
      { status: 500 }
    );
  }
}
