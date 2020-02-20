const CONTEXT_COLOR = "primary";

const $catButtons = $("#KB_sidebar a.nav-link");
const $content = $("#KB_content");
const $dashboard = $("#KB_dashboard");
const $editButton = $("#KB_edit-button");
const $homeLink = $("#KB_home-link");
const $inputSearch = $("#KB_input-search");
const $inputSearchForm = $("#KB_input-search-group");
const $mainarea = $("#KB_mainarea");
const $mainindex = $("#KB_main-index");
const $pseudoBody = $("#KB_pseudo-body");
const $reloadButton = $("#KB_reload-button");
const $sidebar = $("#KB_sidebar");
const $tableLengthChooserForm = $("#KB_table-length-chooser");
const $tableLengthChooserSelect = $("#KB_table-length-chooser-select");

const clearSearchButton = document.getElementById("KB_clear-search-button");
const topNavbar = document.getElementById("KB_top-navbar");
const toggleSidebarBtn = document.getElementById("KB_toggle-sidebar");

const sourceURLHTMLTemplate = '<h1><a href="{url}">Source</a></h1>\n';

const dropdownTemplate = ` <div tabindex="-1" role="group" class="KB_action-dropdown-menu dropdown" data-source="{dataSource}" data-href="{dataHref}" data-type="{dataType}">
    <button type="button" class="btn btn-${CONTEXT_COLOR} btn-sm dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"><i class="nf KB_custom-icon-{typeIcon}"></i></button>
    <div class="dropdown-menu">
        <h6 class="dropdown-header">Choose an action</h6>
        <a data-action="file" href="#" class="dropdown-item KB_action-item"><i class="nf nf-fa-edit"></i>&nbsp&nbspOpen file with external program</a>
        <a data-action="folder" href="#" class="dropdown-item KB_action-item"><i class="nf nf-fa-folder_open_o"></i>&nbsp&nbspOpen folder containing file</a>
        <a data-action="new_tab" href="#" class="dropdown-item KB_action-item"><i class="nf nf-fa-external_link_square"></i>&nbsp&nbspOpen page in new tab</a>
        <a data-action="source_url" href="#" class="dropdown-item KB_action-item"><i class="nf nf-fa-link"></i>&nbsp&nbspOpen source URL</a>
    </div>
</div>`;

const titleTemplate = '<div onauxclick="titleClick(event, this)" \
onclick="titleClick(event, this)" \
data-source="{dataSource}" \
data-type="{dataType}" \
data-href="{dataHref}">{text}</div>';

const delayedFocusSearchInput = utilThrottle(() => {
    // GENERAL PROBLEM:
    // When the Firefox developer tools is open, the search input doesn't focus on page load.
    // It took me hours to discover this stupid behavior!!! )$(&$$)
    document.body.scrollTop = document.documentElement.scrollTop = 0;

    // Needs the time out. Otherwise, it wouldn't focus the freaking input field!!!
    // Check if a greater amount of table elements affects this.
    $inputSearch.focus();
}, 500);

const delayedSearchFunc = utilThrottle((aVal) => {
    doSearch(aVal);
}, 500);

const btnActMap = {
    "html": {
        // Hidden because opening the HTML file as a local file instead of a "served file"
        // will simply break the page rendering.
        "file": "hide",
        "folder": "show",
        "new_tab": "show"
    },
    "html-external": {
        "file": "hide",
        "folder": "show",
        // Shown even though open in new tab is the default action when clicking the entry title
        // because title entries aren't navigable by keyboard.
        "new_tab": "show"
    },
    "md": {
        "file": "show",
        "folder": "show",
        "new_tab": "show"
    },
    "pdf": {
        "file": "show",
        "folder": "show",
        "new_tab": "show"
    },
    "epub": {
        "file": "show",
        "folder": "show",
        "new_tab": "hide"
    }
};

