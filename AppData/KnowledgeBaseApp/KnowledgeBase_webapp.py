#!/usr/bin/python3
# -*- coding: utf-8 -*-
"""Web application.

Attributes
----------
www_root : str
    The path to the folder that will be served by the web server.
"""
import os
import sys

from subprocess import run
from urllib.parse import unquote

try:
    from docutils import core as docutils_core
except (ImportError, SystemError):
    docutils_core = None

try:
    # If executed as a script to start the web server.
    host, port, app_dir_path = sys.argv[1:]
except Exception:
    # If imported as a module by Sphinx.
    host, port = None, None
    app_dir_path = os.path.realpath(os.path.abspath(os.path.join(
        os.path.normpath(os.path.dirname(__file__)))))

sys.path.insert(0, app_dir_path)

from python_utils.bottle_utils import WebApp
from python_utils.bottle_utils import bottle
from python_utils.bottle_utils import bottle_app
from python_utils.mistune_utils import md

www_root = os.path.realpath(os.path.abspath(os.path.join(
    os.path.normpath(os.getcwd()))))

_title_template = "<h1>{page_title}</h1>\n"
_source_template = '<h3><a href="{page_source}">Source</a></h3>\n'


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

    @bottle_app.route("/_assets_bootstrap_css")
    def bootstrap_css_static():
        """Serve the file found at ``UserData/www/assets/css/bootstrap.min.css``.

        This allows me to use the Bootstrap CSS stylesheet from any HTML document located at any
        directory depth. I can simply use ``<link rel="stylesheet" href="/_assets_bootstrap_css" />``
        and the desired stylesheet will be used.

        Returns
        -------
        object
            An instance of `bottle.HTTPResponse`.
        """
        return bottle.static_file("bootstrap.min.css", root=os.path.join(www_root, "assets", "css"))

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
        return bottle.static_file(filepath, root=www_root)

    @bottle_app.post("/handle_inline_content")
    def handle_inline_content():
        """Load files inline.

        Returns
        -------
        sre
            The content for the landing page.
        """
        html_data = ""
        handler = unquote(bottle.request.POST["inlinePageHandler"]).lower()
        file_path = os.path.abspath(os.path.join(
            www_root, unquote(bottle.request.POST["inlinePageURL"])))

        page_title = unquote(bottle.request.POST["inlinePageTitle"])
        page_source = unquote(bottle.request.POST["inlinePageSource"])

        page_title = _title_template.format(page_title=page_title) if page_title else ""
        page_source = _source_template.format(page_source=page_source) if page_source else ""

        with open(file_path, "r", encoding="UTF-8") as f:
            raw_data = f.read()

        # TODO: Using "md" for .rst because I couldn't find an RST icon between the thousands of
        # icons in NerdFont. Some day I might stumble upon one. LOL
        if handler == "md":
            try:
                # NOTE: Try to parse reStructuredText and fallback to Markdown.
                if file_path.lower()[-4:] == ".rst" and docutils_core is not None:
                    html_data = parse_rst(raw_data)
                else:
                    html_data = md(raw_data)
            except Exception:
                html_data = raw_data
        else:
            html_data = raw_data

        return page_title + page_source + html_data

    @bottle_app.route("/")
    def index():
        """Serve the landing page.

        Returns
        -------
        sre
            The content for the landing page.
        """
        with open(os.path.join(www_root, "index.html"), "r", encoding="UTF-8") as index_file:
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
        action = unquote(bottle.request.POST["action"])
        file_path = os.path.abspath(os.path.join(www_root, unquote(bottle.request.POST["href"])))
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
if __name__ == "__main__" and host and port:
    app = KnowledgeBaseWebapp(host, port)
    app.run()
