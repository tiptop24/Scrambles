import type { Metadata } from "next";
import "./globals.css";

const title = "Scrambles — Premier League Pick 'Em";
const description =
  "Pick one Premier League team a week. Win and survive, lose and you're out. Last one standing wins.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, siteName: "Scrambles" },
  twitter: { card: "summary", title, description },
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
