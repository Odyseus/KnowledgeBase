#!/usr/bin/python3
# -*- coding: utf-8 -*-
"""Utilities to handle downloaded archives.

Attributes
----------
root_folder : str
    The main folder containing the application. All commands must be executed
    from this location without exceptions.
"""

import json
import os
import time

from datetime import datetime
from datetime import timedelta
from runpy import run_path
from shutil import rmtree
from subprocess import CalledProcessError
from subprocess import STDOUT

from . import app_utils
from .python_utils import cmd_utils
from .python_utils import exceptions
from .python_utils import json_schema_utils
from .python_utils import shell_utils
from .python_utils import string_utils
from .python_utils import tqdm_wget
from .schemas import archives_schema

root_folder = os.path.realpath(os.path.abspath(os.path.join(
    os.path.normpath(os.getcwd()))))


class ArchivesHandler():
    """Class to handle archives downloaded from the net (compressed or not).

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
        self.logger = logger
        self._dry_run = dry_run
        self._last_update_data = {}
        self._compressed_archives = []

        try:
            self._archives_data = run_path(os.path.join(root_folder, "UserData", "data_sources",
                                                        "archives.py"))["data"]
        except Exception:
            self._archives_data = None

        self._validate_archives_data()

        self._archives_storage = os.path.join(
            root_folder, "UserData", "data_storage", "downloaded_archives")
        self._archives_destination = os.path.join(
            app_utils.WWW_BASE_PATH, "archives")
        self._archives_last_updated = os.path.join(self._archives_storage, "last_updated.json")
        self._current_date = time.strftime("%B %d %Y", time.gmtime())  # Format = January 1 2018

        self._ensure_paths()
        self._expand_archives_data()

    def get_data_tables_obj(self):
        """Get DataTables object.

        Returns
        -------
        list
            DataTables object.
        """
        data_tables_obj = []

        for data in self._archives_data:
            try:
                cat_path = data["kb_category"].replace("|", os.sep)
                data_tables_obj.append({
                    "t": data["kb_title"],
                    "c": data["kb_category"],
                    # Path to files relative to the www folder
                    "p": os.path.join("archives",
                                      data.get("kb_handler", "ext"),
                                      cat_path,
                                      data["kb_title"],
                                      data.get("kb_rel_path", ""),
                                      data.get("kb_filename", "index.html")),
                    "h": data.get("kb_handler", "ext")
                })
            except Exception as err:
                self.logger.error(data["kb_title"])
                self.logger.error(err)
                continue

        return data_tables_obj

    def download_all_archives(self, force_download):
        """Download all archives.

        Parameters
        ----------
        force_download : bool
            Ignore archive update frequency and update its file/s anyway.

        Raises
        ------
        exceptions.KeyboardInterruption
            See <class :any:`exceptions.KeyboardInterruption`>.
        """
        try:
            for data in self._archives_data:
                self.logger.info(shell_utils.get_cli_separator("-"), date=False)

                try:
                    self._download_archive(data, force_download)
                except Exception as err:
                    self.logger.error("Error downloading archive. URL: ", data["arch_url"])
                    self.logger.error(err)
                    continue
                except (KeyboardInterrupt, SystemExit):
                    raise exceptions.KeyboardInterruption()
        except (KeyboardInterrupt, SystemExit):
            raise exceptions.KeyboardInterruption()
        else:
            with open(self._archives_last_updated, "w", encoding="UTF-8") as data_file:
                data_file.write(json.dumps(self._last_update_data, indent=4, sort_keys=True))

        if self._compressed_archives:
            self.logger.info("Handling compressed archives.")
            self._handle_compressed_archives()

        self._append_to_files()

    def _append_to_files(self):
        """Append to files.
        """
        for data in self._archives_data:
            arvhive_append_data = data.get("kb_file_append", False)

            if arvhive_append_data:
                self.logger.info("Appending data to <%s>'s files." % data["kb_title"])

                for append_data in arvhive_append_data:
                    file_path = os.path.join(data["extraction_destination"], append_data[0])
                    file_data = append_data[1]

                    if os.path.exists(file_path):
                        self.logger.info("Appending data to <%s>." % append_data[0], date=False)
                        with open(file_path, "a") as file_to_append:
                            file_to_append.write(file_data)

    def _handle_compressed_archives(self):
        """Handle the downloaded compressed archives.

        Raises
        ------
        exceptions.KeyboardInterruption
            See <class :any:`exceptions.KeyboardInterruption`>.
        """
        try:
            for source in self._compressed_archives:
                self.logger.info(shell_utils.get_cli_separator("-"), date=False)
                self.logger.info("Decompressing <%s>" % source["kb_title"])

                try:
                    aborted_msg = "Extract operation for <%s> aborted." % source["kb_title"]
                    ext_dst = source["extraction_destination"]
                    cmd = []

                    if not cmd_utils.which(source["unzip_prog"]):
                        self.logger.error("Command <%s> not found on your system." %
                                          source["unzip_prog"] + aborted_msg)
                        continue

                    if source["unzip_prog"] == "7z":
                        cmd += ["7z", "e", "-y", source["downloaded_filename"],
                                "-o", ext_dst]
                    elif source["unzip_prog"] == "unzip":
                        cmd += ["unzip", "-q", "-o", source["downloaded_filename"],
                                "-d", ext_dst]
                    elif source["unzip_prog"] == "tar":
                        untar_arg = source.get("untar_arg")
                        cmd = ["tar", "--extract"]

                        if untar_arg:
                            cmd += [untar_arg]

                        cmd += [
                            "--file",
                            source["downloaded_filename"],
                            "--totals",
                            "--directory", ext_dst
                        ]

                    if cmd:
                        try:
                            if os.path.isfile(ext_dst):
                                if self._dry_run:
                                    self.logger.log_dry_run("File will be removed:\n%s" % ext_dst)
                                else:
                                    os.remove(ext_dst)

                            if os.path.isdir(ext_dst):
                                if self._dry_run:
                                    self.logger.log_dry_run(
                                        "Directory will be removed:\n%s" % ext_dst)
                                else:
                                    rmtree(ext_dst)
                        finally:
                            if self._dry_run:
                                self.logger.log_dry_run(
                                    "Directory will be created at:\n%s" % ext_dst)
                            else:
                                os.makedirs(ext_dst, exist_ok=True)

                            try:
                                if self._dry_run:
                                    self.logger.log_dry_run(
                                        "Command that will be executed:\n%s" % " ".join(cmd))
                                else:
                                    self.logger.info("Running command:\n" + " ".join(cmd))

                                    cmd_utils.run_cmd(cmd,
                                                      stdout=None,
                                                      stderr=STDOUT,
                                                      check=True)
                            except CalledProcessError as err:
                                self.logger.error(err)
                except Exception as err:
                    self.logger.error(err)
        except (KeyboardInterrupt, SystemExit):
            raise exceptions.KeyboardInterruption()

    def _download_archive(self, data, force_download):
        """Download the archives.

        Parameters
        ----------
        data : list
            The list containing archive data.
        force_download : bool
            Download archive without checking if it needs to be downloaded.

        Raises
        ------
        exceptions.KeyboardInterruption
            See <class :any:`exceptions.KeyboardInterruption`>.
        """
        is_compressed_source = data.get("unzip_prog", False)

        try:
            parent_dir = os.path.dirname(data["downloaded_filename"])

            if self._dry_run:
                self.logger.log_dry_run("Parent directory will be created at:\n%s" % parent_dir)
            else:
                os.makedirs(parent_dir, exist_ok=True)
        except Exception as err:
            self.logger.error(err)

        if force_download or self._should_download_archive(data):
            self.logger.info("Updating <%s>" % data["kb_title"])

            try:
                if self._dry_run:
                    self.logger.log_dry_run("File will be downloaded:")
                    self.logger.log_dry_run("URL: %s" % data["arch_url"])
                    self.logger.log_dry_run("Location: %s" % data["downloaded_filename"])
                else:
                    tqdm_wget.download(data["arch_url"], data["downloaded_filename"])
            except (KeyboardInterrupt, SystemExit):
                raise exceptions.KeyboardInterruption()
            except Exception as err:
                self.logger.error(err)
            else:
                # Do not modify download history on dry run.
                if not self._dry_run:
                    self._last_update_data[data["slugified_name"]] = self._current_date

                if is_compressed_source:
                    self._compressed_archives.append(data)
        else:
            self.logger.info("<%s> doesn't need updating." % data["kb_title"])

            if is_compressed_source:
                self._compressed_archives.append(data)

    def _should_download_archive(self, data):
        """Check if the archive should be updated.

        Parameters
        ----------
        data : dict
            The archive data to check.

        Returns
        -------
        bool
            If the archive needs to be updated depending on its configured specified
            update frequency.
        """
        frequency = data.get("download_frequency", "m")
        last_updated = data.get("last_updated", False)

        if frequency == "d" or not last_updated:
            return True

        downloaded_filename = data.get("downloaded_filename", False)
        downloaded_filename_exists = downloaded_filename and os.path.exists(downloaded_filename)

        if not downloaded_filename_exists:
            return True

        try:
            then = datetime.strptime(last_updated, "%B %d %Y")
            now = datetime.strptime(self._current_date, "%B %d %Y")

            if frequency == "w":  # Weekly.
                return (now - then) > timedelta(days=6)
            elif frequency == "m":  # Monthly.
                return (now - then) > timedelta(days=29)
            elif frequency == "s":  # Semestrial.
                return (now - then) > timedelta(days=87)
        except Exception:
            return True

    def _validate_archives_data(self):
        """Validate archives data.

        Returns
        -------
        None
            Halt execution.

        Raises
        ------
        exceptions.MalformedSources
            See <class :any:`exceptions.MalformedSources`>.
        """
        if not json_schema_utils.JSONSCHEMA_INSTALLED:
            return

        json_schema_utils.validate(
            self._archives_data, archives_schema,
            error_message_extra_info="\n".join([
                "File: %s" % os.path.join(root_folder, "UserData", "data_sources",
                                          "archives.py"),
                "Data key: data"
            ]),
            logger=self.logger)

        titles = set()
        errors = []

        for data in self._archives_data:
            source_title = data.get("kb_title", False)

            if source_title:
                # Do not allow more than one source with the same "kb_title".
                if source_title in titles:
                    errors.append("More than one source with the same title. <%s>" % source_title)
                else:
                    titles.add(source_title)

        if errors:
            raise exceptions.MalformedSources(
                "Error/s found that must be fixed!!!\n%s" % "\n".join(errors))

    def _ensure_paths(self):
        """Ensure the existence of some folders.
        """
        if self._dry_run:
            self.logger.log_dry_run("Parent directory will be created at:\n%s" %
                                    self._archives_storage)
        else:
            if not os.path.exists(self._archives_storage):
                os.makedirs(self._archives_storage)

    def _expand_archives_data(self):
        """Add additional data to the archives data.
        """
        try:
            with open(self._archives_last_updated, "r", encoding="UTF-8") as json_file:
                self._last_update_data = json.loads(json_file.read())
        except Exception:
            self._last_update_data = {}

        for data in self._archives_data:
            cat_path = data["kb_category"].replace("|", os.sep)

            # Generate and add "slugified_name".
            data["slugified_name"] = string_utils.slugify(data["kb_title"])

            # Generate and add the path to the extraction destination directory.
            data["extraction_destination"] = os.path.join(self._archives_destination,
                                                          data.get("kb_handler", "ext"),
                                                          cat_path,
                                                          data["kb_title"])

            # Generate and add the path for the downloaded file.
            # If it's a compressed file, download it into a storage folder.
            if data.get("unzip_prog", False):
                data["downloaded_filename"] = os.path.join(
                    self._archives_storage, data["slugified_name"])
            else:  # If it's an HTML file, download it directly into its final destination.
                data["downloaded_filename"] = os.path.join(
                    data["extraction_destination"], data.get("kb_filename", "index.html"))

            # Insert the date in which the data was last updated.
            if self._last_update_data:
                data["last_updated"] = self._last_update_data.get(data["slugified_name"], None)

        # Lastly, sort dictionaries by data names.
        self._archives_data = sorted(self._archives_data, key=lambda arch: arch["kb_title"])


if __name__ == "__main__":
    pass
