import type { CSSProperties } from "react";
import type { Theme } from "./types";

export const FONTS: Record<string, string> = {
  Inter: "var(--font-inter)",
  Karla: "var(--font-karla)",
  Montserrat: "var(--font-montserrat)",
  "Source Sans 3": "var(--font-source-sans)",
  "Playfair Display": "var(--font-playfair)",
  "Space Grotesk": "var(--font-space-grotesk)",
};

const RADIUS = { square: "0px", rounded: "8px", pill: "999px" };

/** Turns a theme into CSS variables; everything else (faded descriptions, answer tints,
 *  selected rings) is derived with color-mix, the way Typeform derives them from a few colours. */
export function themeVars(theme: Theme): CSSProperties {
  return {
    "--tf-bg": theme.background_color,
    "--tf-q": theme.question_color,
    "--tf-a": theme.answer_color,
    "--tf-btn": theme.button_color,
    "--tf-btn-text": theme.button_text_color,
    "--tf-radius": RADIUS[theme.corner_radius],
    "--tf-font": `${FONTS[theme.font] ?? FONTS.Inter}, system-ui, sans-serif`,
    backgroundImage: theme.background_image_url ? `url("${theme.background_image_url}")` : undefined,
  } as CSSProperties;
}
