// Lokalt skårboard for takst-quizen. Lagres i nettleserens localStorage,
// så resultater er kun synlige på samme enhet/nettleser – ikke delt mellom brukere.

export interface LeaderboardEntry {
  name: string;
  score: number;
  total: number;
  timeMs: number;
  date: string;
}

const STORAGE_PREFIX = "takstquiz-leaderboard-v1-";
const MAX_ENTRIES = 5;

function storageKey(total: number) {
  return `${STORAGE_PREFIX}${total}`;
}

function isEntry(v: unknown): v is LeaderboardEntry {
  if (!v || typeof v !== "object") return false;
  const e = v as Record<string, unknown>;
  return (
    typeof e.name === "string" &&
    typeof e.score === "number" &&
    typeof e.total === "number" &&
    typeof e.timeMs === "number" &&
    typeof e.date === "string"
  );
}

function sortEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.timeMs - b.timeMs;
  });
}

export function loadLeaderboard(total: number): LeaderboardEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(total));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortEntries(parsed.filter(isEntry));
  } catch {
    return [];
  }
}

export function addLeaderboardEntry(total: number, entry: LeaderboardEntry): LeaderboardEntry[] {
  const updated = sortEntries([...loadLeaderboard(total), entry]).slice(0, MAX_ENTRIES);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(storageKey(total), JSON.stringify(updated));
    } catch {
      // localStorage utilgjengelig (privat modus e.l.) – ignorer, resultatet vises likevel denne økten.
    }
  }
  return updated;
}

export function formatQuizTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
