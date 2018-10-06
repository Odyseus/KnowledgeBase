#!/usr/bin/python3
# -*- coding: utf-8 -*-
"""Summary

Attributes
----------
bottle_app : object
    Bottle application.
root_folder : str
    The path to the folder that will be served by the web server.
"""
import os
import sys

from subprocess import call

try:
    from python_utils import bottle
except (ImportError, SystemError):
    from .python_utils import bottle

root_folder = os.path.realpath(os.path.abspath(os.path.join(
    os.path.normpath(os.getcwd()))))

bottle_app = bottle.Bottle()


class KnowledgeBaseWebapp(object):
    """Knowledge Base web server.

    Attributes
    ----------
    host : str
        The host name used by the web server.
    port : str
        The port number used by the web server.
    """

    def __init__(self, host, port):
        """Initialization.

        Parameters
        ----------
        host : str
            The host name used by the web server.
        port : str
            The port number used by the web server.
        """
        super().__init__()
        self.host = host
        self.port = port

    def run(self):
        """Run web application.
        """
        bottle_app.run(host=self.host, port=self.port)

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
    @bottle_app.post("/local_files")
    def handle_local_files():
        """Handle local files.
        """
        action = bottle.request.POST["action"]
        file_path = os.path.abspath(os.path.join(root_folder, bottle.request.POST["href"]))
        file_folder = os.path.dirname(file_path)
        file_name = os.path.basename(file_path)

        if action == "file":
            # FIXME:
            # I'm experiencing anomalies with this. Sometimes, when opening a file, it will spawn
            # a new instance of the text editor of my choice (Sublime Text).
            # I though the use of a string instead of a list for the call() function fixed it,
            # but what actually fixed it was the restart of the server. It seems that the problem
            # is triggered when the server is started at system start up.
            # call('xdg-open "%s"' % file_name, cwd=file_folder, shell=True)
            call(["xdg-open", file_name], cwd=file_folder)
        elif action == "folder":
            call(["xdg-open", file_folder], cwd=file_folder)


# FIXME: Convert this script into a module.
# Just because it's the right thing to do.
# As it is right now, everything works as "it should".
if __name__ == "__main__":
    args = sys.argv[1:]

    if len(args) == 2:
        app = KnowledgeBaseWebapp(args[0], args[1])
        app.run()
