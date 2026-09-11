"use client";

import { useState } from "react";

/**
 * Uses the native share sheet on mobile (the whole point — one tap into
 * iMessage/WhatsApp/Instagram) and falls back to copying the text on desktop
 * browsers that don't support the Web Share API.
 */
export function ShareButton({
  text,
  title = "Scrambles",
  label,
  className = "",
}: {
  text: string;
  title?: string;
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title, text });
        return;
      } catch {
        // user cancelled the share sheet, or share() isn't wired up right —
        // fall through to clipboard so the button still does something.
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — nothing more we can do without a visible prompt */
    }
  }

  return (
    <button onClick={handleShare} className={className}>
      {copied ? "Copied!" : label}
    </button>
  );
}
