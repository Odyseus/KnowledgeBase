"use strict"; // jshint ignore:line

/* NOTES:
 *
 * - "Interesting" fact. If the Firefox setting called browser.zoom.full is set to false
 *  the zooming of the page will not trigger breakpoint changes.
 */

var KB_Main = null;
var KB_Table = null;

(function() {
    const KB_Constants = {
        // jQuery objects.
        $catButtons: $("#KB_sidebar button.nav-link"),
        $indexModal: $("#KB_index-modal"),
        // DOM elements.
        content: document.getElementById("KB_content"),
        contentWrapper: document.getElementById("KB_main-content-wrapper"),
        editButton: document.getElementById("KB_edit-button"),
        inputSearch: document.getElementById("KB_input-search"),
        inputSearchForm: document.getElementById("KB_input-search-group"),
        loadingOverlay: document.getElementById("KB_loading"),
        prefOpenPDFsExternally: document.getElementById("KB_pref_open-pdfs-externally"),
        prefSetDefaultCategory: document.getElementById("KB_pref_set-default-category"),
        prefTablePageLength: document.getElementById("KB_pref_table-page-length"),
        pseudoBody: document.getElementById("KB_pseudo-body"),
        reloadButton: document.getElementById("KB_reload-button"),
        resetSettingsButton: document.getElementById("KB_reset-settings-button"),
        sidebarWrapper: document.getElementById("KB_sidebar-wrapper"),
        tableLengthChooserForm: document.getElementById("KB_table-length-chooser"),
        tableLengthChooserSelect: document.getElementById("KB_table-length-chooser-select"),
        tableWrapper: document.getElementById("KB_table-wrapper"),
        topNavbar: document.getElementById("KB_top-navbar"),
        toTopPageButton: document.getElementById("to-top-of-page"),

        LOAD_INLINE: 0,
        LOAD_IN_NEW_TAB: 1,
        /* Action items.
         *
         * file (Open file with external program)  :
         * folder (Open folder containing file)    :
         * new_tab (Open page in new tab)          :
         * source_url (Open source URL)            :
         */
        dropdownTemplate: (a) => {
            return `
<div tabindex="-1" role="group" class="KB_action-dropdown-menu dropdown">
    <button type="button" class="btn btn-${KB_Constants.btnActMap[a.typeIcon].color} btn-sm dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"><i class="nf KB_custom-icon-${a.typeIcon}"></i></button>
    <div class="dropdown-menu" data-source="${a.dataSource}" data-href="${a.dataHref}" data-type="${a.dataType}">
        <h6 class="dropdown-header">Choose an action</h6>
        <a onclick="KB_Main.actionClick(event, $(this.parentNode), null, 'file');" data-action="file" href="#" class="dropdown-item">
            <i class="nf nf-fa-edit">&nbsp&nbsp</i>Open file with external program</a>
        <a onclick="KB_Main.actionClick(event, $(this.parentNode), null, 'folder');" data-action="folder"  href="#" class="dropdown-item">
            <i class="nf nf-fa-folder_open_o">&nbsp&nbsp</i>Open folder containing file</a>
        <a onclick="KB_Main.actionClick(event, $(this.parentNode), null, 'new_tab');" data-action="new_tab"  href="#" class="dropdown-item">
            <i class="nf nf-fa-external_link_square">&nbsp&nbsp</i>Open page in new tab</a>
        <a onclick="KB_Main.actionClick(event, $(this.parentNode), null, 'source_url');" data-action="source_url"  href="#" class="dropdown-item">
            <i class="nf nf-fa-link">&nbsp&nbsp</i>Open source URL</a>
    </div>
</div>`;
        },
        titleTemplate: (aDataHref, aDataType, aDataSource, aText) => {
            return `<div onauxclick="KB_Main.titleClick(event, this)" onclick="KB_Main.titleClick(event, this)" data-source="${aDataSource}" data-type="${aDataType}" data-href="${aDataHref}">${aText}</div>`;
        },
        btnActMap: {
            "html": {
                "color": "orange",
                // Hidden because opening the HTML file as a local file instead of a "served file"
                // will simply break the page rendering.
                "file": "hide",
                "folder": "show",
                "new_tab": "show"
            },
            "ext": {
                "color": "indigo",
                "file": "hide",
                "folder": "show",
                // Shown even though open in new tab is the default action when clicking the entry title
                // because title entries aren't navigable by keyboard.
                "new_tab": "show"
            },
            "md": {
                "color": "primary",
                "file": "show",
                "folder": "show",
                "new_tab": "show"
            },
            "pdf": {
                "color": "red",
                "file": "show",
                "folder": "show",
                "new_tab": "show"
            },
            "epub": {
                "color": "cyan",
                "file": "show",
                "folder": "show",
                "new_tab": "hide"
            }
        },
        delayedTableDrawCallback: KB_Utils.debounce(() => {
            KB_Main && KB_Main.focusSearchInput();

            $(".KB_action-dropdown-menu").on("show.bs.dropdown", (aE) => {
                let $actionDropdownMenu = $(aE.target);

                if ($actionDropdownMenu.data("action-buttons-handled")) {
                    return;
                }

                $actionDropdownMenu.data("action-buttons-handled", true);

                let $actionButtons = $actionDropdownMenu.find("a.dropdown-item");
                let i = $actionButtons.length;
                while (i--) {
                    let $actBtn = $($actionButtons[i]);

                    let btnAction = $actBtn.data("action");
                    let sourceURL = $actBtn.parent().data("source") || "";
                    let type = $actBtn.parent().data("type");

                    if (btnAction === "source_url") {
                        $actBtn[sourceURL ? "show" : "hide"]();
                    } else {
                        $actBtn[KB_Constants.btnActMap[type][btnAction]]();
                    }
                }
            }).on("keyup.td", (aE) => {
                // NOTE: Workaround for Firefox in Linux. ¬¬
                // All of this nonsense due to web developers being DUMASSES!!!
                if (aE.keyCode === 27) { // Escape key.
                    $(aE.target).dropdown("hide");
                }
            });
        }, 500),
        tableOptions: {
            // NOTE: Removed options/features.
            // PROBLEM 1:
            // The fixed table headers show up when the table is hidden!! (/%$($(/$)))
            // (*) Bypassed the problem by disabling the fixed header feature every time
            // a markdown page is loaded, and re-enabling it when the index is loaded.
            // PROBLEM 2:
            // The fixed table header/footer don't resize when the table is resized (when hiding the
            // sidebar, for example).
            // (*) Same fix as the previous problem. Toggle fixed header enabled state when setting the
            // page layout.
            // "fixedHeader": {
            //     "header": true,
            //     // Do not enable footer ever again. It causes more damage than good.
            //     "footer": false,
            //     "headerOffset": topNavbar.offsetHeight
            // },
            // "autoWidth": false,
            // Pretty crappy behavior. Columns don't come back to their original sizes.
            // (*) This seems to be fixed by the CSS tweaks I made to try to fix the "fixedHeader" problems.
            // But I'm keeping it disabled because now I'm using just two columns. One with fixed width
            // (the image column) and the other with a 100% width set (the title column). So, responsiveness
            // isn't needed.
            // "responsive": true,
            // Default number of rows to display on a single page when using pagination.
            // Set dynamically on KB_Main initialization.
            // "pageLength": 50,
            drawCallback: (aSettings) => { // jshint ignore:line
                KB_Constants.delayedTableDrawCallback();
            },
            // This makes a huge difference when there are tens of thousands of elements in a table.
            // Right now, the table handles just about a couple of thousands items.
            // For what I observed, there are always loaded the amount of items defined by the table length
            // selector.
            "deferRender": true,
            // Hide loading state of the table.
            "processing": false,
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
            "dom": '<<"KB_table-info-pagination-container pagination-sm"ip>r<t><"pagination-sm"p>>',
            // "dom": "<ipr<t>p>",
            // Which buttons to be shown in the pagination control.
            // full_numbers: 'First', 'Previous', 'Next' and 'Last' buttons, plus page numbers.
            "pagingType": "full_numbers",
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
                "name": "type",
                "class": "KB_img-cell-td",
                render: (aData, aType, aRow) => {
                    switch (aType) {
                        case "filter":
                        case "search":
                        case "sort":
                            return aData;
                        default:
                            return KB_Constants.dropdownTemplate({
                                dataHref: aRow.p,
                                dataType: aRow.i,
                                dataSource: aRow.s || "",
                                typeIcon: aData
                            });
                    }
                }
            }, {
                "data": "c",
                "name": "category",
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
                "name": "sub-category",
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
                "name": "title",
                "targets": 3,
                "class": `KB_title-link text-bold`,
                // "Hard coding" the click event here to avoid problems when the event is added by jQuery.
                // One of the problems is that in every change of the table page, the event was added more than once.
                // I dimmed it infinitely easier to just hard code it here while modifying the "render".
                render: (aData, aType, aRow) => {
                    switch (aType) {
                        case "display":
                            return KB_Constants.titleTemplate(aRow.p, aRow.i, aRow.s || "", aData);
                        default:
                            return aData;
                    }
                }
            }],
            // Not used for now.
            // initComplete: function() {}
        }
    };

    class KB_MainClass {
        constructor() {
            this._winStorage = window.localStorage;
            this._prefDefaults = {
                pref_DefaultCategory: "",
                pref_OpenPDFExternal: "true",
                pref_TablePageLength: "25",
            };

            let prefs = this.getPrefsFromStorage();
            for (let pref in prefs) {
                this[pref] = prefs[pref];
            }

            this._currentCategory = "All Categories";
            this._mainScrollPosition = 0;
            // this._currentPage = null;
            this._currentSection = "table";
            this._URLParams = new URLSearchParams(window.location.search);

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
            //     inlinePageURL (String):
            //         This key is part of the this._currentPage object. It's the relative to the server URL
            //         that points to the markdown/html/pdf page to load.
            //     inlinePageType (String):
            //         This key is part of the this._currentPage object.
            //     inlinePageSource (String):
            //         This key is part of the this._currentPage object. It's the URL to the
            //         content's on-line source.
            //     pref_DefaultCategory (String):
            //         Used to set the default category when the main index page is loaded.
            //         This query overrides the settings from the settings.json file.
            if (this._URLParams.has("inlinePageURL") && this._URLParams.has("inlinePageType")) {
                this.loadPageInline();
            }

            // NOTE:These are mostly useful bookmarking the page with specific page settings in case
            // local storage isn't available or it's cleared constantly.
            for (let pref in this._prefDefaults) {
                if (this._URLParams.has(pref)) {
                    this[pref] = decodeURIComponent(this._URLParams.get(pref));
                }
            }

            this.filterTable = KB_Utils.debounce(this.doFilter);
            // NOTE: Needs the time out. Otherwise, it wouldn't focus the freaking input field!!!
            // Check if a greater amount of table elements affects this.
            this.focusSearchInput = KB_Utils.debounce(() => {
                // NOTE: When the Firefox developer tools is open, the search input doesn't focus on page load.
                // It took me hours to discover this stupid behavior!!! )$(&$$)
                KB_Constants.inputSearch.focus();
            }, 500);

            // Enable animated scrolling when clicking the back-to-top button.
            // Treated separated for the following reasons:
            // - The smooth scroll library will not recognize special fragments like
            // # or #top to scroll to with an animation.
            // - The smooth scroll library will also not recognize the source element
            // as a link, so it can catch the hash.
            // - And finally, when treating it specially like this, I can prevent
            // the address bar url from being modified.
            // KB_Constants.toTopPageButton.addEventListener("click", (aE) => { // jshint ignore:line
            //     KB_Utils.smoothScrollToTop();
            //     return false;
            // }, false);

            KB_Constants.resetSettingsButton.addEventListener("click", (aE) => { // jshint ignore:line
                KB_Main.clearPrefsInStorage();
                return false;
            }, false);

            // Set active category.
            this.setActiveCategory();

            // Replicate the behavior of the DataTables native table length chooser.
            KB_Table.page.len(this.pref_TablePageLength).draw();
            KB_Constants.tableLengthChooserSelect.value = this.pref_TablePageLength;
            KB_Constants.tableLengthChooserSelect.addEventListener("change", (aE) => { // jshint ignore:line
                KB_Table.page.len(aE.target.value).draw();

                return false;
            }, false);

            KB_Table.on("length.dt.DT", (e, s, len) => {
                if (KB_Constants.tableLengthChooserSelect.value !== len) {
                    KB_Constants.tableLengthChooserSelect.value = len;
                }
            });

            KB_Constants.$indexModal.on("show.bs.modal", () => {
                KB_Constants.prefOpenPDFsExternally.checked = this.pref_OpenPDFExternal;
                KB_Constants.prefTablePageLength.value = this.pref_TablePageLength;
            }).on("keyup", (aE) => {
                // NOTE: Workaround for Firefox in Linux. ¬¬
                if (aE.keyCode === 27) { // Escape key.
                    $(aE.target).modal("hide");
                }
            });

            KB_Constants.prefSetDefaultCategory.addEventListener("click", () => {
                this.savePrefToStorage("pref_DefaultCategory",
                    this._currentCategory === "All Categories" ? "" : this._currentCategory);
            }, false);

            KB_Constants.prefOpenPDFsExternally.addEventListener("click", () => {
                this.pref_OpenPDFExternal = !this.pref_OpenPDFExternal;
                this.savePrefToStorage("pref_OpenPDFExternal", this.pref_OpenPDFExternal);
            }, false);

            KB_Constants.prefTablePageLength.addEventListener("change", () => {
                this.savePrefToStorage("pref_TablePageLength", KB_Constants.prefTablePageLength.value);
            }, false);

            // Replicate the DataTables search function used by its native search input.
            KB_Constants.inputSearch.addEventListener("keyup", this.inputSearchEventHandler, false);
            KB_Constants.inputSearch.addEventListener("search", this.inputSearchEventHandler, false);
            KB_Constants.inputSearch.addEventListener("input", this.inputSearchEventHandler, false);
            KB_Constants.inputSearch.addEventListener("paste", this.inputSearchEventHandler, false);
            KB_Constants.inputSearch.addEventListener("cut", this.inputSearchEventHandler, false);
            KB_Constants.inputSearch.addEventListener("keypress", this.inputSearchEventHandler, false);

            if (!this._URLParams.has("inlinePageURL")) {
                this.displayMainSection("table");
            }
        }

        elementsCallbacks(aE, aID) {
            aE.preventDefault();
            switch (aID) {
                case "KB_clear-search-button":
                    this.clearSearchInput(KB_Constants.inputSearch);
                    break;
                case "KB_toggle-sidebar":
                    this.toggleSidebar();
                    break;
                case "KB_reload-button":
                    this.loadPageInline();
                    // this.loadPageInline(this._currentPage);
                    break;
                case "KB_edit-button":
                    this.actionClick(aE, null, decodeURIComponent(this._URLParams.get("inlinePageURL")), "file");
                    break;
                case "KB_home-link":
                    switch (aE.button) {
                        case 0:
                            if (this._currentSection === "table") {
                                document.documentElement.scrollTop = this._mainScrollPosition = 0;
                            }

                            this.displayMainSection("table");
                            break;
                        case 1:
                            KB_Utils.loadInNewTab("index.html");
                            break;
                    }
                    break;
            }

            return false;
        }

        toggleSidebar(aShow = null) {
            // NOTE: This is to allow to use the function with a toggle and/or as a show/hide logic.
            //
            // - If aShow is null, let the d-none class decide sidebar visibility.
            // - If aShow is a boolean, let the argument decide.
            //
            // All this trouble is so I don't have to use hardcoded sizes/margins/paddings nor
            // idiotic animations.
            let showSidebar = aShow !== null ? aShow : KB_Constants.sidebarWrapper.classList.contains("d-none");
            let sidebarWrapperClasses = [
                "col-lg-2",
                "col-md-3"
            ];
            let contentWrapperClasses = [
                "offset-0",
                "offset-lg-2",
                "offset-md-3",
                "offset-sm-0",
                "col-12",
                "col-lg-10",
                "col-md-9",
                "col-sm-12"
            ];

            if (showSidebar) { // Show sidebar.
                // Remove the d-none class to the sidebar wrapper so it can be shown...
                KB_Constants.sidebarWrapper.classList.remove("d-none");
                // ...add back all layout classes to the sidebar and content wrappers so
                // they can be laid out depending on the view port size.
                KB_Constants.sidebarWrapper.classList.add(...sidebarWrapperClasses);
                KB_Constants.contentWrapper.classList.add(...contentWrapperClasses);
            } else { // Hide sidebar.
                // Add the d-none class to hide sidebar wrapper...
                KB_Constants.sidebarWrapper.classList.add("d-none");
                // ...remove all layout classes from the sidebar and content wrappers and
                // add only the col-12 class to the content wrapper so it occupy the
                // full width.
                KB_Constants.sidebarWrapper.classList.remove(...sidebarWrapperClasses);
                KB_Constants.contentWrapper.classList.remove(...contentWrapperClasses);
                KB_Constants.contentWrapper.classList.add("col-12");
            }
        }

        inputSearchEventHandler(aE) {
            switch (aE.type) {
                case "keyup":
                case "search":
                case "input":
                case "paste":
                case "cut":
                    // The best that I could come up with to avoid triggering the doFilter() function
                    // a million times unnecessarily. Which would trigger a million times the function
                    // DataTables.drawCallback(). And which will make the re-draw of the table reset the
                    // current scroll position. A snow ball of little annoyances that become a huge
                    // performance problem.
                    let triggerSearch = aE.type !== "keyup" ||
                        String.fromCharCode(aE.keyCode).match(/(\w|\s)/g) !== null ||
                        // Backspace.  So clearing the search box can trigger a clearSearchInput() (inside the
                        // call to doFilter()).
                        aE.which === 8 ||
                        // Delete.
                        aE.which === 46 ||
                        // Colon. So exact "type searches" can be performed (type:term).
                        aE.which === 16 ||
                        // Ultimately, let the Enter key trigger a search.
                        aE.which === 13;

                    if (aE.which === 27) { // Escape key
                        KB_Main.clearSearchInput(this);
                    } else {
                        if (triggerSearch) {
                            KB_Main.filterTable(aE.target.value.trim());
                        }
                    }

                    return false;
                case "keypress":
                    // Prevent form submission.
                    if (aE.keyCode === 13) {
                        return false;
                    }
                    break;
            }
        }

        setActiveCategory(aE, aEl) {
            if (aE) {
                aE.preventDefault();

                switch (aE.button) {
                    case 1:
                    case 2:
                        return;
                }
            }

            if (this._currentSection === "content") {
                this.displayMainSection("table");
            }

            let searchtext = null;
            document.documentElement.scrollTop = this._mainScrollPosition = 0;

            let filterTable = () => {
                KB_Table.search("");
                KB_Table.columns().search("");
            };

            // When selecting a category from the sidebar.
            if (aEl) {
                let subCatColIndex = aEl.classList.contains("KB_sub-cat-link") ?
                    "sub-category:name" :
                    "category:name";
                searchtext = aEl.textContent;

                this._currentCategory = searchtext;
                searchtext = searchtext === "All Categories" ? "" : searchtext;

                if (searchtext) {
                    filterTable();
                    this.highlightCategoryInSidebar(searchtext);
                    searchtext = searchtext.replace("/", "\\/");
                    KB_Table.column(subCatColIndex).search("^" + searchtext + "$", true, true, true).draw();
                } else {
                    this.clearSearchInput();
                }
            } else { // When selecting a category from initial page load.
                searchtext = this.pref_DefaultCategory ? this.pref_DefaultCategory :
                    this._currentCategory === "All Categories" ? "" : this._currentCategory;

                if (searchtext) {
                    filterTable();
                    KB_Table.column("category:name").search("^" + searchtext + "$", true, true, true).draw();
                    this.highlightCategoryInSidebar(searchtext);
                } else {
                    this.clearSearchInput();
                }
            }

            aE && aE.stopPropagation();
        }

        highlightCategoryInSidebar(aCategory) {
            let i = KB_Constants.$catButtons.length;
            while (i--) {
                if (KB_Constants.$catButtons[i].textContent === aCategory) {
                    KB_Constants.$catButtons[i].classList.add("active");
                } else {
                    KB_Constants.$catButtons[i].classList.remove("active");
                }
            }
        }

        clearSearchInput(aInput) {
            if (aInput) {
                aInput.setAttribute("value", "");
                aInput.value = "";
            }

            this._currentCategory = "All Categories";
            this.highlightCategoryInSidebar(this._currentCategory);
            KB_Table.search("");
            KB_Table.columns().search("").draw();

            this._mainScrollPosition = 0;
        }

        doFilter(aVal) {
            if (aVal) {
                if (aVal.length > 2) {
                    if (/\|/.test(aVal)) {
                        let cat,
                            sub,
                            title = null;
                        let parts = aVal.split("|");

                        if (parts.length === 2) {
                            [cat, title] = aVal.split("|");
                        } else if (parts.length === 3) {
                            [cat, sub, title] = aVal.split("|");
                        }

                        if (cat && cat.length > 1) {
                            KB_Table.columns().search("");
                            KB_Table.column("category:name").search("^" + cat, true, false, true).draw();
                        }

                        if (sub && sub.length > 1) {
                            KB_Table.columns().search("");
                            KB_Table.column("sub-category:name").search("^" + sub, true, false, true).draw();
                        }

                        if (title && title.length > 1) {
                            KB_Table.column("title:name").search(title, false, true, true).draw();
                        }
                    } else if (/:/.test(aVal)) {
                        let [type, title] = aVal.split(":");

                        if (type && type.length > 1) {
                            KB_Table.columns().search("");
                            KB_Table.column("type:name").search("^" + type, true, false, true).draw();
                        }

                        if (title && title.length > 1) {
                            KB_Table.column("title:name").search(title, false, true, true).draw();
                        }
                    } else {
                        KB_Table.search(aVal, false, true, true).draw();
                    }
                }
            } else {
                this.clearSearchInput();
            }
        }

        displayMainSection(aEl) {
            try {
                switch (aEl) {
                    case "content":
                        this.toggleSidebar(false);
                        this._currentSection = "content";
                        document.documentElement.scrollTop = 0;
                        KB_Constants.tableWrapper.classList.add("d-none");
                        KB_Constants.content.classList.remove("d-none");
                        KB_Constants.reloadButton.classList.remove("d-none");
                        this._URLParams.has("type") && this._URLParams.get("type") === "md" &&
                            KB_Constants.editButton.classList.remove("d-none");
                        KB_Constants.inputSearchForm.classList.add("d-none");
                        KB_Constants.tableLengthChooserForm.classList.add("d-none");
                        break;
                    case "table":
                        this.toggleSidebar(true);
                        this._currentSection = "table";
                        KB_Constants.tableWrapper.classList.remove("d-none");
                        KB_Constants.content.classList.add("d-none");
                        KB_Constants.content.innerHTML = "";
                        this._URLParams = new URLSearchParams("");
                        KB_Constants.reloadButton.classList.add("d-none");
                        KB_Constants.editButton.classList.add("d-none");
                        KB_Constants.inputSearchForm.classList.remove("d-none");
                        KB_Constants.tableLengthChooserForm.classList.remove("d-none");
                        this.focusSearchInput();
                        document.documentElement.scrollTop = this._mainScrollPosition;
                        break;
                }
            } finally {
                // NOTE: Why the bother, one would ask?
                // On initial load of the index, and without the zero opacity nor the loading overlay,
                // one can see all page elements being created/arranged plus the creation of the table.
                // I freaking hate that! So, the loading overlay is to cover that up. And the zero
                // opacity is to hide the body until the loading overlay loads (¬¬). Not using
                // animations because they can't guarantee that everything is loaded upon finishing;
                // plus they add useless overhead to the loading process.
                if (!KB_Constants.loadingOverlay.classList.contains("d-none")) {
                    KB_Constants.pseudoBody.style.opacity = 1;
                    // NOTE: The debounce here is created and auto-executed. This is done only once per
                    // page loading, so don't worry about storing the debounce for reuse.
                    KB_Utils.debounce(() => {
                        KB_Constants.loadingOverlay.classList.add("d-none");
                    }, 200)();
                }
            }
        }

        loadPageInline() {
            let self = this;
            $.ajax({
                method: "POST",
                // NOTE: Non-existent location. It's used just to send POST requests.
                url: "/handle_inline_content",
                cache: false,
                data: this._URLParams.toString()
            }).done((aResponse) => {
                if (this._URLParams.get("inlinePageType").toLowerCase() === "md") {
                    if (this._URLParams.get("inlinePageSource")) {
                        aResponse = `<h1><a href="${this._URLParams.get("inlinePageSource")}">Source</a></h1>
${aResponse}`;
                    }
                }

                KB_Constants.content.innerHTML = aResponse;
            }).always((aXHR, aStatusText) => { // jshint ignore:line
                try {
                    self.displayMainSection("content");
                } finally {
                    self.setupHTMLInlineContent();
                }
            }).fail((aXHR, aStatusText) => {
                console.error("Request failed: " + aStatusText);
                console.error(aXHR);
                KB_Constants.content.innerHTML = aXHR.responseText;
            });
        }

        contentLinkLoadInNewTab(aE) {
            aE.preventDefault();
            KB_Utils.loadInNewTab(aE.target.getAttribute("href"));
        }

        setupHTMLInlineContent() {
            // Hijack all links inside content so they can trigger the
            // Everything in "pure JavaScript".
            // Using jQuery's functions here makes everything ULTRA-MEGA-SLOW!!! ¬¬

            // "Back to top" button visibility (among other things).
            let contentLinks = KB_Constants.content.querySelectorAll("a[href]");
            let i = contentLinks.length;
            while (i--) {
                let targetHref = contentLinks[i].getAttribute("href");

                if (targetHref[0] === "#") {
                    contentLinks[i].addEventListener("click",
                        KB_Utils.smoothScrollInternalTarget.bind(null, KB_Constants.topNavbar),
                        false);
                } else {
                    // Nothing freaking works in the un-configurable crap called Firefox Quantum (57+)!!!
                    // So, I have to hard code it!!!
                    contentLinks[i].addEventListener("click", this.contentLinkLoadInNewTab, false);
                }
            }

            if (typeof hljs === "object") {
                let codeBlocks = KB_Constants.content.querySelectorAll("pre code");
                let i = codeBlocks.length;
                while (i--) {
                    hljs.highlightBlock(codeBlocks[i]);
                }
            }
        }

        titleClick(aE, aPseudoLink) {
            this._mainScrollPosition = document.documentElement.scrollTop;
            if (
                // If right click, do nothing. For extra actions already exit the action buttons.
                aE.button === 2 ||
                // If Alt modifier do nothing. I want to be able to select and copy text.
                aE.altKey) {
                return false;
            }

            aE.preventDefault();

            // NOTE: Use of a jQuery object because it makes it easier to get data attributes.
            let $pseudoLink = $(aPseudoLink);
            let href = $pseudoLink.data("href");
            let type = $pseudoLink.data("type");
            let source = $pseudoLink.data("source");

            switch (this.getLoadActionFromType(type)) {
                case KB_Constants.LOAD_INLINE: // Load Markdown pages inline.
                    this._URLParams.set("inlinePageURL", href);
                    this._URLParams.set("inlinePageType", type);
                    this._URLParams.set("inlinePageSource", source);

                    if (aE.button === 0) { // Left click
                        this.loadPageInline();
                    } else if (aE.button === 1) { // Middle click
                        // Query string implementation.
                        KB_Utils.loadInNewTab(`index.html?${this._URLParams.toString()}`);
                    }
                    break;
                case KB_Constants.LOAD_IN_NEW_TAB: // Load URI on new tab.
                    this._URLParams = new URLSearchParams("");

                    if (type === "epub" || (type === "pdf" && this.pref_OpenPDFExternal)) {
                        this.actionClick(aE, null, href, "file");
                    } else {
                        KB_Utils.loadInNewTab(href);
                    }
                    break;
            }

            aE.stopPropagation();
        }

        /**
         * Action when clicking an action icon inside the popovers attached to the table icons.
         *
         * @param {Object} a$ActionBtn - The event that triggered the function.
         * @param {String} aHref    - The relative path to a file.
         * @param {String} aAction  - The type of action that will be used to decide what to do with the path.
         */
        actionClick(aE, a$ActionBtn, aHref, aAction) {
            aE && aE.preventDefault();

            if (a$ActionBtn) {
                if (aAction === "new_tab") {
                    switch (this.getLoadActionFromType(a$ActionBtn.data("type"))) {
                        case KB_Constants.LOAD_INLINE:
                            let query = new URLSearchParams("");
                            query.set("inlinePageURL", a$ActionBtn.data("href"));
                            query.set("inlinePageType", a$ActionBtn.data("type"));
                            query.set("inlinePageSource", a$ActionBtn.data("source"));
                            KB_Utils.loadInNewTab(`index.html?${query.toString()}`);
                            break;
                        case KB_Constants.LOAD_IN_NEW_TAB:
                            KB_Utils.loadInNewTab(a$ActionBtn.data("href"));
                            break;
                    }
                } else if (aAction === "source_url") {
                    KB_Utils.loadInNewTab(a$ActionBtn.data("source"));
                } else if (aAction === "file" || aAction === "folder") {
                    this.actionClickAjaxCall(a$ActionBtn.data("href"), aAction);
                }
            } else {
                this.actionClickAjaxCall(aHref, aAction);
            }

            return false;
        }

        actionClickAjaxCall(aHref, aAction) {
            $.ajax({
                method: "POST",
                // Non-existent location. It's used just to send POST requests.
                url: "/handle_local_files",
                cache: false,
                data: {
                    href: aHref,
                    action: aAction
                }
            }).fail((aXHR, aStatusText) => {
                console.error("Request failed: " + aStatusText);
                console.error(aXHR);
            });
        }

        getLoadActionFromType(aPageType) {
            switch (aPageType) {
                case "epub":
                case "ext":
                case "pdf":
                    return KB_Constants.LOAD_IN_NEW_TAB; // Load in new tab.
                default:
                    return KB_Constants.LOAD_INLINE; // Load in-line.
            }
        }

        clearPrefsInStorage() {
            if (!this._winStorage) {
                return;
            }

            this._winStorage.clear();
        }

        savePrefToStorage(aKey, aValue) {
            if (!this._winStorage) {
                return;
            }

            this._winStorage.setItem("KB_" + aKey, aValue);
        }

        getPrefsFromStorage() {
            if (!this._winStorage) {
                return this._prefDefaults;
            }

            return {
                pref_DefaultCategory: this._winStorage.getItem("KB_pref_DefaultCategory") ||
                    this._prefDefaults.pref_DefaultCategory,
                pref_OpenPDFExternal: (this._winStorage.getItem("KB_pref_OpenPDFExternal") ||
                    this._prefDefaults.pref_OpenPDFExternal) === "true",
                pref_TablePageLength: this._winStorage.getItem("KB_pref_TablePageLength") ||
                    this._prefDefaults.pref_TablePageLength,
            };
        }
    }

    jQuery(document).ready(() => {
        KB_Table = $("#KB_table").DataTable(KB_Constants.tableOptions);
        KB_Main = new KB_MainClass();
    });

    KB_Debugger.wrapObjectMethods({
        KB_Constants: KB_Constants,
        KB_MainClass: KB_MainClass
    });
})();

/* global KB_Utils,
          KB_Debugger
 */
