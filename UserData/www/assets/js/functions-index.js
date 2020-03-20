/* NOTES:
 *
 * - "Interesting" fact. If the Firefox setting called browser.zoom.full is set to false
 *      the zooming of the page will not trigger breakpoint changes.
 * - When the Firefox developer tools is open, the search input doesn't focus on page load.
 *      It took me hours to discover this stupid behavior!!! )$(&$$)
 * - Input search nightmare!! I wanted something simple. To store search terms when pressing Enter
 *      without the input search being cleared and without submitting the form. Simple, right?!?
 *      Nothing is ever so with shit "designed" by f*cking web developers!!! The way that I made it
 *      work is as follows:
 *      - Added `action="javascript:void(0)"` attribute to the form.
 *      - Added `name="input-id"` attribute to the input of type search.
 *      - On the `keypress` event for the input I prevent default and return false when pressing the
 *          Enter key. In the middle of these calls I call the form's `submit` method.
 *      - Why all of this works (in Firefox based browsers only, because in Shitmium based browsers
 *          nothing f*cking works!!!), and which part of these changes actually made it work,
 *          I have no idea. Like with everything derived from "web technologies",
 *          I will keep "enjoying" it while it last. It's pointless to expect any kind of stability
 *          or congruency from any of these "technologies".
 * - Reasons (other than them being shit) for autocomplete not working on Shitmium based browsers:
 *     - The input isn't the first child of the form. Typical Google shit, to tell everybody how
 *         things should be designed!!!
 *     - Autocomplete is disabled when not using SSL in Shitmium based browsers. Typical web
 *         developers shit mentality, EVERYTHING in the f*cking cloud! Local HTML files can't be
 *         viewed in a f*cking HTML viewer!!! And SSL forced on locally hosted sites without
 *         internet access that DO NOT handle ANY data that needs to be securely handled!!!
 *     - Lastly, Google's design decision that the current behavior is the desired behavior by ALL
 *         Chrome users. This is the most likely problem. 90% of Chrome's users are morons that
 *         installed the browser without even knowing while blindly clicking Next in a wizard that
 *         they didn't even knew WTF they were installing, like every single f*cking Windows user!!!
 */