// Define and initialize the DataTables table.
const table = $mainindex.DataTable({
    drawCallback: (settings) => { // jshint ignore:line
        delayedFocusSearchInput();

        $(".KB_action-dropdown-menu").on("show.bs.dropdown", function() {
            let $actionDropdownMenu = $(this);
            // All of this nonsense due to web developers being DUMASSES!!!
            $actionDropdownMenu.data("dropdown-opened", true);
            let $actionButtons = $(this).find("a.KB_action-item");

            for (let i = $actionButtons.length - 1; i >= 0; i--) {
                let $actBtn = $($actionButtons[i]);

                if ($actBtn.data("moronic-nonsense")) {
                    continue;
                }

                let btnAction = $actBtn.data("action");
                let sourceURL = $(this).data("source") || "";
                let type = $(this).data("type");

                if (btnAction === "source_url") {
                    $actBtn[sourceURL ? "show" : "hide"]();
                    // $actBtn[sourceURL ? "show" : "hide"](sourceURL ?  : 0);
                } else {
                    $actBtn[btnActMap[type][btnAction]]();
                    // $actBtn[btnActMap[type][btnAction]](btnActMap[type][btnAction] ?  : 0);
                }

                $actBtn.data("href", $(this).data("href"));
                $actBtn.data("type", type);
                $actBtn.data("source", sourceURL);

                // Attach click for the popover's action buttons.
                $actBtn.on("click", function() { // jshint ignore:line
                    $actionDropdownMenu.dropdown("toggle");
                    $actionDropdownMenu.find("button.dropdown-toggle").trigger("blur");
                    // The data-* attributes on the .KB_action-item are set when the popover is shown.
                    actionClick($(this));

                    return false;
                });

                $actBtn.data("moronic-nonsense", true);
            }
        }).on("hide.bs.dropdown", function() {
            // All of this nonsense due to web developers being DUMASSES!!!
            $(this).data("dropdown-opened", false);
        }).on("keyup.td", function(aE) { // NO ARROW FUNC. ALLOWED!!!
            let $actionDropdownMenu = $(this);

            // All of this nonsense due to web developers being DUMASSES!!!
            if (aE.keyCode == 27 && $actionDropdownMenu.data("dropdown-opened")) { // Escape key.
                // this.classList.remove("open");
                $actionDropdownMenu.dropdown("toggle");
                // Trigger blur so the button doesn't get focused after the dropdown is hidden.
                $actionDropdownMenu.find("button.dropdown-toggle").trigger("blur");
            }
        });
    },
    // This makes a huge difference when there are tens of thousands of elements in a table.
    // Right now, the table handles just about a thousand items.
    "deferRender": true,
    // Display loading state of the table.
    "processing": true,
    // Display information about the table including information about filtered data if
    // that action is being performed.
    "info": true,
    // Hide the selector to change the number of records to be shown per page.
    // Disabled in favor of a custom selector added to the top bar bar.
    "lengthChange": false,
    // Enable search abilities of DataTables.
    // "searching": true,
    // Do not show the DataTables' native search input and table length changer.
    // Using custom ones directly inserted in the top bar bar.
    "dom": "<ipr<t>p>",
    // PROBLEM 1:
    // The fixed table headers show up when the table is hidden!! (/%$($(/$)))
    // (*) Bypassed the problem by disabling the fixed header feature every time
    // a markdown page is loaded, and re-enabling it when the index is loaded.
    // PROBLEM 2:
    // The fixed table header/footer don't resize when the table is resized (when hiding the
    // sidebar, for example).
    // (*) Same fix as the previous problem. Toggle fixed header enabled state when setting the
    // page layout.
    "fixedHeader": {
        "header": true,
        // Do not enable footer ever again. It causes more damage than good.
        "footer": false,
        "headerOffset": topNavbar.offsetHeight
    },
    // Default number of rows to display on a single page when using pagination.
    "pageLength": 50,
    // Which buttons to be shown in the pagination control.
    // full_numbers: 'First', 'Previous', 'Next' and 'Last' buttons, plus page numbers.
    "pagingType": "full_numbers",
    // "autoWidth": false,
    // Pretty crappy behavior. Columns don't come back to their original sizes.
    // (*) This seems to be fixed by the CSS tweaks I made to try to fix the "fixedHeader" problems.
    // But I'm keeping it disabled because now I'm using just two columns. One with fixed width
    // (the image column) and the other with a 100% width set (the title column). So, responsiveness
    // isn't needed.
    // "responsive": true,
    "ordering": true,
    "ajax": {
        "url": "assets/data/data_tables.json",
        "dataSrc": "",
        "deferRender": true
    },
    // Sort by title.
    // 0 is the column with the images.
    // 1 is the column with the categories, which is hidden.
    // 2 is the column with the sub-categories, which is also hidden.
    // 3 is the column with the titles.
    "order": [
        [3, "asc"]
    ],
    "columns": [{
        "orderable": false,
        "targets": 0,
        "data": "i",
        "class": "KB_img-cell-td",
        render: (aData, aType, aRow) => {
            switch (aType) {
                case "filter":
                case "search":
                case "sort":
                    return aData;
                default:
                    return dropdownTemplate.format({
                        "dataHref": aRow.p,
                        "dataType": aRow.i,
                        "dataSource": aRow.s || "",
                        "typeIcon": aData
                    });
            }
        }
    }, {
        "data": "c",
        "targets": 1,
        "sortable": false,
        "visible": false,
        render: (aData, aType, aRow) => { // jshint ignore:line
            switch (aType) {
                case "filter":
                case "search":
                case "sort":
                case "display":
                    if (aData.indexOf("|") > -1) {
                        return aData.split("|")[0];
                    }

                    return aData;
                default:
                    return aData;
            }
        }
    }, {
        "data": "c",
        "targets": 2,
        "sortable": false,
        "visible": false,
        render: (aData, aType, aRow) => { // jshint ignore:line
            switch (aType) {
                case "filter":
                case "search":
                case "sort":
                case "display":
                    if (aData.indexOf("|") > -1) {
                        return aData.split("|")[1];
                    }

                    return "";
                default:
                    return "";
            }
        }
    }, {
        "data": "t",
        "targets": 3,
        "class": `KB_title-link text-${CONTEXT_COLOR}`,
        // "Hard coding" the click event here to avoid problems when the event is added by jQuery.
        // One of the problems is that in every change of the table page, the event was added more than once.
        // I dimmed it infinitely easier to just hard code it here while modifying the "render".
        render: (aData, aType, aRow) => {
            switch (aType) {
                case "display":
                    return titleTemplate.format({
                        "dataHref": aRow.p,
                        "dataType": aRow.i,
                        "dataSource": aRow.s || "",
                        "text": aData
                    });
                default:
                    return aData;
            }
        }
    }],
    // Not used for now.
    // initComplete: function() {}
});

