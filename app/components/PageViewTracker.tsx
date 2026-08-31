"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackPageView } from "@/app/utils/trackEvent";

/**
 * Fires a page_view event on every route change. No cookies involved — see
 * app/api/track/route.ts for the privacy notes on how visits are counted.
 */
export default function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    trackPageView(pathname);
  }, [pathname]);

  return null;
}
