#!/usr/bin/python3
# -*- coding: utf-8 -*-
"""Repositories handler functions.

Attributes
----------
root_folder : str
    The main folder containing the Knowledge Base. All commands must be executed
    from this location without exceptions.
"""

import json
import os

from runpy import run_path
from subprocess import Popen, PIPE

from . import app_utils
from .python_utils import exceptions, shell_utils, file_utils, cmd_utils

root_folder = os.path.realpath(os.path.abspath(os.path.join(
    os.path.normpath(os.getcwd()))))


try:
    bitbucket_data = run_path(os.path.join(root_folder, "UserData", "data_sources",
                                           "bitbucket.py"))["data"]
except Exception:
    bitbucket_data = None

try:
    github_data = run_path(os.path.join(root_folder, "UserData", "data_sources", "github.py"))[
        "data"]
except Exception:
    github_data = None


class RepoHandlers():
    """Main class to "handle" a repository data.

    Attributes
    ----------
    data_tables_obj : list
        Where the JSON data is stored before finally save it into a JSON file.
    debug : bool
        Save JSON files with indentation.
    logger : object
        See <class :any:`LogSystem`>.
    repo : dict
        The repository data.
    success : bool
        If some of the taks are not successful, do not save the JSON file for the repository.
    """

    def __init__(self, repo, debug=False, logger=None):
        """
        Parameters
        ----------
        repo : dict
            The repository data.
        debug : bool, optional
            Save JSON files with indentation.
        logger : object
            See <class :any:`LogSystem`>.
        """
        super(RepoHandlers, self).__init__()
        self.logger = logger
        self.repo = repo
        self.debug = debug
        self.data_tables_obj = []
        self.success = False

    def sphinx_generated_handler(self):
        """Handle repositories set to build their Sphinx documentation.
        """
        try:
            self.data_tables_obj.append({
                "t": self.repo.title,
                "c": self.repo.category,
                "h": self.repo.path_handler,
                # Path to files relative to the www folder
                "p": os.path.join(self.repo.get_sphinx_generated_pages_storage(),
                                  "html", self.repo.filename),
                # Icon name
                "i": self.repo.repo_img
            })
            self.success = True
        except Exception as err:
            self.success = False
            self.logger.error(self.repo.repo_name)
            self.logger.error(err)
        finally:
            self.generate_data_file()

    def single_file_handler(self):
        """Handle repositories set to manage just one file on them.
        """
        try:
            www_path = os.path.join("{}_repositories".format(self.repo.web_service),
                                    self.repo.get_folder_name(),
                                    self.repo.rel_path,
                                    self.repo.filename)
            source_path = os.path.join(self.repo.get_path(), self.repo.rel_path,
                                       self.repo.filename)
            destination_path = os.path.join(app_utils.WWW_BASE_PATH, www_path)

            self.data_tables_obj.append({
                "t": self.repo.title,
                "c": self.repo.category,
                "h": self.repo.path_handler,
                # Path to files relative to the www folder
                "p": www_path,
                # Icon name
                "i": self.repo.repo_img
            })

            try:
                if self.repo.copy_full_repo:
                    source_path = self.repo.get_path()
                    destination_path = os.path.join(app_utils.WWW_BASE_PATH,
                                                    "{}_repositories".format(
                                                        self.repo.web_service),
                                                    self.repo.get_folder_name())
                    file_utils.custom_copytree(source_path,
                                               destination_path,
                                               ignored_patterns=app_utils.custom_copytree_global_ignored_patterns,
                                               logger=self.logger,
                                               log_copied_file=True,
                                               relative_path=app_utils.WWW_BASE_PATH)
                else:
                    file_utils.custom_copy2(source_path, destination_path, self.logger,
                                            log_copied_file=True,
                                            relative_path=app_utils.WWW_BASE_PATH)
            except Exception as err1:
                self.logger.error(err1)
                self.success = False
            else:
                self.success = True
        except Exception as err2:
            self.success = False
            self.logger.error(self.repo.repo_name)
            self.logger.error(err2)
        finally:
            self.generate_data_file()

    def multi_file_handler(self):
        """Handle repositories set to manage more than one file on them.
        """
        try:
            repo_path = self.repo.get_path()
            rel_path = self.repo.rel_path
            file_pattern = self.repo.file_pattern
            filenames = os.listdir(os.path.join(repo_path, rel_path))
            category = self.repo.category
            web_service = self.repo.web_service
            folder_name = self.repo.get_folder_name()

            for filename in filenames:
                if filename not in self.repo.files_to_ignore and filename.endswith(file_pattern):
                    try:
                        title = filename[:-int(len(file_pattern))]
                        www_path = os.path.join("{}_repositories".format(web_service),
                                                folder_name,
                                                rel_path,
                                                filename)
                        source_path = os.path.join(repo_path, rel_path, filename)
                        destination_path = os.path.join(app_utils.WWW_BASE_PATH, www_path)

                        self.data_tables_obj.append({
                            "t": self.repo.title_prefix + title,
                            "c": category,
                            "h": 0,
                            # Path to files relative to the www folder
                            "p": www_path,
                            # Icon name
                            "i": "md"
                        })

                        try:
                            file_utils.custom_copy2(source_path, destination_path, self.logger,
                                                    log_copied_file=True,
                                                    relative_path=app_utils.WWW_BASE_PATH)
                        except Exception as err1:
                            self.logger.error(err1)
                            self.success = False
                        else:
                            self.success = True
                    except Exception as err2:
                        self.logger.error(filename)
                        self.logger.error(err2)
                        continue
            self.success = True
        except Exception as err3:
            self.success = False
            self.logger.error(self.repo.repo_name)
            self.logger.error(err3)
        finally:
            self.generate_data_file()

    def generate_data_file(self):
        """Generate the JSON file for the repository.

        Returns
        -------
        None
            Do not try to save the JSON file in case something went wrong handling the repository.
        """
        if not self.success:
            return

        try:
            json_path = self.repo.get_json_path()
            json_parent = os.path.dirname(json_path)

            if not os.path.exists(json_parent):
                os.makedirs(json_parent)

            with open(json_path, "w") as json_file:
                if (self.debug):
                    json_file.write(json.dumps(self.data_tables_obj, indent=4, sort_keys=True))
                else:
                    json_file.write(json.dumps(self.data_tables_obj))
        except Exception as err:
            self.logger.error(self.repo.repo_name)
            self.logger.error(err)


