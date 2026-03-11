"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Eye, Search } from "lucide-react";
import Image from "next/image";
import { faviconSrc } from "@/lib/favicon";
import { useSiteContext } from "@/lib/site-context";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const LIMIT = 39;

interface Site {
  id: number;
  slug: string;
  domain: string | null;
  title: string | null;
}

interface SiteWithVisits {
  site: Site;
  visits: number | null;
}

function HoverLabel({ domain, title }: { domain: string; title: string | null }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <span className="truncate" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {hovered && title ? title : domain}
    </span>
  );
}

function NavSites({ query }: { query: string }) {
  const { siteId, setSite } = useSiteContext();
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [sites, setSites] = React.useState<SiteWithVisits[]>([]);
  const [skip, setSkip] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  const loadingRef = React.useRef(false);

  // Debounce 300ms
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Сброс при новом запросе
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

  // Первая загрузка / при смене запроса
  React.useEffect(() => {
    fetchSites(0, debouncedQuery);
  }, [debouncedQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Инфинит скрол
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

  return (
    <SidebarGroup>
      <SidebarMenu>
        {sites.map((item) => {
          const domain = (item.site.domain ?? item.site.slug).replace(/^www\./, "").replace(/\/$/, "");
          return (
            <SidebarMenuItem key={item.site.id}>
              <SidebarMenuButton
                tooltip={item.site.title ?? domain}
                isActive={siteId === item.site.id}
                onClick={() => setSite(item.site)}
              >
                <Image
                  src={faviconSrc(item.site.slug)}
                  alt=""
                  width={16}
                  height={16}
                  className="shrink-0 rounded-sm"
                  unoptimized
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "/globe.svg";
                  }}
                />
                <HoverLabel domain={domain} title={item.site.title} />
                {item.visits != null && (
                  <span className="ml-auto text-xs text-muted-foreground shrink-0">
                    {item.visits.toLocaleString("ru")}
                  </span>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
        {loading && (
          <SidebarMenuItem>
            <span className="px-2 py-1 text-xs text-muted-foreground">Загрузка...</span>
          </SidebarMenuItem>
        )}
        <div ref={sentinelRef} className="h-1" />
      </SidebarMenu>
    </SidebarGroup>
  );
}

function AppSidebarInner() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [query, setQuery] = React.useState("");

  return (
    <>
      <SidebarHeader className="p-4 gap-2">
        <div className="flex flex-row items-center gap-0">
          <div className="flex flex-1 items-center gap-2 overflow-hidden">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-sidebar-primary-foreground">
              <Eye className="size-4" />
            </div>
            <div className="grid leading-tight">
              <span className="truncate font-semibold text-sm">RuSites SEOtool</span>
              <span className="truncate text-xs text-muted-foreground">v26.1</span>
            </div>
          </div>
          <SidebarTrigger className="shrink-0" />
        </div>
        {!collapsed && (
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск..."
              className="h-7 pl-7 text-sm"
            />
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <NavSites query={query} />
      </SidebarContent>
      <SidebarRail />
    </>
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <AppSidebarInner />
    </Sidebar>
  );
}
