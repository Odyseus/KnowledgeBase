#!/usr/bin/python3
# -*- coding: utf-8 -*-
"""Main application utilities.

Attributes
----------
CAT_LIST_ITEM_TEMPLATE : str
    HTML template for the categories menu items.
CAT_MENU_TEMPLATE : str
    HTML template for the categories menus.
custom_copytree_global_ignored_patterns : list
    List of globally ignored patterns for the :any:`file_utils.custom_copytree` function.
root_folder : str
    The main folder containing the application. All commands must be executed
    from this location without exceptions.
WWW_BASE_PATH : str
    The path to the www folder.
"""

import json
import os

from shlex import quote as shell_quote
from subprocess import CalledProcessError

from .python_utils import cmd_utils
from .python_utils import file_utils
from .python_utils import shell_utils

root_folder = os.path.realpath(os.path.abspath(os.path.join(
    os.path.normpath(os.getcwd()))))

custom_copytree_global_ignored_patterns = [".git"]

WWW_BASE_PATH = os.path.join(root_folder, "UserData", "www")


CAT_LIST_ITEM_TEMPLATE = """{indent}<li class="nav-item">
{indent}    <span class="btn-group" role="group">
{indent}        <a class="nav-link {cat_class} cat-btn btn" href="#"><i class="cat-icon nf {cat_icon}"></i>{cat_title}</a>
{indent}    </span>
{indent}</li>"""


CAT_MENU_TEMPLATE = """<li class="nav-item">
    <span class="btn-group" role="group">
        <a class="nav-link cat-btn btn" href="#"><i class="cat-icon nf {cat_icon}">\
</i>{cat_title}</a>
        <a class="toggle-cat-btn btn" href="#{cat_menu_id}" data-toggle="collapse" aria-expanded="false"></a>
    </span>
    <ul class="collapse list-unstyled subcats" id="{cat_menu_id}">
{sub_cat_items}
    </ul>
</li>"""