class Repository():
    """Main class to initialize a repository.

    Attributes
    ----------
    category : str
        Category name.
    copy_full_repo : boot
        Whether to copy all the files on the repository or not.
    file_append : list
        A list of tuples containing the path to a file and the data to append to said file.
    file_pattern : str
        A pattern to determine the files to copy.
    filename : str
        Name of the file to copy.
    files_to_ignore : list
        List of files to ignore (not copy).
    json_data : list
        Repository data storage.
    logger : object
        See <class :any:`LogSystem`>.
    path_handler : int
        A flag that determines how to handle the path or paths specified on the json_data object
        of the repository.
    rel_path : str
        A path relative to the root of the repository folder were the file/files is/are located.
    repo_img : str
        String to be usaed to represent the image that will be shown on the index.html table.
    repo_name : str
        The name of the repository.
    repo_owner : str
        The owner of the repository.
    repo_url : str
        The repository URL.
    title : str
        The text that will be used as title for the entry/entries generated by this class.
    title_prefix : str
        A title prefix.
    web_service : str
        The name of the web service (github or bitbucket).
    """

    def __init__(self, data, web_service="github", load_json_file=True,
                 is_sphinx_generated=False, logger=None):
        """
        Parameters
        ----------
        data : dict
            Repository data.
        web_service : str, optional
            The name of the web service (github or bitbucket).
        load_json_file : bool, optional
            Load JSON data only when it is needed.
        is_sphinx_generated : bool, optional
            Boolean to determine which file name to use as default. If it is a repository to
            generate a Sphinx documentation, the use "index.html" as default file name. Else,
            use "README.md" as default.
        logger : object
            See <class :any:`LogSystem`>.

        Raises
        ------
        exceptions.MissingMandatoryField
            Missing mandatory field.
        """
        super(Repository, self).__init__()
        self.logger = logger
        self.json_data = None
        self.web_service = web_service
        self.repo_owner = data.get("repo_owner", None)
        self.repo_name = data.get("repo_name", None)

        if self.repo_owner is None or self.repo_name is None:
            msg = "web_service  = %s\n" % str(self.web_service)
            msg += "repo_owner   = %s\n" % str(self.repo_owner)
            msg += "repo_name    = %s\n" % str(self.repo_name)
            raise exceptions.MissingMandatoryField(msg)

        self.repo_img = data.get("repo_img", "md")
        self.repo_url = "https://{}.com/{}/{}.git".format(web_service,
                                                          self.repo_owner,
                                                          self.repo_name)
        self.path_handler = data.get("path_handler", 0)
        self.category = data.get("category", "Category")

        self.files_to_ignore = data.get("files_to_ignore", [])
        self.title = data.get("title", "")
        self.file_pattern = data.get("file_pattern", "")
        self.title_prefix = data.get("title_prefix", "")
        self.filename = data.get(
            "filename", "index.html" if is_sphinx_generated else "README.md")
        self.rel_path = data.get("rel_path", "")
        self.copy_full_repo = data.get("copy_full_repo", False)
        self.file_append = data.get("file_append", [])

        if load_json_file:
            self.set_json_data()

    def set_json_data(self):
        """Set the JSON data.
        """
        try:
            with open(self.get_json_path(), "r") as json_file:
                self.json_data = json.loads(json_file.read())
        except Exception as err:
            self.json_data = None
            self.logger.error(self.repo_name)
            self.logger.error(err)

    def build_sphinx_docs(self):
        """Build Sphinx documentation.
        """
        self.logger.info("Attempting to build %s's docs." % self.repo_name)

        script_path = os.path.join(root_folder, "AppData", "data", "bash_scripts",
                                   "generate_repo_docs.sh")
        doctrees_path = os.path.join(root_folder, "UserData", "tmp", "sphinx_doctrees",
                                     self.get_folder_name(), "doctrees")
        html_path = os.path.join(app_utils.WWW_BASE_PATH,
                                 self.get_sphinx_generated_pages_storage(), "html")

        po = Popen('"{0}" "{1}" "{2}"'.format(script_path, doctrees_path, html_path),
                   shell=True,
                   env=cmd_utils.get_environment(),
                   cwd=os.path.join(self.get_path(), self.rel_path))
        po.wait()

        if self.file_append:
            self._append_data_to_files(html_path)

    def _append_data_to_files(self, html_path):
        """Append data to files.

        Parameters
        ----------
        html_path : str
            Path to where HTML pages are stored.
        """
        self.logger.info("Appending data to <%s>'s files." % self.repo_name)

        for append_data in self.file_append:
            file_path = os.path.join(html_path, append_data[0])
            file_data = append_data[1]

            if os.path.exists(file_path):
                self.logger.info("Appending data to <%s>." % append_data[0])
                with open(file_path, "a") as file_to_append:
                    file_to_append.write(file_data)

    def get_sphinx_generated_pages_storage(self):
        """Get Sphinx generated pages storage.

        Returns
        -------
        str
            The path to the Sphinx generated pages storage.
        """
        return os.path.join("sphinx_generated_pages", self.get_folder_name())

    def get_folder_name(self):
        """Get the repository folder name.

        Returns
        -------
        str
            The repository folder name.
        """
        return self.repo_owner + "-" + self.repo_name

    def get_storage_path(self):
        """Get the storage path (were all the repositories are cloned into).

        Returns
        -------
        str
            The storage path.
        """
        return os.path.join(root_folder, "UserData", "tmp", "{}_repositories".format(self.web_service))

    def get_path(self):
        """Get the repository path.

        Returns
        -------
        str
            The repository path.
        """
        return os.path.join(self.get_storage_path(), self.get_folder_name())

    def get_json_path(self):
        """Get the JSON file path for the repository.

        Returns
        -------
        str
            The JSON file path.
        """
        return os.path.join(root_folder,
                            "UserData",
                            "tmp",
                            "{}_repositories_json_storage".format(self.web_service),
                            self.get_folder_name() + ".json")


