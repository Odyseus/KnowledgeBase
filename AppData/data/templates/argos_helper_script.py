#!/usr/bin/python3
# -*- coding: utf-8 -*-
import os

# The root_folder is two (2) levels up from were the argos script is located.
root_folder = os.path.realpath(os.path.abspath(os.path.join(
    os.path.normpath(os.path.join(os.getcwd(), *([".."] * 2))))))

print("""---
<b>Shortcuts</b>
Launch DevDocs App | iconName=devhelp bash="(knowledge-base-app launch run_devdocs_app)"
Launch Zeal App | iconName=zeal bash="(knowledge-base-app launch run_zeal_app)"
Open Webpage | iconName=html bash="(knowledge-base-app run open_main_webpage)"
Start Server &amp; Open Webpage | iconName=html bash="(knowledge-base-app run http_server_start open_main_webpage)" alternate=true
HTML to Markdown - Clipboard | iconName=html bash="(knowledge-base-app run html_to_markdown_clip)"
HTML to Markdown - HTML files | iconName=html bash="(knowledge-base-app run html_to_markdown_files)" alternate=true
---
<b>Knowledge Base HTTP Server</b>
--Start HTTP Server | iconName=media-playback-start bash="(knowledge-base-app server start)"
--Stop HTTP Server | iconName=process-stop bash="(knowledge-base-app server stop)"
--Restart HTTP Server | iconName=stock-refresh bash="(knowledge-base-app server restart)"
---
<b>Direct Access to Files</b>
--Open html_pages.json file | bash="xdg-open '{root_folder}'/UserData/www/html_pages/html_pages.json"
--Open categories_data.json file | bash="xdg-open '{root_folder}'/UserData/www/assets/data/categories_data.json"
--Open from_clipboard.html file | bash="xdg-open '{root_folder}'/tmp/html_to_markdown/from_clipboard.html"
--Open from_clipboard.md file | bash="xdg-open '{root_folder}'/tmp/html_to_markdown/from_clipboard.md"
--Open archives.py data file | bash="xdg-open '{root_folder}'/UserData/data_sources/archives.py"
--Open bitbucket.py data file | bash="xdg-open '{root_folder}'/UserData/data_sources/bitbucket.py"
--Open github.py data file | bash="xdg-open '{root_folder}'/UserData/data_sources/github.py"
---
<b>DataTables JSON creation</b>
--Generate GitHub repositories JSON files (Terminal) | bash="(knowledge-base-app run github_repos_json_files_creation)" terminal=true
--Generate BitBucket repositories JSON files (Terminal) | bash="(knowledge-base-app run bitbucket_repos_json_files_creation)" terminal=true
--Generate main JSON file (Terminal) | bash="(knowledge-base-app run main_json_file_creation)" terminal=true
--Generate all JSON files (Terminal) | bash="(knowledge-base-app run github_repos_json_files_creation bitbucket_repos_json_files_creation main_json_file_creation)" terminal=true
--Generate categories.html file | bash="(knowledge-base-app run categories_html_generation)" terminal=true
---
<b>Repositories handling</b>
--<b>GitHub repositories handling</b>
--Update repositories | bash="(knowledge-base-app run github_repos_update)" terminal=true
--Update repositories &amp; generate all JSON files | bash="(knowledge-base-app run github_repos_update github_repos_json_files_creation main_json_file_creation)" terminal=true
--Generate Sphinx docs | bash="(knowledge-base-app run github_sphinx_docs_build)" terminal=true
-----
--<b>BitBucket repositories handling</b>
--Update repositories | bash="(knowledge-base-app run bitbucket_repos_update)" terminal=true
--Update repositories &amp; generate all JSON files | bash="(knowledge-base-app run bitbucket_repos_update bitbucket_repos_json_files_creation main_json_file_creation)" terminal=true
--Generate Sphinx docs | bash="(knowledge-base-app run bitbucket_sphinx_docs_build)" terminal=true
-----
--<b>All repositories handling</b>
----Update all repositories | bash="(knowledge-base-app run github_repos_update bitbucket_repos_update)" terminal=true
----Update all repositories &amp; generate all JSON files | bash="(knowledge-base-app run github_repos_update bitbucket_repos_update github_repos_json_files_creation bitbucket_repos_json_files_creation main_json_file_creation)" terminal=true
<b>Various</b>
--Create system executable | bash="(knowledge-base-app generate system_executable)" terminal=true
""".format(root_folder=root_folder))