class DataTablesObject():
    """This class generates the data_tables.json file used by
    the `DataTables JavaScript library <http://www.datatables.net/>`_ which
    is used in the Knowledge Base index.html file.

    Attributes
    ----------
    data_tables_obj : list
        Where the JSON data is stored before finally save it into a JSON file.
    logger : object
        See <class :any:`LogSystem`>.
    """

    def __init__(self, file_extensions=[], dry_run=False, logger=None):
        """Initialize.

        Parameters
        ----------
        file_extensions : list, optional
            Used by the :any:`DataTablesObject._get_data_by_file_extension` method.
        dry_run : bool, optional
            Log an action without actually performing it.
        logger : object
            See <class :any:`LogSystem`>.
        """
        self.data_tables_obj = []
        self._dry_run = dry_run
        self.logger = logger
        self._file_extensions = file_extensions

        self._get_data_by_file_extension()
        self._get_data_from_html_pages()
        self._get_data_from_repositories()
        self._get_data_from_html_pages_from_archives()

    def _get_data_by_file_extension(self):
        """Generate JSON data depending on the file extensions stored in self._file_extensions.

        The file extensions are actually name of folders located inside the UserData/www
        folder (as of now, "md" for Markdown files, "html" for HTML pages, "pdf" for PDF files and
        epub for ePub files).
        Inside these folders are sub-folders (representing category names) which contain other
        folders (representing sub-category names). Finally, all second level sub-folders contain
        files of said file types.

        These folders will be scanned in search for files and generate "JSON data objects" that
        will be stored into self.data_tables_obj.
        """
        for file_extension in self._file_extensions:
            file_pattern = "." + file_extension
            pages_path = os.path.join(WWW_BASE_PATH, file_extension)

            if not os.path.exists(pages_path):
                continue

            cat_names = os.listdir(pages_path)

            for cat in cat_names:
                if not os.path.isdir(os.path.join(pages_path, cat)):
                    continue

                sub_cat_names = os.listdir(os.path.join(pages_path, cat))

                for sub_cat in sub_cat_names:
                    sub_cat_path = os.path.join(pages_path, cat, sub_cat)

                    if not os.path.isdir(sub_cat_path):
                        continue

                    for dirname, dirnames, filenames in os.walk(sub_cat_path, topdown=False):
                        for filename in filenames:
                            try:
                                if filename.endswith(file_pattern):
                                    title = filename[:-int(len(file_pattern))]
                                    category = cat + "|" + sub_cat

                                    self.data_tables_obj.append({
                                        "t": title,
                                        "c": category,
                                        "h": 0 if file_extension in ["md", "html"] else 1,
                                        # Full path to files from the www folder.
                                        "p": os.path.join(file_extension, cat, sub_cat,
                                                          title + "." + file_extension),
                                        # Icon name
                                        "i": file_extension
                                    })

                                    if file_extension == "epub":
                                        rel_epub = os.path.join(
                                            file_extension, cat, sub_cat, title, "index.html")
                                        abs_epub = os.path.join(WWW_BASE_PATH, rel_epub)

                                        if file_utils.is_real_file(abs_epub):
                                            self.data_tables_obj.append({
                                                "t": title,
                                                "c": category,
                                                "h": 1,
                                                # Full path to files from the www folder.
                                                "p": rel_epub,
                                                # Icon name
                                                "i": "html-external"
                                            })
                            except Exception as err:
                                self.logger.error(filename)
                                self.logger.error(err)
                                continue

    def _get_data_from_html_pages(self):
        """Obtain the JSON data stored in html_pages.json and store it into self.data_tables_obj.

        The UserData/www/html_pages/html_pages.json is manually maintained and it contains
        JSON data related to the content of the html_pages folder.
        """
        json_path = os.path.join(WWW_BASE_PATH, "html_pages", "html_pages.json")
        json_data = None

        try:
            with open(json_path, "r") as json_file:
                json_data = json.loads(json_file.read())

            if json_data is not None:
                # Add this common data here instead of specifying the same data
                # a million times inside the JSON file.
                for data in json_data:
                    data["p"] = "html_pages/{title}/{html_file}".format(title=data["t"],
                                                                        html_file=data["p"])
                    data["h"] = 1
                    data["i"] = "html-external"

                self.data_tables_obj += json_data
        except Exception as err:
            self.logger.error("get_data_from_html_pages")
            self.logger.error(err)

    def _get_data_from_repositories(self):
        """Obtain the JSON data generated for each repository.

        Each repository, after it's "handled", will generate a JSON file containing data related
        to the repository itself. This method will store all that data into self.data_tables_obj.
        """
        from . import repositories_handler

        handler = repositories_handler.RepositoriesHandler(dry_run=self._dry_run,
                                                           logger=self.logger)
        data_tables_obj = handler.get_data_tables_obj()

        if data_tables_obj:
            self.data_tables_obj += data_tables_obj

    def _get_data_from_html_pages_from_archives(self):
        """Obtain the JSON data generated for downloaded archives.
        """
        from . import archives_handler

        handler = archives_handler.ArchivesHandler(dry_run=self._dry_run,
                                                   logger=self.logger)
        data_tables_obj = handler.get_data_tables_obj()

        if data_tables_obj:
            self.data_tables_obj += data_tables_obj

    def get_data_tables_obj(self):
        """Obtain self.data_tables_obj.

        Returns
        -------
        list
            self.data_tables_obj
        """
        return self.data_tables_obj


def get_pandoc_path():
    """Get path of Pandoc executable.

    Returns
    -------
    str
        Pandoc executable path.
    """
    pandoc_user_path = os.path.join(root_folder, "UserData", "pandoc", "pandoc")
    pandoc_user_path_dir = os.path.dirname(pandoc_user_path)
    pandoc_path = pandoc_user_path

    if not os.path.exists(pandoc_user_path):
        pandoc_path = cmd_utils.which("pandoc")

    if pandoc_path is None:
        msg = "Pandoc executable wasn't found on your system nor in <%s>!!!\n" % pandoc_user_path_dir
        msg += "Install Pandoc and/or place its binary in <%s>" % pandoc_user_path_dir
        raise (msg)

    return pandoc_path


def convert_html_to_markdown(from_clipboard, logger):
    """Convert HTML files into Markdown.

    Parameters
    ----------
    from_clipboard : bool
        Convert clipboard content.
    logger : object
        See <class :any:`LogSystem`>.
    """
    pandoc_inplace_convertion(from_format="html", to_format="md",
                              from_clipboard=from_clipboard, logger=logger)


