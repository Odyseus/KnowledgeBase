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
    The main folder containing the Knowledge Base. All commands must be executed
    from this location without exceptions.
WWW_BASE_PATH : str
    The path to the www folder.
"""

import json
import os

from .python_utils import file_utils, misc_utils, cmd_utils

root_folder = os.path.realpath(os.path.abspath(os.path.join(
    os.path.normpath(os.getcwd()))))

custom_copytree_global_ignored_patterns = [".git"]

WWW_BASE_PATH = os.path.join(root_folder, "UserData", "www")


class DataTablesObject():
    """This class generates the data_tables.json file used by
    the `DataTables JavaScript library <http://www.datatables.net/>`_ which
    is used in the Knowledge Base index.html file.

    Attributes
    ----------
    data_tables_obj : list
        Where the JSON data is stored before finally save it into a JSON file.
    file_extensions : list
        Used by the :any:`DataTablesObject.generate_data_by_file_extension` method.
    logger : object
        See <class :any:`LogSystem`>.
    """

    def __init__(self, file_extensions=[], logger=None):
        """Initialize.

        Parameters
        ----------
        file_extensions : list, optional
            Used by the :any:`DataTablesObject.generate_data_by_file_extension` method.
        logger : object
            See <class :any:`LogSystem`>.
        """
        super(DataTablesObject, self).__init__()

        self.data_tables_obj = []
        self.logger = logger
        self.file_extensions = file_extensions

        self.generate_data_by_file_extension()
        self.generate_data_from_html_pages()
        self.generate_data_from_repositories()
        self.generate_data_from_html_pages_from_archives()

    def generate_data_by_file_extension(self):
        """Generate JSON data depending on the file extensions stored in self.file_extensions.

        The file extensions are actually name of folders located inside the UserData/www
        folder (as of now, "md" for Markdown files, "html" for HTML pages and "pdf" for PDF files).
        Inside these folders are sub-folders (representing category names) which contain other
        folders (representing sub-category names). Finally, all second level sub-folders contain
        files of said file types.

        These folders will be scanned in search for files and generate "JSON data objects" that
        will be stored into self.data_tables_obj.
        """
        for file_extension in self.file_extensions:
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
                            except Exception as err:
                                self.logger.error(filename)
                                self.logger.error(err)
                                continue

    def generate_data_from_html_pages(self):
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
                self.data_tables_obj += json_data
        except Exception as err:
            self.logger.error("get_data_from_html_pages")
            self.logger.error(err)

    def generate_data_from_repositories(self):
        """Obtain the JSON data generated for each repository.

        Each repository, after it's "handled", will generate a JSON file containing data related
        to the repository itself. This method will store all that data into self.data_tables_obj.
        """
        from . import repositories_handler

        data_tables_obj = repositories_handler.get_json_data_from_repositories(self.logger)

        if data_tables_obj:
            self.data_tables_obj += data_tables_obj

    def generate_data_from_html_pages_from_archives(self):
        """Obtain the JSON data generated for downloaded archives.
        """
        from . import archives_handler

        handler = archives_handler.ArchivesHandler(logger=self.logger)
        data_tables_obj = handler.get_archives_json_data()

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
    output_path = os.path.join(root_folder, "UserData", "tmp",
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


def main_json_file_creation(debug=False, logger=None):
    """Generate the data_tables.json file.

    See :any:`DataTablesObject`

    Parameters
    ----------
    debug : bool, optional
        Save JSON files with indentation.
    logger : object
        See <class :any:`LogSystem`>.
    """
    data_tables_obj = DataTablesObject(
        file_extensions=["md", "pdf", "html"], logger=logger).get_data_tables_obj()

    data_tables_json_path = os.path.join(WWW_BASE_PATH, "assets", "data", "data_tables.json")

    try:
        with open(data_tables_json_path, "w") as data_tables_json_file:
            if (debug):
                data_tables_json_file.write(json.dumps(data_tables_obj, indent=4, sort_keys=True))
            else:
                data_tables_json_file.write(json.dumps(data_tables_obj))
    except Exception as err:
        logger.error(err)


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


def categories_html_generation(logger):
    """Generate the categories.html file.

    Parameters
    ----------
    logger : object
        See <class :any:`LogSystem`>.
    """
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
        exit()

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
        msg += "Can be created with `./app.py run categories_html_generation` command.\n"
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

    try:
        with open(categories_html_file, "w") as html_file:
            html_file.write("\n".join(categories_html_list_items))

        logger.info("categories.html file created.")
    except Exception as err:
        logger.error(err)


def index_html_generation(logger):
    """generate the index.html file.

    Parameters
    ----------
    logger : object
        See <class :any:`LogSystem`>.
    """
    categories_html_file = os.path.join(WWW_BASE_PATH, "assets", "data", "categories.html")

    try:
        with open(categories_html_file, "r") as html_file:
            categories_data = html_file.read()
    except Exception as err:
        logger.error(err)
        exit()

    base_index_html_file = os.path.join(WWW_BASE_PATH, "assets", "data", "index-base.html")

    try:
        with open(base_index_html_file, "r") as html_file:
            index_data = html_file.read().replace("<!-- {{categories}} -->", categories_data)
    except Exception as err:
        logger.error(err)
        exit()

    index_html_file = os.path.join(WWW_BASE_PATH, "index.html")

    try:
        with open(index_html_file, "w") as html_file:
            html_file.write(index_data)

        logger.info("index.html file created.")
    except Exception as err:
        logger.error(err)


def create_file_from_template(action, logger):
    """Create a "user" file from a template.

    Parameters
    ----------
    action : str
        An "action" that will be used to generate certain files from their
        predefined templates.
    logger : object
        See <class :any:`LogSystem`>.
    """
    actions_map = {
        "app_launcher_script": {
            "filename": "app_launcher",
            "ext": ".sh",
            "destination": "UserData/bash_scripts"
        },
        "github_data_file": {
            "filename": "github",
            "template_filename": "repository",
            "ext": ".py",
            "destination": "UserData/data_sources"
        },
        "bitbucket_data_file": {
            "filename": "bitbucket",
            "template_filename": "repository",
            "ext": ".py",
            "destination": "UserData/data_sources"
        },
        "argos_script": {
            "filename": "argos_helper_script",
            "ext": ".py",
            "destination": "UserData/argos_script"
        },
        "categories_data_file": {
            "filename": "categories",
            "ext": ".json",
            "destination": "UserData/categories_data"
        },
    }

    src_dir = os.path.join(root_folder, "AppData", "data", "templates")
    dst_dir = os.path.join(root_folder, actions_map[action]["destination"])

    if not os.path.exists(dst_dir):
        os.makedirs(dst_dir)

    src_filename = actions_map[action].get("template_filename", actions_map[action].get("filename"))
    src_file = os.path.join(src_dir, src_filename + actions_map[action]["ext"])
    dst_file = os.path.join(dst_dir, actions_map[action]["filename"] + actions_map[action]["ext"])

    if os.path.exists(dst_file):
        renamed_file_name = actions_map[action]["filename"] + "-" + \
            misc_utils.micro_to_milli(misc_utils.get_date_time(
                "filename")) + actions_map[action]["ext"]
        renamed_file_path = os.path.join(dst_dir, renamed_file_name)
        os.rename(dst_file, renamed_file_path)
        logger.warning("Destination file already in existence. Renamed to:")
        logger.warning(os.path.relpath(renamed_file_path, root_folder))

    try:
        file_utils.custom_copy2(src_file, dst_file, logger)
    finally:
        if action in ["github_data_file", "bitbucket_data_file"]:
            # The fileinput module is absolute garbage. So...
            # Let's read in the file...
            with open(dst_file, "r") as file:
                filedata = file.read()

            # Replace the target string...
            filedata = filedata.replace("{repository}", actions_map[action]["filename"])

            # Write the file out again...
            with open(dst_file, "w") as file:
                file.write(filedata)

        logger.info("New file created at:")
        logger.info(os.path.relpath(dst_file, root_folder))


if __name__ == "__main__":
    pass
