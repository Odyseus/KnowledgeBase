#!/usr/bin/python3
# -*- coding: utf-8 -*-
data = {
    # web_service : (str) (Mandatory)
    # Possible values: "github" or "bitbucket"
    "web_service": "{repository}",
    "repositories": {
        "sphinx_generated_handler": [
            {
                # repo_owner : (str) (mandatory)
                # The owner of the GitHub repository.
                "repo_owner": "sphinx-doc",

                # repo_name : (str) (mandatory)
                # The name of the GitHub repository.
                "repo_name": "sphinx",

                # path_handler : (int) (optional) (default: 0)
                # An integer that will be used to determine the JavaScript
                # function that will be used to handle the path to the
                # Markdown/HHTML/PDF files.
                #   0 = A function that is used to handle Markdown files.
                #       They will be rendered inline inside the index page.
                #   1 = A function that is used to handle HTML/PDF files.
                #       They will be loaded into a new browser tab.
                "path_handler": 1,

                # repo_img : (str) (optional) (default: md)
                # The name of the image used by the entries on the table.
                "repo_img": "html5",

                # category : (str) (optional)
                # Category name. The category must exist in the
                # assets/data/categories_data.json file.
                "category": "Documentation",

                # title : (str) (optional)
                # Title.
                "title": "Sphinx Documentation",

                # filename : (str) (optional)
                # "single_file_handler" and "sphinx_generated_handler" only.
                # The file that will be used. If not specified, README.md will
                # be used for single_file_handler repositories and index.html
                # for sphinx_generated_handler.
                "filename": "index.html",

                # rel_path : (str) (optional)
                # Path relative to the repository. In case that the
                # needed/wanted file is inside a sub-folder.
                "rel_path": "doc"
            }
        ],
        "multi_file_handler": [],
        "single_file_handler": []
    }}
