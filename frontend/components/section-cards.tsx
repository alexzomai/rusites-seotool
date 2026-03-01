"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUpIcon, TrendingDownIcon } from "lucide-react";

interface Analytics {
  visits_today: number | null;
  change_pct: number | null;
  rank_today: number | null;
  best_weekday: string | null;
}

export function SectionCards({ analytics }: { analytics: Analytics | null }) {
  const visits = analytics?.visits_today;
  const changePct = analytics?.change_pct;
  const rank = analytics?.rank_today;
  const bestDay = analytics?.best_weekday;

  const pctLabel = changePct != null ? `${changePct >= 0 ? "+" : ""}${changePct.toFixed(1)}%` : "—";
  const isUp = (changePct ?? 0) >= 0;

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Посетители сегодня</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {visits != null ? visits.toLocaleString("ru-RU") : "—"}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {isUp ? <TrendingUpIcon /> : <TrendingDownIcon />}
              {pctLabel}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {isUp ? "Рост трафика" : "Снижение трафика"} {isUp ? <TrendingUpIcon className="size-4" /> : <TrendingDownIcon className="size-4" />}
          </div>
          <div className="text-muted-foreground">По сравнению с предыдущим днём</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Изменение</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {pctLabel}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {isUp ? <TrendingUpIcon /> : <TrendingDownIcon />}
              {pctLabel}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {isUp ? "Положительная динамика" : "Отрицательная динамика"} {isUp ? <TrendingUpIcon className="size-4" /> : <TrendingDownIcon className="size-4" />}
          </div>
          <div className="text-muted-foreground">{isUp ? "Трафик растёт" : "Требует внимания"}</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Позиция в рейтинге</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {rank != null ? `#${rank}` : "—"}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingUpIcon />
              Топ
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Текущая позиция сайта
          </div>
          <div className="text-muted-foreground">В общем рейтинге</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Лучший день</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {bestDay ?? "—"}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingUpIcon />
              Пик
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Максимум посещений <TrendingUpIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">День недели с наибольшим трафиком</div>
        </CardFooter>
      </Card>
    </div>
  );
}
