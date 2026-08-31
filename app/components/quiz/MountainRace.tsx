"use client";

import MountainPlayerMarker from "./MountainPlayerMarker";
import { MOUNTAIN_HEIGHT, MOUNTAIN_PLAYERS, type MountainPlayer, type MountainStanding } from "@/app/utils/quizMountain";

export interface MountainRaceProps {
  standings: MountainStanding[];
  highlightPlayer?: MountainPlayer;
  justWon?: MountainPlayer | null;
}

const TRACK_HEIGHT = 260;
const TOP_MARGIN = 30;
const BASE_MARGIN = 20;
const CLIMB_HEIGHT = TRACK_HEIGHT - TOP_MARGIN - BASE_MARGIN;

// Horisontal forskyvning per spiller slik at avatarer på samme høyde ikke overlapper helt.
const OFFSETS = [-102, -34, 34, 102];

export default function MountainRace({ standings, highlightPlayer, justWon }: MountainRaceProps) {
  const byPlayer = new Map(standings.map((s) => [s.player, s]));

  return (
    <div className="mountain-race">
      {justWon && (
        <p className="mountain-banner">{justWon} nådde Toppen! 🏔️ Ny runde er i gang.</p>
      )}
      <div className="mountain-track">
        <svg
          className="mountain-shape"
          viewBox="0 0 320 260"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0 260 L110 40 L150 90 L200 20 L320 260 Z"
            fill="var(--panel-2)"
            stroke="var(--border)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
        {MOUNTAIN_PLAYERS.map((player, i) => {
          const standing = byPlayer.get(player) ?? { player, progress: 0, totalWins: 0 };
          const pct = Math.min(1, standing.progress / MOUNTAIN_HEIGHT);
          const bottom = BASE_MARGIN + pct * CLIMB_HEIGHT;

          return (
            <MountainPlayerMarker
              key={player}
              player={player}
              progress={standing.progress}
              totalWins={standing.totalWins}
              totalHeight={MOUNTAIN_HEIGHT}
              bottom={bottom}
              offsetX={OFFSETS[i]}
              isYou={highlightPlayer === player}
              isWinner={justWon === player}
            />
          );
        })}
      </div>
      <style jsx>{`
        .mountain-race {
          margin: 24px 0;
        }
        .mountain-banner {
          margin: 0 0 12px;
          text-align: center;
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--primary-dark);
        }
        .mountain-track {
          position: relative;
          height: ${TRACK_HEIGHT}px;
          border-radius: 16px;
          overflow: hidden;
          background: linear-gradient(to bottom, #dcecf7, var(--card) 85%);
          border: 1px solid var(--border-soft);
        }
        .mountain-shape {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
      `}</style>
    </div>
  );
}
