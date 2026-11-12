# The intro's two lines, written out the way 3Blue1Brown's videos write text: ManimGL (Grant
# Sanderson's own Manim), TexText in LaTeX's Computer Modern, and ManimGL's Write (each glyph's
# outline drawn, then filled, sweeping left to right). "Click a quadrant to read that section."
# is written, held, faded; then "Click again to go back." is written at the same size and pace.
# Rendered once to public/intro/hint.mp4 (and hint-vertical.mp4 for phones), which the intro
# (src/app/_components/Intro.tsx) plays. Not part of the site's build.
#
# The only departures from ManimGL's defaults: the Write timings below, and custom_config.yml
# next to this file (60 fps, 3b1b's frame rate, and a black background, where ManimGL's default
# canvas is #333333, to match the intro's black screen).
#
# To re-render (needs a TeX install with latex and dvisvgm, e.g. MacTeX):
#   uv venv --python 3.12 .venv-manimgl
#   uv pip install --python .venv-manimgl/bin/python manimgl "setuptools<81"
#   cd tools/intro    (so ManimGL picks up custom_config.yml)
#   M=../../.venv-manimgl/bin/manimgl; O=/tmp/manimgl
#   $M hint.py HintWrite -w --hd --file_name hint --video_dir $O
#   $M hint.py HintWriteVertical -w -r 1080x1920 --file_name hint-vertical --video_dir $O
#   $M hint.py HintStill -w --hd --file_name hint-still --video_dir $O
#   $M hint.py HintStillVertical -w -r 1080x1920 --file_name hint-vertical-still --video_dir $O
# Then move each video's index to the front (Safari won't start a video promptly without it)
# and save the stills (shown instead if a browser won't autoplay):
#   for f in hint hint-vertical; do
#     ffmpeg -i $O/$f.mp4 -c copy -movflags +faststart ../../public/intro/$f.mp4
#     ffmpeg -i $O/$f-still.mp4 -frames:v 1 ../../public/intro/$f.png
#   done
# (ManimGL 1.7.2's --fps flag is broken, hence the config file; its -s doesn't save a frame,
# hence the stills as moments of video.)
#
# If the length changes, update the timeline in src/app/globals.css ("Intro") and DONE_MS in
# Intro.tsx.

from manimlib import DOWN, FRAME_WIDTH, FadeOut, Scene, TexText, VGroup, Write

FIRST = "Click a quadrant to read that section."
FIRST_LINES = ("Click a quadrant", "to read that section.")  # on phones
SECOND = "Click again to go back."

# Timings (seconds). The video is LEAD + WRITE_FIRST + HOLD + FADE + GAP + WRITE_SECOND + HOLD.
LEAD, WRITE_FIRST, HOLD, FADE, GAP, WRITE_SECOND = 0.25, 2.3, 0.8, 0.5, 0.15, 1.5


def sentences(vertical: bool):
    """Both sentences at the same type size: the first fitted to the frame, the second scaled by
    the same factor."""
    if vertical:
        first = VGroup(*(TexText(line) for line in FIRST_LINES)).arrange(DOWN, buff=0.3)
        width = FRAME_WIDTH * 0.6
    else:
        first = TexText(FIRST)
        width = FRAME_WIDTH * 0.36
    second = TexText(SECOND)
    k = width / first.get_width()
    first.scale(k)
    second.scale(k)
    return first, second


class _Write(Scene):
    vertical = False

    def construct(self):
        first, second = sentences(self.vertical)
        self.wait(LEAD)
        self.play(Write(first, run_time=WRITE_FIRST))
        self.wait(HOLD)
        self.play(FadeOut(first, run_time=FADE))
        self.wait(GAP)
        self.play(Write(second, run_time=WRITE_SECOND))
        self.wait(HOLD)


class HintWrite(_Write):
    pass


class HintWriteVertical(_Write):
    """For phones, rendered portrait with `-r 1080x1920`. Same timing as HintWrite."""

    vertical = True


class _Still(Scene):
    """Both sentences at once, for the intro to show if a browser won't play the video."""

    vertical = False

    def construct(self):
        first, second = sentences(self.vertical)
        self.add(VGroup(first, second).arrange(DOWN, buff=0.7))
        self.wait(0.1)  # rendered as a moment of video; its frame is saved as the still


class HintStill(_Still):
    pass


class HintStillVertical(_Still):
    vertical = True
