"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  Globe,
  LogOut,
  Newspaper,
  Rss,
  Radio,
  Tv,
  BookOpen,
  FileText,
  Mic,
  Podcast,
  Sparkles,
  Megaphone,
  MessageSquare,
  Pen,
  ScrollText,
  Signal,
  Antenna,
  Bookmark,
  Hash,
  AtSign,
  Flame,
  Zap,
  Eye,
  TrendingUp,
  Search,
  Laptop,
  Shield,
  Star,
  Sun,
  Moon,
  Cloud,
  Map,
  Compass,
  Anchor,
  Bell as BellIcon,
  Camera,
  Coffee,
  Heart,
  Music,
  Palette,
  Plane,
  Rocket,
  Umbrella,
  Waves,
  Mountain,
  TreePine,
  Lightbulb,
  Crown,
  Diamond,
  Feather,
} from "lucide-react";

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  sites: [
    { name: "BBC News", url: "#", icon: Globe },
    { name: "CNN", url: "#", icon: Tv },
    { name: "Reuters", url: "#", icon: Newspaper },
    { name: "The Guardian", url: "#", icon: BookOpen },
    { name: "Al Jazeera", url: "#", icon: Radio },
    { name: "Associated Press", url: "#", icon: FileText },
    { name: "The New York Times", url: "#", icon: ScrollText },
    { name: "Washington Post", url: "#", icon: Pen },
    { name: "Bloomberg", url: "#", icon: TrendingUp },
    { name: "The Economist", url: "#", icon: Bookmark },
    { name: "NPR", url: "#", icon: Mic },
    { name: "Vice News", url: "#", icon: Flame },
    { name: "Politico", url: "#", icon: Megaphone },
    { name: "BuzzFeed News", url: "#", icon: Zap },
    { name: "The Verge", url: "#", icon: Signal },
    { name: "TechCrunch", url: "#", icon: Rss },
    { name: "Wired", url: "#", icon: Antenna },
    { name: "Ars Technica", url: "#", icon: Hash },
    { name: "The Atlantic", url: "#", icon: Eye },
    { name: "Vox", url: "#", icon: MessageSquare },
    { name: "Forbes", url: "#", icon: Search },
    { name: "The Hill", url: "#", icon: AtSign },
    { name: "Axios", url: "#", icon: Sparkles },
    { name: "Medium", url: "#", icon: Podcast },
    { name: "Substack", url: "#", icon: FileText },
    { name: "Der Spiegel", url: "#", icon: Shield },
    { name: "Le Monde", url: "#", icon: Star },
    { name: "The Times", url: "#", icon: Sun },
    { name: "Daily Mail", url: "#", icon: Moon },
    { name: "Sky News", url: "#", icon: Cloud },
    { name: "France 24", url: "#", icon: Map },
    { name: "Deutsche Welle", url: "#", icon: Compass },
    { name: "South China Morning Post", url: "#", icon: Anchor },
    { name: "The Japan Times", url: "#", icon: Camera },
    { name: "ABC News", url: "#", icon: Laptop },
    { name: "CBS News", url: "#", icon: Coffee },
    { name: "Fox News", url: "#", icon: Heart },
    { name: "MSNBC", url: "#", icon: Music },
    { name: "The Independent", url: "#", icon: Palette },
    { name: "Financial Times", url: "#", icon: Plane },
    { name: "Wall Street Journal", url: "#", icon: Rocket },
    { name: "USA Today", url: "#", icon: Umbrella },
    { name: "Los Angeles Times", url: "#", icon: Waves },
    { name: "Chicago Tribune", url: "#", icon: Mountain },
    { name: "Toronto Star", url: "#", icon: TreePine },
    { name: "The Sydney Morning Herald", url: "#", icon: Lightbulb },
    { name: "The Hindu", url: "#", icon: Crown },
    { name: "Times of India", url: "#", icon: Diamond },
    { name: "Haaretz", url: "#", icon: Feather },
    { name: "RT News", url: "#", icon: BellIcon },
  ],
};

function NavSites({
  sites,
}: {
  sites: {
    name: string;
    url: string;
    icon: React.ElementType;
  }[];
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Сайты</SidebarGroupLabel>
      <SidebarMenu>
        {sites.map((site) => (
          <SidebarMenuItem key={site.name}>
            <SidebarMenuButton asChild tooltip={site.name}>
              <a href={site.url}>
                <site.icon />
                <span>{site.name}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
}) {
  const { isMobile } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">CN</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <BadgeCheck />
                Аккаунт
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CreditCard />
                Оплата
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Bell />
                Уведомления
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <LogOut />
                Выйти
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="flex flex-row items-center gap-0 p-4">
        <div className="flex flex-1 items-center gap-2 overflow-hidden">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-mdtext-sidebar-primary-foreground">
            <Eye className="size-4" />
          </div>
          <div className="grid leading-tight">
            <span className="truncate font-semibold text-sm">PressWatch</span>
            <span className="truncate text-xs text-muted-foreground">v26.1</span>
          </div>
        </div>
        <SidebarTrigger className="shrink-0" />
      </SidebarHeader>
      <SidebarContent>
        <NavSites sites={data.sites} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
