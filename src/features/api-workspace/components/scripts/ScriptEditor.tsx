"use client";

import { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ChevronDown, ChevronUp, Code, Play, Info, Plus, Trash, Check, HelpCircle } from "lucide-react";
import { RequestTest, RequestPreScript } from "@/lib/api-data";
import { useTranslation } from "react-i18next";

interface ScriptEditorProps {
  preRequest?: RequestPreScript;
  tests?: RequestTest[];
  onPreRequestChange: (preRequest: RequestPreScript) => void;
  onTestsChange: (tests: RequestTest[]) => void;
}

export function ScriptEditor({
  preRequest = { script: "", enabled: false },
  tests = [],
  onPreRequestChange,
  onTestsChange
}: ScriptEditorProps) {
  const { t } = useTranslation('common');
  const [activeTab, setActiveTab] = useState("pre-request");
  const [preRequestHelpOpen, setPreRequestHelpOpen] = useState(false);
  const [testHelpOpen, setTestHelpOpen] = useState(false);

  // 预请求脚本变更处理
  const handlePreRequestScriptChange = (script: string) => {
    onPreRequestChange({
      ...preRequest,
      script
    });
  };

  // 预请求脚本启用/禁用处理
  const handlePreRequestEnabledChange = (enabled: boolean) => {
    onPreRequestChange({
      ...preRequest,
      enabled
    });
  };

  // 从脚本中提取测试名称
  const extractTestName = (script: string): string => {
    try {
      // 检查脚本是否包含pm.test调用
      if (!script || typeof script !== 'string' || !script.includes('pm.test(')) {
        return t('apiTesting.request.tests.autoName', { n: tests.length + 1, defaultValue: `测试 ${tests.length + 1}` });
      }
      
      console.log('开始从脚本中提取测试名称:', script.substring(0, 50) + '...');
      
      // 增强的正则表达式，定位第一个pm.test调用中的名称
      // 这个正则表达式更为精确，处理多种引号和内嵌引号的情况
      const regex = /pm\s*\.\s*test\s*\(\s*(["'])([^\\'"]*)\1\s*,/;
      const match = script.match(regex);
      
      if (match && match[2]) {
        const extractedName = match[2].trim();
        console.log('成功提取到测试名称:', extractedName);
        return extractedName;
      }
      
      // 如果上面的正则匹配失败，尝试直接解析字符串
      let scriptLines = script.split('\n');
      for (let line of scriptLines) {
        if (line.includes('pm.test(')) {
          const startIndex = line.indexOf('pm.test(') + 8; // 8 = 'pm.test('.length
          const quoteChar = line.charAt(startIndex); // 获取引号类型 (' 或 ")
          
          if (quoteChar === '"' || quoteChar === '\'') {
            const endIndex = line.indexOf(quoteChar, startIndex + 1);
            if (endIndex > startIndex) {
              const name = line.substring(startIndex + 1, endIndex);
              console.log('使用备用方法提取到测试名称:', name);
              return name;
            }
          }
        }
      }
    } catch (error) {
      console.error('从测试脚本中提取名称失败:', error);
    }
    
    // 如果所有提取方法都失败，返回默认名称
    return t('apiTesting.request.tests.autoName', { n: tests.length + 1, defaultValue: `测试 ${tests.length + 1}` });
  };
  
  // 检查并修正现有测试的名称
  useEffect(() => {
    // 检查是否有测试需要名称修正
    // 更广泛的检测条件，包括名称中包含脚本片段或者编程结构
    const needsCorrection = tests.some(test => 
      // 名称中包含脚本片段
      (test.name.includes('pm.test(') || test.name.includes('function(') || 
       test.name.includes('pm.expect(') || test.name.includes('pm.response') ||
       // 名称过长
       test.name.length > 30 ||
       // 名称与脚本开头部分相同
       (test.script && test.script.startsWith(test.name))));
    
    if (needsCorrection || tests.some(test => test.script && !test.name)) {
      console.log('发现需要修正的测试名称');
      
      const correctedTests = tests.map(test => {
        // 如果名称看起来是脚本或空白，尝试从脚本中提取
        if (!test.name || test.name.includes('pm.') || test.name.length > 30) {
          const extractedName = extractTestName(test.script);
          if (extractedName && extractedName !== `测试 ${tests.length + 1}`) {
            return {
              ...test,
              name: extractedName
            };
          }
        }
        return test;
      });
      
      if (JSON.stringify(correctedTests) !== JSON.stringify(tests)) {
        console.log('应用修正后的测试名称');
        onTestsChange(correctedTests);
      }
    }
  }, [tests]); // 注意依赖项改为tests数组，这样在测试发生变化时也能执行

  // 添加新测试
  const addTest = () => {
    const testScript = "// " + t('workspace.script.examples.writeHere', '在此编写测试代码') + "\npm.test(\"" + t('workspace.script.examples.statusCheck', '状态码检查') + "\", function() {\n    pm.response.to.have.status(200);\n});";
    const newTest: RequestTest = {
      name: t('workspace.script.examples.statusCheck', '状态码检查'),
      script: testScript,
      enabled: true
    };
    onTestsChange([...tests, newTest]);
  };

  // 删除测试
  const removeTest = (index: number) => {
    const updatedTests = [...tests];
    updatedTests.splice(index, 1);
    onTestsChange(updatedTests);
  };

  // 更新测试名称
  const updateTestName = (index: number, name: string) => {
    const updatedTests = [...tests];
    updatedTests[index] = {
      ...updatedTests[index],
      name
    };
    onTestsChange(updatedTests);
  };

  // 更新测试脚本
  const updateTestScript = (index: number, script: string) => {
    const updatedTests = [...tests];
    // 从新脚本中提取测试名称
    const nameFromScript = extractTestName(script);
    
    updatedTests[index] = {
      ...updatedTests[index],
      script,
      // 如果脚本变化了，则同步更新测试名称
      name: nameFromScript
    };
    onTestsChange(updatedTests);
  };

  // 更新测试启用状态
  const updateTestEnabled = (index: number, enabled: boolean) => {
    const updatedTests = [...tests];
    updatedTests[index] = {
      ...updatedTests[index],
      enabled
    };
    onTestsChange(updatedTests);
  };

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pre-request">{t('workspace.script.tabs.preRequest', '预请求脚本')}</TabsTrigger>
          <TabsTrigger value="tests">{t('workspace.script.tabs.tests', '测试脚本')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pre-request" className="space-y-4 mt-0 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                checked={preRequest.enabled}
                onCheckedChange={handlePreRequestEnabledChange}
                id="pre-request-enabled"
              />
              <Label htmlFor="pre-request-enabled">{t('workspace.script.pre.enable', '启用预请求脚本')}</Label>
            </div>
            <Dialog open={preRequestHelpOpen} onOpenChange={setPreRequestHelpOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <HelpCircle className="h-4 w-4 mr-1" />
                  {t('workspace.script.help', '帮助')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t('workspace.script.pre.helpTitle', '预请求脚本帮助')}</DialogTitle>
                  <DialogDescription>
                    {t('workspace.script.pre.helpDesc', '预请求脚本在请求发送前执行，可用于动态设置请求参数和执行认证流程')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <p>{t('workspace.script.pre.usageTitle', '预请求脚本在请求发送前执行，可用于：')}</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>{t('workspace.script.pre.usage.item1', '动态设置请求参数、头部或请求体')}</li>
                      <li>{t('workspace.script.pre.usage.item2', '生成随机数据或时间戳')}</li>
                      <li>{t('workspace.script.pre.usage.item3', '执行复杂的认证流程')}</li>
                      <li>{t('workspace.script.pre.usage.item4', '从其他请求中提取数据')}</li>
                    </ul>
                    <p className="font-medium mt-4">{t('workspace.script.commonApi', '常用API:')}</p>
                    <div className="bg-muted rounded-md p-3 space-y-2 text-xs font-mono">
                      <div><strong>pm.variables.set(key, value)</strong> - {t('workspace.script.api.setVar', '设置变量')}</div>
                      <div><strong>pm.request.headers.add(header)</strong> - {t('workspace.script.api.addHeader', '添加请求头')}</div>
                      <div><strong>pm.request.body.raw</strong> - {t('workspace.script.api.modifyBody', '修改请求体')}</div>
                      <div><strong>Date.now()</strong> - {t('workspace.script.api.timestamp', '获取当前时间戳')}</div>
                    </div>
                    <p className="font-medium mt-4">{t('workspace.script.examples.title', '示例代码:')}</p>
                    <pre className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md text-xs overflow-auto">
{`// 设置一个请求变量 | Set a request variable
pm.variables.set("timestamp", Date.now());

// 设置一个请求头 | Set a request header
pm.request.headers.add({
  key: "X-Custom-Header",
  value: "custom-value"
});

// 修改请求体 | Modify request body
const body = JSON.parse(pm.request.body.raw);
body.customField = "new value";
pm.request.body.raw = JSON.stringify(body);

// 生成随机数据 | Generate random data
pm.variables.set("randomId", Math.random().toString(36).substr(2, 9));

// 设置认证token | Set authentication token
pm.request.headers.add({
  key: "Authorization",
  value: "Bearer " + pm.variables.get("authToken")
});`}
                    </pre>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className={`border rounded-md ${!preRequest.enabled ? 'opacity-50' : ''}`}>
            <Textarea
              className="h-80 font-mono"
              placeholder={t('workspace.script.pre.placeholder', '// 在此处编写预请求脚本')}
              value={preRequest.script}
              onChange={(e) => handlePreRequestScriptChange(e.target.value)}
              disabled={!preRequest.enabled}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="tests" className="space-y-4 mt-0 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between">
              <Button onClick={addTest} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
                {t('workspace.script.tests.add', '添加测试')}
            </Button>
            <Dialog open={testHelpOpen} onOpenChange={setTestHelpOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <HelpCircle className="h-4 w-4 mr-1" />
                  {t('workspace.script.help', '帮助')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t('workspace.script.tests.helpTitle', '测试脚本帮助')}</DialogTitle>
                  <DialogDescription>
                    {t('workspace.script.tests.helpDesc', '测试脚本在响应收到后执行，用于验证响应数据和执行断言测试')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <p>{t('workspace.script.tests.usageTitle', '测试脚本在响应收到后执行，可用于：')}</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>{t('workspace.script.tests.usage.item1', '验证响应状态码、正文和头部')}</li>
                      <li>{t('workspace.script.tests.usage.item2', '从响应中提取数据并保存为变量')}</li>
                      <li>{t('workspace.script.tests.usage.item3', '验证响应时间和性能')}</li>
                      <li>{t('workspace.script.tests.usage.item4', '执行断言和测试')}</li>
                    </ul>

                    <p className="font-medium mt-4">{t('workspace.script.commonApi', '常用API:')}</p>
                    <div className="bg-muted rounded-md p-3 space-y-2 text-xs font-mono">
                      <div><strong>pm.test(name, function)</strong> - {t('workspace.script.api.createTest', '创建测试')}</div>
                      <div><strong>pm.response.to.have.status(code)</strong> - {t('workspace.script.api.checkStatus', '验证状态码')}</div>
                      <div><strong>pm.response.json()</strong> - {t('workspace.script.api.getJson', '获取JSON响应')}</div>
                      <div><strong>pm.expect(value)</strong> - {t('workspace.script.api.createExpect', '创建断言')}</div>
                      <div><strong>pm.variables.set(key, value)</strong> - {t('workspace.script.api.setVar', '设置变量')}</div>
                    </div>

                    <p className="font-medium mt-4">{t('workspace.script.tests.assertionsTitle', '常用断言:')}</p>
                    <div className="bg-muted rounded-md p-3 space-y-1 text-xs font-mono">
                      <div><strong>.to.equal(value)</strong> - {t('workspace.script.assert.equal', '等于')}</div>
                      <div><strong>.to.have.property(key)</strong> - {t('workspace.script.assert.property', '包含属性')}</div>
                      <div><strong>.to.be.a(type)</strong> - {t('workspace.script.assert.type', '类型检查')}</div>
                      <div><strong>.to.include(value)</strong> - {t('workspace.script.assert.include', '包含值')}</div>
                      <div><strong>.to.be.above(number)</strong> - {t('workspace.script.assert.above', '大于')}</div>
                      <div><strong>.to.be.below(number)</strong> - {t('workspace.script.assert.below', '小于')}</div>
                    </div>

                    <p className="font-medium mt-4">{t('workspace.script.examples.title', '示例代码:')}</p>
                    <pre className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md text-xs overflow-auto">
{`// ${t('workspace.script.examples.statusCheck', '状态码检查')}
pm.test("${t('workspace.script.examples.statusCheck', '状态码检查')}", function() {
  pm.response.to.have.status(200);
});

// ${t('workspace.response.tests.title', '测试响应JSON')}
pm.test("${t('workspace.response.tests.title', '响应包含正确的数据')}", function() {
  const responseData = pm.response.json();
  pm.expect(responseData).to.have.property("id");
  pm.expect(responseData.status).to.equal("success");
  pm.expect(responseData.data).to.be.a("object");
});

// ${t('workspace.response.tests.running', '测试响应时间')}
pm.test("${t('workspace.response.tests.running', '响应时间小于500ms')}", function() {
  pm.expect(pm.response.responseTime).to.be.below(500);
});

// ${t('workspace.response.tests.hint', '保存响应数据为变量供其他请求使用')}
const responseData = pm.response.json();
pm.variables.set("authToken", responseData.token);
pm.variables.set("userId", responseData.user.id);

// ${t('workspace.response.tests.title', '测试响应头')}
pm.test("${t('workspace.response.tests.title', '包含正确的Content-Type')}", function() {
  pm.expect(pm.response.headers.get("Content-Type")).to.include("application/json");
});

// ${t('workspace.response.tests.title', '测试数组数据')}
pm.test("${t('workspace.response.tests.title', '返回的列表不为空')}", function() {
  const responseData = pm.response.json();
  pm.expect(responseData.items).to.be.a("array");
  pm.expect(responseData.items.length).to.be.above(0);
});`}
                    </pre>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {tests.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-500 border rounded-md">
              <div className="flex flex-col items-center space-y-2">
                <Info className="h-5 w-5" />
                <span>{t('workspace.script.tests.empty', '没有测试脚本')}</span>
                <Button onClick={addTest} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  {t('workspace.script.tests.add', '添加测试')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {tests.map((test, index) => (
                <Card key={index}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 flex-1">
                        <Switch
                          checked={test.enabled}
                          onCheckedChange={(checked) => updateTestEnabled(index, checked)}
                          id={`test-enabled-${index}`}
                        />
                        <input
                          className="flex-1 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary focus:outline-none px-1"
                          value={test.name}
                          onChange={(e) => updateTestName(index, e.target.value)}
                          placeholder={t('workspace.script.tests.namePlaceholder', '测试名称')}
                          title={t('workspace.script.tests.nameTitle', '测试名称')}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTest(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-100"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className={`border rounded-md ${!test.enabled ? 'opacity-50' : ''}`}>
                      <Textarea
                        className="h-32 font-mono"
                        placeholder={t('workspace.script.tests.placeholder', '// 在此处编写测试代码')}
                        value={test.script}
                        onChange={(e) => updateTestScript(index, e.target.value)}
                        disabled={!test.enabled}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