class BitBucketRepo(Repository):
    """Sub-class of :any:`Repository` to initialize a BitBucket repository.
    """

    def __init__(self, data, logger, web_service="bitbucket", load_json_file=True,
                 is_sphinx_generated=False):
        """
        Parameters
        ----------
        data : dict
            See :any:`Repository` > data
        logger : object
            See <class :any:`LogSystem`>.
        web_service : str, optional
            See :any:`Repository` > web_service
        load_json_file : bool, optional
            See :any:`Repository` > load_json_file
        is_sphinx_generated : bool, optional
            See :any:`Repository` > is_sphinx_generated
        """
        super(BitBucketRepo, self).__init__(data,
                                            web_service=web_service,
                                            logger=logger,
                                            load_json_file=load_json_file,
                                            is_sphinx_generated=is_sphinx_generated)

    def get_check_repo_cmd(self):
        """Get the command to check the repository.

        Returns
        -------
        list
            The command to check the repository.
        """
        return ["hg", "-R", ".", "root"]

    def do_pull(self):
        """Pull from the repository.
        """
        cmd_utils.exec_command(
            "hg pull",
            self.get_path(),
            logger=self.logger
        )

    def do_clone(self):
        """Clone the repository.
        """
        cmd_utils.exec_command(
            "hg clone {} {}".format(
                self.repo_url,
                self.get_folder_name()
            ),
            self.get_storage_path(),
            logger=self.logger
        )


