"use client";

import i18next, { i18n as I18nInstance } from "i18next";
import HttpBackend from "i18next-http-backend";
import { initReactI18next } from "react-i18next";

let initialized = false;

function detectInitialLanguage(): string {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("abyss-general-settings");
      if (saved) {
        const { language } = JSON.parse(saved) || {};
        if (language) {
          return language === "en-US" ? "en" : language;
        }
      }
    } catch {}
    const nav = typeof navigator !== "undefined" ? navigator.language : "zh-CN";
    if (nav && nav.toLowerCase().startsWith("en")) return "en";
    if (nav && nav.toLowerCase().startsWith("zh")) return "zh-CN";
  }
  return "zh-CN";
}

export function getI18nInstance(): I18nInstance {
  if (!initialized) {
    i18next
      .use(HttpBackend)
      .use(initReactI18next)
      .init({
        lng: detectInitialLanguage(),
        fallbackLng: "zh-CN",
        supportedLngs: ["zh-CN", "en"],
        nonExplicitSupportedLngs: true,
        ns: ["common"],
        defaultNS: "common",
        interpolation: { escapeValue: false },
        backend: {
          loadPath: "/locales/{{lng}}/{{ns}}.json",
        },
        react: {
          useSuspense: false,
        },
        detection: undefined,
      });
    initialized = true;
  }
  return i18next;
}


