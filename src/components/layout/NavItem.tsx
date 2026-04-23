"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem as NavItemType } from "@/types";

export function NavItem({ label, href, icon: Icon }: Omit<NavItemType, "requiredRole">) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn("nav-item", isActive ? "nav-item-active" : "nav-item-inactive")}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </Link>
  );
}
