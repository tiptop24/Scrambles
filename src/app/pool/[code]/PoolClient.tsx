"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { PoolOverviewDTO } from "@/lib/clientTypes";
import { ShareButton } from "@/components/ShareButton";
import { inviteMessage, pickMessage, eliminationMessage } from "@/lib/shareText";

function playerStorageKey(code: string) {
  return `scrambles:player:${code}`;
}

export default function PoolClient({ code }: { code: string }) {
  const [overview, setOverview] = useState<PoolOverviewDTO | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [joinName, setJoinName] = useState("");
  const [joining, setJoining] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const [pickingTeamId, setPickingTeamId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/pools/${code}`);
    if (res.status === 404) {
      setNotFound(true);
      return;
    }
    const data = await res.json();
    setOverview(data);
  }, [code]);

  useEffect(() => {
    setPlayerId(localStorage.getItem(playerStorageKey(code)));
    load();
  }, [code, load]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinName.trim()) return;
    setJoining(true);
    try {
      const res = await fetch(`/api/pools/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: joinName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem(playerStorageKey(code), data.playerId);
      setPlayerId(data.playerId);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not join pool.");
    } finally {
      setJoining(false);
    }
  }

  async function handlePick(teamId: string) {
    if (!overview || !playerId) return;
    setPickError(null);
    setPickingTeamId(teamId);
    try {
      const res = await fetch(`/api/pools/${code}/picks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, gameWeekId: overview.currentGameWeek.id, teamId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await load();
    } catch (err) {
      setPickError(err instanceof Error ? err.message : "Could not save pick.");
    } finally {
      setPickingTeamId(null);
    }
  }

  if (notFound) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-bold">Pool not found</h1>
        <p className="text-black/60 mt-2">Double check the invite code and try again.</p>
        <Link href="/" className="text-pitch underline mt-4 inline-block">
          Back home
        </Link>
      </div>
    );
  }

  if (!overview) {
    return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-black/50">Loading…</div>;
  }

  const me = overview.players.find((p) => p.id === playerId) ?? null;
  const myStanding = overview.standings.find((s) => s.playerId === playerId) ?? null;
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/pool/${code}` : "";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-pitch">{overview.pool.name}</h1>
          <p className="text-sm text-black/50 mt-1">
            Gameweek {overview.currentGameWeek.number} of {overview.gameWeeks.length}
          </p>
        </div>
        <ShareBox
          inviteCode={overview.pool.inviteCode}
          shareUrl={shareUrl}
          poolName={overview.pool.name}
        />
      </header>

      {!me && (
        <section className="bg-white rounded-2xl border border-black/5 p-6 shadow-sm">
          <h2 className="font-bold mb-1">Join this pool</h2>
          <p className="text-sm text-black/60 mb-4">Enter your name to start picking.</p>
          <form onSubmit={handleJoin} className="flex gap-2 flex-wrap">
            <input
              className="flex-1 min-w-[160px] rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pitch"
              placeholder="Your name"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              maxLength={40}
            />
            <button
              disabled={joining || !joinName.trim()}
              className="rounded-lg bg-pitch text-white font-semibold px-4 py-2 text-sm disabled:opacity-40"
            >
              {joining ? "Joining…" : "Join"}
            </button>
          </form>
        </section>
      )}

      {me && (
        <PickBoard
          overview={overview}
          me={me}
          myStanding={myStanding}
          onPick={handlePick}
          pickingTeamId={pickingTeamId}
          pickError={pickError}
          shareUrl={shareUrl}
        />
      )}

      <StandingsTable overview={overview} meId={playerId} />

      <p className="text-center text-xs text-black/40">
        Running this pool?{" "}
        <Link href={`/pool/${code}/admin`} className="underline">
          Manage fixtures &amp; results
        </Link>
      </p>
    </div>
  );
}

function ShareBox({
  inviteCode,
  shareUrl,
  poolName,
}: {
  inviteCode: string;
  shareUrl: string;
  poolName: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-black/5 px-4 py-3 text-sm shadow-sm">
      <div className="text-black/50 text-xs mb-1">Invite code</div>
      <div className="font-mono font-bold tracking-widest text-lg">{inviteCode}</div>
      <ShareButton
        text={inviteMessage(poolName, shareUrl)}
        title={`Join ${poolName} on Scrambles`}
        label="Invite friends"
        className="mt-1 text-xs text-pitch underline block"
      />
    </div>
  );
}

function PickBoard({
  overview,
  me,
  myStanding,
  onPick,
  pickingTeamId,
  pickError,
  shareUrl,
}: {
  overview: PoolOverviewDTO;
  me: PoolOverviewDTO["players"][number];
  myStanding: PoolOverviewDTO["standings"][number] | null;
  onPick: (teamId: string) => void;
  pickingTeamId: string | null;
  pickError: string | null;
  shareUrl: string;
}) {
  const gw = overview.currentGameWeek;
  const poolName = overview.pool.name;

  if (me.eliminated) {
    return (
      <section className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
        <h2 className="font-bold text-red-700">You&apos;re out</h2>
        <p className="text-sm text-red-700/70 mt-1">
          Eliminated in gameweek {me.eliminatedWeekNo}. Keep an eye on your goal difference — it
          still counts toward your final rank.
        </p>
        <ShareButton
          text={eliminationMessage({
            poolName,
            playerName: me.name,
            gameWeekNumber: me.eliminatedWeekNo ?? gw.number,
            weeksSurvived: myStanding?.weeksSurvived ?? 0,
            goalDifference: myStanding?.cumulativeGoalDifference ?? 0,
            shareUrl,
          })}
          title={`Eliminated from ${poolName}`}
          label="Share your elimination"
          className="mt-4 inline-block rounded-lg bg-red-700 text-white font-semibold px-4 py-2 text-sm"
        />
      </section>
    );
  }

  if (gw.fixtures.length === 0) {
    return (
      <section className="bg-white rounded-2xl border border-black/5 p-6 text-center text-black/60 text-sm">
        Fixtures for gameweek {gw.number} haven&apos;t been added yet. Check back soon.
      </section>
    );
  }

  if (me.pickForCurrentWeek) {
    const team = overview.teams.find((t) => t.id === me.pickForCurrentWeek!.teamId);
    return (
      <section className="bg-white rounded-2xl border border-black/5 p-6 shadow-sm">
        <h2 className="font-bold mb-1">Your pick — gameweek {gw.number}</h2>
        <p className="text-2xl font-extrabold text-pitch mt-2">{team?.name ?? "Unknown team"}</p>
        <p className="text-sm text-black/50 mt-1">
          {gw.locked ? "Result is in — check the standings below." : "Locked in. Good luck!"}
        </p>
        {team && (
          <ShareButton
            text={pickMessage({
              poolName,
              playerName: me.name,
              teamName: team.name,
              gameWeekNumber: gw.number,
              shareUrl,
            })}
            title={`My pick in ${poolName}`}
            label="Share your pick"
            className="mt-4 inline-block rounded-lg bg-pitch text-white font-semibold px-4 py-2 text-sm"
          />
        )}
      </section>
    );
  }

  return (
    <section className="bg-white rounded-2xl border border-black/5 p-6 shadow-sm">
      <h2 className="font-bold mb-1">Make your pick — gameweek {gw.number}</h2>
      <p className="text-sm text-black/60 mb-4">
        Pick a winner. You can&apos;t pick a team you&apos;ve already used.
      </p>
      {pickError && <p className="text-sm text-red-600 mb-3">{pickError}</p>}
      <div className="space-y-2">
        {gw.fixtures.map((f) => (
          <div key={f.id} className="grid grid-cols-2 gap-2">
            {[f.homeTeam, f.awayTeam].map((team) => {
              const used = me.usedTeamIds.includes(team.id);
              return (
                <button
                  key={team.id}
                  disabled={used || pickingTeamId !== null || gw.locked}
                  onClick={() => onPick(team.id)}
                  className={`rounded-lg border px-3 py-3 text-sm font-semibold text-left transition
                    ${used ? "bg-black/5 text-black/30 cursor-not-allowed" : "border-black/10 hover:border-pitch hover:bg-pitch/5"}
                    ${pickingTeamId === team.id ? "opacity-50" : ""}`}
                >
                  {team.name}
                  {used && <span className="block text-xs font-normal">already picked</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

function StandingsTable({
  overview,
  meId,
}: {
  overview: PoolOverviewDTO;
  meId: string | null;
}) {
  return (
    <section>
      <h2 className="font-bold mb-3">Standings</h2>
      <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-black/5 text-black/50 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Player</th>
              <th className="text-right px-4 py-2">Status</th>
              <th className="text-right px-4 py-2">GD</th>
            </tr>
          </thead>
          <tbody>
            {overview.standings.map((row) => (
              <tr
                key={row.playerId}
                className={`border-t border-black/5 ${row.playerId === meId ? "bg-accent/10" : ""}`}
              >
                <td className="px-4 py-2 font-medium">
                  {row.name}
                  {row.playerId === meId && <span className="text-black/40 text-xs"> (you)</span>}
                </td>
                <td className="px-4 py-2 text-right">
                  {row.alive ? (
                    <span className="text-emerald-600 font-semibold">Alive</span>
                  ) : (
                    <span className="text-black/40">Out — GW{row.eliminatedWeekNo}</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right font-mono">
                  {row.cumulativeGoalDifference > 0 ? "+" : ""}
                  {row.cumulativeGoalDifference}
                </td>
              </tr>
            ))}
            {overview.standings.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-black/40">
                  No players yet — be the first to join!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