def convert_rst_to_markdown(from_clipboard, logger):
    """Convert RST files into Markdown.

    Parameters
    ----------
    from_clipboard : bool
        Convert clipboard content.
    logger : object
        See <class :any:`LogSystem`>.
    """
    pandoc_inplace_convertion(from_format="rst", to_format="md",
                              from_clipboard=from_clipboard, logger=logger)


def pandoc_inplace_convertion(from_format, to_format, from_clipboard, logger):
    """Convert documents inside a fixed temporary location with Pandoc.

    Parameters
    ----------
    from_format : str
        From which format to convert from. See :any:`convert_with_pandoc` for more details.
    to_format : str
        To which format to convert to. See :any:`convert_with_pandoc` for more details.
    from_clipboard : bool
        Convert clipboard content.
    logger : object
        See <class :any:`LogSystem`>.

    Returns
    -------
    None
        Halt execution.
    """
    file_pattern = ".%s" % from_format
    output_path = os.path.join(root_folder, "UserData", "data_storage",
                               "pandoc_convertions", "%s_to_%s" % (from_format, to_format))

    # Use of the latest version of pandoc downloaded from their repository.
    # https://github.com/jgm/pandoc/releases
    # Forced to do this because some Pandoc arguments/options from the version
    # available on the Ubuntu 16.04 repositories doesn't work as they should.
    # Pandoc 1.16.x: --email-obfuscation=none does NOT work.
    # Pandoc 1.19.x: --email-obfuscation=none does work.

    if not os.path.exists(output_path):
        os.makedirs(output_path)

    if from_clipboard:
        from .common import pyperclip
        from_clipboard_file_name = "from_clipboard.%s" % to_format
        from_clipboard_file_path = os.path.join(output_path, from_clipboard_file_name)

        try:
            with open(from_clipboard_file_path, "w") as from_clipboard_file:
                from_clipboard_file.write(pyperclip.paste())
        except Exception as err:
            logger.error(err)
            return

        convert_with_pandoc(from_clipboard_file_path, output_path,
                            from_format, to_format, logger)
    else:
        for dirname, dirnames, filenames in os.walk(output_path, topdown=False):
            for filename in filenames:
                if filename.endswith(file_pattern):
                    file_path = os.path.join(dirname, filename)
                    convert_with_pandoc(file_path, output_path, from_format, to_format, logger)


def convert_with_pandoc(input_file, output_path, from_format, to_format, logger):
    """Convert documents using Pandoc.

    The "input_file" file will be converted and saved inside the "output_path" folder. The output
    file will have the same name as the input file, but with the extension defined by the
    "to_format" parameter.

    Parameters
    ----------
    input_file : str
        The file to convert.
    output_path : str
        The location were the converted file will be saved.
    from_format : str
        From which format to convert from. This is actually the file extension of "input_file".
        This file extension will be used to decide which argument to pass to the "--from" Pandoc
        option.
    to_format : str
        To which format to convert to. Similarly to "from_format", this parameter is a file
        extension that will be used to chose the argument to pass to the "--to" Pandoc option.
        It is also the file extension that will be assigned to the output file.
    logger : object
        See <class :any:`LogSystem`>.
    """
    pandoc_path = get_pandoc_path()

    # Store "--to" and "--from" options in case that in the future I decide to implement
    # conversions to/from other formats and the file extension doesn't match the output format.
    from_options = {
        "html": "html",
        "rst": "rst"
    }
    to_options = {
        "md": "markdown_github"
    }

    try:
        cmd_utils.exec_command(
            " ".join([
                pandoc_path,
                "--atx-headers",
                "--email-obfuscation=none",
                "--wrap=preserve",
                "--to=%s" % to_options[to_format],
                "--normalize",
                "--output=%s" % ('"%s.%s"' %
                                 (os.path.splitext(os.path.basename(input_file))[0], to_format)),
                "--no-highlight",
                "--from=%s" % from_options[from_format],
                "%s" % ('"' + input_file + '"')
            ]),
            working_directory=output_path,
            logger=logger
        )
    except Exception as err:
        logger.error(err)


