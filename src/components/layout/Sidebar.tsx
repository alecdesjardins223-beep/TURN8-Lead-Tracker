import {
  LayoutDashboard,
  BookOpen,
  Search,
  Users,
  Settings,
} from "lucide-react";
import { NavItem } from "./NavItem";
import type { NavItem as NavItemType } from "@/types";

const navItems: NavItemType[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Playbooks", href: "/playbooks", icon: BookOpen },
  { label: "Search Profiles", href: "/search-profiles", icon: Search },
  { label: "Leads", href: "/leads", icon: Users },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="flex h-full w-[var(--sidebar-width)] flex-col border-r border-slate-200 bg-white">
      {/* Logo / wordmark */}
      <div className="flex h-14 items-center border-b border-slate-200 px-4">
        <span className="text-sm font-bold tracking-wider text-brand-700 uppercase">
          TURN8
        </span>
        <span className="ml-2 text-sm text-slate-400">Lead Tracker</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.href}>
              <NavItem {...item} />
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-200 px-4 py-3">
        <p className="text-xs text-slate-400">Internal use only</p>
      </div>
    </aside>
  );
}
