import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { cookies } from "next/headers";
import "./globals.css";

export const dynamic = "force-dynamic";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Trade Ease — Admin Dashboard",
  description: "Lead generation and demo site management",
  icons: { icon: "/logo.svg" },
};

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/scores", label: "Scores" },
  { href: "/demos", label: "Demos" },
  { href: "/outreach", label: "Outreach" },
  { href: "/outreach/approved", label: "Send Queue" },
  { href: "/outreach/followups", label: "Follow-ups" },
  { href: "/clients", label: "Clients" },
];

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const isLoggedIn =
    cookieStore.get("admin_session")?.value === process.env.ADMIN_SESSION_SECRET;

  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex h-screen bg-gray-50">
          {isLoggedIn && (
            <aside className="hidden md:flex w-56 bg-gray-900 text-white flex-col shrink-0">
              <div className="px-6 py-5 border-b border-gray-700">
                <span className="text-lg font-bold tracking-tight">Trade Ease</span>
                <p className="text-xs text-gray-400 mt-0.5">Admin Dashboard</p>
              </div>
              <nav className="flex-1 px-3 py-4 space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <div className="px-6 py-4 border-t border-gray-700">
                <p className="text-xs text-gray-500">tradeeasehq.com</p>
              </div>
            </aside>
          )}

          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {isLoggedIn && (
              <nav className="md:hidden bg-gray-900 text-white flex items-center gap-1 px-3 py-2 overflow-x-auto shrink-0">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="px-3 py-1.5 rounded text-xs text-gray-300 hover:bg-gray-700 hover:text-white whitespace-nowrap transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            )}
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
