// Copy for every share moment in the app. Kept in one place so the voice
// stays consistent — punchy, a little competitive, always ending in the
// invite link so a share is also an invite.

export function inviteMessage(poolName: string, shareUrl: string): string {
  return `⚽ I'm running "${poolName}" — a Premier League pick 'em. Pick one team a week to survive, never repeat a team, last one standing wins. Join me: ${shareUrl}`;
}

export function pickMessage(opts: {
  poolName: string;
  playerName: string;
  teamName: string;
  gameWeekNumber: number;
  shareUrl: string;
}): string {
  const { poolName, playerName, teamName, gameWeekNumber, shareUrl } = opts;
  return `🔒 ${playerName} is riding with ${teamName} in Gameweek ${gameWeekNumber} of "${poolName}". Think you'd survive longer? ${shareUrl}`;
}

export function eliminationMessage(opts: {
  poolName: string;
  playerName: string;
  gameWeekNumber: number;
  weeksSurvived: number;
  goalDifference: number;
  shareUrl: string;
}): string {
  const { poolName, playerName, gameWeekNumber, weeksSurvived, goalDifference, shareUrl } = opts;
  const gd = goalDifference > 0 ? `+${goalDifference}` : `${goalDifference}`;
  return `💀 ${playerName} is OUT of "${poolName}" — eliminated in Gameweek ${gameWeekNumber} after surviving ${weeksSurvived} week${weeksSurvived === 1 ? "" : "s"} (GD ${gd}). Think you can outlast them? ${shareUrl}`;
}

export function gameWeekRecapMessage(opts: {
  poolName: string;
  gameWeekNumber: number;
  survivors: string[];
  eliminated: string[];
  shareUrl: string;
}): string {
  const { poolName, gameWeekNumber, survivors, eliminated, shareUrl } = opts;
  const lines = [`🏆 "${poolName}" — Gameweek ${gameWeekNumber} results are in!`];
  if (survivors.length > 0) {
    lines.push(`✅ Still alive: ${survivors.join(", ")}`);
  }
  if (eliminated.length > 0) {
    lines.push(`💀 Eliminated: ${eliminated.join(", ")}`);
  }
  lines.push(`${survivors.length} player${survivors.length === 1 ? "" : "s"} remain. ${shareUrl}`);
  return lines.join("\n");
}