(function() {
    "use strict"; // jshint ignore:line

    let KB_Main = null;
    let KB_Table = null;

    const ALL_CATEGORIES = "All Categories";
    const LOAD_INLINE = 0;
    const LOAD_IN_NEW_TAB = 1;
    const DEFAULT_PREFS = {
        pref_DefaultCategory: ALL_CATEGORIES,
        pref_OpenPDFExternal: "true",
        pref_DisplayCatCol: "false",
        pref_DisplaySubCatCol: "false",
        pref_TablePageLength: "25"
    };
    const SEARCH_INPUT_EVENTS = [
        "keyup",
        "search",
        "input",
        "paste",
        "cut",
        "keypress"
    ];
    const SIDEBAR_WRAPPER_CLASSES = [
        "col-lg-2",
        "col-md-3"
    ];
    const CONTENT_WRAPPER_CLASSES = [
        "offset-0",
        "offset-lg-2",
        "offset-md-3",
        "offset-sm-0",
        "col-12",
        "col-lg-10",
        "col-md-9",
        "col-sm-12"
    ];

    // jQuery objects.
    const $IndexModal = $("#KB_index-modal");
    const $LoadingOverlay = $("#KB_loading");
    const $PseudoBody = $("#KB_pseudo-body");
    const $Sidebar = $("#KB_sidebar");
    const $SidebarCatButtons = $Sidebar.find("button.KB_cat-btn");
    const $Table = $("#KB_table");
    const $TopNavbar = $("#KB_top-navbar");

    // DOM elements.
    const InlineContent = document.getElementById("KB_inline-content");
    const MainContentWrapper = document.getElementById("KB_main-content-wrapper");
    const EditButton = document.getElementById("KB_edit-button");
    const InputSearch = document.getElementById("KB_input-search");
    const InputSearchGroup = document.getElementById("KB_input-search-group");
    const ReloadButton = document.getElementById("KB_reload-button");
    const ResetSettingsButton = document.getElementById("KB_reset-settings-button");
    const SidebarWrapper = document.getElementById("KB_sidebar-wrapper");
    const TableLengthChooserForm = document.getElementById("KB_table-length-chooser-form");
    const TableLengthChooserSelect = document.getElementById("KB_table-length-chooser-select");
    const TableWrapper = document.getElementById("KB_table-wrapper");
    const NavbarOffsetElements = new Map(Array.prototype.slice.call(
        document.getElementsByClassName("KB_needs-navbar-offset")).map((aEl) => [aEl, {}]));

    /**
     * Action buttons data map.
     *
     * @type {Object}
     */
    const BtnActMap = {
        "html": {
            "color": "orange",
            // NOTE: Hidden because these type of pages aren't actually HTML documents, they are just
            // using HTML markup, but without the <html>, <body> nor <!DOCTYPE html> tags.
            "file": "hide",
            "folder": "show",
            "new_tab": "show"
        },
        "ext": {
            "color": "indigo",
            "file": "hide",
            "folder": "show",
            // NOTE: Shown even though open in new tab is the default action when clicking the entry title
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
    };
    /**
     * Dropdown menu template.
     *
     * @param {Object} a - The object containing the data used to fill the template string.
     *
     * @return {String} The filled out template string.
     */
    const DropdownTemplate = (a) => {
        return `
<div tabindex="-1" role="group" class="KB_action-dropdown-menu dropdown" data-source="${encodeURIComponent(a.dataSource)}" data-title="${encodeURIComponent(a.dataTitle)}" data-href="${encodeURIComponent(a.dataHref)}" data-handler="${encodeURIComponent(a.dataHandler)}">
    <button type="button" class="btn btn-${BtnActMap[a.dataHandler].color} btn-sm dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"><i class="nf KB_custom-icon-${a.dataHandler}"></i></button>
    <div class="dropdown-menu">
        <h6 class="dropdown-header">Choose an action</h6>
        <a data-action="file" href="#" class="dropdown-item">
            <i class="nf nf-fa-edit">&nbsp&nbsp</i>Open file with external program</a>
        <a data-action="folder"  href="#" class="dropdown-item">
            <i class="nf nf-fa-folder_open_o">&nbsp&nbsp</i>Open folder containing file</a>
        <a data-action="new_tab"  href="#" class="dropdown-item">
            <i class="nf nf-fa-external_link_square">&nbsp&nbsp</i>Open page in new tab</a>
        <a data-action="source_url"  href="#" class="dropdown-item">
            <i class="nf nf-fa-link">&nbsp&nbsp</i>Open source URL</a>
    </div>
</div>`;
    };
    const TitleTemplate = (aDataHref, aDataHandler, aDataSource, aTitle) => {
        return `<div class="KB_title-link" data-source="${encodeURIComponent(aDataSource)}" data-handler="${encodeURIComponent(aDataHandler)}" data-href="${encodeURIComponent(aDataHref)}">${aTitle}</div>`;
    };
    /**
     * Delayed function called by DataTables.drawCallback().
     *
     * NOTE: Since I'm using deferRender=true to initialize the DataTables table, only
     * the visible elements of the table are actually created upon table initialization.
     * That's why I'm forced to iterate through all action buttons every time the table
     * is drawn. And that's also why this function is debounced; to avoid unnecessary rapid fire.
     *
     * @param {Function} () - Debounced function.
     */
    const DelayedTableDrawCallback = Ody_Utils.debounce(() => {
        KB_Main && KB_Main.focusSearchInput();

        $Table.find(".KB_action-dropdown-menu").each((aIndex, aEl) => {
            let $el = $(aEl);

            // NOTE: This is to ensure that the events are attached to each dropdown menu just ONCE.
            if ($el.data("action-menu-handled")) {
                return;
            }

            $el.on("show.bs.dropdown", (aE) => {
                let $actionDropdownMenu = $(aE.currentTarget);

                // NOTE: Again, this is to ensure that the events are attached to each menu items
                // just ONCE.
                if ($actionDropdownMenu.data("action-menuitem-handled")) {
                    return;
                }

                let $actionItems = $actionDropdownMenu.find("a.dropdown-item");
                let sourceURL = $actionDropdownMenu.data("source") || "";
                let handler = $actionDropdownMenu.data("handler");

                for (let i = $actionItems.length - 1; i >= 0; i--) {
                    let $actItem = $($actionItems[i]);
                    let itemAction = $actItem.data("action");

                    $actItem.on("click", KB_Main.actionClick
                        .bind(KB_Main, $actionDropdownMenu, null, itemAction));

                    if (itemAction === "source_url") {
                        $actItem[sourceURL ? "show" : "hide"]();
                    } else {
                        $actItem[BtnActMap[handler][itemAction]]();
                    }
                }

                $actionDropdownMenu.data("action-menuitem-handled", true);
            }).on("keyup.td", (aE) => {
                // NOTE: Workaround for Firefox in Linux. ¬¬
                // All of this nonsense due to web developers being DUMBASSES!!!
                if (aE.keyCode === 27) { // Escape key.
                    $(aE.target).dropdown("hide");
                }
            });

            $el.data("action-menu-handled", true);
        });
    }, 500);

    /**
     * The object used to initialize the DataTables table.
     *
     * @type {Object}
     */
    const TableOptions = {
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
            DelayedTableDrawCallback();
        },
        // This makes a huge difference when there are tens of thousands of elements in a table.
        // Right now, the table handles just about a couple of thousands items.
        // For what I observed, there are always loaded the amount of items defined by the table length
        // selector.
        deferRender: true,
        // Hide loading state of the table since I already use a loading overlay.
        processing: false,
        // Display information about the table including information about filtered data if
        // that action is being performed.
        info: true,
        // Enable search abilities of DataTables.
        searching: true,
        // Hide the selector to change the number of records to be shown per page.
        // Disabled in favor of a custom selector added to the top navbar.
        lengthChange: false,
        // Do not show the DataTables' native search input and table length changer.
        // Using custom ones directly inserted in the top navbar.
        // Added the container with class KB_table-info-pagination-container to be able to
        // display the info and top pagination in the same line with some CSS sorcery.
        // Added the pagination-sm Bootstrap class to both paginations to make them smaller.
        dom: '<<"KB_table-info-pagination-container pagination-sm"ip>r<t><"pagination-sm"p>>',
        // Which buttons to be shown in the pagination control.
        // full_numbers: 'First', 'Previous', 'Next' and 'Last' buttons, plus page numbers.
        pagingType: "full_numbers",
        ordering: true,
        ajax: {
            url: "assets/data/data_tables.json",
            dataSrc: "",
            deferRender: true
        },
        // Sort by title.
        // 0 is the column with the action buttons.
        // 1 is the column with the categories, which is hidden.
        // 2 is the column with the sub-categories, which is also hidden.
        // 3 is the column with the titles.
        // Columns options.
        // - searchable: All true.
        // - type: Not needed since I use a function for the "render" option that handles the data
        //      that it returns depending on the action performed by DataTables.
        order: [
            [3, "asc"]
        ],
        columns: [{
            data: "h",
            name: "handler",
            targets: 0,
            sortable: false,
            class: "KB_image",
            render: (aData, aType, aRow) => {
                switch (aType) {
                    case "filter":
                    case "search":
                    case "sort":
                        return aData;
                    default:
                        return DropdownTemplate({
                            dataHref: aRow.p,
                            dataTitle: aRow.t,
                            dataHandler: aRow.h,
                            dataSource: aRow.s || ""
                        });
                }
            }
        }, {
            data: "c",
            name: "category",
            targets: 1,
            sortable: false,
            visible: true,
            render: (aData, aType, aRow) => { // jshint ignore:line
                switch (aType) {
                    case "filter":
                    case "search":
                    case "sort":
                    case "display":
                        if (/\|/.test(aData)) {
                            return aData.split("|")[0];
                        }

                        return aData;
                    default:
                        return aData;
                }
            }
        }, {
            data: "c",
            name: "sub-category",
            targets: 2,
            sortable: false,
            visible: true,
            render: (aData, aType, aRow) => { // jshint ignore:line
                switch (aType) {
                    case "filter":
                    case "search":
                    case "sort":
                    case "display":
                        if (/\|/.test(aData)) {
                            return aData.split("|")[1];
                        }

                        return "";
                    default:
                        return "";
                }
            }
        }, {
            data: "t",
            name: "title",
            targets: 3,
            class: "KB_title text-bold",
            render: (aData, aType, aRow) => {
                switch (aType) {
                    case "display":
                        return TitleTemplate(aRow.p, aRow.h, aRow.s || "", aData);
                    default:
                        return aData;
                }
            }
        }],
        // Not used for now.
        initComplete: function() {
            KB_Main = new KB_MainClass();
        }
    };

    class KB_MainClass {
        constructor() {
            this._winStorage = window.localStorage;

            let prefs = this.getPrefsFromStorage();
            for (let pref in prefs) {
                this[pref] = prefs[pref];
            }

            this._currentCategory = ALL_CATEGORIES;
            this._mainScrollPosition = 0;
            // NOTE: This is set only when the "currentCategoryName" URL parameter is set.
            this._ignoreDefaultCategory = false;
            this._currentSection = "table";
            this._URLParams = new URLSearchParams(window.location.search);
            this.delayedSetElementsOffset = Ody_Utils.debounce(this.doSetElementsOffset, 50);

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
            //     inlinePageURL:
            //         It's the path relative to the server URL that points to an inline page to load.
            //     inlinePageHandler:
            //         The "page handler" is used to decide how to load an inline page and the image used
            //         on its action button on the table.
            //     inlinePageSource:
            //         It's the URL to the content's on-line source.
            //     pref_DefaultCategory:
            //         Used to set the default category when the main index page is loaded.
            if (this._URLParams.has("inlinePageURL") && this._URLParams.has("inlinePageHandler")) {
                this.loadPageInline();
            }

            // NOTE:These are mostly useful for bookmarking the page with specific page settings in case
            // local storage isn't available or it's cleared constantly.
            for (let pref in DEFAULT_PREFS) {
                if (this._URLParams.has(pref)) {
                    this[pref] = decodeURIComponent(this._URLParams.get(pref));
                }
            }

            if (this._URLParams.has("currentCategoryName")) {
                this._currentCategory = this._URLParams.get("currentCategoryName");

                Ody_Utils.clearQueryString();
                this._ignoreDefaultCategory = true;
            }

            this.filterTable = Ody_Utils.debounce(this.doFilter);
            // NOTE: Needs the time out. Otherwise, it wouldn't focus the freaking input field!!!
            // Check if a greater amount of table elements affects this.
            this.focusSearchInput = Ody_Utils.debounce(() => {
                InputSearch.focus();
            }, 500);

            ResetSettingsButton.addEventListener("click", function(aE) { // jshint ignore:line
                this.clearPrefsInStorage();
                return false;
            }.bind(this), false);

            this.setActiveCategory();

            // Replicate the behavior of the DataTables native table length chooser.
            KB_Table.page.len(this.pref_TablePageLength).draw();
            TableLengthChooserSelect.value = this.pref_TablePageLength;
            TableLengthChooserSelect.addEventListener("change", (aE) => { // jshint ignore:line
                KB_Table.page.len(aE.target.value).draw();

                return false;
            }, false);

            KB_Table.on("length.dt.DT", (e, s, len) => {
                if (TableLengthChooserSelect.value !== len) {
                    TableLengthChooserSelect.value = len;
                }
            });

            KB_Table.column("category:name").visible(this.pref_DisplayCatCol);
            KB_Table.column("sub-category:name").visible(this.pref_DisplaySubCatCol);

            // NOTE: No need to optimize this. And use arrow function to preserve "this".
            $IndexModal.on("show.bs.modal", () => {
                $IndexModal.find(".KB_pref-handler").each((aIndex, aEl) => {
                    let pref = aEl.getAttribute("data-pref");
                    switch (pref) {
                        case "pref_DisplayCatCol":
                        case "pref_DisplaySubCatCol":
                        case "pref_OpenPDFExternal":
                            aEl.checked = this[pref];
                            break;
                        case "pref_TablePageLength":
                            aEl.value = this[pref];
                            break;
                    }
                });
            }).on("keyup", (aE) => {
                // NOTE: Workaround for Firefox in Linux. ¬¬
                if (aE.keyCode === 27) { // Escape key.
                    $(aE.target).modal("hide");
                }
            });

            // Replicate the DataTables search function used by its native search input.
            for (let i = SEARCH_INPUT_EVENTS.length - 1; i >= 0; i--) {
                InputSearch.addEventListener(SEARCH_INPUT_EVENTS[i],
                    this.inputSearchEventHandler, false);
            }

            if (!this._URLParams.has("inlinePageURL")) {
                this.displayMainSection("table");
            }

            $Sidebar.on("click auxclick", "button.KB_cat-btn",
                this.setActiveCategory.bind(this));
            $Table.on("click auxclick", ".KB_title-link",
                this.handleTitleClick.bind(this));
            $IndexModal.on("click change", ".KB_pref-handler",
                this.handlePreferences.bind(this));
            $TopNavbar.on("click", ".KB_nav-item",
                this.handleNavItemsClick.bind(this));

            if ("Ody_SmoothScroll" in window) {
                Ody_SmoothScroll.topElementOffset = $TopNavbar.outerHeight(true);
                Ody_SmoothScroll.initLinksHandler();
            }

            window.addEventListener("resize", () => {
                this.delayedSetElementsOffset();
            }, false);

            this.delayedSetElementsOffset();
        }

        doSetElementsOffset() {
            Ody_Utils.setElementsOffset($TopNavbar[0], NavbarOffsetElements);
        }

        /**
         * Handle navbar items clicks.
         *
         * @param {Object} aE - Event that triggered the function.
         */
        handleNavItemsClick(aE) {
            aE.preventDefault();
            switch (aE.currentTarget.getAttribute("id")) {
                case "KB_clear-search-button":
                    this.clearSearchInput(InputSearch);
                    break;
                case "KB_toggle-sidebar":
                    this.toggleSidebar();
                    break;
                case "KB_reload-button":
                    this.loadPageInline();
                    break;
                case "KB_edit-button":
                    this.actionClick(null, decodeURIComponent(this._URLParams.get("inlinePageURL")), "file", aE);
                    break;
                case "KB_home-link":
                    switch (aE.button) {
                        case 0:
                            if (this._currentSection === "table") {
                                this.resetScrollPosition();
                            }

                            this.displayMainSection("table");
                            break;
                        case 1:
                            Ody_Utils.loadInNewTab("");
                            break;
                    }
                    break;
            }

            return false;
        }

        /**
         * Toggle sidebar visibility.
         *
         * If a boolean is passed, the sidebar is hid or shown. If null is passed, the sidebar
         * visibility will be toggled depending on the existence or not of the d-none class.
         *
         * @param {Boolean/null} aShow - Whether to show or hide the sidebar.
         */
        toggleSidebar(aShow = null) {
            // All this trouble is so I don't have to use hardcoded sizes/margins/paddings nor
            // idiotic animations. I just let all elements fit the available space.
            let showSidebar = aShow === null ? SidebarWrapper.classList.contains("d-none") : aShow;

            if (showSidebar) { // Show sidebar.
                // Remove the d-none class to the sidebar wrapper so it can be shown...
                SidebarWrapper.classList.remove("d-none");
                // ...add back all layout classes to the sidebar and content wrappers so
                // they can be laid out depending on the view port size.
                SidebarWrapper.classList.add(...SIDEBAR_WRAPPER_CLASSES);
                MainContentWrapper.classList.add(...CONTENT_WRAPPER_CLASSES);
            } else { // Hide sidebar.
                // Add the d-none class to hide sidebar wrapper...
                SidebarWrapper.classList.add("d-none");
                // ...remove all layout classes from the sidebar and content wrappers and
                // add only the col-12 class to the content wrapper so it occupy the
                // full width.
                SidebarWrapper.classList.remove(...SIDEBAR_WRAPPER_CLASSES);
                MainContentWrapper.classList.remove(...CONTENT_WRAPPER_CLASSES);
                MainContentWrapper.classList.add("col-12");
            }
        }

        /**
         * Handle events triggered by the input search.
         *
         * @param {Object} aE - Event that triggered the function.
         */
        inputSearchEventHandler(aE) {
            // Prevent form submission.
            if (aE.type === "keypress" && aE.keyCode === 13) {
                aE.preventDefault();
                InputSearchGroup.submit();
                return false;
            }

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
                    break;
            }
        }

        /**
         * Set active category.
         *
         * @param {Object} aE - Event that triggered the function.
         */
        setActiveCategory(aE) {
            // NOTE: aE will not exist when calling setActiveCategory() on page load.
            aE && aE.preventDefault();

            if (this._currentSection === "content") {
                this.displayMainSection("table");
            }

            let searchtext = null;

            // When selecting a category from the sidebar.
            if (aE && aE.currentTarget) {
                searchtext = aE.currentTarget.getAttribute("data-cat");

                switch (aE.button) {
                    case 1:
                        let query = new URLSearchParams("");
                        query.set("currentCategoryName", searchtext);
                        Ody_Utils.loadInNewTab(`?${query.toString()}`);
                        return;
                    case 2:
                        return;
                }
                this.resetScrollPosition();

                this._currentCategory = searchtext;

                this.highlightCategoryInSidebar(searchtext);
                this.filterCategories(searchtext);
            } else { // When selecting a category from initial page load.
                this.resetScrollPosition();
                searchtext = (this.pref_DefaultCategory && !this._ignoreDefaultCategory) ? this.pref_DefaultCategory :
                    this._currentCategory;

                this._ignoreDefaultCategory = false;

                this.highlightCategoryInSidebar(searchtext);
                this.filterCategories(searchtext);
            }

            aE && aE.stopPropagation();
        }

        /**
         * Highlight category in sidebar.
         *
         * @param {String} aCategory - The category to highlight.
         */
        highlightCategoryInSidebar(aCategory) {
            let currentCatButton = null;
            for (let i = $SidebarCatButtons.length - 1; i >= 0; i--) {
                if ($SidebarCatButtons[i].getAttribute("data-cat") === aCategory) {
                    $SidebarCatButtons[i].classList.add("active");
                    currentCatButton = $SidebarCatButtons[i];
                } else {
                    $SidebarCatButtons[i].classList.remove("active");
                }
            }

            if (currentCatButton !== null && !!currentCatButton.getAttribute("data-parent")) {
                let $collapseEl = $(currentCatButton.getAttribute("data-parent"));
                $collapseEl && $collapseEl.collapse().show();
            }
        }

        /**
         * Clear search input.
         *
         * @param {Object} aInput - The input element to clear.
         */
        clearSearchInput(aInput) {
            if (aInput) {
                aInput.setAttribute("value", "");
                aInput.value = "";
            }

            this.filterCategories(this._currentCategory);
            this._mainScrollPosition = 0;
        }

        /**
         * Filter categories.
         *
         * @param {String} aCategory - Category name.
         */
        filterCategories(aCategory) {
            KB_Table.search("");
            KB_Table.columns().search("");

            if (aCategory === "All Categories") {
                KB_Table.columns().search("").draw();
            } else {
                let [cat, sub] = aCategory.split("|");

                cat && KB_Table.column("category:name").search("^" + Ody_Utils.escapeRegExp(cat) + "$",
                    true, false, true).draw();
                sub && KB_Table.column("sub-category:name").search("^" + Ody_Utils.escapeRegExp(sub) + "$",
                    true, false, true).draw();
            }
        }

        /**
         * Filter the table content.
         *
         * @param {String} aVal - The search term.
         */
        doFilter(aVal) {
            if (aVal) {
                if (aVal.length > 2) {
                    // NOTE: Not using the filterCategories function here so I can do "abbreviated
                    // searches". For example, instead of being forced to type do a search like
                    // "Category|Subcategory|SearchTerm", I can simply do "Cat|Sub|SearchTerm".
                    if (/\|/.test(aVal)) { // Search by category/sub-category.
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
                            KB_Table.column("category:name").search("^" + Ody_Utils.escapeRegExp(cat),
                                true, false, true).draw();
                        }

                        if (sub && sub.length > 1) {
                            KB_Table.columns().search("");
                            KB_Table.column("sub-category:name").search("^" + Ody_Utils.escapeRegExp(sub),
                                true, false, true).draw();
                        }

                        if (title && title.length > 1) {
                            KB_Table.column("title:name").search(title, false, true, true).draw();
                        } else {
                            KB_Table.column("title:name").search("").draw();
                        }
                    } else if (/:/.test(aVal)) { // Search by handler.
                        let [handler, title] = aVal.split(":");

                        if (handler && handler.length > 1) {
                            this.filterCategories(this._currentCategory);
                            KB_Table.column("handler:name").search("^" + Ody_Utils.escapeRegExp(handler),
                                true, false, true).draw();
                        }

                        if (title && title.length > 1) {
                            KB_Table.column("title:name").search(title, false, true, true).draw();
                        } else {
                            KB_Table.column("title:name").search("").draw();
                        }
                    } else {
                        KB_Table.search(aVal, false, true, true).draw();
                    }
                }
            } else {
                this.clearSearchInput();
            }
        }

        /**
         * Display one of the main sections of the index page.
         *
         * @param {Object} aEl - String representing the desired element.
         */
        displayMainSection(aEl) {
            try {
                switch (aEl) {
                    case "content":
                        this.toggleSidebar(false);
                        this._currentSection = "content";
                        document.documentElement.scrollTop = 0;

                        this.customFadeOut(TableWrapper);
                        this.customFadeOut(InputSearchGroup);
                        this.customFadeOut(TableLengthChooserForm);

                        this.customFadeIn(InlineContent);
                        this.customFadeIn(ReloadButton);
                        this._URLParams.has("inlinePageHandler") &&
                            this._URLParams.get("inlinePageHandler") === "md" &&
                            this.customFadeIn(EditButton);
                        break;
                    case "table":
                        this.toggleSidebar(true);
                        this._currentSection = "table";
                        InlineContent.innerHTML = "";
                        this._URLParams = new URLSearchParams("");

                        this.customFadeIn(TableWrapper);
                        this.customFadeIn(InputSearchGroup);
                        this.customFadeIn(TableLengthChooserForm);

                        this.customFadeOut(ReloadButton);
                        this.customFadeOut(EditButton);
                        // NOTE: Do not fade it out!
                        InlineContent.classList.add("d-none");

                        this.focusSearchInput();
                        // When going back to the index, restore the scroll position.
                        document.documentElement.scrollTop = this._mainScrollPosition;
                        break;
                }
            } finally {
                $PseudoBody.animate({
                    opacity: "1"
                }, {
                    duration: 200,
                    start: () => {
                        $LoadingOverlay.animate({
                            opacity: "0"
                        }, {
                            duration: 200,
                            done: () => {
                                $LoadingOverlay.addClass("d-none");
                            }
                        });
                    }
                });
            }
        }

        customFadeIn(aEl) {
            $(aEl).animate({
                opacity: "1"
            }, {
                duration: 200,
                start: () => {
                    aEl.classList.remove("d-none");
                }
            });
        }

        customFadeOut(aEl) {
            $(aEl).animate({
                opacity: "0"
            }, {
                duration: 200,
                done: () => {
                    aEl.classList.add("d-none");
                }
            });
        }

        /**
         * Load a Markdown or reStructuredText page inline.
         */
        loadPageInline() {
            let self = this;
            $.ajax({
                method: "POST",
                // NOTE: Non-existent location. It's used just to send POST requests.
                url: "/handle_inline_content",
                cache: false,
                data: this._URLParams.toString()
            }).done((aResponse) => {
                InlineContent.innerHTML = aResponse;
            }).always((aXHR, aStatusText) => { // jshint ignore:line
                try {
                    self.displayMainSection("content");
                } finally {
                    self.setupHTMLInlineContent();
                }
            }).fail((aXHR, aStatusText) => {
                console.error("Request failed: " + aStatusText);
                console.error(aXHR);
                InlineContent.innerHTML = aXHR.responseText;
            });
        }

        /**
         * Open links inside pages loaded inline in a new tab.
         *
         * @param {Object} aE - Event that triggered the function.
         */
        contentLinkLoadInNewTab(aE) {
            aE.preventDefault();
            Ody_Utils.loadInNewTab(aE.target.getAttribute("href"));
        }

        /**
         * Setup the content of a just inserted inline page.
         */
        setupHTMLInlineContent() {
            let contentLinks = InlineContent.querySelectorAll("a[href]");

            for (let i = contentLinks.length - 1; i >= 0; i--) {
                let targetHref = contentLinks[i].getAttribute("href");

                if (targetHref[0] !== "#") {
                    // Nothing freaking works in the un-configurable crap called Firefox Quantum (57+)!!!
                    // So, I have to hard code it!!!
                    contentLinks[i].addEventListener("click", this.contentLinkLoadInNewTab, false);
                }
            }

            if (typeof hljs === "object") {
                let codeBlocks = InlineContent.querySelectorAll("pre code");
                for (let i = codeBlocks.length - 1; i >= 0; i--) {
                    hljs.highlightBlock(codeBlocks[i]);
                }
            }
        }

        /**
         * Handle elements that handle preferences.
         *
         * @param {Object} aE - Event that triggered the function.
         */
        handlePreferences(aE) {
            let pref = aE.currentTarget.getAttribute("data-pref");
            switch (aE.type) {
                case "click":
                    switch (pref) {
                        case "pref_DisplayCatCol":
                        case "pref_DisplaySubCatCol":
                        case "pref_OpenPDFExternal":
                            this[pref] = !this[pref];
                            this.savePrefToStorage(pref, this[pref]);

                            pref === "pref_DisplayCatCol" &&
                                KB_Table.column("category:name").visible(this.pref_DisplayCatCol);
                            pref === "pref_DisplaySubCatCol" &&
                                KB_Table.column("sub-category:name").visible(this.pref_DisplaySubCatCol);
                            break;
                        case "pref_DefaultCategory":
                            this.savePrefToStorage(pref, this._currentCategory);
                            break;
                    }
                    break;
                case "change":
                    switch (pref) {
                        case "pref_TablePageLength":
                            this.savePrefToStorage(pref, aE.currentTarget.value);
                            break;
                    }
                    break;
            }
        }

        /**
         * Handle clicks on table titles' elements.
         *
         * @param {Object} aE - Event that triggered the function.
         */
        handleTitleClick(aE) {
            // Store the scroll position of the index to later restore it.
            this._mainScrollPosition = document.documentElement.scrollTop;
            if (
                // If right click, do nothing. For extra actions already exist the action buttons.
                aE.button === 2 ||
                // If Alt modifier do nothing. I want to be able to select and copy text.
                aE.altKey) {
                return false;
            }

            aE.preventDefault();

            let href = aE.currentTarget.getAttribute("data-href");
            let handler = aE.currentTarget.getAttribute("data-handler");
            let source = aE.currentTarget.getAttribute("data-source");
            let title = aE.currentTarget.textContent;

            switch (this.getLoadActionFromHandler(handler)) {
                case LOAD_INLINE:
                    this._URLParams.set("inlinePageURL", href);
                    this._URLParams.set("inlinePageHandler", handler);
                    this._URLParams.set("inlinePageSource", source);
                    this._URLParams.set("inlinePageTitle", title);

                    if (aE.button === 0) { // Left click
                        this.loadPageInline();
                    } else if (aE.button === 1) { // Middle click
                        // Query string implementation.
                        Ody_Utils.loadInNewTab(`?${this._URLParams.toString()}`);
                    }
                    break;
                case LOAD_IN_NEW_TAB:
                    this._URLParams = new URLSearchParams("");

                    if (handler === "epub" || (handler === "pdf" && this.pref_OpenPDFExternal)) {
                        this.actionClick(null, href, "file", aE);
                    } else {
                        Ody_Utils.loadInNewTab(href);
                    }
                    break;
            }

            aE.stopPropagation();
        }

        /**
         * Action when clicking an action icon inside the dropdown menus attached to the table icons.
         *
         * @param {Object} aE           - Event that triggered the function.
         * @param {String} a$ActionMenu - The dropdown menu where the data is stored.
         * @param {String} aHref        - The relative path to a file.
         * @param {String} aAction      - The type of action that will be used to decide what to do with the path.
         *
         * @return {Boolean} Stop propagation.
         */
        actionClick(a$ActionMenu, aHref, aAction, aE) {
            aE && aE.preventDefault();

            if (a$ActionMenu) {
                if (aAction === "new_tab") {
                    switch (this.getLoadActionFromHandler(a$ActionMenu.data("handler"))) {
                        case LOAD_INLINE:
                            // NOTE: Create a new query and leave the current one untouched.
                            let query = new URLSearchParams("");
                            query.set("inlinePageURL", a$ActionMenu.data("href"));
                            query.set("inlinePageHandler", a$ActionMenu.data("handler"));
                            query.set("inlinePageSource", a$ActionMenu.data("source"));
                            query.set("inlinePageTitle", a$ActionMenu.data("title"));
                            Ody_Utils.loadInNewTab(`?${query.toString()}`);
                            break;
                        case LOAD_IN_NEW_TAB:
                            Ody_Utils.loadInNewTab(a$ActionMenu.data("href"));
                            break;
                    }
                } else if (aAction === "source_url") {
                    Ody_Utils.loadInNewTab(a$ActionMenu.data("source"));
                } else if (aAction === "file" || aAction === "folder") {
                    this.actionClickAjaxCall(a$ActionMenu.data("href"), aAction);
                }

                // NOTE: Close the menu manually so I can return false at the end so the f*cking
                // page will not scroll to the f*cking top.
                a$ActionMenu.dropdown("hide");
            } else {
                this.actionClickAjaxCall(aHref, aAction);
            }

            return false;
        }

        /**
         * The AJAX call performed by this.actionClick().
         *
         * @param {String} aHref   - The relative path to a file.
         * @param {String} aAction - The type of action that will be used to decide what to do with the path.
         */
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

        /**
         * Get action from handler.
         *
         * @param {String} aPageHandler - The handler ID.
         *
         * @return {Number} The load action code.
         */
        getLoadActionFromHandler(aPageHandler) {
            switch (aPageHandler) {
                case "epub":
                case "ext":
                case "pdf":
                    return LOAD_IN_NEW_TAB;
                default:
                    return LOAD_INLINE;
            }
        }

        /**
         * Clear all preferences stored into window.localStorage.
         */
        clearPrefsInStorage() {
            if (!this._winStorage) {
                return;
            }

            this._winStorage.clear();
        }

        /**
         * Save preference to window.localStorage.
         *
         * @param {String} aKey   - The window.localStorage key to save the preference into.
         * @param {String} aValue - The value associated to aKey.
         *
         * @return {String} description
         */
        savePrefToStorage(aKey, aValue) {
            if (!this._winStorage) {
                return;
            }

            this._winStorage.setItem("KB_" + aKey, aValue);
        }

        /**
         * Get preferences from window.localStorage.
         *
         * @return {Object} Preferences stored in window.localStorage or the defaults if window.localStorage is not available.
         */
        getPrefsFromStorage() {
            if (!this._winStorage) {
                return DEFAULT_PREFS;
            }

            return {
                pref_DefaultCategory: this._winStorage.getItem("KB_pref_DefaultCategory") ||
                    DEFAULT_PREFS.pref_DefaultCategory,
                pref_OpenPDFExternal: (this._winStorage.getItem("KB_pref_OpenPDFExternal") ||
                    DEFAULT_PREFS.pref_OpenPDFExternal) === "true",
                pref_DisplayCatCol: (this._winStorage.getItem("KB_pref_DisplayCatCol") ||
                    DEFAULT_PREFS.pref_DisplayCatCol) === "true",
                pref_DisplaySubCatCol: (this._winStorage.getItem("KB_pref_DisplaySubCatCol") ||
                    DEFAULT_PREFS.pref_DisplaySubCatCol) === "true",
                pref_TablePageLength: this._winStorage.getItem("KB_pref_TablePageLength") ||
                    DEFAULT_PREFS.pref_TablePageLength
            };
        }

        /**
         * Reset index scroll position.
         */
        resetScrollPosition() {
            document.documentElement.scrollTop = this._mainScrollPosition = 0;
        }
    }

    Ody_Debugger.wrapObjectMethods({
        KB_MainClass: KB_MainClass
    });

    KB_Table = $Table.DataTable(TableOptions);
})();

/* global Ody_Utils,
          Ody_Debugger,
          Ody_SmoothScroll
 */
