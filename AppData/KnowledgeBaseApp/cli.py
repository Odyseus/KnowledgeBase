#!/usr/bin/python3
# -*- coding: utf-8 -*-
"""Main command line application.

Attributes
----------
docopt_doc : str
    Used to store/define the docstring that will be passed to docopt as the "doc" argument.
root_folder : str
    The main folder containing the application. All commands must be executed from this location
    without exceptions.
"""

import os

from subprocess import Popen
from threading import Thread

from . import app_utils
from .__init__ import __appdescription__
from .__init__ import __appname__
from .__init__ import __status__
from .__init__ import __version__
from .python_utils import cli_utils

root_folder = os.path.realpath(os.path.abspath(os.path.join(
    os.path.normpath(os.getcwd()))))


docopt_doc = """{appname} {version} ({status})

{appdescription}

Usage:
    app.py (-h | --help | --manual | --version)
    app.py run <func_name>... [--debug] [--force-download]
    app.py launch <app_launcher_script_arguments>...
    app.py server (start | stop | restart)
                  [--host=<host>]
                  [--port=<port>]
    app.py generate <file_to_generate>

Options:

-h, --help
    Show this screen.

--manual
    Show this application manual page.

--version
    Show application version.

--host=<host>]
    Host name. [Default: 0.0.0.0]

--port=<port>]
    Port number. [Default: 8888]

--debug
    As of now, only used when generating JSON files. They will be saved
    with indentation.

--force-download
    Force the download of all archives, ignoring the frequency in which they
    should be downloaded. Only used by the "archives_download" sub-command.

Sub-commands for the `run` command and the order they will be executed:
    github_repos_update                 bitbucket_repos_update
    github_repos_json_files_creation    bitbucket_repos_json_files_creation
    archives_download                   main_json_file_creation
    html_to_markdown_clip               bitbucket_sphinx_docs_build
    github_sphinx_docs_build            categories_html_generation
    index_html_generation               open_main_webpage
    html_to_markdown_files

Sub-commands for the `launch` command:
    This argument will be passed to the UserData/bash_scripts/app_launcher.sh
    script, if existent. See documentation.

Sub-commands for the `server` command:
    start                               Start server.
    stop                                Stop server.
    restart                             Restart server.

Sub-commands for the `generate` command:
    app_launcher_script                 argos_script
    bitbucket_data_file                 github_data_file
    system_executable

""".format(appname=__appname__,
           appdescription=__appdescription__,
           version=__version__,
           status=__status__)


