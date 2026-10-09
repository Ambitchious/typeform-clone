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
const QUESTION_SIZE = { sm: "20px", md: "clamp(22px, 2.4vw, 26px)", lg: "clamp(26px, 3.2vw, 34px)" };
const WELCOME_SIZE = { sm: "clamp(28px, 3vw, 36px)", md: "clamp(32px, 4vw, 48px)", lg: "clamp(36px, 5vw, 64px)" };

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
    "--tf-q-size": QUESTION_SIZE[theme.question_size],
    "--tf-w-size": WELCOME_SIZE[theme.welcome_size],
    "--tf-w-align": theme.welcome_align,
    "--tf-w-items": theme.welcome_align === "center" ? "center" : "flex-start",
    backgroundImage: theme.background_image_url ? `url("${theme.background_image_url}")` : undefined,
  } as CSSProperties;
}

/** Alignment changes layout (badge placement, button rows), so it is a class rather than a variable. */
export const themeClass = (theme: Theme) => (theme.question_align === "center" ? "tf tf-q-center" : "tf");
