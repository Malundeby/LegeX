import { createClient } from "@/lib/supabase/client";

/**
 * "Fjellklatring" – delt, asynkron gamification for Takstquiz.
 * Fire faste spillere klatrer et felles fjell (0–10) basert på antall
 * riktige svar (÷5, avrundet ned – 50 riktige totalt til toppen) fra hver
 * fullførte quizrunde.
 * Første til toppen vinner, får en permanent seiersteller, og fjellet
 * nullstilles for alle fire.
 *
 * Lagres i Supabase (tabellen quiz_mountain_players) siden spillerne bruker
 * ulike enheter – i motsetning til poeng-leaderboardet (takstQuizLeaderboard.ts)
 * som er rent lokalt.
 */

export const MOUNTAIN_PLAYERS = ["Anke", "Jo", "Anette", "Valborg"] as const;
export type MountainPlayer = (typeof MOUNTAIN_PLAYERS)[number];
export const MOUNTAIN_HEIGHT = 10;

export interface MountainStanding {
  player: MountainPlayer;
  progress: number;
  totalWins: number;
}

interface MountainRow {
  player: string;
  progress: number;
  total_wins: number;
}

function defaultStandings(): MountainStanding[] {
  return MOUNTAIN_PLAYERS.map((player) => ({ player, progress: 0, totalWins: 0 }));
}

function toStandings(rows: MountainRow[]): MountainStanding[] {
  const byName = new Map(rows.map((r) => [r.player, r]));
  return MOUNTAIN_PLAYERS.map((player) => {
    const row = byName.get(player);
    return {
      player,
      progress: row?.progress ?? 0,
      totalWins: row?.total_wins ?? 0,
    };
  });
}

export async function getMountainStandings(): Promise<MountainStanding[]> {
  if (typeof window === "undefined") return defaultStandings();
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("quiz_mountain_players")
      .select("player, progress, total_wins");
    if (error || !data) return defaultStandings();
    return toStandings(data as MountainRow[]);
  } catch {
    return defaultStandings();
  }
}

export async function resetMountainProgress(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const supabase = createClient();
    await supabase
      .from("quiz_mountain_players")
      .update({ progress: 0, updated_at: new Date().toISOString() })
      .in("player", MOUNTAIN_PLAYERS);
  } catch {
    // Beste innsats – ingen kritisk feil om nullstilling ikke rekker frem.
  }
}

export async function recordMountainWin(player: MountainPlayer): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("quiz_mountain_players")
      .select("total_wins")
      .eq("player", player)
      .single();
    const currentWins = (data as { total_wins: number } | null)?.total_wins ?? 0;
    await supabase
      .from("quiz_mountain_players")
      .update({ total_wins: currentWins + 1 })
      .eq("player", player);
  } catch {
    // Beste innsats – seieren vises uansett i UI selv om telleren ikke lagres.
  }
}

export async function addMountainProgress(
  player: MountainPlayer,
  correctAnswers: number
): Promise<{ standings: MountainStanding[]; winner: MountainPlayer | null }> {
  if (typeof window === "undefined") {
    return { standings: defaultStandings(), winner: null };
  }

  const units = Math.floor(correctAnswers / 5);
  const current = await getMountainStandings();

  if (units <= 0) {
    return { standings: current, winner: null };
  }

  const currentEntry = current.find((s) => s.player === player);
  const newProgress = Math.min(MOUNTAIN_HEIGHT, (currentEntry?.progress ?? 0) + units);

  try {
    const supabase = createClient();
    await supabase
      .from("quiz_mountain_players")
      .update({ progress: newProgress, updated_at: new Date().toISOString() })
      .eq("player", player);
  } catch {
    // Beste innsats – returner likevel oppdaterte tall til UI under.
  }

  if (newProgress >= MOUNTAIN_HEIGHT) {
    await recordMountainWin(player);
    await resetMountainProgress();
    const finalStandings = await getMountainStandings();
    return { standings: finalStandings, winner: player };
  }

  const refreshed = await getMountainStandings();
  return { standings: refreshed, winner: null };
}
