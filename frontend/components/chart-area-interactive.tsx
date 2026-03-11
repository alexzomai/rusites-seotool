"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { Plus, X } from "lucide-react";

import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteSearchList, type Site } from "@/components/site-search-list";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface ChartDataPoint {
  date: string;
  visits: number;
}

export interface CompareSiteData {
  id: number;
  title: string;
  slug: string;
  data: ChartDataPoint[];
}

export const COMPARE_COLORS = ["--chart-2", "--chart-3"] as const;

function mergeChartData(
  main: ChartDataPoint[],
  compareSites: CompareSiteData[],
): Record<string, number | string | null>[] {
  // Collect all unique dates
  const allDates = new Set<string>();
  main.forEach((p) => allDates.add(p.date));
  compareSites.forEach((cs) => cs.data.forEach((p) => allDates.add(p.date)));

  // Index main data
  const mainMap = new Map<string, number>();
  main.forEach((p) => mainMap.set(p.date, p.visits));

  // Index each compare site
  const compareMaps = compareSites.map((cs) => {
    const m = new Map<string, number>();
    cs.data.forEach((p) => m.set(p.date, p.visits));
    return { id: cs.id, map: m };
  });

  return Array.from(allDates)
    .sort((a, b) => a.localeCompare(b))
    .map((date) => {
      const row: Record<string, number | string | null> = {
        date,
        visits: mainMap.get(date) ?? null,
      };
      compareMaps.forEach((cm) => {
        row[`compare_${cm.id}`] = cm.map.get(date) ?? null;
      });
      return row;
    });
}

interface LegendItem {
  id?: string; // recharts passes dataKey as `id`
  value?: string;
  color?: string;
}

