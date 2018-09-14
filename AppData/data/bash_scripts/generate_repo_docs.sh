#!/bin/bash

# sphinx-apidoc arguments
#
# -o <outputdir>
#     Directory to place the output files. If it does not exist, it is created.
#
# -f, --force
#     Force overwritting of any existing generated files.
#
# -e, --separate
#     Put documentation for each module on its own page.
#
# -M
#     Put module documentation before submodule documentation.

workdir="`pwd`"

(
    cd $workdir
    sphinx-build . -b html -d "$1" "$2"
)

exit 0
