#!/bin/bash

workdir="`pwd`"

run_zeal_app() {
    (
        zeal &
    )
}

run_devdocs_app() {
    (
        cd $workdir/Data/apps/DevDocs
        ./DevDocs.AppImage &
    )
}


case "$1" in
    run_zeal_app)
        run_zeal_app
    ;;
    run_devdocs_app)
        run_devdocs_app
    ;;
    *)
        echo "Usage: /app_launcher.sh (run_zeal_app | run_devdocs_app)"
        exit 1
esac

exit 0
