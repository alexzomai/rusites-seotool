"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUpIcon, TrendingDownIcon } from "lucide-react";

interface Analytics {
  visits_today: number | null;
  visits_diff: number | null;
  change_pct: number | null;
  rank_today: number | null;
  best_weekday: string | null;
}

const WEEKDAY_RU: Record<string, string> = {
  Monday: "Понедельник",
  Tuesday: "Вторник",
  Wednesday: "Среда",
  Thursday: "Четверг",
  Friday: "Пятница",
  Saturday: "Суббота",
  Sunday: "Воскресенье",
};

export function SectionCards({ analytics }: { analytics: Analytics | null }) {
  const visits = analytics?.visits_today;
  const visitsDiff = analytics?.visits_diff ?? null;
  const changePct = analytics?.change_pct;
  const rank = analytics?.rank_today;
  const bestDay =
    analytics?.best_weekday != null ? (WEEKDAY_RU[analytics.best_weekday] ?? analytics.best_weekday) : null;

  const pctLabel = changePct != null ? `${changePct >= 0 ? "+" : ""}${changePct.toFixed(1)}%` : "—";
  const isUp = (changePct ?? 0) >= 0;

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-2 gap-3 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @5xl/main:grid-cols-4 [&_[data-slot=card-header]]:pb-1">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="truncate text-xs">Посетители сегодня</CardDescription>
          <CardTitle className="text-base font-semibold tabular-nums @[160px]/card:text-lg @[200px]/card:text-2xl @[250px]/card:text-3xl">
            {visits != null ? visits.toLocaleString("ru-RU") : "—"}
          </CardTitle>
          <CardAction className="hidden @[160px]/card:flex">
            {visitsDiff != null && (
              <Badge variant="outline" className="text-xs px-1.5">
                {visitsDiff >= 0 ? <TrendingUpIcon className="size-3" /> : <TrendingDownIcon className="size-3" />}
                {visitsDiff >= 0 ? "+" : ""}
                {visitsDiff.toLocaleString("ru-RU")}
              </Badge>
            )}
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-0.5 text-xs">
          <div className="line-clamp-1 flex gap-1 font-medium">
            {isUp ? "Рост трафика" : "Снижение"}{" "}
            {isUp ? <TrendingUpIcon className="size-3" /> : <TrendingDownIcon className="size-3" />}
          </div>
          <div className="text-muted-foreground line-clamp-1 hidden @[140px]/card:block">Пред. день</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="truncate text-xs">Изменение</CardDescription>
          <CardTitle className="text-base font-semibold tabular-nums @[160px]/card:text-lg @[200px]/card:text-2xl @[250px]/card:text-3xl">
            {pctLabel}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-0.5 text-xs">
          <div className="line-clamp-1 flex gap-1 font-medium">
            {isUp ? "Динамика +" : "Динамика −"}{" "}
            {isUp ? <TrendingUpIcon className="size-3" /> : <TrendingDownIcon className="size-3" />}
          </div>
          <div className="text-muted-foreground line-clamp-1 hidden @[140px]/card:block">
            {isUp ? "Трафик растёт" : "Требует внимания"}
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="truncate text-xs">Позиция в рейтинге</CardDescription>
          <CardTitle className="text-base font-semibold tabular-nums @[160px]/card:text-lg @[200px]/card:text-2xl @[250px]/card:text-3xl">
            {rank != null ? `#${rank}` : "—"}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-0.5 text-xs">
          <div className="line-clamp-1 font-medium">Позиция сайта</div>
          <div className="text-muted-foreground line-clamp-1 hidden @[140px]/card:block">В общем рейтинге</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="truncate text-xs">Лучший день</CardDescription>
          <CardTitle className="text-base font-semibold tabular-nums @[160px]/card:text-lg @[200px]/card:text-2xl @[250px]/card:text-3xl">
            {bestDay ?? "—"}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-0.5 text-xs">
          <div className="line-clamp-1 flex gap-1 font-medium">
            Макс. посещений <TrendingUpIcon className="size-3" />
          </div>
          <div className="text-muted-foreground line-clamp-1 hidden @[140px]/card:block">Наибольший трафик</div>
        </CardFooter>
      </Card>
    </div>
  );
}
