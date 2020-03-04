#!/usr/bin/python3
# -*- coding: utf-8 -*-
"""Web application.

Attributes
----------
root_folder : str
    The path to the folder that will be served by the web server.
"""
import os
import sys

from subprocess import run

try:
    from docutils import core as docutils_core
except (ImportError, SystemError):
    docutils_core = None

# NOTE: Failsafe imports due to this file being used as a script (when launching the server)
# and as a module (when generating documentation with Sphinx).
try:
    from python_utils.bottle_utils import bottle
    from python_utils.bottle_utils import bottle_app
    from python_utils.bottle_utils import WebApp
    from python_utils.mistune_utils import md
except (ImportError, SystemError):
    from .python_utils.bottle_utils import bottle
    from .python_utils.bottle_utils import bottle_app
    from .python_utils.bottle_utils import WebApp
    from .python_utils.mistune_utils import md

root_folder = os.path.realpath(os.path.abspath(os.path.join(
    os.path.normpath(os.getcwd()))))


def parse_rst(input_string):
    """Parse resTrructuredText.

    Parameters
    ----------
    input_string : str
        The rST string to parse.

    Returns
    -------
    str
        The parsed rST string.
    """
    overrides = {
        "input_encoding": "unicode",
        "doctitle_xform": True,
        "initial_header_level": 1
    }
    parts = docutils_core.publish_parts(source=input_string, source_path=None,
                                        writer_name="html5", settings_overrides=overrides)

    return parts["html_body"]


class KnowledgeBaseWebapp(WebApp):
    """Web server.
    """
    def __init__(self, *args, **kwargs):
        """Initialization.

        Parameters
        ----------
        *args
            Arguments.
        **kwargs
            Keyword arguments.
        """
        super().__init__(*args, **kwargs)

    @bottle_app.route("/<filepath:path>")
    def server_static(filepath):
        """Serve static files.

        Parameters
        ----------
        filepath : str
            Path to the served static file.

        Returns
        -------
        object
            An instance of bottle.HTTPResponse.
        """
        return bottle.static_file(filepath, root=root_folder)

    @bottle_app.post("/handle_inline_content")
    def handle_inline_content():
        """Load files inline.

        Returns
        -------
        sre
            The content for the landing page.
        """
        file_path = os.path.abspath(os.path.join(root_folder, bottle.request.POST["inlinePageURL"]))

        with open(file_path, "r", encoding="UTF-8") as f:
            raw_data = f.read()

        # TODO: Using "md" for .rst because I couldn't find an RST icon between the thousands of
        # icon in NerdFont. Some day I might stumble upon one. LOL
        if bottle.request.POST["inlinePageType"].lower() == "md":
            try:
                # NOTE: Try to parse reStructuredText and fallback to Markdown.
                if file_path.lower()[-4:] == ".rst" and docutils_core is not None:
                    return parse_rst(raw_data)
                else:
                    return md(raw_data)
            except Exception:
                return raw_data
        else:
            return raw_data

    @bottle_app.route("/")
    def index():
        """Serve the landing page.

        Returns
        -------
        sre
            The content for the landing page.
        """
        with open(os.path.join(root_folder, "index.html"), "r", encoding="UTF-8") as index_file:
            index_data = index_file.read()

        if index_data:
            return index_data
        else:
            return "Something went horribly wrong!!!"

    # Non-existent location. It's used just to "catch" POST requests.
    @bottle_app.post("/handle_local_files")
    def handle_local_files():
        """Handle local files.
        """
        action = bottle.request.POST["action"]
        file_path = os.path.abspath(os.path.join(root_folder, bottle.request.POST["href"]))
        file_folder = os.path.dirname(file_path)
        p = None

        if action == "file":
            # FIXME:
            # I'm experiencing anomalies with this. Sometimes, when opening a file, it will spawn
            # a new instance of the text editor of my choice (Sublime Text).
            # I though the use of a string instead of a list for the call() function fixed it,
            # but what actually fixed it was the restart of the server. It seems that the problem
            # is triggered when the server is started at system start up.
            # call('xdg-open "%s"' % file_name, cwd=file_folder, shell=True)
            p = run(["xdg-open", file_path], cwd=file_folder, check=True)
        elif action == "folder":
            p = run(["xdg-open", file_folder], cwd=file_folder, check=True)

        if p and p.returncode:
            # Implement a fallback.
            # Delay it as long as possible before swallowing GLib or Gio.
            pass


# FIXME: Convert this script into a module.
# Just because it's the right thing to do.
# As it is right now, everything works as "it should".
if __name__ == "__main__":
    args = sys.argv[1:]

    if len(args) == 2:
        app = KnowledgeBaseWebapp(args[0], args[1])
        app.run()
