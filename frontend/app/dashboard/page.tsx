"use client";

import { useEffect, useMemo, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { useSiteContext } from "@/lib/site-context"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Analytics {
  visits_today: number | null;
  change_pct: number | null;
  rank_today: number | null;
  best_weekday: string | null;
}

interface Metric {
  date: string;
  weekday: string;
  visits: number | null;
  visits_diff: number | null;
}

interface MetricsResponse {
  analytics: Analytics;
  metrics: Metric[];
}

export default function Page() {
  const { siteId } = useSiteContext();
  const [data, setData] = useState<MetricsResponse | null>(null);

  useEffect(() => {
    if (siteId == null) {
      setData(null);
      return;
    }
    let cancelled = false;
    fetch(`${API_URL}/api/${siteId}/metrics`)
      .then((res) => res.json())
      .then((json: MetricsResponse) => {
        if (!cancelled) setData(json);
      });
    return () => { cancelled = true; };
  }, [siteId]);

  const chartData = useMemo(() => (data?.metrics ?? []).map((m) => ({
    date: m.date,
    visits: m.visits ?? 0,
  })), [data]);

  const tableData = useMemo(() => (data?.metrics ?? []).map((m, i) => ({
    id: i + 1,
    date: m.date,
    dayOfWeek: m.weekday,
    traffic: m.visits ?? 0,
    diff: m.visits_diff ?? 0,
  })), [data]);

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards analytics={data?.analytics ?? null} />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive data={chartData} />
              </div>
              <DataTable data={tableData} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
