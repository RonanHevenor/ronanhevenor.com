// The intro plays only on someone's first visit ever. When it plays, Intro.tsx sets this cookie;
// with it, the layout leaves the intro out entirely (no overlay, no video download) and marks
// <html> "no-intro" (so the bottom link doesn't do its intro fade-in).
export const INTRO_SEEN_COOKIE = "you_know_how_to_use_my_website";
// 400 days, the longest a browser keeps a cookie (Chrome's cap).
export const INTRO_SEEN_MAX_AGE = 400 * 24 * 60 * 60;