let currentPage = null;
// Only categories are allowed, not sub-categories.
let pref_DefaultCategory = null;
let currentCategory = "All Categories";

/**************************************
 * From here up, variable declarations.
 **************************************/

// START jQuery page ready.
jQuery(document).ready(($) => {
    $.ajax({
        url: "assets/data/settings.json",
        dataType: "json",
        cache: false,
        complete: (ajqXHR) => {
            try {
                _init(ajqXHR.responseJSON);
            } catch (aErr) {
                _init(null);
            }
        },
        error: () => {
            _init(null);
        }
    });
});
// END jQuery page ready.

/****************************************
 * From here down, function declarations.
 ****************************************/

function setActiveCategory(aEl) {
    let searchtext = null;

    let filterTable = () => {
        table.columns(1).search("", false, true, true);
        table.columns(2).search("", false, true, true);
        table.search("", false, true, true);
    };

    if (aEl) {
        let subCatColIndex = aEl.classList.contains("KB_sub-cat-link") ? 2 : 1;
        searchtext = aEl.textContent;

        currentCategory = searchtext;
        searchtext = searchtext === "All Categories" ? "" : searchtext;

        if (searchtext) {
            filterTable();
            highlightCategoryInSidebar(searchtext);
            searchtext = searchtext.replace("/", "\\/");
            table.columns(subCatColIndex).search("^" + searchtext + "$", true, true, true).draw();
        } else {
            clearSearchInput();
        }
    } else {
        searchtext = pref_DefaultCategory ? pref_DefaultCategory :
            currentCategory === "All Categories" ? "" : currentCategory;

        if (searchtext) {
            filterTable();
            table.columns(1).search("^" + searchtext + "$", true, true, true).draw();
            highlightCategoryInSidebar(searchtext);
        } else {
            clearSearchInput();
        }
    }
}

