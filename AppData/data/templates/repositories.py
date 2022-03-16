# -*- coding: utf-8 -*-
"""Repositories data practical example.
"""
data = [
    {
        "repo_owner": "hexchat",
        "repo_name": "documentation",
        "repo_handler": "sphinx_docs",
        "kb_category": "Software|Documentation",
        "kb_title": "HexChat documentation"
    }, {
        "repo_owner": "sindresorhus",
        "repo_name": "awesome",
        "repo_handler": "files",
        "repo_file_patterns_include": ["readme.md"],
        "kb_category": "Bookmark",
        "kb_title": "Awesome (Curated list of awesome lists)",
    }, {
        "repo_owner": "rstacruz",
        "repo_name": "cheatsheets",
        "repo_handler": "files",
        "repo_file_patterns_include": ["*.md"],
        "repo_file_patterns_ignore": ["README.md"],
        "kb_category": "Software|Quick Reference",
        "kb_title_prefix": "Devhints cheatsheets - "
    }
]
