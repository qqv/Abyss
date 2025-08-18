"use client";

import { useState } from "react";
import Sidebar from "@/components/sidebar";
import ClientWrapper, { ViewMode } from "./ClientWrapper";

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>("api");
  const [currentApiTestTab, setCurrentApiTestTab] = useState<'collections' | 'history'>('collections');
  const [currentProxyTab, setCurrentProxyTab] = useState<string>('proxies');

  return (
    <main className="flex h-screen w-full flex-col">
      <div className="flex h-full">
        <Sidebar
          onViewModeChange={setViewMode}
          currentViewMode={viewMode}
          currentApiTestTab={currentApiTestTab}
          currentProxyTab={currentProxyTab}
          onApiTestTabChange={setCurrentApiTestTab}
        />
        <ClientWrapper
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          currentApiTestTab={currentApiTestTab}
          onApiTestTabChange={setCurrentApiTestTab}
          onProxyTabChange={setCurrentProxyTab}
        />
      </div>
    </main>
  );
}