class GitHubRepo(Repository):
    """Sub-class of :any:`Repository` to initialize a GitHub repository.
    """

    def __init__(self, data, logger, web_service="github", load_json_file=True,
                 is_sphinx_generated=False):
        """
        Parameters
        ----------
        data : dict
            See :any:`Repository` > data
        logger : object
            See <class :any:`LogSystem`>.
        web_service : str, optional
            See :any:`Repository` > web_service
        load_json_file : bool, optional
            See :any:`Repository` > load_json_file
        is_sphinx_generated : bool, optional
            See :any:`Repository` > is_sphinx_generated
        """
        super(GitHubRepo, self).__init__(data,
                                         web_service=web_service,
                                         logger=logger,
                                         load_json_file=load_json_file,
                                         is_sphinx_generated=is_sphinx_generated)

    def get_check_repo_cmd(self):
        """Get the command to check the repository.

        Returns
        -------
        list
            The command to check the repository.
        """
        return ["git", "ls-remote"]

    def do_pull(self):
        """Pull from the repository.
        """
        cmd_utils.exec_command(
            "git pull",
            self.get_path(),
            logger=self.logger
        )

    def do_clone(self):
        """Clone the repository.
        """
        cmd_utils.exec_command(
            "git clone {} {}".format(
                self.repo_url,
                self.get_folder_name()
            ),
            self.get_storage_path(),
            logger=self.logger
        )


class RepoBridge():
    """"Bridge" class used to retrieve the actual classes from a string.
    """

    def github(self, *args, **kargs):
        """Get GitHub repository.

        Parameters
        ----------
        *args
            Positional arguments.
        **kargs
            Keyword arguments.

        Returns
        -------
        object
            Initialized :any:`GitHubRepo` class.
        """
        return GitHubRepo(*args, **kargs)

    def bitbucket(self, *args, **kargs):
        """Get BitBucket repository.

        Parameters
        ----------
        *args
            Positional arguments.
        **kargs
            Keyword arguments.

        Returns
        -------
        object
            Initialized :any:`BitBucketRepo` class.
        """
        return BitBucketRepo(*args, **kargs)


def github_repos_json_files_creation(debug, logger):
    """Create the JSON files for GitHub repositories.

    Parameters
    ----------
    debug : bool
        Save JSON files with indentation.
    logger : object
        See <class :any:`LogSystem`>.
    """
    generate_repositories_json_files(github_data, debug, logger)


def bitbucket_repos_json_files_creation(debug, logger):
    """Create the JSON files for BitBucket repositories.

    Parameters
    ----------
    debug : bool
        Save JSON files with indentation.
    logger : object
        See <class :any:`LogSystem`>.
    """
    generate_repositories_json_files(bitbucket_data, debug, logger)


def generate_repositories_json_files(repository_data, debug, logger):
    """Main function to create the JSON files for the repositories.

    Parameters
    ----------
    repository_data : dict
        The repository data to process.
    debug : bool
        Save JSON files with indentation.
    logger : object
        See <class :any:`LogSystem`>.
    """
    if repository_data is not None:
        for repository_handler in repository_data["repositories"]:
            for repo_data in repository_data["repositories"][repository_handler]:
                # Do not generate JSON files for repositories that are used to generate
                # Markdown files (or other types of files) from the repository data.
                # Right now, there is only one repository of this type
                # ActiveState/code which repo handler is called "code_recipes_handler".
                if repo_data.get("no_json", False):
                    continue

                repo = getattr(RepoBridge(), repository_data["web_service"])(
                    repo_data,
                    load_json_file=False,
                    is_sphinx_generated=repository_handler == "sphinx_generated_handler",
                    logger=logger
                )

                repo_handler = RepoHandlers(repo, debug=debug, logger=logger)
                try:
                    getattr(repo_handler, repository_handler)()
                except AttributeError as err:
                    logger.warning(repo_data)
                    logger.error(err)
                    continue

            logger.info("Finished creating JSON files for <%s> repositories using the handler <%s>"
                        % (repository_data["web_service"], repository_handler))