function highlightCategoryInSidebar(aCategory) {
    for (let i = $catButtons.length - 1; i >= 0; i--) {
        // Toggling the "bg-CONTEXT_COLOR" class to avoid using a hard-coded color
        // for active categories.
        if ($catButtons[i].textContent === aCategory) {
            $catButtons[i].classList.add(`bg-${CONTEXT_COLOR}`, "active");
            $catButtons[i].classList.remove(`text-${CONTEXT_COLOR}`);
        } else {
            $catButtons[i].classList.remove(`bg-${CONTEXT_COLOR}`, "active");
            $catButtons[i].classList.add(`text-${CONTEXT_COLOR}`);
        }
    }
}

function clearSearchInput(aInput) {
    aInput && aInput.val("");
    currentCategory = "All Categories";
    highlightCategoryInSidebar(currentCategory);
    table.columns(1).search("", false, true, true);
    table.columns(2).search("", false, true, true);
    table.search("", false, true, true).draw();
}

function doSearch(aVal) {
    table.search(aVal, false, true, true).draw();
}

function displayMainSection(aEl) {
    document.body.scrollTop = document.documentElement.scrollTop = 0;

    switch (aEl) {
        case "content":
            $dashboard.hide();
            $content.show();
            // Disable the fixed headers so they don't show up when the table is hidden.
            table.fixedHeader.disable();
            $reloadButton.show();
            currentPage && currentPage.type && currentPage.type === "md" && $editButton.show();
            $inputSearchForm.hide();
            $tableLengthChooserForm.hide();
            break;
        case "table":
            $dashboard.show();
            $content.hide();
            $content[0].innerHTML = "";
            currentPage = null;
            $reloadButton.hide();
            $editButton.hide();
            // Re-enable the fixed table headers that were disabled when the table was hidden.
            table.fixedHeader.enable();
            $inputSearchForm.show();
            $tableLengthChooserForm.show();
            delayedFocusSearchInput();
            break;
    }

    // Display body with a delay. This is to avoid seeing all the "functions initial workings".
    $pseudoBody.animate({
        opacity: 1
    }, 1000);

}

function loadPageInline(aCurrentPage) {
    let ajaxCall = () => {
        $.ajax({
            method: "POST",
            // Non-existent location. It's used just to send POST requests.
            url: "/handle_inline_content",
            cache: false,
            data: {
                href: aCurrentPage.url,
                type: aCurrentPage.type
            }
        }).done((aResponse) => { // jshint ignore:line
            displayMainSection("content");

            if (aCurrentPage.type.toLowerCase() === "md") {
                if (aCurrentPage.source) {
                    aResponse = sourceURLHTMLTemplate.format({
                        "url": aCurrentPage.source
                    }) + aResponse;
                }
            }

            try {
                $content[0].innerHTML = aResponse;
            } finally {
                setupHTMLInlineContent();
            }
        }).fail((aXHR, aStatusText) => {
            console.error("Request failed: " + aStatusText);
            console.error(aXHR);
        });
    };
    ajaxCall();
}

