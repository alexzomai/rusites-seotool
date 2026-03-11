"use client";

import * as React from "react";
import Image from "next/image";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { faviconSrc } from "@/lib/favicon";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const LIMIT = 50;

export interface Site {
  id: number;
  slug: string;
  domain: string | null;
  title: string | null;
}

interface SiteWithVisits {
  site: Site;
  visits: number | null;
}

interface SiteSearchListProps {
  onSelect: (site: Site) => void;
  excludeIds?: Set<number>;
}

export function SiteSearchList({ onSelect, excludeIds }: SiteSearchListProps) {
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [sites, setSites] = React.useState<SiteWithVisits[]>([]);
  const [skip, setSkip] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  const loadingRef = React.useRef(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  React.useEffect(() => {
    setSites([]);
    setSkip(0);
    setHasMore(true);
  }, [debouncedQuery]);

  const fetchSites = React.useCallback(async (currentSkip: number, q: string) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/sites?q=${encodeURIComponent(q)}&skip=${currentSkip}&limit=${LIMIT}`);
      const batch: SiteWithVisits[] = await res.json();
      setSites((prev) => (currentSkip === 0 ? batch : [...prev, ...batch]));
      setSkip(currentSkip + batch.length);
      setHasMore(batch.length === LIMIT);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchSites(0, debouncedQuery);
  }, [debouncedQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
          fetchSites(skip, debouncedQuery);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, skip, debouncedQuery, fetchSites]);

  const filtered = excludeIds ? sites.filter((s) => !excludeIds.has(s.site.id)) : sites;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск сайта..."
          className="pl-8"
          autoFocus
        />
      </div>
      <div className="max-h-72 overflow-y-auto rounded-md border">
        {filtered.map((item) => (
          <button
            key={item.site.id}
            type="button"
            onClick={() => onSelect(item.site)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
          >
            <Image
              src={faviconSrc(item.site.slug)}
              alt=""
              width={14}
              height={14}
              className="shrink-0 rounded-sm"
              unoptimized
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/globe.svg";
              }}
            />
            <span className="truncate max-w-[40ch]">{item.site.title ?? item.site.slug}</span>
          </button>
        ))}
        {loading && <div className="px-3 py-2 text-xs text-muted-foreground">Загрузка...</div>}
        <div ref={sentinelRef} className="h-1" />
      </div>
    </div>
  );
}
