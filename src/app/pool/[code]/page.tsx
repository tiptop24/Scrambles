import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import PoolClient from "./PoolClient";

interface Props {
  params: Promise<{ code: string }>;
}

// Per-pool metadata means an invite link unfurls in iMessage/WhatsApp/Slack
// with the pool's own name instead of the generic site title — a link that
// looks like a real invite gets opened far more often than a bare URL.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const pool = await prisma.pool.findUnique({ where: { inviteCode: code.toUpperCase() } });

  if (!pool) {
    return { title: "Pool not found — Scrambles" };
  }

  const title = `${pool.name} — Scrambles`;
  const description = `Join "${pool.name}": pick one Premier League team a week, survive a loss and you're out. Last one standing wins.`;

  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: "summary", title, description },
  };
}

export default async function PoolPage({ params }: Props) {
  const { code } = await params;
  return <PoolClient code={code} />;
}