function contentLinkInternalTarget(aE) {
    aE.preventDefault();
    delayedToggleBackToTopButtonVisibility();

    let href = aE.target.getAttribute("href");

    if (href) {
        href = href.slice(1);

        let targetElement = document.getElementById(href);

        if (!targetElement) {
            try {
                // For ancient web pages that still use the deprecated "name" attribute. ¬¬
                targetElement = document.querySelector('[name="' + href + '"]');
            } catch (aErr) {
                targetElement = null;
            }
        }

        try {
            if (targetElement) {
                // This didn't show signs of "jerkyness" when animated (yet).
                $("html, body").animate({
                    scrollTop: targetElement.getBoundingClientRect().top +
                        // I suppose that this is why jQuery was born, because of retarded
                        // corporations that cannot get their shit together!!!
                        // In some browsers, document.documentElement.scrollTop is used to store
                        // the page scrolled position, in some others, document.body.scrollTop
                        // is used instead. ¬¬
                        (document.documentElement.scrollTop || document.body.scrollTop) -
                        topNavbar.offsetHeight
                }, 400);
            }
        } catch (aErr) {
            console.error(aErr);
        }
    }
}

function contentLinkLoadInNewTab(aE) {
    aE.preventDefault();
    loadInNewTab(aE.target.getAttribute("href"));
}

function setupHTMLInlineContent() {
    try {
        displayMainSection("content");
    } finally {
        // Hijack all links inside content so they can trigger the
        // "Back to top" button visibility (among other things).
        let contentLinks = $content[0].querySelectorAll("a[href]");

        try {
            // From this point on, everything in "pure JavaScript".
            // Using jQuery's functions here makes everything ULTRA-MEGA-SLOW!!! ¬¬
            for (let i = contentLinks.length - 1; i >= 0; i--) {
                let targetHref = contentLinks[i].getAttribute("href");

                if (targetHref[0] === "#") {
                    contentLinks[i].addEventListener("click", contentLinkInternalTarget, false);
                } else {
                    // Nothing freaking works in the un-configurable crap called Firefox Quantum (57+)!!!
                    // So, I have to hard code it!!!
                    contentLinks[i].addEventListener("click", contentLinkLoadInNewTab, false);
                }
            }
        } finally {
            if (typeof hljs === "object") {
                let $codeBlocks = $("pre code");
                for (let i = $codeBlocks.length - 1; i >= 0; i--) {
                    hljs.highlightBlock($codeBlocks[i]);
                }
            }
        }
    }
}

function titleClick(aE, aPseudoLink) {
    let $pseudoLink = $(aPseudoLink);
    let href = $pseudoLink.data("href");
    let type = $pseudoLink.data("type");
    let source = $pseudoLink.data("source");

    switch (getLoadActionFromType(type)) {
        case 0: // Load Markdown pages inline.
            currentPage = {
                url: href,
                source: source,
                type: type
            };

            if (aE.button === 0) { // Left click
                loadPageInline(currentPage);
            } else if (aE.button === 1) { // Middle click
                // Query string implementation.
                loadInNewTab("index.html?currentPageURL=" + encodeURIComponent(href) +
                    "&currentPageType=" + type + "&currentPageSource=" + encodeURIComponent(source));
            }
            break;
        case 1: // Load URI on new tab.
            currentPage = null;

            if (type === "epub") {
                actionClick(null, href, "file");
            } else {
                loadInNewTab(href);
            }
            break;
    }
}

/**
 * Action when clicking an action icon inside the popovers attached to the table icons.
 * @param  {Object} aE      The event that triggered the function.
 * @param  {String} aHref   The relative path to a file.
 * @param  {String} aAction The type of action that will be used to decide what to do with the path.
 */
function actionClick(a$ActionBtn, aHrefPri, aActionPri) {
    // The ajax call is only used by the "file" (to open files with the system's default handler)
    // and the "folder" (to open folders with the system's default handler) actions.
    let ajaxCall = (aHrefSec, aActionSec) => {
        $.ajax({
            method: "POST",
            // Non-existent location. It's used just to send POST requests.
            url: "/handle_local_files",
            cache: false,
            data: {
                href: aHrefSec,
                action: aActionSec
            }
        }).done((aMsg) => { // jshint ignore:line
            //
        }).fail((aXHR, aStatusText) => {
            console.error("Request failed: " + aStatusText);
            console.error(aXHR);
        });
    };

    if (a$ActionBtn) {
        if (a$ActionBtn.data("action") === "new_tab") {
            switch (getLoadActionFromType(a$ActionBtn.data("type"))) {
                case 0:
                    loadInNewTab("index.html?currentPageURL=" + encodeURIComponent(a$ActionBtn.data("href")) +
                        "&currentPageType=" + a$ActionBtn.data("type") + "&currentPageSource=" + a$ActionBtn.data("source"));
                    break;
                case 1:
                    loadInNewTab(a$ActionBtn.data("href"));
                    break;
            }
        } else if (a$ActionBtn.data("action") === "source_url") {
            loadInNewTab(a$ActionBtn.data("source"));
        } else if (a$ActionBtn.data("action") === "file" ||
            a$ActionBtn.data("action") === "folder") {
            ajaxCall(a$ActionBtn.data("href"), a$ActionBtn.data("action"));
        }
    } else {
        ajaxCall(aHrefPri, aActionPri);
    }

    return false;
}

