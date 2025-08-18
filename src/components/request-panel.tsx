"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiRequest, HttpMethod, RequestParam } from "@/lib/api-data";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Minus, Play, Eye } from "@/components/ui/icons";

interface RequestPanelProps {
  request: ApiRequest;
}

export default function RequestPanel({ request }: RequestPanelProps) {
  const [activeTab, setActiveTab] = useState("params");
  const [localRequest, setLocalRequest] = useState<ApiRequest>(request);
  
  const handleMethodChange = (value: string) => {
    setLocalRequest({
      ...localRequest,
      method: value as HttpMethod
    });
  };
  
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalRequest({
      ...localRequest,
      url: e.target.value
    });
  };
  
  const handleHeaderChange = (index: number, field: "key" | "value" | "enabled", value: string | boolean) => {
    const updatedHeaders = [...localRequest.headers];
    updatedHeaders[index] = {
      ...updatedHeaders[index],
      [field]: value
    };
    
    setLocalRequest({
      ...localRequest,
      headers: updatedHeaders
    });
  };
  
  const handleParamChange = (index: number, field: "key" | "value" | "enabled", value: string | boolean) => {
    const updatedParams = [...localRequest.queryParams];
    updatedParams[index] = {
      ...updatedParams[index],
      [field]: value
    };
    
    setLocalRequest({
      ...localRequest,
      queryParams: updatedParams
    });
  };
  
  const handleBodyChange = (value: string) => {
    if (localRequest.body.mode === 'raw') {
      setLocalRequest({
        ...localRequest,
        body: {
          ...localRequest.body,
          raw: value
        }
      });
    }
  };
  
  const handleAddHeader = () => {
    setLocalRequest({
      ...localRequest,
      headers: [
        ...localRequest.headers,
        { key: "", value: "", enabled: true }
      ]
    });
  };
  
  const handleRemoveHeader = (index: number) => {
    const updatedHeaders = [...localRequest.headers];
    updatedHeaders.splice(index, 1);
    
    setLocalRequest({
      ...localRequest,
      headers: updatedHeaders
    });
  };
  
  const handleAddParam = () => {
    setLocalRequest({
      ...localRequest,
      queryParams: [
        ...localRequest.queryParams,
        { key: "", value: "", enabled: true }
      ]
    });
  };
  
  const handleRemoveParam = (index: number) => {
    const updatedParams = [...localRequest.queryParams];
    updatedParams.splice(index, 1);
    
    setLocalRequest({
      ...localRequest,
      queryParams: updatedParams
    });
  };
  
  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{localRequest.name}</CardTitle>
          <div className="flex items-center space-x-2 mt-2">
            <Select value={localRequest.method} onValueChange={handleMethodChange}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="选择方法" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
                <SelectItem value="HEAD">HEAD</SelectItem>
                <SelectItem value="OPTIONS">OPTIONS</SelectItem>
              </SelectContent>
            </Select>
            <Input 
              value={localRequest.url} 
              onChange={handleUrlChange}
              className="flex-1"
              placeholder="输入请求URL"
            />
            <Button variant="default" size="sm" className="ml-2">
              <Play className="h-4 w-4 mr-1" />
              发送
            </Button>
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-1" />
              查看结果
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="params" className="flex items-center">
                <span>参数</span>
                {localRequest.queryParams.length > 0 && (
                  <span className="ml-1 bg-white text-black border border-gray-400 rounded-full w-4 h-4 text-[10px] flex items-center justify-center">
                    {localRequest.queryParams.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="headers" className="flex items-center">
                <span>请求头</span>
                {localRequest.headers.length > 0 && (
                  <span className="ml-1 bg-white text-black border border-gray-400 rounded-full w-4 h-4 text-[10px] flex items-center justify-center">
                    {localRequest.headers.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="body">请求体</TabsTrigger>
              <TabsTrigger value="tests">测试脚本</TabsTrigger>
            </TabsList>
            
            <TabsContent value="params" className="mt-4">
              <div className="space-y-2">
                {localRequest.queryParams.map((param: RequestParam, index: number) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      placeholder="参数名"
                      value={param.key}
                      onChange={(e) => handleParamChange(index, "key", e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="参数值"
                      value={param.value}
                      onChange={(e) => handleParamChange(index, "value", e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveParam(index)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={handleAddParam}>
                  <PlusCircle className="h-4 w-4 mr-1" />
                  添加参数
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="headers" className="mt-4">
              <div className="space-y-2">
                {localRequest.headers.map((header, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      placeholder="请求头名称"
                      value={header.key}
                      onChange={(e) => handleHeaderChange(index, "key", e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="请求头值"
                      value={header.value}
                      onChange={(e) => handleHeaderChange(index, "value", e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveHeader(index)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={handleAddHeader}>
                  <PlusCircle className="h-4 w-4 mr-1" />
                  添加请求头
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="body" className="mt-4">
              <div className="space-y-4">
                <div>
                  <Label>内容类型</Label>
                  <Select 
                    value={localRequest.body.contentType || "application/json"} 
                    onValueChange={(value) => {
                      if (localRequest.body.mode === 'raw') {
                        setLocalRequest({
                          ...localRequest,
                          body: {
                            ...localRequest.body,
                            contentType: value
                          }
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择内容类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="application/json">application/json</SelectItem>
                      <SelectItem value="application/xml">application/xml</SelectItem>
                      <SelectItem value="text/plain">text/plain</SelectItem>
                      <SelectItem value="application/x-www-form-urlencoded">application/x-www-form-urlencoded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {localRequest.body.mode === 'raw' && (
                  <Textarea
                    placeholder="输入请求体内容"
                    value={localRequest.body.raw || ""}
                    onChange={(e) => handleBodyChange(e.target.value)}
                    className="min-h-[200px] font-mono text-sm"
                  />
                )}
                
                {/* 这里可以添加其他请求体类型的输入界面 */}
              </div>
            </TabsContent>
            
            <TabsContent value="tests" className="mt-4">
              <div className="space-y-4">
                <div>
                  <Label>预请求脚本</Label>
                  <Textarea
                    placeholder="输入预请求脚本"
                    value={localRequest.preRequest?.script || ""}
                    onChange={(e) => {
                      setLocalRequest({
                        ...localRequest,
                        preRequest: {
                          script: e.target.value,
                          enabled: localRequest.preRequest?.enabled || true
                        }
                      });
                    }}
                    className="min-h-[100px] font-mono text-sm"
                  />
                </div>
                
                <div>
                  <Label>测试脚本</Label>
                  {localRequest.tests && localRequest.tests.length > 0 ? (
                    localRequest.tests.map((test, index) => (
                      <div key={index} className="space-y-2">
                        <Input
                          placeholder="测试名称"
                          value={test.name}
                          onChange={(e) => {
                            const updatedTests = [...(localRequest.tests || [])];
                            updatedTests[index] = {
                              ...updatedTests[index],
                              name: e.target.value
                            };
                            
                            setLocalRequest({
                              ...localRequest,
                              tests: updatedTests
                            });
                          }}
                          className="w-full mt-2"
                        />
                        <Textarea
                          placeholder="输入测试脚本"
                          value={test.script}
                          onChange={(e) => {
                            const updatedTests = [...(localRequest.tests || [])];
                            updatedTests[index] = {
                              ...updatedTests[index],
                              script: e.target.value
                            };
                            
                            setLocalRequest({
                              ...localRequest,
                              tests: updatedTests
                            });
                          }}
                          className="min-h-[100px] font-mono text-sm"
                        />
                      </div>
                    ))
                  ) : (
                    <Textarea
                      placeholder="输入测试脚本"
                      className="min-h-[100px] font-mono text-sm mt-2"
                      onChange={(e) => {
                        setLocalRequest({
                          ...localRequest,
                          tests: [
                            {
                              name: "默认测试",
                              script: e.target.value,
                              enabled: true
                            }
                          ]
                        });
                      }}
                    />
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
