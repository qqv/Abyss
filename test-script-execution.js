// 测试脚本执行验证
async function testScriptExecution() {
  try {
    // 动态导入测试执行服务
    const { executeTestScripts } = await import('./src/components/services/test-execution-service.js');
    
    // 模拟测试数据
    const testScripts = [{
      name: '状态码测试',
      script: 'pm.test("状态码是200", function() { pm.response.to.have.status(200); });',
      enabled: true
    }];

    const mockResponse = {
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      data: { message: 'success' }
    };

    console.log('开始测试脚本执行...');
    const results = await executeTestScripts(testScripts, mockResponse);
    console.log('测试结果:', results);
    console.log('测试', results.length > 0 && results[0].passed ? '通过' : '失败');
  } catch (error) {
    console.error('测试执行失败:', error);
  }
}

testScriptExecution();
