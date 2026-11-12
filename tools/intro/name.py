# The intro's "Ronan Hevenor", written out the way 3Blue1Brown's videos write text: ManimGL
# (Grant Sanderson's own Manim), TexText in LaTeX's Computer Modern, and Write with ManimGL's
# defaults (each glyph's outline drawn, then filled, sweeping left to right). Rendered once to
# public/intro/name.mp4, which the intro (src/app/_components/Intro.tsx) plays. Not part of the
# site's build.
#
# The only departure from ManimGL's defaults is in custom_config.yml next to this file: 60 fps
# (3b1b's frame rate) and a black background (ManimGL's default canvas is #333333) to match the
# intro's black screen.
#
# To re-render (needs a TeX install with latex and dvisvgm, e.g. MacTeX):
#   uv venv --python 3.12 .venv-manimgl
#   uv pip install --python .venv-manimgl/bin/python manimgl "setuptools<81"
#   cd tools/intro && ../../.venv-manimgl/bin/manimgl name.py NameWrite -w --hd \
#     --file_name name --video_dir /tmp/manimgl && cp /tmp/manimgl/name.mp4 ../../public/intro/
# (Run it from tools/intro so ManimGL picks up custom_config.yml. ManimGL 1.7.2's --fps flag is
# broken, hence the config file.)
#
# If the length changes, update the timeline in src/app/globals.css ("Intro").

from manimlib import FRAME_WIDTH, Scene, TexText, Write


class NameWrite(Scene):
    def construct(self):
        name = TexText("Ronan Hevenor")
        name.set_width(FRAME_WIDTH * 0.78)
        self.wait(0.25)
        self.play(Write(name))  # ManimGL's own defaults, as in 3b1b's videos
        self.wait(0.6)
