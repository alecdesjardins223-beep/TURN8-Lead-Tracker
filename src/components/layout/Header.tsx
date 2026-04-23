import { LogOut } from "lucide-react";

interface HeaderProps {
  userEmail?: string | null;
  userRole?: string;
}

export function Header({ userEmail, userRole }: HeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
      {/* Breadcrumb / page context slot — children can override */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span className="font-medium text-slate-900">TURN8</span>
      </div>

      {/* User info */}
      <div className="flex items-center gap-4">
        {userRole && (
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
            {userRole}
          </span>
        )}
        {userEmail && (
          <span className="text-sm text-slate-600">{userEmail}</span>
        )}
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
