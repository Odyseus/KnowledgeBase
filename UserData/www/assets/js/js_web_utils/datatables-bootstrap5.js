/*! DataTables Bootstrap 5 integration
 * 2020 SpryMedia Ltd - datatables.net/license
 *
 * Modifications:
 * - Set pagination-sm class to the pagination by default and also make these classes configurable.
 * - Prevent creating elements with duplicated IDs.
 */

/**
 * DataTables integration for Bootstrap 5. This requires Bootstrap 5 and
 * DataTables 1.10 or newer.
 *
 * This file sets the defaults and adds options to DataTables to style its
 * controls using Bootstrap. See http://datatables.net/manual/styling/bootstrap
 * for further information.
 */
(function(factory) {
    if (typeof define === "function" && define.amd) {
        // AMD
        define(["jquery", "datatables.net"], function($) {
            return factory($, window, document);
        });
    } else if (typeof exports === "object") {
        // CommonJS
        module.exports = function(root, $) {
            if (!root) {
                root = window;
            }

            if (!$ || !$.fn.dataTable) {
                // Require DataTables, which attaches to jQuery, including
                // jQuery if needed and have a $ property so we can access the
                // jQuery object that is used
                $ = require("datatables.net")(root, $).$;
            }

            return factory($, root, root.document);
        };
    } else {
        // Browser
        factory(jQuery, window, document);
    }
}(function($, window, document, undefined) {
    "use strict"; // jshint ignore:line

    const DataTable = $.fn.dataTable;

    /* Set the defaults for DataTables initialisation */
    $.extend(true, DataTable.defaults, {
        dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
            '<"row"<"col-sm-12"tr>>' +
            '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
        renderer: "bootstrap"
    });

    /* Default class modification */
    $.extend(DataTable.ext.classes, {
        sWrapper: "dataTables_wrapper dt-bootstrap5",
        sFilterInput: "form-control form-control-sm",
        sLengthSelect: "form-select form-select-sm",
        sProcessing: "dataTables_processing card",
        sPageButton: "paginate_button page-item",
        sPagination: "pagination pagination-sm"
    });

    /* Bootstrap paging button renderer */
    DataTable.ext.renderer.pageButton.bootstrap = (aSettings, aHost, aIdx, aButtons, aPage, aPages) => {
        const api = new DataTable.Api(aSettings);
        const classes = aSettings.oClasses;
        const lang = aSettings.oLanguage.oPaginate;
        const aria = aSettings.oLanguage.oAria.paginate || {};
        let btnDisplay,
            btnClass,
            counter = 0,
            idsStorage = new Set(),
            id = null;

        const attach = (container, buttons) => {
            let i = 0,
                ien = buttons.length,
                node,
                button;
            const clickHandler = (aE) => {
                aE.preventDefault();

                if (!$(aE.currentTarget).hasClass("disabled") && api.page() !== aE.data.action) {
                    api.page(aE.data.action).draw("page");
                }
            };

            for (; i < ien; i++) {
                button = buttons[i];

                if (Array.isArray(button)) {
                    attach(container, button);
                } else {
                    btnDisplay = "";
                    btnClass = "";

                    switch (button) {
                        // NOTE: This generates two elements with the exact same ID.
                        case "ellipsis":
                            btnDisplay = "&#x2026;";
                            btnClass = "disabled";
                            break;

                        case "first":
                            btnDisplay = lang.sFirst;
                            btnClass = button + (aPage > 0 ?
                                "" : " disabled");
                            break;

                        case "previous":
                            btnDisplay = lang.sPrevious;
                            btnClass = button + (aPage > 0 ?
                                "" : " disabled");
                            break;

                        case "next":
                            btnDisplay = lang.sNext;
                            btnClass = button + (aPage < aPages - 1 ?
                                "" : " disabled");
                            break;

                        case "last":
                            btnDisplay = lang.sLast;
                            btnClass = button + (aPage < aPages - 1 ?
                                "" : " disabled");
                            break;

                        default:
                            btnDisplay = button + 1;
                            btnClass = aPage === button ?
                                "active" : "";
                            break;
                    }

                    if (btnDisplay) {
                        id = aIdx === 0 && typeof button === "string" ?
                            aSettings.sTableId + "_" + button :
                            null;

                        // NOTE: Prevent duplicated element IDs.
                        if (id && idsStorage.has(id)) {
                            id = id + counter;
                        }

                        id && idsStorage.add(id);

                        node = $("<li>", {
                                "class": classes.sPageButton + " " + btnClass,
                                "id": id
                            })
                            .append($("<a>", {
                                    "href": "#",
                                    "aria-controls": aSettings.sTableId,
                                    "aria-label": aria[button],
                                    "data-dt-idx": counter,
                                    "tabindex": aSettings.iTabIndex,
                                    "class": "page-link"
                                })
                                .html(btnDisplay)
                            )
                            .appendTo(container);

                        aSettings.oApi._fnBindAction(
                            node, {
                                action: button
                            }, clickHandler
                        );

                        counter++;
                    }
                }
            }
        };

        // IE9 throws an 'unknown error' if document.activeElement is used
        // inside an iframe or frame.
        let activeEl;

        try {
            // Because this approach is destroying and recreating the paging
            // elements, focus is lost on the select button which is bad for
            // accessibility. So we want to restore focus once the draw has
            // completed
            activeEl = $(aHost).find(document.activeElement).data("dt-idx");
        } catch (e) {}

        attach(
            $(aHost).empty().html('<ul class="' + classes.sPagination + '"/>').children("ul"),
            aButtons
        );

        if (activeEl !== undefined) {
            $(aHost).find("[data-dt-idx=" + activeEl + "]").trigger("focus");
        }
    };

    return DataTable;
}));

/* global define
 */

/* jshint browser: true */
