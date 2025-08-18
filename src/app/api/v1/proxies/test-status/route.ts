import { NextResponse } from 'next/server';

// 保存全局测试状态
// 使用可变对象，即属性可以被更新
const _testingStatus = {
  inProgress: false,
  startTime: null as number | null,
  completed: 0,
  total: 0
};

// 导出测试状态对象
export const testingStatus = _testingStatus;

// 用于外部访问和修改测试状态的函数
export function updateTestingStatus(status: Partial<typeof testingStatus>) {
  // 逐个属性更新而不是给常量赋值
  Object.assign(testingStatus, status);
  return testingStatus;
}

// 重置测试状态
export function resetTestingStatus() {
  testingStatus.inProgress = false;
  testingStatus.startTime = null;
  testingStatus.completed = 0;
  testingStatus.total = 0;
}

// 初始化测试状态
export function initTestingStatus(total: number) {
  // 逐个属性更新
  testingStatus.inProgress = true;
  testingStatus.startTime = Date.now();
  testingStatus.completed = 0;
  testingStatus.total = total;
  return testingStatus;
}

// 增加已完成测试计数
export function incrementCompleted() {
  testingStatus.completed += 1;
  if (testingStatus.completed >= testingStatus.total) {
    testingStatus.inProgress = false;
  }
}

// 配置路由为动态模式
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 获取测试状态
export async function GET() {
  try {
    return NextResponse.json({
      inProgress: testingStatus.inProgress,
      startTime: testingStatus.startTime,
      completed: testingStatus.completed,
      total: testingStatus.total,
      ...(testingStatus.startTime && testingStatus.inProgress ? {
        elapsedSeconds: Math.floor((Date.now() - testingStatus.startTime) / 1000)
      } : {})
    });
  } catch (error) {
    console.error('获取测试状态失败:', error);
    return NextResponse.json(
      { error: '获取测试状态失败' },
      { status: 500 }
    );
  }
}
