import type { Metadata } from "next";
import { cookies } from "next/headers";

export const metadata: Metadata = { title: "Sign In | TURN8 Lead Tracker" };

export default async function LoginPage() {
  const cookieStore = await cookies();
  // NextAuth stores the CSRF token as "token|hash" in this cookie
  const csrfToken = cookieStore.get("next-auth.csrf-token")?.value?.split("|")[0] ?? "";
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          {/* Wordmark */}
          <div className="mb-8 text-center">
            <span className="text-xl font-bold tracking-widest text-brand-700 uppercase">
              TURN8
            </span>
            <p className="mt-1 text-sm text-slate-500">Lead Tracker</p>
          </div>

          <h1 className="mb-2 text-center text-lg font-semibold text-slate-900">
            Sign in to your account
          </h1>
          <p className="mb-6 text-center text-sm text-slate-500">
            Enter your email to receive a sign-in link
          </p>

          <form
            action="/api/auth/signin/email"
            method="POST"
            className="space-y-4"
          >
            <input name="csrfToken" type="hidden" value={csrfToken} />
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="you@turn8.io"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-colors"
            >
              Send sign-in link
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Internal use only — TURN8
        </p>
      </div>
    </div>
  );
}
