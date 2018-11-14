#!/usr/bin/python3
# -*- coding: utf-8 -*-
"""Repositories data practical example.
"""
data = [
    {
        "repo_owner": "hexchat",
        "repo_name": "documentation",
        "repo_handler": "sphinx_docs",
        "kb_category": "Software|Documentation",
        "kb_title": "HexChat documentation",
        "kb_rel_path": ""
    }, {
        "repo_owner": "sindresorhus",
        "repo_name": "awesome",
        "repo_handler": "single_file",
        "repo_filename": "readme.md",
        "kb_category": "Bookmark",
        "kb_title": "Awesome (Curated list of awesome lists)",
    }, {
        "repo_owner": "rstacruz",
        "repo_name": "cheatsheets",
        "repo_handler": "multi_files",
        "repo_file_pattern": ".md",
        "kb_category": "Software|Quick Reference",
        "kb_title_prefix": "Devhints cheatsheets - ",
        "kb_file_ignore": ["README.md"]
    }
]
