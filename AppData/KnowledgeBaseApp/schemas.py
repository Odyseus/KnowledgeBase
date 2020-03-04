#!/usr/bin/python3
# -*- coding: utf-8 -*-
"""Schemas for JSON data validation.

Attributes
----------
archives_schema : dict
    JSON schema.
categories_data_schema : dict
    JSON schema.
common_keys : dict
    JSON schema.
repositories_schema : dict
    JSON schema.
"""
common_keys = {
    "kb_title": {
        "type": "string",
        "description": "The title that will be displayed in the web page index."
    },
    "kb_category": {
        "type": "string",
        "description": "A category name to organize the web page index."
    },
    "kb_file_append": {
        "type": "array",
        "description": "A list of tuples.",
        "items": {
            "type": "custom_tuple",
            "description": "A tuple. It must contain a path to a file (relative to **UserData/www/html_pages_from_archives/<kb_title>**) at index 0 (zero) and a string at index 1 (one)."
        }
    },
    "no_json": {
        "type": "boolean",
        "description": "Not implemented.",
    }
}

archives_schema = {
    "description": "Schema to validate the 'data' property inside a UserData/data_sources/archives.py file.",
    "type": "array",
    "additionalItems": True,
    "items": {
        "type": "object",
        "additionalProperties": False,
        "required": [
            "kb_title",
            "kb_category",
            "arch_url"
        ],
        "properties": {
            "kb_title": common_keys["kb_title"],
            "kb_category": common_keys["kb_category"],
            "no_json": common_keys["no_json"],
            "arch_url": {
                "type": "string",
                "description": "The url from which to download an archive."
            },
            "kb_rel_path": {
                "type": "string",
                "description": "The path (relative to **UserData/www/html_pages_from_archives/<kb_title>**) to the a folder containing an HTML file (``kb_filename``) found inside the extracted content of an archive."
            },
            "kb_filename": {
                "type": "string",
                "description": "The file name found inside the extracted content of an archive relative to ``kb_rel_path``."
            },
            "kb_file_append": common_keys["kb_file_append"],
            "download_frequency": {
                "enum": ["d", "w", "m", "s"],
                "description": "Frequency at which an archive should be downloaded."
            },
            "unzip_prog": {
                "enum": ["7z", "unzip", "tar"],
                "description": "The command to use to decompress archives."
            },
            "untar_arg": {
                "enum": [
                    "--xz",
                    "-J",
                    "--gzip",
                    "-z",
                    "--bzip2",
                    "-j"
                ],
                "description": "The decompress argument used by the ``tar`` program."
            }
        }
    }
}

repositories_schema = {
    "description": "Schema to validate the 'data' property inside a UserData/data_sources/archives.py file.",
    "type": "array",
    "additionalItems": True,
    "items": {
        "type": "object",
        "additionalProperties": False,
        "oneOf": [
            {
                "required": ["repo_owner", "repo_name", "kb_category", "kb_title"]
            }, {
                "required": ["repo_owner", "repo_name", "kb_category", "kb_title_prefix"]
            }
        ],
        "properties": {
            "repo_owner": {
                "type": "string",
                "description": "Repository owner/organization."
            },
            "repo_name": {
                "type": "string",
                "description": "pository name."
            },
            "repo_service": {
                "enum": ["github", "bitbucket", "gitlab"],
                "description": "This value is used to generate a URL to an on-line service."
            },
            "copy_full_repo": {
                "type": "boolean",
                "description": "Whether to copy the full repository to its final location or not."
            },
            "repo_handler": {
                "enum": ["files", "sphinx_docs", "code_recipes"],
                "description": "Repository handler."
            },
            "repo_type": {
                "enum": ["git", "hg"],
                "description": "Repository type."
            },
            "repo_file_names": {
                "type": "array",
                "description": "A list of file paths relative to a repository folder.",
                "items": {
                    "type": "string",
                    "description": "A file path relative to a repository folder."
                }
            },
            "repo_file_patterns_include": {
                "type": "array",
                "description": "A list of file patterns.",
                "items": {
                    "type": "string",
                    "description": "A file pattern."
                }
            },
            "repo_file_patterns_ignore": {
                "type": "array",
                "description": "A list of file patterns.",
                "items": {
                    "type": "string",
                    "description": "A file pattern."
                }
            },
            "repo_sources_path": {
                "type": "string",
                "description": "A relative path to the desired Sphinx documentation sources."
            },
            "kb_title_prefix": {
                "type": "string",
                "description": "The prefix that will be used to generate a label that will be displayed in the web page index table."
            },
            "kb_index_filename": {
                "type": "string",
                "description": "The file name of the index file of the generated documentation."
            },
            "kb_title": common_keys["kb_title"],
            "kb_category": common_keys["kb_category"],
            "kb_file_append": common_keys["kb_file_append"],
            "no_json": common_keys["no_json"]
        }
    }
}

categories_data_schema = {
    "description": "Schema to validate the content of the UserData/categories_data/categories.json file.",
    "type": "object",
    "additionalProperties": True,
    "patternProperties": {
        ".*": {
            "type": "object",
            "additionalProperties": False,
            "required": [
                "icon"
            ],
            "properties": {
                "icon": {
                    "type": "string"
                }
            }
        }
    }
}


if __name__ == "__main__":
    pass
