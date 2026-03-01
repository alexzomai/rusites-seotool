"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import { useSiteContext } from "@/lib/site-context";

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
  const { siteId, site } = useSiteContext();
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (siteId == null) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`${API_URL}/api/${siteId}/metrics`)
      .then((res) => res.json())
      .then((json: MetricsResponse) => {
        if (!cancelled) setData(json);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
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
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {site && (
            <div className="flex items-center gap-3 px-4 lg:px-6">
              <Image
                src={`https://www.liveinternet.ru/favicon/${site.slug}.ico`}
                alt=""
                width={24}
                height={24}
                className="shrink-0 rounded-sm"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                unoptimized
              />
              <h1 className="text-xl font-semibold">{site.title ?? site.slug}</h1>
              {site.domain && (
                <span className="text-sm text-muted-foreground">{site.domain}</span>
              )}
            </div>
          )}
          <SectionCards analytics={data?.analytics ?? null} />
          <div className="px-4 lg:px-6">
            <ChartAreaInteractive data={chartData} />
          </div>
          <DataTable data={tableData} />
        </div>
      </div>
    </div>
  );
}
