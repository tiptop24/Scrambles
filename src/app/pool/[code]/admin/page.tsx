"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { PoolOverviewDTO, TeamDTO } from "@/lib/clientTypes";

interface FixtureRow {
  homeTeamId: string;
  awayTeamId: string;
}

export default function AdminPage() {
  const { code } = useParams<{ code: string }>();
  const [overview, setOverview] = useState<PoolOverviewDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/pools/${code}`);
    if (res.ok) setOverview(await res.json());
  }, [code]);

  useEffect(() => {
    load();
  }, [load]);

  if (!overview) {
    return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-black/50">Loading…</div>;
  }

  const gw = overview.currentGameWeek;
  const seasonComplete = overview.gameWeeks.every((g) => g.locked);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <header>
        <h1 className="text-xl font-extrabold text-pitch">{overview.pool.name} — Admin</h1>
        <p className="text-sm text-black/50 mt-1">
          Anyone with this link can manage the pool — no account needed. Keep it to the pool
          organizer.
        </p>
      </header>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {seasonComplete ? (
        <section className="bg-white rounded-2xl border border-black/5 p-6 text-center text-black/60">
          Every gameweek has been played. Season&apos;s over — check the standings on the pool
          page for the final result.
        </section>
      ) : gw.fixtures.length === 0 ? (
        <FixtureBuilder
          code={code}
          gameWeekNumber={gw.number}
          teams={overview.teams}
          busy={busy}
          setBusy={setBusy}
          setError={setError}
          onDone={load}
        />
      ) : (
        <ResultsEntry
          code={code}
          gameWeek={gw}
          busy={busy}
          setBusy={setBusy}
          setError={setError}
          onDone={load}
        />
      )}

      <p className="text-center text-xs text-black/40">
        <Link href={`/pool/${code}`} className="underline">
          Back to pool
        </Link>
      </p>
    </div>
  );
}

function FixtureBuilder({
  code,
  gameWeekNumber,
  teams,
  busy,
  setBusy,
  setError,
  onDone,
}: {
  code: string;
  gameWeekNumber: number;
  teams: TeamDTO[];
  busy: boolean;
  setBusy: (b: boolean) => void;
  setError: (e: string | null) => void;
  onDone: () => void;
}) {
  const [rows, setRows] = useState<FixtureRow[]>([{ homeTeamId: "", awayTeamId: "" }]);

  function updateRow(i: number, field: keyof FixtureRow, value: string) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }

  async function submit() {
    setError(null);
    const validRows = rows.filter((r) => r.homeTeamId && r.awayTeamId);
    if (validRows.length === 0) {
      setError("Add at least one match.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/pools/${code}/gameweeks/${gameWeekNumber}/fixtures`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fixtures: validRows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save fixtures.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bg-white rounded-2xl border border-black/5 p-6 shadow-sm">
      <h2 className="font-bold mb-1">Set fixtures — gameweek {gameWeekNumber}</h2>
      <p className="text-sm text-black/60 mb-4">Add every match happening this gameweek.</p>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-2 gap-2">
            <TeamSelect
              teams={teams}
              value={row.homeTeamId}
              onChange={(v) => updateRow(i, "homeTeamId", v)}
              placeholder="Home team"
            />
            <TeamSelect
              teams={teams}
              value={row.awayTeamId}
              onChange={(v) => updateRow(i, "awayTeamId", v)}
              placeholder="Away team"
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => setRows((prev) => [...prev, { homeTeamId: "", awayTeamId: "" }])}
          className="text-sm text-pitch underline"
        >
          + Add match
        </button>
        <div className="flex-1" />
        <button
          onClick={submit}
          disabled={busy}
          className="rounded-lg bg-pitch text-white font-semibold px-4 py-2 text-sm disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save fixtures"}
        </button>
      </div>
    </section>
  );
}

function TeamSelect({
  teams,
  value,
  onChange,
  placeholder,
}: {
  teams: TeamDTO[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-black/10 px-3 py-2 text-sm bg-white"
    >
      <option value="">{placeholder}</option>
      {teams.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  );
}

function ResultsEntry({
  code,
  gameWeek,
  busy,
  setBusy,
  setError,
  onDone,
}: {
  code: string;
  gameWeek: PoolOverviewDTO["currentGameWeek"];
  busy: boolean;
  setBusy: (b: boolean) => void;
  setError: (e: string | null) => void;
  onDone: () => void;
}) {
  const [scores, setScores] = useState<Record<string, { home: string; away: string }>>({});

  function updateScore(fixtureId: string, side: "home" | "away", value: string) {
    setScores((prev) => ({
      ...prev,
      [fixtureId]: { ...(prev[fixtureId] ?? { home: "", away: "" }), [side]: value },
    }));
  }

  async function submit() {
    setError(null);
    const results = gameWeek.fixtures.map((f) => {
      const s = scores[f.id] ?? { home: "", away: "" };
      return { fixtureId: f.id, homeScore: Number(s.home), awayScore: Number(s.away) };
    });
    const incomplete = gameWeek.fixtures.some((f) => {
      const s = scores[f.id];
      return !s || s.home === "" || s.away === "";
    });
    if (incomplete) {
      setError("Enter a final score for every match before submitting.");
      return;
    }
    if (!confirm("This locks the gameweek and eliminates anyone who didn't win. Continue?")) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/pools/${code}/gameweeks/${gameWeek.number}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save results.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bg-white rounded-2xl border border-black/5 p-6 shadow-sm">
      <h2 className="font-bold mb-1">Enter results — gameweek {gameWeek.number}</h2>
      <p className="text-sm text-black/60 mb-4">
        Submitting locks this gameweek: winners survive, everyone else is eliminated.
      </p>
      <div className="space-y-2">
        {gameWeek.fixtures.map((f) => (
          <div key={f.id} className="flex items-center gap-2 text-sm">
            <span className="flex-1 text-right">{f.homeTeam.name}</span>
            <input
              type="number"
              min={0}
              className="w-14 rounded-lg border border-black/10 px-2 py-1 text-center"
              value={scores[f.id]?.home ?? ""}
              onChange={(e) => updateScore(f.id, "home", e.target.value)}
            />
            <span className="text-black/30">–</span>
            <input
              type="number"
              min={0}
              className="w-14 rounded-lg border border-black/10 px-2 py-1 text-center"
              value={scores[f.id]?.away ?? ""}
              onChange={(e) => updateScore(f.id, "away", e.target.value)}
            />
            <span className="flex-1">{f.awayTeam.name}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-end mt-4">
        <button
          onClick={submit}
          disabled={busy}
          className="rounded-lg bg-pitch text-white font-semibold px-4 py-2 text-sm disabled:opacity-40"
        >
          {busy ? "Submitting…" : "Submit results & lock gameweek"}
        </button>
      </div>
    </section>
  );
}
