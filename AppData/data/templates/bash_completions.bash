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
            "run server generate -h --help --manual --version" -- "${cur}") )
        return 0
    fi

    # Completion of options and sub-commands.
    cmd="${COMP_WORDS[1]}"

    case $cmd in
    "run")
        COMPREPLY=( $(compgen -W "\
update_all_repositories \
handle_all_repositories \
download_all_archives \
create_main_json_file \
html_to_markdown_files \
html_to_markdown_clip \
epub_to_html \
build_sphinx_docs \
generate_categories_html \
generate_index_html \
open_main_webpage \
--force-download --dry-run --do-not-pull --input-path-storage=" -- "${cur}") )
        ;;
    "server")
        COMPREPLY=( $(compgen -W "start stop restart --host= --port=" -- "${cur}") )
        _decide_nospace_{current_date} ${COMPREPLY[0]}
        ;;
    "generate")
        COMPREPLY=( $(compgen -W \
            "system_executable" -- "${cur}") )
        ;;
    esac
} &&
complete -F __knowledge_base_cli_{current_date} {executable_name}
