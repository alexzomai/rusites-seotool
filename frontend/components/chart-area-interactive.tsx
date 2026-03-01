"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const chartConfig = {
  visitors: {
    label: "Посетители",
  },
  visits: {
    label: "Визиты",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

interface ChartDataPoint {
  date: string;
  visits: number;
}

export function ChartAreaInteractive({ data }: { data: ChartDataPoint[] }) {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = React.useState("90d");

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d");
    }
  }, [isMobile]);

  const filteredData = React.useMemo(() => {
    if (data.length === 0) return [];
    const referenceDate = new Date(data[data.length - 1].date);
    let daysToSubtract = 90;
    if (timeRange === "30d") daysToSubtract = 30;
    else if (timeRange === "7d") daysToSubtract = 7;
    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);
    return data.filter((item) => new Date(item.date) >= startDate);
  }, [data, timeRange]);

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Всего посетителей</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">Итого за последние 3 месяца</span>
          <span className="@[540px]/card:hidden">Последние 3 месяца</span>
        </CardDescription>
        <CardAction>
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
              <SelectItem value="90d" className="rounded-lg">3 месяца</SelectItem>
              <SelectItem value="30d" className="rounded-lg">30 дней</SelectItem>
              <SelectItem value="7d" className="rounded-lg">7 дней</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillVisits" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-visits)" stopOpacity={1.0} />
                <stop offset="95%" stopColor="var(--color-visits)" stopOpacity={0.1} />
              </linearGradient>
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
                return date.toLocaleDateString("ru-RU", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("ru-RU", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                  hideIndicator
                  formatter={(value) => Number(value).toLocaleString("ru-RU")}
                />
              }
            />
            <Area dataKey="visits" type="natural" fill="url(#fillVisits)" stroke="var(--color-visits)" />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
