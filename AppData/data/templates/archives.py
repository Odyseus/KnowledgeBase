#!/usr/bin/python3
# -*- coding: utf-8 -*-
"""Archives data practical example.
"""
data = [
    {
        "kb_title": "PyGObject API Reference (By Lazka)",
        "kb_category": "Software|Documentation",
        "arch_url": "http://github.com/lazka/pgi-docs/archive/master.zip",
        "kb_rel_path": "pgi-docs-master",
        "unzip_prog": "unzip",
        "file_append": [
            ("pgi-docs-master/_static/css/theme.css", """
    /* CSS code that will be appended to the
       pgi-docs-master/_static/css/theme.css file*/
    """)
        ]
    }, {
        "kb_title": "Bash Reference Manual",
        "kb_category": "Software|Documentation",
        "arch_url": "https://www.gnu.org/software/bash/manual/bash.html",
        "frequency": "s"
    }, {
        "kb_title": "ZSH Documentation",
        "kb_category": "Software|Documentation",
        "arch_url": "http://zsh.sourceforge.net/Doc/zsh_html.tar.gz",
        "kb_rel_path": "zsh_html",
        "unzip_prog": "tar",
        "untar_arg": "--gzip",
        "frequency": "s"
    }
]
