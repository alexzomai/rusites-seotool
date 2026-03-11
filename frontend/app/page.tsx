"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ChartAreaInteractive, type CompareSiteData, COMPARE_COLORS } from "@/components/chart-area-interactive";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { Site } from "@/components/site-search-list";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import { useSiteContext } from "@/lib/site-context";
import { faviconSrc } from "@/lib/favicon";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

const WEEKDAY_RU: Record<string, string> = {
  Monday: "Понедельник",
  Tuesday: "Вторник",
  Wednesday: "Среда",
  Thursday: "Четверг",
  Friday: "Пятница",
  Saturday: "Суббота",
  Sunday: "Воскресенье",
};

interface Analytics {
  visits_today: number | null;
  visits_diff: number | null;
  change_pct: number | null;
  rank_today: number | null;
  best_weekday: string | null;
}

interface Metric {
  date: string;
  weekday: string;
  visits: number | null;
  visits_diff: number | null;
  change_pct: number | null;
}

interface MetricsResponse {
  analytics: Analytics;
  metrics: Metric[];
}

export default function Page() {
  const { siteId, site, setSite } = useSiteContext();
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [compareSites, setCompareSites] = useState<CompareSiteData[]>([]);

  // Загружаем топ-1 сайт при первом открытии
  useEffect(() => {
    if (siteId != null) return;
    fetch(`${API_URL}/api/top?limit=1`)
      .then((res) => res.json())
      .then((json) => {
        if (json?.[0]?.site) setSite(json[0].site);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    return () => {
      cancelled = true;
    };
  }, [siteId]);

  // Сброс сравнения при смене основного сайта
  useEffect(() => {
    setCompareSites([]);
  }, [siteId]);

  function addCompareSite(site: Site) {
    if (compareSites.length >= 4) return;
    const id = site.id;
    fetch(`${API_URL}/api/${id}/metrics`)
      .then((res) => res.json())
      .then((json: MetricsResponse) => {
        const siteData = json.metrics.map((m) => ({ date: m.date, visits: m.visits ?? 0 }));
        setCompareSites((prev) => {
          if (prev.some((s) => s.id === id) || prev.length >= 4) return prev;
          const label = (site.domain ?? site.slug).replace(/^www\./, "").replace(/\/$/, "");
          return [...prev, { id, title: label, slug: site.slug, data: siteData }];
        });
      });
  }

  function removeCompareSite(id: number) {
    setCompareSites((prev) => prev.filter((s) => s.id !== id));
  }

  const chartData = useMemo(
    () =>
      (data?.metrics ?? []).map((m) => ({
        date: m.date,
        visits: m.visits ?? 0,
      })),
    [data],
  );

  const tableData = useMemo(
    () =>
      [...(data?.metrics ?? [])].reverse().map((m, i) => ({
        id: i + 1,
        date: m.date,
        dayOfWeek: WEEKDAY_RU[m.weekday] ?? m.weekday,
        traffic: m.visits ?? 0,
        diff: m.visits_diff ?? 0,
        changePct: m.change_pct ?? null,
      })),
    [data],
  );

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="flex items-center gap-2 px-4 lg:px-6 md:hidden">
            <SidebarTrigger />
            {site && (
              <div className="flex items-center gap-2 min-w-0">
                <Image
                  src={faviconSrc(site.slug)}
                  alt=""
                  width={18}
                  height={18}
                  className="shrink-0 rounded-sm"
                  unoptimized
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "/globe.svg";
                  }}
                />
                <span className="text-sm font-semibold truncate">{site.title ?? site.slug}</span>
              </div>
            )}
          </div>
          {site && (
            <div className="hidden md:flex items-center gap-3 px-4 lg:px-6">
              <Image
                src={faviconSrc(site.slug)}
                alt=""
                width={24}
                height={24}
                className="shrink-0 rounded-sm"
                unoptimized
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/globe.svg";
                }}
              />
              <h1 className="text-xl font-semibold">{site.title ?? site.slug}</h1>
              {site.domain && (
                <span className="text-sm text-muted-foreground">
                  {site.domain.replace(/^www\./, "").replace(/\/$/, "")}
                </span>
              )}
            </div>
          )}
          <SectionCards analytics={data?.analytics ?? null} />
          <div className="px-4 lg:px-6">
            <ChartAreaInteractive
              data={chartData}
              compareSites={compareSites}
              onAddCompareSite={addCompareSite}
              onRemoveCompareSite={removeCompareSite}
              mainSiteId={siteId}
              mainSiteTitle={site ? (site.domain ?? site.slug).replace(/^www\./, "").replace(/\/$/, "") : null}
            />
          </div>
          <DataTable
            data={tableData}
            compareSites={compareSites.map((cs, i) => ({
              id: cs.id,
              title: cs.title,
              data: cs.data,
              color: `var(${COMPARE_COLORS[i] ?? "--chart-2"})`,
            }))}
            mainSiteTitle={site ? (site.domain ?? site.slug).replace(/^www\./, "").replace(/\/$/, "") : "Трафик"}
          />
        </div>
      </div>
    </div>
  );
}
