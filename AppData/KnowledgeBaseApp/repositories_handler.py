#!/usr/bin/python3
# -*- coding: utf-8 -*-
"""Repositories handler utilities.

Attributes
----------
global_repo_file_patterns_ignore : list
    Repositories globally ignored patterns.
repo_service_url_map : dict
    List of repositories service URLs.
repositories_data_tables_json_path : str
    Path to the repositories_data_tables.json file.
root_folder : str
    The main folder containing the application. All commands must be executed
    from this location without exceptions.
"""
import json
import os

from runpy import run_path

from . import app_utils
from .python_utils import cmd_utils
from .python_utils import exceptions
from .python_utils import file_utils
from .python_utils import json_schema_utils
from .python_utils import shell_utils
from .python_utils import string_utils
from .schemas import repositories_schema

root_folder = os.path.realpath(os.path.abspath(os.path.join(
    os.path.normpath(os.getcwd()))))


repositories_data_tables_json_path = os.path.join(root_folder,
                                                  "UserData",
                                                  "data_storage",
                                                  "repositories_data_tables.json")

repo_service_url_map = {
    "github": "https://github.com/",
    "bitbucket": "https://bitbucket.org/",
    "gitlab": "https://gitlab.com/",
}


_allowed_repo_types = {"git", "hg"}

global_repo_file_patterns_ignore = [
    ".github/*",
    ".gitlab/*",
    ".travis/*"
]


class InvalidRepositoryData(exceptions.ExceptionWhitoutTraceBack):
    """InvalidRepositoryData
    """
    pass