def github_repos_update(logger):
    """Update all GitHub repositories.

    Parameters
    ----------
    logger : object
        See <class :any:`LogSystem`>.
    """
    update_repositories(github_data, logger)


def bitbucket_repos_update(logger):
    """Update all BitBucket repositories.

    Parameters
    ----------
    logger : object
        See <class :any:`LogSystem`>.
    """
    update_repositories(bitbucket_data, logger)


def update_repositories(repository_data, logger):
    """Main function to update repositories.

    Parameters
    ----------
    repository_data : dict
        The repository data to process.
    logger : object
        See <class :any:`LogSystem`>.
    """
    if repository_data is not None:
        for repository_handler in repository_data["repositories"]:
            for repo_data in repository_data["repositories"][repository_handler]:
                try:
                    logger.info(shell_utils.get_cli_separator(), date=False)
                    repo = getattr(RepoBridge(), repository_data["web_service"])(
                        repo_data,
                        load_json_file=False,
                        is_sphinx_generated=repository_handler == "sphinx_generated_handler",
                        logger=logger
                    )
                    repo_path = repo.get_path()
                    repo_parent = os.path.dirname(repo_path)

                    if not os.path.exists(repo_parent):
                        os.makedirs(repo_parent)

                    if file_utils.is_real_dir(repo_path):
                        # If the repository path exists, check if it is a valid repository
                        # and proceed to attempt to pull from it.
                        p = Popen(repo.get_check_repo_cmd(), stdout=PIPE, cwd=repo_path)

                        output, error_output = p.communicate()
                    else:
                        # If the repository path doesn't exists, attempt to clone the
                        # repository and get out of the loop.
                        logger.warning("%s doesn't seem to exist." % repo.repo_name)
                        logger.info("Cloning %s repository." % repo.repo_name)
                        repo.do_clone()
                        continue

                    if p and not p.returncode:  # Return code should be zero.
                        logger.info("Pulling from %s repository." % repo.repo_name)
                        repo.do_pull()
                except Exception as err:
                    logger.error(err)
                    continue


def bitbucket_sphinx_docs_build(logger):
    """Build Sphinx documentation of all BitBucket repositories.

    Parameters
    ----------
    logger : object
        See <class :any:`LogSystem`>.
    """
    build_sphinx_docs(bitbucket_data, logger)


def github_sphinx_docs_build(logger):
    """Build Sphinx documentation of all GitHub repositories.

    Parameters
    ----------
    logger : object
        See <class :any:`LogSystem`>.
    """
    build_sphinx_docs(github_data, logger)


def build_sphinx_docs(repository_data, logger):
    """Main function to build Sphinx documentation for all repositories.

    Parameters
    ----------
    repository_data : dict
        The repository data to process.
    logger : object
        See <class :any:`LogSystem`>.
    """
    if repository_data is not None:
        for repository_handler in repository_data["repositories"]:
            if repository_handler == "sphinx_generated_handler":
                for repo_data in repository_data["repositories"][repository_handler]:
                    try:
                        logger.info(shell_utils.get_cli_separator(), date=False)
                        repo = getattr(RepoBridge(), repository_data["web_service"])(
                            repo_data,
                            load_json_file=False,
                            is_sphinx_generated=True,
                            logger=logger
                        )
                        repo.build_sphinx_docs()
                    except Exception as err:
                        logger.error(err)
                        continue


def get_json_data_from_repositories(logger):
    """Obtain the JSON data generated for each repository.

    Each repository, after it's "handled", will generate a JSON file containing data related
    to the repository itself.

    Parameters
    ----------
    logger : object
        See <class :any:`LogSystem`>.

    Returns
    -------
    list
        DataTables object.
    """
    data_tables_obj = []

    for repository_data in [bitbucket_data, github_data]:
        if repository_data is not None:
            for repository_handler in repository_data.get("repositories", None):
                for repo_data in repository_data["repositories"][repository_handler]:
                    if repo_data.get("no_json", False):
                        continue

                    repo = getattr(RepoBridge(),
                                   repository_data["web_service"])(
                        repo_data,
                        is_sphinx_generated=repository_handler == "sphinx_generated_handler",
                        logger=logger
                    )
                    repo_json_data = repo.json_data

                    if repo_json_data is not None:
                        data_tables_obj += repo_json_data

    return data_tables_obj


if __name__ == "__main__":
    pass