function CustomLegend({
  payload,
  chartConfig,
  compareSites,
  onRemoveCompareSite,
}: {
  payload?: LegendItem[];
  chartConfig: ChartConfig;
  compareSites: CompareSiteData[];
  onRemoveCompareSite?: (id: number) => void;
}) {
  if (!payload?.length) return null;
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-2">
      {payload.map((entry) => {
        const key = entry.id ?? entry.value ?? "";
        const isCompare = key.startsWith("compare_");
        const compareId = isCompare ? parseInt(key.replace("compare_", ""), 10) : null;
        const label = (chartConfig[key]?.label as string) ?? entry.value ?? key;
        const color = chartConfig[key]?.color ?? entry.color;
        return (
          <div key={key} className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ background: color }} />
            <span className="text-xs text-muted-foreground max-w-[160px] truncate" title={label}>
              {label}
            </span>
            {isCompare && compareId != null && (
              <button
                type="button"
                onClick={() => onRemoveCompareSite?.(compareId)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ChartAreaInteractive({
  data,
  compareSites = [],
  onAddCompareSite,
  onRemoveCompareSite,
  mainSiteId,
  mainSiteTitle,
}: {
  data: ChartDataPoint[];
  compareSites?: CompareSiteData[];
  onAddCompareSite?: (site: Site) => void;
  onRemoveCompareSite?: (id: number) => void;
  mainSiteId?: number | null;
  mainSiteTitle?: string | null;
}) {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = React.useState("90d");
  const [dialogOpen, setDialogOpen] = React.useState(false);

  React.useEffect(() => {
    if (isMobile) setTimeRange("7d");
  }, [isMobile]);

  const chartConfig = React.useMemo<ChartConfig>(() => {
    const config: ChartConfig = {
      visits: { label: mainSiteTitle ?? "Визиты", color: "var(--chart-1)" },
    };
    compareSites.forEach((cs, i) => {
      config[`compare_${cs.id}`] = {
        label: cs.title,
        color: `var(${COMPARE_COLORS[i] ?? "--chart-2"})`,
      };
    });
    return config;
  }, [compareSites]);

  const mergedData = React.useMemo(() => mergeChartData(data, compareSites), [data, compareSites]);

  const filteredData = React.useMemo(() => {
    if (mergedData.length === 0) return [];
    const referenceDate = new Date(mergedData[mergedData.length - 1].date as string);
    let daysToSubtract = 90;
    if (timeRange === "30d") daysToSubtract = 30;
    else if (timeRange === "7d") daysToSubtract = 7;
    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);
    return mergedData.filter((item) => new Date(item.date as string) >= startDate);
  }, [mergedData, timeRange]);

  const excludeIds = React.useMemo(() => {
    const ids = new Set<number>(compareSites.map((cs) => cs.id));
    if (mainSiteId != null) ids.add(mainSiteId);
    return ids;
  }, [compareSites, mainSiteId]);

  return (
    <>
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Всего посетителей</CardTitle>
          <CardDescription>
            <span className="hidden @[540px]/card:block">Итого за последние 3 месяца</span>
            <span className="@[540px]/card:hidden">Последние 3 месяца</span>
          </CardDescription>
          <CardAction>
            <div className="flex items-center gap-2">
              {compareSites.length < 2 && (
                <Button
                  variant="outline"
                  size="icon"
                  className="size-7"
                  onClick={() => setDialogOpen(true)}
                  title="Добавить сайт для сравнения"
                >
                  <Plus className="size-3.5" />
                </Button>
              )}
              <ToggleGroup
                type="single"
                value={timeRange}
                onValueChange={setTimeRange}
                variant="outline"
                className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
              >
                <ToggleGroupItem value="90d">3 месяца</ToggleGroupItem>
                <ToggleGroupItem value="30d">30 дней</ToggleGroupItem>
                <ToggleGroupItem value="7d">7 дней</ToggleGroupItem>
              </ToggleGroup>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger
                  className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
                  size="sm"
                  aria-label="Выберите период"
                >
                  <SelectValue placeholder="3 месяца" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="90d" className="rounded-lg">
                    3 месяца
                  </SelectItem>
                  <SelectItem value="30d" className="rounded-lg">
                    30 дней
                  </SelectItem>
                  <SelectItem value="7d" className="rounded-lg">
                    7 дней
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
            <AreaChart data={filteredData}>
              <defs>
                <linearGradient id="fillVisits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-visits)" stopOpacity={1.0} />
                  <stop offset="95%" stopColor="var(--color-visits)" stopOpacity={0.1} />
                </linearGradient>
                {compareSites.map((cs, i) => (
                  <linearGradient key={cs.id} id={`fillCompare_${cs.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={`var(${COMPARE_COLORS[i] ?? "--chart-2"})`} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={`var(${COMPARE_COLORS[i] ?? "--chart-2"})`} stopOpacity={0.1} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString("ru-RU", { month: "short", day: "numeric" });
                }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    className="min-w-[160px]"
                    labelFormatter={(value) =>
                      new Date(value).toLocaleDateString("ru-RU", { month: "short", day: "numeric" })
                    }
                  />
                }
              />
              <ChartLegend
                content={(props) => (
                  <CustomLegend
                    payload={props.payload as unknown as LegendItem[]}
                    chartConfig={chartConfig}
                    compareSites={compareSites}
                    onRemoveCompareSite={onRemoveCompareSite}
                  />
                )}
              />
              <Area dataKey="visits" type="natural" fill="url(#fillVisits)" stroke="var(--color-visits)" connectNulls />
              {compareSites.map((cs) => (
                <Area
                  key={cs.id}
                  dataKey={`compare_${cs.id}`}
                  type="natural"
                  fill={`url(#fillCompare_${cs.id})`}
                  stroke={`var(--color-compare_${cs.id})`}
                  connectNulls
                />
              ))}
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Добавить сайт для сравнения</DialogTitle>
          </DialogHeader>
          <SiteSearchList
            excludeIds={excludeIds}
            onSelect={(site) => {
              onAddCompareSite?.(site);
              setDialogOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
