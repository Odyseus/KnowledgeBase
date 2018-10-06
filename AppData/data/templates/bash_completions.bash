#!/bin/bash

# It would have been impossible to create this without the following post on Stack Exchange!!!
# https://unix.stackexchange.com/a/55622

type "{executable_name}" &> /dev/null &&
_decide_nospace_{current_date}(){
    if [[ ${1} == "--"*"=" ]] ; then
        type "compopt" &> /dev/null && compopt -o nospace
    fi
} &&
__knowledge_base_cli_{current_date}(){
    local cur prev cmd
    COMPREPLY=()
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"

    # Completion of commands and "first level options.
    if [[ $COMP_CWORD == 1 ]]; then
        COMPREPLY=( $(compgen -W \
            "run launch server generate -h --help --manual --version" -- "${cur}") )
        return 0
    fi

    # Completion of options and sub-commands.
    cmd="${COMP_WORDS[1]}"

    case $cmd in
    "run")
        COMPREPLY=( $(compgen -W \
            "github_repos_update bitbucket_repos_update github_repos_json_files_creation \
bitbucket_repos_json_files_creation archives_download main_json_file_creation \
html_to_markdown_files html_to_markdown_clip \
bitbucket_sphinx_docs_build github_sphinx_docs_build categories_html_generation \
index_html_generation open_main_webpage --debug --force-download" -- "${cur}") )
        ;;
    "server")
        COMPREPLY=( $(compgen -W "start stop restart --host= --port=" -- "${cur}") )
        _decide_nospace_{current_date} ${COMPREPLY[0]}
        ;;
    "generate")
        COMPREPLY=( $(compgen -W \
            "app_launcher_script argos_script bitbucket_data_file github_data_file \
system_executable" -- "${cur}") )
        ;;
    esac
} &&
complete -F __knowledge_base_cli_{current_date} {executable_name}
