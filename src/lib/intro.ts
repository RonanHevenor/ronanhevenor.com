// The intro plays only on a first visit (or the first in a week). When it plays, Intro.tsx sets this cookie;
// with it, the layout leaves the intro out entirely (no overlay, no video download) and marks
// <html> "no-intro" (so the bottom link doesn't do its intro fade-in).
export const INTRO_SEEN_COOKIE = "you_know_how_to_use_my_website";
// A week: after that, a returning visitor sees the intro again.
export const INTRO_SEEN_MAX_AGE = 7 * 24 * 60 * 60;