class RepositoriesHandler():
    """Repositories handler.

    Attributes
    ----------
    logger : object
        See <class :any:`LogSystem`>.
    """

    def __init__(self, dry_run=False, logger=None):
        """Initialize.

        Parameters
        ----------
        dry_run : bool, optional
            Log an action without actually performing it.
        logger : object
            See <class :any:`LogSystem`>.
        """
        try:
            self._repositories_data = run_path(os.path.join(root_folder, "UserData", "data_sources",
                                                            "repositories.py"))["data"]
        except Exception:
            self._repositories_data = None

        self._dry_run = dry_run
        self.logger = logger

        self._data_tables_obj = []

        self._validate_repo_data()

    def _validate_repo_data(self):
        """Validate repository data.

        Returns
        -------
        None
            Halt execution.
        """
        if not json_schema_utils.JSONSCHEMA_INSTALLED:
            return

        json_schema_utils.validate(
            self._repositories_data, repositories_schema,
            error_message_extra_info="\n".join([
                "File: %s" % os.path.join(root_folder, "UserData", "data_sources",
                                          "archives.py"),
                "Data key: data"
            ]),
            logger=self.logger)

    def _generate_repositories_data_tables_json_file(self):
        """Generate the JSON file for the repository.
        """
        self.logger.info("Generating repositories JSON file...")

        try:
            json_parent = os.path.dirname(repositories_data_tables_json_path)

            if not os.path.exists(json_parent):
                if self._dry_run:
                    self.logger.log_dry_run(
                        "Parent directory will be created at:\n%s" % json_parent)
                else:
                    os.makedirs(json_parent)

            if self._dry_run:
                self.logger.log_dry_run("JSON file will be created at:\n%s" %
                                        repositories_data_tables_json_path)
            else:
                with open(repositories_data_tables_json_path, "w") as json_file:
                    json_file.write(json.dumps(self._data_tables_obj))
        except Exception as err:
            self.logger.error(err)

    def _append_data_to_files(self, html_path, repo_data):
        """Append data to files.

        Parameters
        ----------
        html_path : str
            Path to where HTML pages are stored.
        repo_data : dict
            Repository data.
        """
        self.logger.info("Appending data to files...")

        for append_data in repo_data.get("kb_file_append", []):
            file_path = os.path.join(html_path, append_data[0])
            file_data = append_data[1]

            if os.path.exists(file_path):
                if self._dry_run:
                    self.logger.log_dry_run("\n".join(["Data to append to existent file:",
                                                       "File: %s" % file_path,
                                                       "Data: %s" % file_data]))
                else:
                    self.logger.info(append_data[0])
                    with open(file_path, "a") as file_to_append:
                        file_to_append.write(file_data)

    def _handle_sphinx_docs_repo_type(self, repo_data):
        """Handle repositories set to build their Sphinx documentation.

        Parameters
        ----------
        repo_data : dict
            Repository data.
        """
        try:
            self._data_tables_obj.append({
                "t": repo_data.get("kb_title", ""),
                "c": repo_data.get("kb_category", "Uncategorized"),
                # Path to files relative to the www folder
                "p": os.path.join(self._get_sphinx_generated_pages_storage(repo_data),
                                  "html", repo_data.get("kb_index_filename", "index.html")),
                # Icon name
                "h": repo_data.get("kb_handler", "ext"),
                "s": self._get_repo_url(repo_data)
            })
        except Exception as err:
            self.logger.error("%s-%s" % (repo_data.get("repo_owner"), repo_data.get("repo_name")))
            self.logger.error(err)

    def _handle_files_repo_type(self, repo_data):
        """Handle repositories set to manage one or more files on them.

        Parameters
        ----------
        repo_data : dict
            Repository data.
        """
        try:
            repo_path = self._get_path(repo_data)
            repo_file_names = repo_data.get("repo_file_names", [])
            repo_file_patterns_include = repo_data.get("repo_file_patterns_include", [])
            repo_file_patterns_ignore = repo_data.get("repo_file_patterns_ignore", [])
            repo_file_patterns_ignore.extend(global_repo_file_patterns_ignore)
            filenames = []

            # To have a default and to avoid having to specify repo_file_names in every
            # single repository data object.
            if not repo_file_names and not repo_file_patterns_include:
                repo_file_names = ["README.md"]

            if repo_file_names:
                filenames += repo_file_names
            else:
                temp_files_list = []

                for root, dirs, files in os.walk(repo_path, topdown=True):
                    # <3 https://stackoverflow.com/a/19859907
                    # Modify dirs in-place to avoid visiting undesired directories.
                    dirs[:] = [d for d in dirs
                               if d not in set(app_utils.custom_copytree_global_ignored_patterns)]

                    for f_name in string_utils.super_filter(files,
                                                            repo_file_patterns_include,
                                                            repo_file_patterns_ignore):
                        temp_files_list.append(self._get_file_rel_path(root, f_name, repo_path))

                # Second filtering to apply exclusion_patterns. In case that there is
                # a directory filtering pattern.
                filenames += string_utils.super_filter(temp_files_list,
                                                       exclusion_patterns=repo_file_patterns_ignore)

            for file_rel_path in filenames:
                file_name = os.path.splitext(os.path.basename(file_rel_path))[0]

                try:
                    if repo_data.get("kb_title_prefix"):
                        title = repo_data.get("kb_title_prefix") + file_name
                    else:
                        title = repo_data.get("kb_title") or file_name

                    www_path = os.path.join("%s_repositories" %
                                            repo_data.get("repo_service", "github"),
                                            self._get_folder_name(repo_data),
                                            file_rel_path)
                    source_path = os.path.join(repo_path, file_rel_path)
                    destination_path = os.path.join(app_utils.WWW_BASE_PATH, www_path)

                    self._data_tables_obj.append({
                        "t": title,
                        "c": repo_data.get("kb_category", "Uncategorized"),
                        # Path to files relative to the www folder
                        "p": www_path,
                        # Icon name
                        "h": repo_data.get("kb_handler", "md"),
                        "s": self._get_repo_url(repo_data)
                    })

                    # If copy_full_repo is True, there is no need to copy the actually used files.
                    if not repo_data.get("copy_full_repo"):
                        try:
                            if self._dry_run:
                                self.logger.log_dry_run("A file will be copied:")
                                self.logger.log_dry_run("Source: %s" % source_path)
                                self.logger.log_dry_run("Destination: %s" % destination_path)
                            else:
                                file_utils.custom_copy2(source_path, destination_path, self.logger,
                                                        log_copied_file=True,
                                                        relative_path=app_utils.WWW_BASE_PATH)
                        except Exception as err1:
                            self.logger.error(err1)
                except Exception as err2:
                    self.logger.error(file_name)
                    self.logger.error(err2)
                    continue

            if repo_data.get("copy_full_repo"):
                full_repo_destination_path = os.path.join(app_utils.WWW_BASE_PATH,
                                                          "%s_repositories" % repo_data.get(
                                                              "repo_service", "github"),
                                                          self._get_folder_name(repo_data))
                if self._dry_run:
                    self.logger.log_dry_run("A folder will be copied:")
                    self.logger.log_dry_run("Source: %s" % repo_path)
                    self.logger.log_dry_run("Destination: %s" % full_repo_destination_path)
                else:
                    file_utils.custom_copytree(repo_path,
                                               full_repo_destination_path,
                                               ignored_patterns=app_utils.custom_copytree_global_ignored_patterns,
                                               logger=self.logger,
                                               log_copied_file=True,
                                               relative_path=app_utils.WWW_BASE_PATH)

        except Exception as err3:
            self.logger.error("%s-%s" % (repo_data.get("repo_owner"), repo_data.get("repo_name")))
            self.logger.error(err3)

    def _get_file_rel_path(self, root_dir, file_name, start_path):
        """Get file relative path.

        Parameters
        ----------
        root_dir : str
            Path to file location.
        file_name : str
            File name.
        start_path : str
            The path that the resulting path should be relative to.

        Returns
        -------
        str
            A relative path.
        """
        return os.path.relpath(os.path.join(root_dir, file_name), start=start_path)

    def _get_sphinx_generated_pages_storage(self, repo_data):
        """Get Sphinx generated pages storage.

        Parameters
        ----------
        repo_data : dict
            Repository data.

        Returns
        -------
        str
            The path to the Sphinx generated pages storage.
        """
        return os.path.join("sphinx_generated_pages", self._get_folder_name(repo_data))

    def _get_folder_name(self, repo_data):
        """Get the repository folder name.

        Parameters
        ----------
        repo_data : dict
            Repository data.

        Returns
        -------
        str
            The repository folder name.
        """
        return repo_data.get("repo_owner") + "-" + repo_data.get("repo_name")

    def _get_storage_path(self, repo_data):
        """Get the storage path (were all the repositories are cloned into).

        Parameters
        ----------
        repo_data : dict
            Repository data.

        Returns
        -------
        str
            The storage path.
        """
        return os.path.join(root_folder, "UserData", "data_storage",
                            "%s_repositories" % repo_data.get("repo_service", "github"))

    def _get_path(self, repo_data):
        """Get the repository path.

        Parameters
        ----------
        repo_data : dict
            Repository data.

        Returns
        -------
        str
            The repository path.
        """
        return os.path.join(self._get_storage_path(repo_data),
                            self._get_folder_name(repo_data))

    def _get_repo_service_slug(self, repo_data):
        """Get the repository service slug.

        Parameters
        ----------
        repo_data : dict
            Repository data.

        Returns
        -------
        str
            The repository path.
        """
        return os.path.join(self._get_storage_path(repo_data),
                            self._get_folder_name(repo_data))

    def _get_check_repo_cmd(self, repo_type):
        """Get the command to check the repository.

        No used for now.

        Parameters
        ----------
        repo_type : str
            Repository type (git or hg).

        Returns
        -------
        list
            The command to check the repository.
        """
        if repo_type == "git":
            return ["Some command that's actually useful!!!!"]
            # Why not? Because Git can be absolutely retarded.
            # I WANT TO KNOW IF THE CURRENT DIRECTORY IS A FREAKING GIT REPOSITORY!!!!
            # NOT IF THE CURRENT DIRECTORY IS INSIDE A GIT REPOSITORY!!!
            # return ["git", "rev-parse", "--git-dir"]
            # return ["git", "status"]

            # Why not? It connects to internet.
            # return ["git", "ls-remote"]
        elif repo_type == "hg":
            return ["hg", "-R", ".", "root"]

    def _get_repo_url(self, repo_data):
        """Get repository URL.

        Parameters
        ----------
        repo_data : dict
            Repository data.

        Returns
        -------
        str
            The repository URL.
        """
        repo_service = repo_data.get("repo_service", "github")
        repo_url_template = "{}{}/{}.git" if repo_data.get(
            "repo_type", "git") == "git" else "{}{}/{}"
        repo_base_url = repo_service_url_map[repo_service] if \
            repo_service in repo_service_url_map else repo_service

        return repo_url_template.format(repo_base_url,
                                        repo_data.get("repo_owner"),
                                        repo_data.get("repo_name"))

    def _do_pull(self, repo_data):
        """Pull from the repository.

        Parameters
        ----------
        repo_data : dict
            Repository data.
        """
        cmd = "%s pull" % repo_data.get("repo_type", "git")
        cwd = self._get_path(repo_data)

        if self._dry_run:
            self.logger.log_dry_run("Command that will be executed:\n%s" % cmd)
            self.logger.log_dry_run("Command will be executed on directory:\n%s" % cwd)
        else:
            cmd_utils.run_cmd(
                cmd,
                stdout=None,
                stderr=None,
                shell=True,
                check=True,
                cwd=cwd
            )

    def _do_clone(self, repo_data):
        """Clone the repository.

        Parameters
        ----------
        repo_data : dict
            Repository data.
        """
        repo_type = repo_data.get("repo_type", "git")

        cmd = "{cmd} clone {depth} {url} {path}".format(
            cmd=repo_type,
            depth="--depth=1" if repo_type == "git" else "",
            url=self._get_repo_url(repo_data),
            path=self._get_folder_name(repo_data)
        )
        cwd = self._get_storage_path(repo_data)

        if self._dry_run:
            self.logger.log_dry_run("Command that will be executed:\n%s" % cmd)
            self.logger.log_dry_run("Command will be executed on directory:\n%s" % cwd)
        else:
            cmd_utils.run_cmd(
                cmd,
                stdout=None,
                stderr=None,
                shell=True,
                check=True,
                cwd=cwd,
            )

    def handle_all_repositories(self):
        """Handle all repositories.

        The main tasks of this method are to populate the ``self._data_tables_obj`` list with
        all repositories data and to copy desired files into the www folder. The
        ``self._data_tables_obj`` is finally saved into a JSON file for easy retrieval.

        Repositories whose handler is **sphinx_docs** will have their DataTables data generated,
        but are purposely handled (the Sphinx documentations built) separately in
        ``self.build_sphinx_docs``.
        """
        self.logger.info(shell_utils.get_cli_separator("-"), date=False)
        self.logger.info("Handling repositories...")

        for repo_data in sorted(self._repositories_data,
                                key=lambda k: ("repo_handler" not in k, k.get("repo_handler", "files"))):
            # Do not generate JSON files for repositories that are used to generate
            # Markdown files (or other types of files) from the repository data.
            # Right now, there is only one repository of this type
            # ActiveState/code which repo handler is called "code_recipes_handler".
            if repo_data.get("no_json", False):
                continue

            repo_handler = repo_data.get("repo_handler", "files")

            if repo_handler:
                handler = getattr(self, "_handle_%s_repo_type" % repo_handler)

                try:
                    handler(repo_data)
                except AttributeError as err:
                    self.logger.warning("Repository handler: %s" % repo_handler)
                    self.logger.error(err)
                    continue

        self._generate_repositories_data_tables_json_file()
        self.logger.info("Finished handling all repositories.")

    def update_all_repositories(self, do_not_pull=False):
        """Main function to update repositories.

        Parameters
        ----------
        do_not_pull : bool, optional
            Just clone the repositories that where not handled before, do not pull from existent
            repositories.

        Raises
        ------
        exceptions.KeyboardInterruption
            Halt execution.
        """
        warnings = []
        errors = []

        repos_count = len(self._repositories_data)
        repos_processed = 0
        repos_omitted = 0

        for repo_data in self._repositories_data:
            repos_processed += 1
            try:
                self.logger.info(shell_utils.get_cli_separator(), date=False)
                self.logger.info("%s/%s" % (repos_processed, repos_count), date=False)

                repo_path = self._get_path(repo_data)
                repo_parent = os.path.dirname(repo_path)

                if not os.path.exists(repo_parent):
                    os.makedirs(repo_parent)

                # START USING THIS WHEN GIT GAINS SOME FREAKING SENSE!!!
                # If the repository path exists, check if it is a valid repository
                # and proceed to attempt to pull from it.
                # p = cmd_utils.run_cmd(self._get_check_repo_cmd(repo_data.get("repo_type", "git")),
                #                       stdout=DEVNULL,
                #                       stderr=DEVNULL,
                #                       cwd=repo_path)
                if not file_utils.is_real_dir(repo_path):
                    # If the repository path doesn't exists, attempt to clone the
                    # repository and get out of the loop.
                    self.logger.warning("<%s-%s> doesn't seem to exist." %
                                        (repo_data.get("repo_owner"), repo_data.get("repo_name")))
                    self.logger.info("Cloning repository...")
                    self._do_clone(repo_data)
                    continue

                if do_not_pull:
                    repos_omitted += 1
                    continue

                # Do the wrong thing until Git allows me to do the right thing.
                # Check for the .git or .hg directories to decide if a folder is a repository.
                if file_utils.is_real_dir(os.path.join(repo_path, ".%s" %
                                                       repo_data.get("repo_type", "git"))):
                    self.logger.info("Pulling from <%s-%s> repository." %
                                     (repo_data.get("repo_owner"), repo_data.get("repo_name")))
                    self._do_pull(repo_data)
                else:
                    warnings.append(repo_path)
                    self.logger.warning("Manual intervention required!")
                    self.logger.warning("The following path doesn't seem to be a repository:")
                    self.logger.warning(repo_path)
            except Exception as err:
                errors.append((err, repo_data))
                self.logger.error(err)
                self.logger.error(repo_path)
                continue
            except KeyboardInterrupt:
                raise exceptions.KeyboardInterruption()

        if warnings:
            self.logger.warning("Manual intervention required!")
            self.logger.warning("The following path/s don't point to a repository:")

            for w in warnings:
                self.logger.warning(w, date=False)

        if errors:
            self.logger.error("The following error/s were encountered:")

            for err, repo_data in errors:
                self.logger.info(shell_utils.get_cli_separator("-"), date=False)
                self.logger.error(err, date=False)
                self.logger.error(self._get_repo_url(repo_data), date=False)
                self.logger.error(self._get_path(repo_data), date=False)

        if repos_omitted > 0:
            self.logger.info("%d repositories omitted from pulling." % repos_omitted)

    def build_sphinx_docs(self):
        """Build Sphinx documentation.
        """
        for repo_data in [repo for repo in self._repositories_data
                          if repo.get("repo_handler") == "sphinx_docs"]:
            self.logger.info(shell_utils.get_cli_separator("-"), date=False)
            self.logger.info("Attempting to build Sphinx docs.")
            self.logger.info("Repository: %s-%s" %
                             (repo_data.get("repo_owner"), repo_data.get("repo_name")), date=False)

            doctrees_path = os.path.join(root_folder, "UserData", "data_storage", "sphinx_doctrees",
                                         self._get_folder_name(repo_data), "doctrees")
            html_path = os.path.join(app_utils.WWW_BASE_PATH,
                                     self._get_sphinx_generated_pages_storage(repo_data), "html")

            cmd = ["sphinx-build", ".", "-b", "html", "-d", doctrees_path, html_path]
            cwd = os.path.join(self._get_path(repo_data), repo_data.get("repo_sources_path", ""))

            if self._dry_run:
                self.logger.log_dry_run("Command that will be executed:\n%s" % cmd)
                self.logger.log_dry_run("Command will be executed on directory:\n%s" % cwd)
            else:
                cmd_utils.run_cmd(cmd,
                                  stdout=None,
                                  stderr=None,
                                  cwd=cwd)

            if repo_data.get("kb_file_append", []):
                self._append_data_to_files(html_path, repo_data)

    def get_data_tables_obj(self):
        """Obtain the JSON data generated for all repositories.

        Returns
        -------
        list
            DataTables object.
        """
        data_tables_obj = []

        try:
            with open(repositories_data_tables_json_path, "r") as json_file:
                data_tables_obj = json.loads(json_file.read())
        except Exception as err:
            data_tables_obj = []
            self.logger.error(err)

        return data_tables_obj


if __name__ == "__main__":
    pass
