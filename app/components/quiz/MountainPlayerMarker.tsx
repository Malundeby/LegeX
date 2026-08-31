import { MOUNTAIN_AVATARS } from "./MountainAvatars";
import type { MountainPlayer } from "@/app/utils/quizMountain";

export interface MountainPlayerMarkerProps {
  player: MountainPlayer;
  progress: number;
  totalWins: number;
  totalHeight: number;
  bottom: number;
  offsetX: number;
  isYou: boolean;
  isWinner: boolean;
}

/**
 * Egen fil for det dynamisk posisjonerte avatar-merket i fjellklatringen.
 * Holdt utenfor MountainRace.tsx (som bruker styled-jsx) fordi en styled-jsx-
 * komponent som selv rendrer .map()-genererte elementer med inline
 * style={{...}}-interpolasjon fikk Turbopacks styled-jsx-transform til å
 * henge i utvikling – flytting til en egen, styled-jsx-fri komponent løser
 * det. Derfor er all styling her ren inline CSS, ikke <style jsx>.
 */
export default function MountainPlayerMarker({
  player,
  progress,
  totalWins,
  totalHeight,
  bottom,
  offsetX,
  isYou,
  isWinner,
}: MountainPlayerMarkerProps) {
  const Avatar = MOUNTAIN_AVATARS[player];

  return (
    <div
      style={{
        position: "absolute",
        bottom: `${bottom}px`,
        left: `calc(50% + ${offsetX}px)`,
        transform: "translate(-50%, 50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Avatar size={36} state={isWinner ? "celebrating" : "idle"} />
      <span
        style={{
          marginTop: 2,
          fontSize: "0.65rem",
          fontWeight: 700,
          color: isYou ? "var(--primary-text)" : "var(--heading)",
          background: isYou ? "var(--primary)" : "var(--card)",
          borderRadius: 999,
          padding: "1px 6px",
          whiteSpace: "nowrap",
        }}
      >
        {player}
        {totalWins > 0 && ` · 🏆${totalWins}`}
      </span>
      <span style={{ fontSize: "0.6rem", color: "var(--muted)" }}>
        {progress}/{totalHeight}
      </span>
    </div>
  );
}
