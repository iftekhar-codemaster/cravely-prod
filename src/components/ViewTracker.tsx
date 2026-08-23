"use client";

import { useEffect } from "react";
import { trackView } from "@/lib/track";

/** Records a product view (recommendation signal). Renders nothing. */
export default function ViewTracker({ foodId }: { foodId: string }) {
  useEffect(() => {
    const t = setTimeout(() => trackView(foodId), 800); // only count real interest
    return () => clearTimeout(t);
  }, [foodId]);
  return null;
}