class CommandLineInterface(cli_utils.CommandLineInterfaceSuper):
    """Command line interface.

    Attributes
    ----------
    a : dict
        Where docopt_args is stored.
    action : method
        Set the method that will be executed when calling CommandLineTool.run().
    app_args : list
        A list of arguments that will be passed to the app_launcher.sh script.
    debug : bool
        Attribute used by some function calls. As of now, it defines if the functions
        should generate JSON files indented or not indented.
    file_generation_action : str
        An "action" that will be used to generate certain files from their
        predefined templates.
    func_names : list
        A list of function names that will be used to execute those functions
        in the order they were defined (passed as arguments).
    run_args_order : list
        List used as a gude to execute functions in the order they need to.
    """
    run_args_order = [
        "github_repos_update",
        "bitbucket_repos_update",
        "github_repos_json_files_creation",
        "bitbucket_repos_json_files_creation",
        "archives_download",
        "main_json_file_creation",
        "html_to_markdown_files",
        "html_to_markdown_clip",
        "bitbucket_sphinx_docs_build",
        "github_sphinx_docs_build",
        "categories_html_generation",
        "index_html_generation",
        "open_main_webpage",
    ]
    action = None
    app_args = []
    debug = None
    file_generation_action = None
    func_names = []

    def __init__(self, docopt_args):
        """Initialize.

        Parameters
        ----------
        docopt_args : dict
            The dictionary of arguments as returned by docopt parser.
        """
        self.a = docopt_args
        self._cli_header_blacklist = [self.a["--manual"]]

        super().__init__(__appname__, "UserData/logs")

        if self.a["--manual"]:
            self.action = self.display_manual_page
        elif self.a["server"]:
            self.logger.info("Command: server")
            self.logger.info("Arguments:")

            if self.a["start"]:
                self.logger.info("start")
                self.action = self.http_server_start
            elif self.a["stop"]:
                self.logger.info("stop")
                self.action = self.http_server_stop
            elif self.a["restart"]:
                self.logger.info("restart")
                self.action = self.http_server_restart
        elif self.a["run"]:
            self.logger.info("Command: run")
            self.logger.info("Arguments:")
            # Sort the arguments so one doesn't have to worry about the order
            # in which they are passed.
            # Source: https://stackoverflow.com/a/12814719.
            self.a["<func_name>"].sort(key=lambda x: self.run_args_order.index(x))

            for func in self.a["<func_name>"]:
                if getattr(self, func, False):
                    self.logger.info(func)
                    self.func_names.append(func)
                else:
                    self.logger.warning("Non existent function: %s" % func)
        elif self.a["launch"]:
            self.logger.info("Command: launch")
            self.logger.info("Arguments:")

            for arg in self.a["<app_launcher_script_arguments>"]:
                self.logger.info(arg)
                self.app_args.append(arg)
        elif self.a["generate"]:
            self.logger.info("Command: generate")
            self.logger.info("Argument: %s" % self.a["<file_to_generate>"])
            self.file_generation_action = self.a["<file_to_generate>"]

    def run(self):
        """Run tasks depending on the arguments passed.

        Do not worry about the threads join()ing. Both conditions can't be true
        at the same time because they are set by mutually exclusive arguments.
        """
        threads = []

        if self.action:
            self.action()
        elif self.func_names:
            for func in self.func_names:
                t = Thread(target=getattr(self, func, None))
                t.start()
                threads.append(t)

                for thread in threads:
                    if thread is not None:
                        thread.join()
        elif self.app_args:
            for arg in self.app_args:
                t = Thread(target=self.run_app, args=(arg,))
                t.start()
                threads.append(t)

                for thread in threads:
                    if thread is not None:
                        thread.join()
        elif self.file_generation_action is not None:
            if self.file_generation_action == "system_executable":
                self._system_executable_generation(
                    exec_name="knowledge-base-cli",
                    app_root_folder=root_folder,
                    sys_exec_template_path=os.path.join(
                        root_folder, "AppData", "data", "templates", "system_executable"),
                    bash_completions_template_path=os.path.join(
                        root_folder, "AppData", "data", "templates", "bash_completions.bash"),
                    logger=self.logger
                )
            else:
                app_utils.create_file_from_template(self.file_generation_action, self.logger)

    def run_app(self, arg):
        """Function to run applications through the app_launcher.sh script.

        Parameters
        ----------
        arg : str
            The argument that will be passed to the app_launcher.sh script.
        """
        script_path = os.path.join(root_folder, "UserData", "bash_scripts", "app_launcher.sh")
        Popen([script_path, arg])

    def archives_download(self):
        """See :any:`archives_handler.ArchivesHandler`
        """
        from . import archives_handler

        handler = archives_handler.ArchivesHandler(logger=self.logger)
        handler.download_all_archives(self.a["--force-download"])

    def github_repos_update(self):
        """See :any:`repositories_handler.github_repos_update`
        """
        from . import repositories_handler

        repositories_handler.github_repos_update(self.logger)

    def bitbucket_repos_update(self):
        """See :any:`repositories_handler.bitbucket_repos_update`
        """
        from . import repositories_handler

        repositories_handler.bitbucket_repos_update(self.logger)

    def github_repos_json_files_creation(self):
        """See :any:`repositories_handler.github_repos_json_files_creation`
        """
        from . import repositories_handler

        repositories_handler.github_repos_json_files_creation(self.a["--debug"], self.logger)

    def bitbucket_repos_json_files_creation(self):
        """See :any:`repositories_handler.bitbucket_repos_json_files_creation`
        """
        from . import repositories_handler

        repositories_handler.bitbucket_repos_json_files_creation(self.a["--debug"], self.logger)

    def main_json_file_creation(self):
        """See :any:`app_utils.main_json_file_creation`
        """
        app_utils.main_json_file_creation(debug=self.a["--debug"], logger=self.logger)

    def http_server(self, action="start"):
        """Start/Stop/Restart the HTTP server.

        Parameters
        ----------
        action : str, optional
            Any of the following: start/stop/restart.
        """
        www_root = os.path.join(root_folder, "UserData", "www")
        os.chdir(www_root)
        cmd_path = os.path.join(root_folder, "AppData", "data", "python_scripts", "http_server")

        # Use of os.execv() so at the end only one process is left executing.
        # The "http_server" executable also uses os.execv() to launch the real web application.
        os.execv(cmd_path, [" "] + [action,
                                    "KnowledgeBase",
                                    self.a["--host"],
                                    self.a["--port"]])

    def http_server_start(self):
        """Self explanatory.
        """
        self.http_server(action="start")

    def http_server_stop(self):
        """Self explanatory.
        """
        self.http_server(action="stop")

    def http_server_restart(self):
        """Self explanatory.
        """
        self.http_server(action="restart")

    def html_to_markdown_files(self):
        """See :any:`app_utils.convert_html_to_markdown`
        """
        app_utils.convert_html_to_markdown(False, self.logger)

    def html_to_markdown_clip(self):
        """See :any:`app_utils.convert_html_to_markdown`
        """
        app_utils.convert_html_to_markdown(True, self.logger)

    def open_main_webpage(self):
        """Self explanatory.
        """
        import webbrowser
        webbrowser.open("http://0.0.0.0:8888", new=2, autoraise=True)

    def bitbucket_sphinx_docs_build(self):
        """See :any:`repositories_handler.bitbucket_sphinx_docs_build`
        """
        from . import repositories_handler

        repositories_handler.bitbucket_sphinx_docs_build(self.logger)

    def github_sphinx_docs_build(self):
        """See :any:`repositories_handler.github_sphinx_docs_build`
        """
        from . import repositories_handler

        repositories_handler.github_sphinx_docs_build(self.logger)

    def categories_html_generation(self):
        """See :any:`app_utils.categories_html_generation`
        """
        app_utils.categories_html_generation(self.logger)

    def index_html_generation(self):
        """See :any:`app_utils.index_html_generation`
        """
        app_utils.index_html_generation(self.logger)

    def display_manual_page(self):
        """See :any:`cli_utils.CommandLineInterfaceSuper._display_manual_page`.
        """
        self._display_manual_page(os.path.join(root_folder, "AppData", "data", "man", "app.py.1"))


def main():
    """Initialize command line interface.
    """
    cli_utils.run_cli(flag_file=".knowledge-base.flag",
                      docopt_doc=docopt_doc,
                      app_name=__appname__,
                      app_version=__version__,
                      app_status=__status__,
                      cli_class=CommandLineInterface)


if __name__ == "__main__":
    main()
