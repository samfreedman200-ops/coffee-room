import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono, Crimson_Pro, Fraunces } from "next/font/google";
import "./globals.css";
import { currentUser } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { countUnreadAcrossThreads } from "@/lib/dms";
import { countPendingRequests } from "@/lib/contributors";
import { countPendingSubmissions } from "@/lib/submissions";
import { countOpenReports } from "@/lib/reports";
import { countUnreadNotifications } from "@/lib/notifications";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Crimson Pro: humanist serif. Used for body article text and mid-level
// headlines — readable warmth.
const crimson = Crimson_Pro({
  variable: "--font-crimson",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

// Fraunces variable: display serif with optical-size + soft + weight axes.
// At large sizes the contrast goes high and dramatic — the headline face.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Coffee Room",
  description: "An anonymous blog. Quiet conversations.",
};

function Brandmark() {
  return (
    <Link
      href="/"
      className="group inline-flex items-baseline gap-2 shrink-0"
      aria-label="Coffee Room — home"
    >
      <span aria-hidden className="text-accent text-lg leading-none">
        ✦
      </span>
      <span className="font-serif text-xl tracking-tight text-foreground group-hover:text-accent transition-colors">
        Coffee Room
      </span>
    </Link>
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await currentUser();
  const unreadDms = user ? countUnreadAcrossThreads(user.id) : 0;
  const unreadNotifs = user ? countUnreadNotifications(user.id) : 0;
  const adminPending =
    user?.role === "admin"
      ? countPendingRequests() +
        countPendingSubmissions() +
        countOpenReports()
      : 0;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${crimson.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-line sticky top-0 z-10 bg-background/85 backdrop-blur-md">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
            <Brandmark />
            <nav className="flex items-center gap-3 sm:gap-5 text-xs sm:text-sm text-muted">
              <Link
                href="/search"
                className="hover:text-accent transition-colors"
                aria-label="search"
                title="Search"
              >
                search
              </Link>
              <Link
                href="/new"
                className="hover:text-accent transition-colors"
              >
                write
              </Link>
              {user ? (
                <>
                  <Link
                    href="/feed"
                    className="hover:text-accent hidden sm:inline transition-colors"
                  >
                    feed
                  </Link>
                  <Link
                    href="/notifications"
                    className="hover:text-accent flex items-center gap-1.5 transition-colors"
                    title="Notifications"
                  >
                    <span className="hidden sm:inline">notifications</span>
                    <span aria-hidden className="sm:hidden">
                      ◇
                    </span>
                    {unreadNotifs > 0 ? (
                      <span className="text-[10px] bg-accent text-white rounded-full px-1.5 py-0.5 leading-none font-medium">
                        {unreadNotifs}
                      </span>
                    ) : null}
                  </Link>
                  <Link
                    href="/dm"
                    className="hover:text-accent flex items-center gap-1.5 transition-colors"
                    title="Direct messages"
                  >
                    messages
                    {unreadDms > 0 ? (
                      <span className="text-[10px] bg-accent text-white rounded-full px-1.5 py-0.5 leading-none font-medium">
                        {unreadDms}
                      </span>
                    ) : null}
                  </Link>
                  {user.role === "admin" ? (
                    <Link
                      href="/admin"
                      className="hover:text-accent flex items-center gap-1.5 transition-colors"
                    >
                      admin
                      {adminPending > 0 ? (
                        <span className="text-[10px] bg-accent text-white rounded-full px-1.5 py-0.5 leading-none font-medium">
                          {adminPending}
                        </span>
                      ) : null}
                    </Link>
                  ) : null}
                  <Link
                    href="/me"
                    className="flex items-center gap-2 hover:text-accent transition-colors pl-1"
                  >
                    <Avatar
                      username={user.username}
                      avatarPath={user.avatar_path}
                      size={26}
                    />
                    <span className="hidden sm:inline font-medium text-foreground">
                      @{user.username}
                    </span>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="hover:text-accent transition-colors"
                  >
                    log in
                  </Link>
                  <Link href="/signup" className="btn-accent px-4 py-1.5 text-xs sm:text-sm">
                    sign up
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="flex-1 mx-auto w-full max-w-3xl px-4 sm:px-6 py-10 sm:py-14">
          {children}
        </main>
        <footer className="border-t border-line">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 py-5 flex items-center justify-between text-xs text-muted">
            <span>anonymous by default. accounts optional.</span>
            <span aria-hidden className="text-accent">✦</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
