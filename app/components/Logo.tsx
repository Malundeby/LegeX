/** Placeholder logo: a medical cross with a pulse line, in the theme colour. */
export default function Logo({ size = 34, title }: { size?: number; title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className="site-logo"
    >
      <rect width="32" height="32" rx="9" fill="var(--primary, #b5573f)" />
      <path d="M12.5 5.5h7v7h7v7h-7v7h-7v-7h-7v-7h7z" fill="var(--primary-text, #faf5ec)" />
      <path
        d="M6.5 16h6l1.6-3.4 2.6 7 1.8-3.6h7"
        fill="none"
        stroke="var(--primary, #b5573f)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
