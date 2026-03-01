"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface SiteInfo {
  id: number;
  slug: string;
  title: string | null;
  domain: string | null;
}

interface SiteContextValue {
  siteId: number | null;
  site: SiteInfo | null;
  setSite: (site: SiteInfo) => void;
}

const SiteContext = createContext<SiteContextValue | null>(null);

export function SiteProvider({ children }: { children: ReactNode }) {
  const [site, setSite] = useState<SiteInfo | null>(null);
  return (
    <SiteContext.Provider value={{ siteId: site?.id ?? null, site, setSite }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSiteContext() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error("useSiteContext must be used within SiteProvider");
  return ctx;
}