/**
 * [correctDashboardWidths description]
 * @param  {[type]} aEl  [description]
 * @param  {[type]} aVal [description]
 */
function correctDashboardWidths(aEl, aVal) {
    aEl.css({
        "-ms-flex": "0 0 " + aVal + "%",
        "flex": "0 0 " + aVal + "%",
        "max-width": aVal + "%"
    });
}

/**
 * Set the main page layout.
 * @param {Boolean} aToggle Whether or not to toggle the sidebar.
 */
function setLayout(aToggle) {
    let winWidth = Math.max($(window).width(), window.innerWidth);
    // Disable fixedHeader on the table. Re-enable it at the end of this function.
    table.fixedHeader.disable();

    if (!$mainarea.is(":visible")) {
        return;
    }

    if (aToggle) {
        if ($sidebar.hasClass("show")) {
            $sidebar.removeClass("show");
        } else {
            $sidebar.addClass("show");
        }
    }

    if ($sidebar.hasClass("show")) {
        if (winWidth <= 576) {
            correctDashboardWidths($sidebar, "100");
            correctDashboardWidths($mainarea, "100");
        } else if (winWidth > 576 && winWidth <= 768) {
            correctDashboardWidths($sidebar, "33.333333");
            correctDashboardWidths($mainarea, "66.666667");
        } else if (winWidth > 768 && winWidth < 1200) {
            correctDashboardWidths($sidebar, "25");
            correctDashboardWidths($mainarea, "75");
        } else {
            correctDashboardWidths($sidebar, "20");
            correctDashboardWidths($mainarea, "80");
        }
    } else {
        correctDashboardWidths($mainarea, "100");
    }

    table.fixedHeader.enable();
}

