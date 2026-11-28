import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="7" fill="#b5573f" />
        <path d="M12.5 5.5h7v7h7v7h-7v7h-7v-7h-7v-7h7z" fill="#faf5ec" />
        <path
          d="M6.5 16h6l1.6-3.4 2.6 7 1.8-3.6h7"
          fill="none"
          stroke="#b5573f"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    {
      ...size
    }
  );
}