def convert_epub_to_html(logger):
    """Convert epub to html.

    Parameters
    ----------
    logger : object
        See <class :any:`LogSystem`>.
    """
    output_path = os.path.join(root_folder, "UserData", "data_storage",
                               "pandoc_convertions", "epub_to_html")

    header_include_path = os.path.join(root_folder, "AppData", "data",
                                       "includes", "epub_to_html_header_include.html")

    list_of_files = [entry.name for entry in os.scandir(output_path) if
                     entry.is_file(follow_symlinks=False) and entry.name.endswith(".epub")]

    for f in list_of_files:
        logger.info(shell_utils.get_cli_separator("-"), date=False)
        logger.info("Converting:")
        logger.info(f, date=False)
        f_path = os.path.join(output_path, f)
        dst_name = os.path.splitext(f)[0]
        dst_path = os.path.join(output_path, dst_name)

        os.makedirs(dst_path, mode=0o777, exist_ok=True)

        cmd = [
            "pandoc",
            "--standalone",
            shell_quote(f_path),
            "--output",
            shell_quote("%s/index.html" % dst_path),
            "--extract-media=assets",
            "--include-in-header=%s" % shell_quote(header_include_path),
            "--wrap=none",
            "--table-of-contents",
            "--to=html5"
        ]

        try:
            logger.info(" ".join(cmd), date=False)

            cmd_utils.run_cmd(" ".join(cmd), stdout=None, stderr=None,
                              cwd=dst_path, shell=True, check=True)
        except CalledProcessError as err:
            logger.error(err)


def create_main_json_file(dry_run=False, logger=None):
    """Generate the data_tables.json file.

    See :any:`DataTablesObject`

    Parameters
    ----------
    dry_run : bool, optional
        See :any:`DataTablesObject` > dry_run parameter.
    logger : object
        See <class :any:`LogSystem`>.
    """
    logger.info(shell_utils.get_cli_separator("-"), date=False)
    logger.info("Generating main JSON file...")
    data_tables_obj = DataTablesObject(file_extensions=["md", "pdf", "html", "epub"],
                                       dry_run=dry_run,
                                       logger=logger).get_data_tables_obj()

    data_tables_json_path = os.path.join(WWW_BASE_PATH, "assets", "data", "data_tables.json")

    try:
        if dry_run:
            logger.info("[DRY_RUN] Main JSON file will be created at: \n%s" %
                        data_tables_json_path, date=False)
        else:
            with open(data_tables_json_path, "w") as data_tables_json_file:
                data_tables_json_file.write(json.dumps(data_tables_obj))

                logger.info("data_tables.json file created at: \n%s" % data_tables_json_path)
    except Exception as err:
        logger.error(err)


