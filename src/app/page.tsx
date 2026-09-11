"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [poolName, setPoolName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createPool(e: React.FormEvent) {
    e.preventDefault();
    if (!poolName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/pools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: poolName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create pool.");
      router.push(`/pool/${data.inviteCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setCreating(false);
    }
  }

  function joinPool(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    router.push(`/pool/${code}`);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-16">
      <section className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-pitch">
          Pick one team. Survive the week.
        </h1>
        <p className="mt-4 text-base sm:text-lg text-black/70 max-w-xl mx-auto">
          Every gameweek, pick one Premier League team to win. Get it right and you live to pick
          again. Lose or draw and you&apos;re out. You can never pick the same team twice all
          season. Last player standing wins — goal difference breaks every tie.
        </p>
      </section>

      <section className="grid sm:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-6">
          <h2 className="font-bold text-lg mb-1">Start a pool</h2>
          <p className="text-sm text-black/60 mb-4">
            Create a private pool, then share the link with friends, family, or your group chat.
          </p>
          <form onSubmit={createPool} className="space-y-3">
            <input
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pitch"
              placeholder="Pool name, e.g. Office Survivor"
              value={poolName}
              onChange={(e) => setPoolName(e.target.value)}
              maxLength={60}
            />
            <button
              type="submit"
              disabled={creating || !poolName.trim()}
              className="w-full rounded-lg bg-pitch text-white font-semibold py-2 text-sm disabled:opacity-40"
            >
              {creating ? "Creating…" : "Create pool"}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-6">
          <h2 className="font-bold text-lg mb-1">Join a pool</h2>
          <p className="text-sm text-black/60 mb-4">
            Got an invite code from a friend? Enter it here to jump in.
          </p>
          <form onSubmit={joinPool} className="space-y-3">
            <input
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-pitch"
              placeholder="INVITE CODE"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              maxLength={8}
            />
            <button
              type="submit"
              disabled={!joinCode.trim()}
              className="w-full rounded-lg bg-black text-white font-semibold py-2 text-sm disabled:opacity-40"
            >
              Go to pool
            </button>
          </form>
        </div>
      </section>

      {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}

      <section className="mt-14 grid sm:grid-cols-3 gap-6 text-sm">
        <Rule title="1. Pick" body="Choose one Premier League team you think will win this gameweek." />
        <Rule title="2. Survive" body="A win keeps you in. A draw or a loss eliminates you — no exceptions." />
        <Rule title="3. No repeats" body="Once you've picked a team, it's gone for the rest of the season." />
      </section>
    </div>
  );
}

function Rule({ title, body }: { title: string; body: string }) {
  return (
    <div className="p-4 rounded-xl bg-white border border-black/5">
      <div className="font-semibold text-pitch mb-1">{title}</div>
      <div className="text-black/60">{body}</div>
    </div>
  );
}
