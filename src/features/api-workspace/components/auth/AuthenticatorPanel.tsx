"use client";

import { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";

// 认证类型
export type AuthType = 'none' | 'basic' | 'apikey' | 'bearer' | 'oauth2';

// 认证参数接口
export interface AuthParams {
  type: AuthType;
  enabled: boolean;
  // Basic Auth
  username?: string;
  password?: string;
  // API Key
  apiKey?: string;
  apiKeyName?: string;
  apiKeyIn?: 'header' | 'query';
  // Bearer Token
  token?: string;
  // OAuth2
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenUrl?: string;
  authUrl?: string;
  scope?: string;
}

interface AuthenticatorPanelProps {
  auth: AuthParams;
  onAuthChange: (auth: AuthParams) => void;
}

export function AuthenticatorPanel({ auth, onAuthChange }: AuthenticatorPanelProps) {
  const { t } = useTranslation('common');
  // 组件加载时，打印认证信息以便调试
  // console.log('AuthenticatorPanel: 收到认证信息', auth);
  
  // 特别检查Bearer Token
  if (auth?.type === 'bearer') {
    // console.log('发现Bearer Token认证:', { token: auth.token, enabled: auth.enabled });
  }
  
  // 处理认证类型变更
  const handleTypeChange = (type: string) => {
    // console.log('认证类型变更为:', type);
    onAuthChange({ 
      ...auth, 
      type: type as AuthType,
      enabled: type !== 'none'
    });
  };

  // 处理认证启用状态变更
  const handleEnabledChange = (enabled: boolean) => {
    // console.log('认证启用状态变更为:', enabled);
    onAuthChange({ ...auth, enabled });
  };

  // 更新认证参数
  const updateAuthParam = (paramName: keyof AuthParams, value: string | boolean) => {
    // console.log(`更新认证参数 ${paramName}:`, value);
    onAuthChange({
      ...auth,
      [paramName]: value
    });
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex space-x-4 items-center">
          <Select 
            value={auth.type} 
            onValueChange={handleTypeChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('auth.selectType', '选择认证类型')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('auth.type.none', '无认证')}</SelectItem>
              <SelectItem value="basic">{t('auth.type.basic', 'Basic Auth')}</SelectItem>
              <SelectItem value="apikey">{t('auth.type.apikey', 'API Key')}</SelectItem>
              <SelectItem value="bearer">{t('auth.type.bearer', 'Bearer Token')}</SelectItem>
              <SelectItem value="oauth2">{t('auth.type.oauth2', 'OAuth 2.0')}</SelectItem>
            </SelectContent>
          </Select>

          {auth.type !== 'none' && (
            <div className="flex items-center space-x-2">
              <Switch 
                checked={auth.enabled}
                onCheckedChange={handleEnabledChange}
                id="auth-enabled"
              />
              <Label htmlFor="auth-enabled">{t('auth.enable', '启用认证')}</Label>
            </div>
          )}
        </div>
      </div>

      {auth.type !== 'none' && auth.enabled && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {auth.type === 'basic' && t('auth.title.basic', '基本认证 (Basic Auth)')}
              {auth.type === 'apikey' && t('auth.title.apikey', 'API Key 认证')}
              {auth.type === 'bearer' && t('auth.title.bearer', 'Bearer Token 认证')}
              {auth.type === 'oauth2' && t('auth.title.oauth2', 'OAuth 2.0 认证')}
            </CardTitle>
            <CardDescription>
              {auth.type === 'basic' && t('auth.desc.basic', '使用用户名和密码进行HTTP基本认证')}
              {auth.type === 'apikey' && t('auth.desc.apikey', '使用API密钥进行认证，可添加到请求头或URL中')}
              {auth.type === 'bearer' && t('auth.desc.bearer', '使用Bearer令牌进行认证，通常是JWT格式')}
              {auth.type === 'oauth2' && t('auth.desc.oauth2', 'OAuth 2.0授权框架提供特定的授权流程')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Basic Auth 参数 */}
            {auth.type === 'basic' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">{t('auth.basic.username', '用户名')}</Label>
                  <Input 
                    id="username" 
                    value={auth.username || ''} 
                    onChange={(e) => updateAuthParam('username', e.target.value)}
                    placeholder={t('auth.basic.usernamePlaceholder', '输入用户名')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t('auth.basic.password', '密码')}</Label>
                  <Input 
                    id="password" 
                    type="password"
                    value={auth.password || ''} 
                    onChange={(e) => updateAuthParam('password', e.target.value)}
                    placeholder={t('auth.basic.passwordPlaceholder', '输入密码')}
                  />
                </div>
              </div>
            )}

            {/* API Key 参数 */}
            {auth.type === 'apikey' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="apiKeyName">{t('auth.apikey.name', 'Key名称')}</Label>
                    <Input 
                      id="apiKeyName" 
                      value={auth.apiKeyName || ''} 
                      onChange={(e) => updateAuthParam('apiKeyName', e.target.value)}
                      placeholder={t('auth.apikey.namePlaceholder', '如 X-API-Key 或 api_key')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">{t('auth.apikey.value', 'Key值')}</Label>
                    <Input 
                      id="apiKey" 
                      value={auth.apiKey || ''} 
                      onChange={(e) => updateAuthParam('apiKey', e.target.value)}
                      placeholder={t('auth.apikey.valuePlaceholder', '输入API Key')}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="apiKeyIn">{t('auth.apikey.addTo', '添加到')}</Label>
                  <Select 
                    value={auth.apiKeyIn || 'header'} 
                    onValueChange={(value) => updateAuthParam('apiKeyIn', value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('auth.apikey.addToPlaceholder', '选择添加位置')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="header">{t('auth.apikey.header', 'Header (请求头)')}</SelectItem>
                      <SelectItem value="query">{t('auth.apikey.query', 'Query (URL查询参数)')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Bearer Token 参数 */}
            {auth.type === 'bearer' && (
              <div className="space-y-2">
                <Label htmlFor="token">{t('auth.bearer.token', 'Token')}</Label>
                <Input 
                  id="token" 
                  value={auth.token || ''} 
                  onChange={(e) => updateAuthParam('token', e.target.value)}
                  placeholder={t('auth.bearer.tokenPlaceholder', '输入Bearer Token')}
                />
                <p className="text-xs text-gray-500">
                  {t('auth.bearer.tip', '请输入不带 "Bearer " 前缀的令牌，系统会自动添加')}
                </p>
              </div>
            )}

            {/* OAuth 2.0 参数 */}
            {auth.type === 'oauth2' && (
              <Tabs defaultValue="config">
                <TabsList>
                  <TabsTrigger value="config">{t('auth.oauth.tabs.config', '配置')}</TabsTrigger>
                  <TabsTrigger value="token">{t('auth.oauth.tabs.token', '令牌')}</TabsTrigger>
                </TabsList>
                <TabsContent value="config" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="tokenUrl">{t('auth.oauth.tokenUrl', '令牌URL')}</Label>
                    <Input 
                      id="tokenUrl" 
                      value={auth.tokenUrl || ''} 
                      onChange={(e) => updateAuthParam('tokenUrl', e.target.value)}
                      placeholder="https://example.com/oauth/token"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="authUrl">{t('auth.oauth.authUrl', '授权URL')}</Label>
                    <Input 
                      id="authUrl" 
                      value={auth.authUrl || ''} 
                      onChange={(e) => updateAuthParam('authUrl', e.target.value)}
                      placeholder="https://example.com/oauth/authorize"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="clientId">{t('auth.oauth.clientId', '客户端ID')}</Label>
                      <Input 
                        id="clientId" 
                        value={auth.clientId || ''} 
                        onChange={(e) => updateAuthParam('clientId', e.target.value)}
                        placeholder={t('auth.oauth.clientIdPlaceholder', '输入Client ID')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clientSecret">{t('auth.oauth.clientSecret', '客户端Secret')}</Label>
                      <Input 
                        id="clientSecret" 
                        type="password"
                        value={auth.clientSecret || ''} 
                        onChange={(e) => updateAuthParam('clientSecret', e.target.value)}
                        placeholder={t('auth.oauth.clientSecretPlaceholder', '输入Client Secret')}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scope">{t('auth.oauth.scope', '作用域 (Scope)')}</Label>
                    <Input 
                      id="scope" 
                      value={auth.scope || ''} 
                      onChange={(e) => updateAuthParam('scope', e.target.value)}
                      placeholder={t('auth.oauth.scopePlaceholder', '用空格分隔多个作用域，如：read write')}
                    />
                  </div>
                </TabsContent>
                <TabsContent value="token" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="accessToken">{t('auth.oauth.accessToken', '访问令牌')}</Label>
                    <Input 
                      id="accessToken" 
                      value={auth.accessToken || ''} 
                      onChange={(e) => updateAuthParam('accessToken', e.target.value)}
                      placeholder={t('auth.oauth.accessTokenPlaceholder', '输入Access Token')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="refreshToken">{t('auth.oauth.refreshToken', '刷新令牌')}</Label>
                    <Input 
                      id="refreshToken" 
                      value={auth.refreshToken || ''} 
                      onChange={(e) => updateAuthParam('refreshToken', e.target.value)}
                      placeholder={t('auth.oauth.refreshTokenPlaceholder', '输入Refresh Token')}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      )}

      {auth.type === 'none' && (
        <div className="flex items-center justify-center h-40 text-gray-500 border rounded-md">
          <div className="flex items-center space-x-2">
            <Info className="h-5 w-5" />
            <span>{t('auth.noneHint', '请选择认证类型以配置API认证')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
