import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import logo from "/src/assets/images/logo.png";
import { apiRequest } from "../api/client";

const SystemContext = createContext(null);

export function SystemProvider({ children }) {
  const { i18n } = useTranslation();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refreshSettings() {
    const payload = await apiRequest("/public/system");
    setSettings(payload.item);
    return payload.item;
  }

  useEffect(() => {
    let active = true;

    refreshSettings()
      .then((systemSettings) => {
        if (!active) {
          return;
        }

        const storedLanguage = localStorage.getItem("sfz-language");
        if (!storedLanguage && systemSettings?.defaultLanguage) {
          i18n.changeLanguage(systemSettings.defaultLanguage);
        }
      })
      .catch(() => null)
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const language = i18n.language === "en" ? "en" : "ar";
    const isArabic = language === "ar";
    document.documentElement.lang = language;
    document.documentElement.dir = isArabic ? "rtl" : "ltr";
    document.body.className = `${isArabic ? "font-arabic" : ""} bg-sand text-slate-900`;
    localStorage.setItem("sfz-language", language);
  }, [i18n.language]);

  const value = useMemo(
    () => ({
      settings,
      loading,
      refreshSettings,
      language: i18n.language === "en" ? "en" : "ar",
      isArabic: i18n.language !== "en",
      setLanguage: (language) => i18n.changeLanguage(language),
      logoSrc: settings?.logoUrl || logo,
      systemName: i18n.language === "en" ? settings?.systemNameEn || "SFZ System" : settings?.systemNameAr || "نظام SFZ"
    }),
    [i18n, loading, settings]
  );

  return <SystemContext.Provider value={value}>{children}</SystemContext.Provider>;
}

export function useSystem() {
  const context = useContext(SystemContext);

  if (!context) {
    throw new Error("useSystem must be used inside SystemProvider.");
  }

  return context;
}
