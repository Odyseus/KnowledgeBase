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

from . import app_utils
from . import archives_handler
from . import repositories_handler
from .__init__ import __appdescription__
from .__init__ import __appname__
from .__init__ import __status__
from .__init__ import __version__
from .python_utils import cli_utils
from .python_utils import exceptions

root_folder = os.path.realpath(os.path.abspath(os.path.join(
    os.path.normpath(os.getcwd()))))


docopt_doc = """{appname} {version} ({status})

{appdescription}

Usage:
    app.py (-h | --help | --manual | --version)
    app.py run <func_name>... [--dry-run]
                              [--force-download]
    app.py server (start | stop | restart)
                  [--host=<host>]
                  [--port=<port>]
    app.py generate system_executable

Options:

-h, --help
    Show this screen.

--manual
    Show this application manual page.

--version
    Show application version.

--host=<host>
    Host name. [Default: 0.0.0.0]

--port=<port>
    Port number. [Default: 8888]

--force-download
    Force the download of all archives, ignoring the frequency in which they
    should be downloaded. Only used by the "download_all_archives" sub-command.

--dry-run
    Do not perform file system changes. Only display messages informing of the
    actions that will be performed or commands that will be executed.
    WARNING! Some file system changes will be performed (e.g. temporary files
    creation) and some commands will be executed (e.g. checking if a directory
    belongs to a repository).

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
    func_names : list
        A list of function names that will be used to execute those functions
        in the order they were defined (passed as arguments).
    run_args_order : list
        List used as a gude to execute functions in the order they need to.
    """
    run_args_order = [
        "update_all_repositories",
        "handle_all_repositories",
        "download_all_archives",
        "create_main_json_file",
        "html_to_markdown_files",
        "html_to_markdown_clip",
        "epub_to_html",
        "build_sphinx_docs",
        "generate_categories_html",
        "generate_index_html",
        "open_main_webpage",
    ]
    action = None
    args_to_init_repo_handler = [
        "update_all_repositories",
        "handle_all_repositories",
        "build_sphinx_docs"
    ]
    func_names = []
    _repositories_handler = None

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

            try:
                # Remove duplicates.
                self.a["<func_name>"] = list(set(self.a["<func_name>"]))
                # Sort the arguments so one doesn't have to worry about the order
                # in which they are passed.
                # Source: https://stackoverflow.com/a/12814719.

                self.a["<func_name>"].sort(key=lambda x: self.run_args_order.index(x))
            except ValueError as err:
                raise exceptions.InvalidArgument(err)

            if any(e in self.args_to_init_repo_handler for e in self.a["<func_name>"]):
                self._repositories_handler = repositories_handler.RepositoriesHandler(
                    dry_run=self.a["--dry-run"],
                    logger=self.logger
                )

            for func in self.a["<func_name>"]:
                if getattr(self, func, False):
                    self.logger.info(func)
                    self.func_names.append(func)
                else:
                    self.logger.warning("Non existent function: %s" % func)
        elif self.a["generate"]:
            if self.a["system_executable"]:
                self.logger.info("System executable generation...")
                self.action = self.system_executable_generation

    def run(self):
        """Run tasks depending on the arguments passed.

        Do not worry about the threads join()ing. Both conditions can't be true
        at the same time because they are set by mutually exclusive arguments.
        """
        if self.action:
            self.action()
        elif self.func_names:
            for func in self.func_names:
                f = getattr(self, func, None)

                if f:
                    f()

    def download_all_archives(self):
        """See :any:`archives_handler.ArchivesHandler`
        """
        handler = archives_handler.ArchivesHandler(
            dry_run=self.a["--dry-run"],
            logger=self.logger
        )
        handler.download_all_archives(self.a["--force-download"])

    def update_all_repositories(self):
        """See :any:`RepositoriesHandler.update_all_repositories`
        """
        self._repositories_handler.update_all_repositories()

    def handle_all_repositories(self):
        """See :any:`RepositoriesHandler.handle_all_repositories`
        """
        self._repositories_handler.handle_all_repositories()

    def create_main_json_file(self):
        """See :any:`app_utils.create_main_json_file`
        """
        app_utils.create_main_json_file(
            dry_run=self.a["--dry-run"],
            logger=self.logger
        )

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

    def epub_to_html(self):
        """See :any:`app_utils.convert_epub_to_html`
        """
        app_utils.convert_epub_to_html(self.logger)

    def open_main_webpage(self):
        """Self explanatory.
        """
        import webbrowser
        webbrowser.open("http://0.0.0.0:8888", new=2, autoraise=True)

    def build_sphinx_docs(self):
        """See :any:`RepositoriesHandler.build_sphinx_docs`
        """
        self._repositories_handler.build_sphinx_docs()

    def generate_categories_html(self):
        """See :any:`app_utils.generate_categories_html`
        """
        app_utils.generate_categories_html(dry_run=self.a["--dry-run"], logger=self.logger)

    def generate_index_html(self):
        """See :any:`app_utils.generate_index_html`
        """
        app_utils.generate_index_html(dry_run=self.a["--dry-run"], logger=self.logger)

    def display_manual_page(self):
        """See :any:`cli_utils.CommandLineInterfaceSuper._display_manual_page`.
        """
        self._display_manual_page(os.path.join(root_folder, "AppData", "data", "man", "app.py.1"))

    def system_executable_generation(self):
        """See :any:`cli_utils.CommandLineInterfaceSuper._system_executable_generation`.
        """
        self._system_executable_generation(
            exec_name="knowledge-base-cli",
            app_root_folder=root_folder,
            sys_exec_template_path=os.path.join(
                root_folder, "AppData", "data", "templates", "system_executable"),
            bash_completions_template_path=os.path.join(
                root_folder, "AppData", "data", "templates", "bash_completions.bash"),
            logger=self.logger
        )


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