def generate_categories_html(dry_run=False, logger=None):
    """Generate the categories.html file.

    Parameters
    ----------
    dry_run : bool, optional
        See :any:`DataTablesObject` > dry_run parameter.
    logger : object
        See <class :any:`LogSystem`>.

    Raises
    ------
    SystemExit
        Halt execution.
    """
    logger.info(shell_utils.get_cli_separator("-"), date=False)
    logger.info("Generating categories.html file...")
    # Collect all categories from the data_tables.json file.
    data_tables_json = os.path.join(WWW_BASE_PATH, "assets", "data", "data_tables.json")
    temp_set = set()

    try:
        with open(data_tables_json, "r") as data_tables_file:
            json_data = json.loads((data_tables_file.read()))
            for cat_data in json_data:
                temp_set.add(cat_data["c"])
    except Exception as err:
        logger.error(err)
        raise SystemExit()

    # Collect categories' data. Just icons are stored for now.
    categories_data_json = os.path.join(
        root_folder, "UserData", "categories_data", "categories.json")
    raw_categories = list(temp_set)
    categories_data = {}
    categories_html_list_items = [CAT_LIST_ITEM_TEMPLATE.format(
        cat_title="All Categories",
        cat_class="cat-link",
        cat_icon="nf-fa-bars",
        indent=""
    )]

    if os.path.exists(categories_data_json):
        try:
            with open(categories_data_json, "r") as categories_data_file:
                categories_data = json.loads((categories_data_file.read()))
        except Exception as err:
            logger.error(err)
    else:
        msg = "UserData/categories_data/categories.json non existent.\n"
        msg += "This file is used to add custom icons to each category.\n"
        msg += "Can be created with `./app.py run generate_categories_html` command.\n"
        msg += "Or let categories use a generic icon."
        logger.warning(msg)

    categories = {}

    for raw_cat in raw_categories:
        raw_cat_pair = raw_cat.split("|")

        try:
            category, subcategory = raw_cat_pair
        except Exception:
            category, subcategory = raw_cat_pair[0], None

        try:
            cat_icon = categories_data[category]["icon"]
        except Exception:
            cat_icon = "nf-fa-folder"

        if subcategory is not None:
            try:
                sub_cat_icon = categories_data[subcategory]["icon"]
            except Exception:
                sub_cat_icon = "nf-fa-folder"

        stored_cat = categories.get(category, None)

        if stored_cat is None:
            categories[category] = {
                "icon": cat_icon,
                "subcategories": []
            }

        if subcategory is not None:
            categories[category]["subcategories"].append({
                "name": subcategory,
                "icon": sub_cat_icon
            })

    # Build the html list items.
    for cat, keys in sorted(categories.items()):
        if len(keys["subcategories"]) == 0:
            categories_html_list_items.append(CAT_LIST_ITEM_TEMPLATE.format(
                cat_title=cat,
                cat_class="cat-link",
                cat_icon=keys["icon"],
                indent=""
            ))
        else:
            sub_cat_html_items = []

            for sub_cat in sorted(keys["subcategories"], key=lambda x: x["name"].lower()):
                sub_cat_html_items.append(CAT_LIST_ITEM_TEMPLATE.format(
                    cat_title=sub_cat["name"],
                    cat_class="sub-cat-link",
                    cat_icon=sub_cat["icon"],
                    indent="        "
                ))

            categories_html_list_items.append(CAT_MENU_TEMPLATE.format(
                cat_title=cat,
                cat_icon=keys["icon"],
                cat_menu_id="cat-menu-%s" % cat.lower(),
                sub_cat_items="\n".join(sub_cat_html_items),
            ))

    # And finally, save the HTML list items into categories.html file.
    categories_html_file = os.path.join(WWW_BASE_PATH, "assets", "data", "categories.html")
    categories_html_data = "\n".join(categories_html_list_items)

    try:
        if dry_run:
            msg = "categories.html file will be created at:\n%s" % categories_html_file
            logger.info("[DRY_RUN] %s" % msg, date=False)
            logger.info("[DRY_RUN] File content: \n%s" % categories_html_data, date=False)
        else:
            with open(categories_html_file, "w") as html_file:
                html_file.write(categories_html_data)

            logger.info("categories.html file created at: \n%s" % categories_html_file)
    except Exception as err:
        logger.error(err)


def generate_index_html(dry_run=False, logger=None):
    """generate the index.html file.

    Parameters
    ----------
    dry_run : bool, optional
        See :any:`DataTablesObject` > dry_run parameter.
    logger : object
        See <class :any:`LogSystem`>.

    Raises
    ------
    SystemExit
        Halt execution.
    """
    logger.info(shell_utils.get_cli_separator("-"), date=False)
    logger.info("Generating index.html file...")
    categories_html_file = os.path.join(WWW_BASE_PATH, "assets", "data", "categories.html")

    try:
        with open(categories_html_file, "r") as html_file:
            categories_data = html_file.read()
    except Exception as err:
        logger.error(err)
        raise SystemExit(1)

    base_index_html_file = os.path.join(WWW_BASE_PATH, "assets", "data", "index-base.html")

    try:
        with open(base_index_html_file, "r") as html_file:
            index_data = html_file.read().replace("<!-- {{categories}} -->", categories_data)
    except Exception as err:
        logger.error(err)
        raise SystemExit(1)

    index_html_file = os.path.join(WWW_BASE_PATH, "index.html")

    try:
        if dry_run:
            msg = "index.html file will be created at:\n%s" % index_html_file
            logger.info("[DRY_RUN] %s" % msg, date=False)
            logger.info("[DRY_RUN] File content: \n%s" % index_data, date=False)
        else:
            with open(index_html_file, "w") as html_file:
                html_file.write(index_data)

            logger.info("index.html file created at: \n%s" % index_html_file)
    except Exception as err:
        logger.error(err)


if __name__ == "__main__":
    pass
