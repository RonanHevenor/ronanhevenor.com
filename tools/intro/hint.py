# The intro's "Click a quadrant to read that section", written out the way 3Blue1Brown's videos
# write text: ManimGL (Grant Sanderson's own Manim), TexText in LaTeX's Computer Modern, and
# ManimGL's Write (each glyph's outline drawn, then filled, sweeping left to right), slowed to
# 4 seconds. Rendered once to public/intro/hint.mp4, which the intro (src/app/_components/Intro.tsx)
# plays. Not part of the site's build.
#
# The only departure from ManimGL's defaults is in custom_config.yml next to this file: 60 fps
# (3b1b's frame rate) and a black background (ManimGL's default canvas is #333333) to match the
# intro's black screen.
#
# To re-render (needs a TeX install with latex and dvisvgm, e.g. MacTeX):
#   uv venv --python 3.12 .venv-manimgl
#   uv pip install --python .venv-manimgl/bin/python manimgl "setuptools<81"
#   cd tools/intro && ../../.venv-manimgl/bin/manimgl hint.py HintWrite -w --hd \
#     --file_name hint --video_dir /tmp/manimgl && cp /tmp/manimgl/hint.mp4 ../../public/intro/
# (Run it from tools/intro so ManimGL picks up custom_config.yml. ManimGL 1.7.2's --fps flag is
# broken, hence the config file.)
#
# If the length changes, update the timeline in src/app/globals.css ("Intro").

from manimlib import FRAME_WIDTH, Scene, TexText, Write


class HintWrite(Scene):
    def construct(self):
        hint = TexText("Click a quadrant to read that section")
        hint.set_width(FRAME_WIDTH * 0.55)
        self.wait(0.25)
        # ManimGL's own Write, as in 3b1b's videos, just slower: 4 s instead of its default 2
        self.play(Write(hint, run_time=4))
        self.wait(0.6)