function _init(aSettingsJSON) {
    if (aSettingsJSON && aSettingsJSON.hasOwnProperty("pref_DefaultCategory")) {
        pref_DefaultCategory = aSettingsJSON.pref_DefaultCategory;
    }

    // Enable animated scrolling when clicking the back-to-top button.
    // Treated separated for the following reasons:
    // - The smooth scroll library will not recognize special fragments like
    // # or #top to scroll to with an animation.
    // - The smooth scroll library will also not recognize the source element
    // as a link, so it can catch the hash.
    // - And finally, when treating it specially like this, I can prevent
    // the address bar url from being modified.
    $("#to-top-of-page").on("click", function() {
        smoothScrollToTop();
        return false;
    });

    // Query strings implementation.
    // So I can open the pages that are loaded inline (Markdown pages or standalone HTML pages)
    // in new tabs and/or pass settings/values.
    // Some query strings are set when middle clicking an item in the table.
    // It has several advantages:
    //      - More than one page can be opened at the same time, instead of going constantly
    //        back and forward.
    //      - Pages will persevere across browser sessions.
    //      - I can reload the pages with F5 instead of the "Force reload of the current
    //      in-line page" button.
    //
    // Supported query strings:
    //     currentPageURL (String):
    //         This key is part of the currentPage object. It's the relative to the server URL
    //         that points to the markdown/html/pdf page to load.
    //     currentPageType (String):
    //         This key is part of the currentPage object.
    //     currentPageSource (String):
    //         This key is part of the currentPage object. It's the URL to the
    //         content's on-line source.
    //     pref_DefaultCategory (String):
    //         Used to set the default category when the main index page is loaded.
    //         This query overrides the settings from the settings.json file.
    if (!!window.location.search) {
        let query = getQueryString();

        if (query["currentPageURL"] && query["currentPageType"]) {
            currentPage = {
                url: decodeURIComponent(query["currentPageURL"]),
                source: query.hasOwnProperty("currentPageSource") ?
                    decodeURIComponent(query["currentPageSource"]) : "",
                type: query["currentPageType"]
            };

            loadPageInline(currentPage);
        }

        if (query["pref_DefaultCategory"]) {
            pref_DefaultCategory = decodeURIComponent(query["pref_DefaultCategory"]);
        }
    }

    // Set active category.
    setActiveCategory();

    // Setup categories inside the sidebar.
    $catButtons.on("click", function() { // NO ARROW FUNC. ALLOWED!!!
        setActiveCategory(this);
        return false;
    });

    // Set initial page layout.
    setLayout();

    // Separate from the top the Sidebar and the Dashboard.
    $sidebar.add($dashboard).css({
        top: topNavbar.offsetHeight
    });

    // Add padding at the top of the Dashboard and the Content.
    $dashboard.add($content).css({
        "padding-top": topNavbar.offsetHeight
    });

    // Auto-set the page layout when resizing the browser's window.
    $(window).resize(() => {
        setLayout();
    }).scroll(() => { // Set back-to-top button visibility function.
        delayedToggleBackToTopButtonVisibility();
    });

    // Set click behavior for the Home link.
    $homeLink.on("click auxclick", (aE) => {
        switch (aE.button) {
            case 0:
                displayMainSection("table");
                break;
            case 1:
                loadInNewTab("index.html");
                break;
        }

        return false;
    });

    // Replicate the behavior of the DataTables native table length chooser.
    $tableLengthChooserSelect
        .val(table.page.len())
        .on("change.DT", function() { // NO ARROW FUNC. ALLOWED!!!
            table.page.len($(this).val()).draw();

            return false;
        });

    table.on("length.dt.DT", (e, s, len) => {
        if ($tableLengthChooserSelect.val() !== len) {
            $tableLengthChooserSelect.val(len);
        }
    });

    // Set function to the Sidebar toggle button.
    toggleSidebarBtn.addEventListener("click", (aE) => {
        aE.preventDefault();
        setLayout(true);
    }, false);

    // Set function to the "Force reload of the current in-line page" button.
    $reloadButton.on("click", () => {
        loadPageInline(currentPage);

        return false;
    });

    $editButton.on("click", () => {
        actionClick(null, currentPage.url, "file");

        return false;
    });

    // Replicate the DataTables search function used by its native search input.
    $inputSearch.on("keyup.DT search.DT input.DT paste.DT cut.DT", function(aE) { // NO ARROW FUNC. ALLOWED!!!
        if (aE.which === 27) { // Escape key
            clearSearchInput($inputSearch);
        } else {
            delayedSearchFunc(this.value);
        }

        return false;
    }).on("keypress.DT", function(aE) {
        /* Prevent form submission */
        if (aE.keyCode == 13) {
            return false;
        }
    });

    // Attach the function to the clear icon.
    clearSearchButton.addEventListener("click", (aE) => {
        aE.preventDefault();
        clearSearchInput($inputSearch);
    }, false);

    if (currentPage === null) {
        displayMainSection("table");
    }

    // Display body with a delay. This is to avoid seeing all the "functions initial workings".
    // Moved to displayMainSection function to test annoyances.
    // $pseudoBody.animate({
    //     opacity: 1
    // }, 1000);
}

function getLoadActionFromType(aPageType) {
    switch (aPageType) {
        case "epub":
        case "html-external":
        case "pdf":
            return 1; // Load in new tab.
        default:
            return 0; // Load in-line.
    }
}

/* global utilThrottle,
          getQueryString,
          loadInNewTab,
          delayedToggleBackToTopButtonVisibility,
          smoothScrollToTop
*/

/* exported titleClick */
