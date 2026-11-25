import type { ComponentType, ReactNode } from "react";
import type { MountainPlayer } from "@/app/utils/quizMountain";

export interface MountainAvatarProps {
  size?: number;
  state?: "idle" | "climbing" | "celebrating";
  className?: string;
}

function ArmsDown() {
  return (
    <>
      <path d="M17 33c-3 1-5 4-5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M31 33c3 1 5 4 5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </>
  );
}

function ArmsUp() {
  return (
    <>
      <path d="M17 33c-4-2-6-6-6-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M31 33c4-2 6-6 6-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </>
  );
}

function SmurfAvatar({
  size = 48,
  state = "idle",
  className,
  accessory,
}: MountainAvatarProps & { accessory?: ReactNode }) {
  const arms = state === "idle" ? <ArmsDown /> : <ArmsUp />;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      role="img"
      aria-hidden="true"
    >
      {/* body */}
      <path
        d="M14 46c0-8 4.5-13 10-13s10 5 10 13"
        fill="var(--mountain-blue)"
        stroke="var(--mountain-blue-dark)"
        strokeWidth="1.5"
      />
      {arms}
      {/* head */}
      <circle
        cx="24"
        cy="21"
        r="11"
        fill="var(--mountain-blue)"
        stroke="var(--mountain-blue-dark)"
        strokeWidth="1.5"
      />
      {/* white smurf hat */}
      <path
        d="M14 18c0-7 20-7 20 0-3-2-17-2-20 0z"
        fill="#fff"
        stroke="var(--mountain-blue-dark)"
        strokeWidth="1.2"
      />
      {/* eyes */}
      <circle cx="20" cy="22" r="1.4" fill="#20323f" />
      <circle cx="28" cy="22" r="1.4" fill="#20323f" />
      {accessory}
      {state === "celebrating" && (
        <path
          d="M24 4l1.2 2.6L28 8l-2.8 1.4L24 12l-1.2-2.6L20 8l2.8-1.4z"
          fill="#f5c342"
        />
      )}
    </svg>
  );
}

function AnkeAvatar(props: MountainAvatarProps) {
  return (
    <SmurfAvatar
      {...props}
      accessory={
        <>
          <circle cx="12.5" cy="19" r="2.4" fill="var(--mountain-blue)" stroke="var(--mountain-blue-dark)" strokeWidth="1.2" />
          <circle cx="35.5" cy="19" r="2.4" fill="var(--mountain-blue)" stroke="var(--mountain-blue-dark)" strokeWidth="1.2" />
          <path d="M15 40c3-2 15-2 18 0v6H15z" fill="#e07bb0" />
        </>
      }
    />
  );
}

function JoAvatar(props: MountainAvatarProps) {
  return (
    <SmurfAvatar
      {...props}
      accessory={<path d="M20.5 25.5c1.5 1 5.5 1 7 0" stroke="#20323f" strokeWidth="1.4" strokeLinecap="round" fill="none" />}
    />
  );
}

function AnetteAvatar(props: MountainAvatarProps) {
  return (
    <SmurfAvatar
      {...props}
      accessory={
        <>
          <path d="M12 24c-1 4-1 8 1 11" stroke="var(--mountain-blue-dark)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          <path d="M36 24c1 4 1 8-1 11" stroke="var(--mountain-blue-dark)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          <path d="M24 13l-3-2 3-1 3 1z" fill="#d2495c" stroke="#a83346" strokeWidth="0.8" />
        </>
      }
    />
  );
}

function ValborgAvatar(props: MountainAvatarProps) {
  return (
    <SmurfAvatar
      {...props}
      accessory={
        <>
          <circle cx="20" cy="22" r="3" fill="none" stroke="#20323f" strokeWidth="1.2" />
          <circle cx="28" cy="22" r="3" fill="none" stroke="#20323f" strokeWidth="1.2" />
          <path d="M23 22h2" stroke="#20323f" strokeWidth="1.2" />
          <path d="M16 17c2-5 14-5 16 0-3-3-13-3-16 0z" fill="#fff" stroke="var(--mountain-blue-dark)" strokeWidth="1.2" />
        </>
      }
    />
  );
}

export const MOUNTAIN_AVATARS: Record<MountainPlayer, ComponentType<MountainAvatarProps>> = {
  Anke: AnkeAvatar,
  Jo: JoAvatar,
  Anette: AnetteAvatar,
  Valborg: ValborgAvatar,
};
