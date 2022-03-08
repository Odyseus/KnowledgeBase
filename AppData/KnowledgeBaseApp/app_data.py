#!/usr/bin/python3
# -*- coding: utf-8 -*-
"""Main application data.

Attributes
----------
CAT_LIST_ITEM_TEMPLATE : str
    HTML template for the categories menu items.
CAT_MENU_TEMPLATE : str
    HTML template for the categories menus.
"""

BOOTSTRAP_CSS_TAG = '<link rel="stylesheet" href="/assets/css/bootstrap.min.css">'
BOOTSTRAP_JS_TAG = '<script type="text/javascript" src="/assets/js/bootstrap.bundle.min.js"></script>'
HIGHLIGHT_CSS_TAG = '<link rel="stylesheet" href="/assets/css/highlight.min.css">'
HIGHLIGHT_JS_TAG = '<script type="text/javascript" src="/assets/js/highlight.min.js"></script>'

CAT_LIST_ITEM_TEMPLATE = """<li class="nav-item">
    <span class="btn-group" role="group">
        <button class="nav-link {cat_class} KB_cat-btn btn" data-parent="{data_parent}" data-cat="{data_cat}" href="#">
            <i class="KB_cat-icon nf {cat_icon}"></i>{cat_title}
        </button>
    </span>
</li>"""

CAT_MENU_TEMPLATE = """<li class="nav-item">
    <span class="btn-group" role="group">
        <button class="nav-link KB_cat-btn btn" data-cat="{data_cat}" href="#"><i class="KB_cat-icon nf {cat_icon}">\
</i>{cat_title}</button>
        <button class="dropdown-toggle btn" href="#{cat_menu_id}" data-bs-toggle="collapse" aria-expanded="false"></button>
    </span>
    <ul class="collapse list-unstyled KB_subcats" id="{cat_menu_id}">
{sub_cat_items}
    </ul>
</li>"""

DOCUTILS_HTML5_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<link rel="shortcut icon" href="/assets/img/favicon.svg" />
{bootstrap_css}
{highlight_css}
<link rel="stylesheet" href="/assets/css/bootstrap.tweaks.css">
</head>
<body class="m-3 p-3">
<div class="container boxed p-3">
{body}
</div>
<button type="button" id="to-top-of-page" class="btn btn-sm btn-primary d-print-none" title="Back to top">&#9650;</button>
{bootstrap_js}
{highlight_js}
<script type="text/javascript" src="/assets/js/js_web_utils/core.js"></script>
<script type="text/javascript" defer src="/assets/js/functions-generic-init.js"></script>
</body>
</html>
"""


if __name__ == "__main__":
    pass
