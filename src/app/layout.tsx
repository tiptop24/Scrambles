import type { Metadata } from "next";
import "./globals.css";

const title = "Scrambles — Premier League Pick 'Em";
const description =
  "Pick one Premier League team a week. Win and survive, lose and you're out. Last one standing wins.";

// Needed to resolve absolute URLs for the generated OG images below — set
// NEXT_PUBLIC_SITE_URL to the real deployed origin once this is live.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  title,
  description,
  metadataBase: new URL(siteUrl),
  openGraph: { title, description, siteName: "Scrambles" },
  twitter: { card: "summary_large_image", title, description },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="bg-pitch text-white">
            <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
              <a href="/" className="font-extrabold text-lg tracking-tight">
                Scrambles <span className="text-accent">⚽</span>
              </a>
              <span className="text-xs text-white/60 hidden sm:block">
                Premier League Pick &apos;Em
              </span>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="text-center text-xs text-black/40 py-6">
            Pick a winner. Stay alive. Last one standing wins.
          </footer>
        </div>
      </body>
    </html>
  );
}
