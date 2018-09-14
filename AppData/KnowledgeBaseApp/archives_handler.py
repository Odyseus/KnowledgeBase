#!/usr/bin/python3
# -*- coding: utf-8 -*-
"""Utilities to handle downloaded archives.

Attributes
----------
root_folder : str
    The main folder containing the Knowledge Base. All commands must be executed
    from this location without exceptions.
"""

import json
import os
import sys
import time

from datetime import datetime, timedelta
from runpy import run_path
from shutil import rmtree
from subprocess import Popen, STDOUT, PIPE

from . import app_utils
from .python_utils import exceptions, tqdm_wget, cmd_utils

try:
    from slugify import slugify
except (SystemError, ImportError):
    raise exceptions.MissingDependencyModule("Module not installed: <python-slugify>")


root_folder = os.path.realpath(os.path.abspath(os.path.join(
    os.path.normpath(os.getcwd()))))


try:
    archives_data = run_path(os.path.join(root_folder, "UserData", "data_sources", "archives.py"))[
        "data"]
except Exception:
    archives_data = None


class ArchivesHandler():
    """Class to handle archives downloaded from the net (compressed or not).

    Attributes
    ----------
    archives_data : list
        The list containing all the data needed to handle archives.
    archives_destination : str
        The final path where to store the downloaded archives.
    archives_last_updated : str
        Path to the JSON file were the last updated dates are stored.
    archives_storage : str
        The path to the temporary folder to store downloaded archives and other data.
    compressed_archives : list
        The list of compressed archives.
    current_date : str
        The current date.
    last_update_data : dict
        The dictionary containing the dates in which the archives were updated.
    logger : object
        See <class :any:`LogSystem`>.
    """

    def __init__(self, logger=None):
        """Initialize.

        Parameters
        ----------
        logger : object
            See <class :any:`LogSystem`>.
        """
        super(ArchivesHandler, self).__init__()
        self.logger = logger
        self.archives_data = archives_data
        self.last_update_data = {}
        self.compressed_archives = []

        self._validate_archives_data()

        self.archives_storage = os.path.join(root_folder, "UserData", "tmp", "archives_storage")
        self.archives_destination = os.path.join(
            app_utils.WWW_BASE_PATH, "html_pages_from_archives")
        self.archives_last_updated = os.path.join(self.archives_storage, "last_updated.json")
        self.current_date = time.strftime("%B %d %Y", time.gmtime())  # Format = January 1 2018

        self._ensure_paths()
        self._expand_archives_data()

    def get_archives_json_data(self):
        """Get archives DataTables JSON data.

        Returns
        -------
        list
            DataTables object.
        """
        data_tables_obj = []

        for data in self.archives_data:
            try:
                data_tables_obj.append({
                    "t": data["title"],
                    "c": data["category"],
                    "h": 1,  # Hard-coded path handler. No need to be specified in the data source.
                    # Path to files relative to the www folder
                    "p": os.path.join("html_pages_from_archives",
                                      data["title"],
                                      data.get("index_path", "index.html")),
                    # Hard-coded icon name. No need to be specified in the data source.
                    "i": "html-external"
                })
            except Exception as err:
                self.logger.error(data["title"])
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
            for data in self.archives_data:
                try:
                    self._download_archive(data, force_download)
                except Exception as err:
                    self.logger.error("Error downloading archive. URL: ", data["url"])
                    self.logger.error(err)
                    continue
                except (KeyboardInterrupt, SystemExit):
                    raise exceptions.KeyboardInterruption()
        except (KeyboardInterrupt, SystemExit):
            raise exceptions.KeyboardInterruption()
        else:
            with open(self.archives_last_updated, "w", encoding="UTF-8") as data_file:
                data_file.write(json.dumps(self.last_update_data, indent=4, sort_keys=True))

        if self.compressed_archives:
            self.logger.info("Handling compressed archives.")
            self._handle_compressed_archives()

        self._handle_append_to_files()

    def _handle_append_to_files(self):
        """Summary
        """
        for data in self.archives_data:
            arvhive_append_data = data.get("file_append", False)

            if arvhive_append_data:
                self.logger.info("Appending data to <" + data["title"] + ">'s files.")

                for append_data in arvhive_append_data:
                    file_path = os.path.join(data["extraction_destination"], append_data[0])
                    file_data = append_data[1]

                    if os.path.exists(file_path):
                        self.logger.info("Appending data to <" + append_data[0] + ">.")
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
            for source in self.compressed_archives:
                self.logger.info("Decompressing source <%s>." % source["title"])

                try:
                    aborted_msg = "Extract operation for <%s> aborted." % source["title"]
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
                        if not source["unzip_args"]:
                            self.logger.error(
                                "The `tar` command requires arguments (unzip_args key).\n" + aborted_msg)
                            continue

                        cmd += ["tar", source["unzip_args"],
                                source["downloaded_filename"], "--directory", ext_dst]

                    if cmd:
                        try:
                            if os.path.isfile(ext_dst):
                                os.remove(ext_dst)

                            if os.path.isdir(ext_dst):
                                rmtree(ext_dst)
                        finally:
                            os.makedirs(ext_dst, exist_ok=True)

                            self.logger.warning(
                                "Running command:\n" + " ".join(cmd))

                            p = Popen(
                                cmd,
                                stdout=PIPE,
                                stderr=STDOUT,
                                env=cmd_utils.get_environment(),
                                cwd=os.path.dirname(source["downloaded_filename"])
                            )

                            while True:
                                # Without decoding output, the loop will run forever. ¬¬
                                output = p.stdout.read(1).decode("utf-8")

                                if output == "" and p.poll() is not None:
                                    break

                                if output:
                                    sys.stdout.write(output)
                                    sys.stdout.flush()
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

        if is_compressed_source:
            try:
                os.makedirs(os.path.dirname(data["downloaded_filename"]), exist_ok=True)
            except Exception as err:
                self.logger.error(err)

        if force_download or self._should_download_archive(data):
            self.logger.info("Updating source <" + data["title"] + ">")

            try:
                tqdm_wget.download(data["url"], data["downloaded_filename"])
            except (KeyboardInterrupt, SystemExit):
                raise exceptions.KeyboardInterruption()
            except Exception as err:
                self.logger.error(err)
            else:
                self.last_update_data[data["slugified_name"]] = self.current_date

                if is_compressed_source:
                    self.compressed_archives.append(data)
        else:
            self.logger.info("Source <" + data["title"] + "> doesn't need updating.")

            if is_compressed_source:
                self.compressed_archives.append(data)

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
        frequency = data.get("frequency", "frequently")
        last_updated = data.get("last_updated", False)

        if frequency == "frequently" or not last_updated:
            return True

        downloaded_filename = data.get("downloaded_filename", False)
        downloaded_filename_exists = downloaded_filename and os.path.exists(downloaded_filename)

        if not downloaded_filename_exists:
            return True

        try:
            then = datetime.strptime(last_updated, "%B %d %Y")
            now = datetime.strptime(self.current_date, "%B %d %Y")

            if frequency == "occasionally":  # Weekly.
                return (now - then) > timedelta(days=6)
            elif frequency == "rarely":  # Monthly.
                return (now - then) > timedelta(days=29)
        except Exception:
            return True

    def _validate_archives_data(self):
        """Validate archives data.

        Raises
        ------
        exceptions.MalformedSources
            See <class :any:`exceptions.MalformedSources`>.
        """
        mandatory_keys = ["title", "url"]
        titles = []
        errors = []

        for data in self.archives_data:
            source_title = data.get("title", False)
            report_source = source_title if source_title else data
            source_keys = data.keys()

            # Do not allow sources without mandatory keys.
            for key in mandatory_keys:
                if key not in source_keys:
                    errors.append("Missing mandatory <%s> key!!! Source: <%s>" %
                                  (key, report_source))

            if source_title:
                # Do not allow more than one source with the same "title".
                if source_title in titles:
                    errors.append("More than one source with the same title. <%s>" % source_title)
                else:
                    titles.append(source_title)

        if errors:
            raise exceptions.MalformedSources(
                "Error/s found that must be fixed!!!\n%s" % "\n".join(errors))

    def _ensure_paths(self):
        """Ensure the existence of some folders.
        """
        if not os.path.exists(self.archives_storage):
            os.makedirs(self.archives_storage)

    def _expand_archives_data(self):
        """Add additional data to the archives data.
        """
        try:
            with open(self.archives_last_updated, "r", encoding="UTF-8") as json_file:
                self.last_update_data = json.loads(json_file.read())
        except Exception:
            self.last_update_data = {}

        for data in self.archives_data:
            # Generate and add "slugified_name".
            data["slugified_name"] = slugify(data["title"])

            # Generate and add the path to the extraction destination directory.
            data["extraction_destination"] = os.path.join(self.archives_destination,
                                                          data["title"])

            # Generate and add the path for the downloaded file.
            # If it's a compressed file, download it into a storage folder.
            if data.get("unzip_prog", False):
                data["downloaded_filename"] = os.path.join(
                    self.archives_storage, data["slugified_name"])
            else:  # If it's an HTML file, download it directly into its final destination.
                data["downloaded_filename"] = os.path.join(
                    data["extraction_destination"], "index.html")

            # Insert the date in which the data was last updated.
            if self.last_update_data:
                data["last_updated"] = self.last_update_data.get(data["slugified_name"], None)

        # Lastly, sort dictionaries by data names.
        self.archives_data = sorted(self.archives_data, key=lambda title: title["title"])


if __name__ == "__main__":
    pass
