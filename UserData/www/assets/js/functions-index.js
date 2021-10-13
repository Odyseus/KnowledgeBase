(function() {
    "use strict"; // jshint ignore:line

    let KB_Main = null;
    let KB_Table = null;

    const ALL_CATEGORIES = "All";
    const LOAD_INLINE = 0;
    const LOAD_IN_NEW_TAB = 1;
    const DEFAULT_PREFS = {
        default_category: ALL_CATEGORIES,
        open_pdf_external: true,
        display_cat_col: false,
        display_subcat_col: false,
        table_page_length: 25
    };
    const Ody_Prefs = new Ody_PrefsClass(DEFAULT_PREFS);
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

    // DOM elements.
    const PseudoBody = document.getElementById("KB_pseudo-body");
    const LoadingOverlay = document.getElementById("KB_loading");
    const TopNavbar = document.getElementById("KB_top-navbar");
    const Table = document.getElementById("KB_table");
    const IndexModal = document.getElementById("KB_index-modal");
    const InlineContent = document.getElementById("KB_inline-content");
    const MainContentWrapper = document.getElementById("KB_main-content-wrapper");
    const EditButton = document.getElementById("KB_edit-button");
    const InputSearch = document.getElementById("KB_input-search");
    const InputSearchGroup = document.getElementById("KB_input-search-group");
    const ReloadButton = document.getElementById("KB_reload-button");
    const ResetSettingsButton = document.getElementById("KB_reset-settings-button");
    const Sidebar = document.getElementById("KB_sidebar");
    const SidebarWrapper = document.getElementById("KB_sidebar-wrapper");
    const TableLengthChooserForm = document.getElementById("KB_table-length-chooser-form");
    const TableLengthChooserSelect = document.getElementById("KB_table-length-chooser-select");
    const TableWrapper = document.getElementById("KB_table-wrapper");
    const NavbarOffsetElements = new Map([
        ...document.getElementsByClassName("KB_needs-navbar-offset")
    ].map((aEl) => [aEl, {}]));
    const TopNavbarItems = [
        ...TopNavbar.getElementsByClassName("KB_nav-item")
    ];
    const SidebarCatButtons = [
        ...Sidebar.getElementsByClassName("KB_cat-btn")
    ];
    const PrefHandlers = [
        ...document.getElementsByClassName("KB_pref-handler")
    ];
    // jQuery objects.
    const $Table = $(Table);

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
    <button type="button" class="btn btn-${BtnActMap[a.dataHandler].color} btn-sm dropdown-toggle" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false"><i class="nf KB_custom-icon-${a.dataHandler}"></i></button>
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
    const DelayedTableDrawCallback = Ody_Core.debounce(() => {
        KB_Main && KB_Main.focusSearchInput();

        Ody_Core.arrayEach([...Table.getElementsByClassName("KB_action-dropdown-menu")], (aEl) => {
            // NOTE: This is to ensure that the events are attached to each dropdown menu just ONCE.
            if (aEl.getAttribute("data-action-menu-handled")) {
                return;
            }

            aEl.addEventListener("show.bs.dropdown", (aE) => {
                let actionDropdownMenu = aE.currentTarget;

                // NOTE: Again, this is to ensure that the events are attached to each menu items
                // just ONCE.
                if (actionDropdownMenu.getAttribute("data-action-menuitem-handled")) {
                    return;
                }

                let actionItems = actionDropdownMenu.getElementsByClassName("dropdown-item");
                let sourceURL = actionDropdownMenu.getAttribute("data-source") || "";
                let handler = actionDropdownMenu.getAttribute("data-handler");

                for (let i = actionItems.length - 1; i >= 0; i--) {
                    let actItem = actionItems[i];
                    let itemAction = actItem.getAttribute("data-action");

                    if (itemAction === "source_url") {
                        actItem.style.display = sourceURL ? "" : "none";
                    } else {
                        actItem.style.display = BtnActMap[handler][itemAction] === "show" ? "" : "none";
                    }
                }

                actionDropdownMenu.setAttribute("data-action-menuitem-handled", true);
            });

            // NOTE: The keyup.td event won't work. Using jQuery, the keyup.td does work.
            aEl.addEventListener("keyup", (aE) => {
                // NOTE: Workaround for Firefox in Linux. ¬¬
                // All of this nonsense due to web developers being DUMBASSES!!!
                if (aE.keyCode === 27) { // Escape key.
                    const dropdown = bootstrap.Dropdown.getOrCreateInstance(aE.target);
                    dropdown && dropdown.hide();
                }
            });

            aEl.setAttribute("data-action-menu-handled", true);
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
        initComplete: function() {
            LoadingOverlay.classList.add("d-none");
            PseudoBody.classList.replace("hide", "show");
        }
    };

    class KB_MainClass {
        constructor() {
            this._currentCategory = ALL_CATEGORIES;
            this._mainScrollPosition = 0;
            // NOTE: This is set only when the "currentCategoryName" URL parameter is set.
            this._ignoreDefaultCategory = false;
            this._currentSection = "table";
            this._URLParams = new URLSearchParams(window.location.search);
            this.delayedSetElementsOffset = Ody_Core.debounce(this.doSetElementsOffset, 50);

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
            //     default_category:
            //         Used to set the default category when the main index page is loaded.
            if (this._URLParams.has("inlinePageURL") && this._URLParams.has("inlinePageHandler")) {
                this.loadPageInline();
            }

            if (this._URLParams.has("currentCategoryName")) {
                this._currentCategory = this._URLParams.get("currentCategoryName");

                Ody_Core.clearQueryString();
                this._ignoreDefaultCategory = true;
            }

            this.filterTable = Ody_Core.debounce(this.doFilter);
            // NOTE: Needs the time out. Otherwise, it wouldn't focus the freaking input field!!!
            // Check if a greater amount of table elements affects this.
            this.focusSearchInput = Ody_Core.debounce(() => {
                InputSearch.focus();
            }, 500);


            // Replicate the behavior of the DataTables native table length chooser.
            KB_Table.page.len(this.getPref("table_page_length")).draw();
            TableLengthChooserSelect.value = this.getPref("table_page_length");
            KB_Table.column("category:name").visible(this.getPref("display_cat_col"));
            KB_Table.column("sub-category:name").visible(this.getPref("display_subcat_col"));

            if (!this._URLParams.has("inlinePageURL")) {
                this.displayMainSection("table");
            }

            if ("Ody_SmoothScroll" in window) {
                Ody_SmoothScroll.topElementOffset = TopNavbar.offsetHeight;
                Ody_SmoothScroll.initLinksHandler();
            }

            this.setActiveCategory();
            this.delayedSetElementsOffset();
            Ody_Utils.initializeBaseBootstrapComponents();
            this.attachListeners();
        }

        attachListeners() {
            window.addEventListener("resize", () => {
                this.delayedSetElementsOffset();
            }, false);

            // NOTE: The elements handled by the following listeners are the ones added by the
            // DataTables table. Adding these two listeners instead of one for each of the
            // thousands of elements a table has seems to be more performant.
            // WARNING: Pay attention not to add siblings to the handled elements. It WILL
            // screw up the event.target references that are needed.
            Ody_Core.arrayEach(["click", "auxclick"], (aEvent) => {
                PseudoBody.addEventListener(aEvent, (aE) => {
                    const target = aE.target;
                    const classList = target.classList;

                    if (classList.contains("KB_title-link")) {
                        this.handleTitleClick(aE);
                    } else if (classList.contains("dropdown-item")) {
                        const actionMenu = aE.target.parentNode.parentNode;

                        if (actionMenu.hasAttribute("data-handler")) {
                            this.actionClick(actionMenu, null, aE.target.getAttribute("data-action"));
                        }
                    }
                });
            });

            Ody_Core.arrayEach(PrefHandlers, (aEl) => {
                switch (aEl.tagName.toLowerCase()) {
                    case "button":
                    case "a":
                    case "input":
                        aEl.addEventListener("click", this.handlePreferences.bind(this));
                        break;
                    case "select":
                        aEl.addEventListener("change", this.handlePreferences.bind(this));
                        break;
                }
            });

            IndexModal.addEventListener("show.bs.modal", () => {
                Ody_Core.arrayEach(PrefHandlers, (aEl) => {
                    const pref = aEl.getAttribute("data-pref");
                    switch (pref) {
                        case "display_cat_col":
                        case "display_subcat_col":
                        case "open_pdf_external":
                            aEl.checked = Ody_Prefs[pref];
                            break;
                        case "table_page_length":
                            aEl.value = Ody_Prefs[pref];
                            break;
                    }
                });
            });

            // Replicate the DataTables search function used by its native search input.
            for (let i = SEARCH_INPUT_EVENTS.length - 1; i >= 0; i--) {
                InputSearch.addEventListener(SEARCH_INPUT_EVENTS[i],
                    this.inputSearchEventHandler.bind(this), false);
            }

            Ody_Core.arrayEach(SidebarCatButtons, (aEl) => {
                Ody_Core.arrayEach(["click", "auxclick"], (aE) => {
                    aEl.addEventListener(aE, this.setActiveCategory.bind(this));
                });
            });

            Ody_Core.arrayEach(TopNavbarItems, (aEl) => {
                Ody_Core.arrayEach(["click", "auxclick"], (aE) => {
                    aEl.addEventListener(aE, this.handleNavItemsClick.bind(this));
                });
            });

            TableLengthChooserSelect.addEventListener("change", (aE) => { // jshint ignore:line
                KB_Table.page.len(aE.target.value).draw();

                return false;
            }, false);

            KB_Table.on("length.dt.DT", (e, s, len) => {
                if (TableLengthChooserSelect.value !== len) {
                    TableLengthChooserSelect.value = len;
                }
            });

            ResetSettingsButton.addEventListener("click", () => {
                Ody_Prefs.clear();
                return false;
            }, false);
        }

        doSetElementsOffset() {
            Ody_Utils.setElementsOffset(TopNavbar, NavbarOffsetElements);
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
                case "KB_index-modal-button":
                    const modal = bootstrap.Modal.getOrCreateInstance(IndexModal);
                    modal && modal.show();
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
                            Ody_Core.loadInNewTab("");
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
                Ody_Core.toggleElementsClasses(MainContentWrapper, [], CONTENT_WRAPPER_CLASSES);
                Ody_Core.toggleElementsClasses(
                    SidebarWrapper,
                    // Remove the d-none class from the sidebar wrapper so it can be shown...
                    ["d-none"],
                    // ...add back all layout classes to the sidebar and content wrappers so
                    // they can be laid out depending on the view port size.
                    SIDEBAR_WRAPPER_CLASSES
                );
            } else { // Hide sidebar.
                Ody_Core.toggleElementsClasses(MainContentWrapper, CONTENT_WRAPPER_CLASSES, ["col-12"]);
                Ody_Core.toggleElementsClasses(
                    SidebarWrapper,
                    // Remove all layout classes from the sidebar and content wrappers and
                    // add only the col-12 class to the content wrapper so it occupys the
                    // full width.
                    SIDEBAR_WRAPPER_CLASSES,
                    // ...add the d-none class to hide sidebar wrapper...
                    ["d-none"]
                );
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
                        this.clearSearchInput(aE.target);
                    } else {
                        if (triggerSearch) {
                            this.filterTable(aE.target.value.trim());
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
            if (aE && aE.target) {
                searchtext = aE.target.getAttribute("data-cat");

                switch (aE.button) {
                    case 1:
                        let query = new URLSearchParams("");
                        query.set("currentCategoryName", searchtext);
                        Ody_Core.loadInNewTab(`?${query.toString()}`);
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
                searchtext = (this.getPref("default_category") && !this._ignoreDefaultCategory) ?
                    this.getPref("default_category") :
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
            for (let i = SidebarCatButtons.length - 1; i >= 0; i--) {
                if (SidebarCatButtons[i].getAttribute("data-cat") === aCategory) {
                    SidebarCatButtons[i].classList.add("active");
                    currentCatButton = SidebarCatButtons[i];
                } else {
                    SidebarCatButtons[i].classList.remove("active");
                }
            }

            if (currentCatButton !== null && !!currentCatButton.getAttribute("data-parent")) {
                let collapse = bootstrap.Collapse.getOrCreateInstance(
                    document.querySelector(currentCatButton.getAttribute("data-parent"))
                );
                collapse && collapse.show();
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

            if (aCategory === ALL_CATEGORIES) {
                KB_Table.columns().search("").draw();
            } else {
                let [cat, sub] = aCategory.split("|");

                cat && KB_Table.column("category:name").search("^" + Ody_Core.escapeRegExp(cat) + "$",
                    true, false, true).draw();
                sub && KB_Table.column("sub-category:name").search("^" + Ody_Core.escapeRegExp(sub) + "$",
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
                            KB_Table.column("category:name").search("^" + Ody_Core.escapeRegExp(cat),
                                true, false, true).draw();
                        }

                        if (sub && sub.length > 1) {
                            KB_Table.columns().search("");
                            KB_Table.column("sub-category:name").search("^" + Ody_Core.escapeRegExp(sub),
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
                            KB_Table.column("handler:name").search("^" + Ody_Core.escapeRegExp(handler),
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
         * NOTE: Never, EVER AGAIN, implement animations to show/hide sections.
         *
         * @param {Object} aEl - String representing the desired element.
         */
        displayMainSection(aEl) {
            switch (aEl) {
                case "content":
                    this.toggleSidebar(false);
                    this._currentSection = "content";
                    document.documentElement.scrollTop = 0;

                    TableWrapper.classList.add("d-none");
                    InputSearchGroup.classList.add("d-none");
                    TableLengthChooserForm.classList.add("d-none");

                    InlineContent.classList.remove("d-none");
                    ReloadButton.classList.remove("d-none");
                    this._URLParams.has("inlinePageHandler") &&
                        this._URLParams.get("inlinePageHandler") === "md" &&
                        EditButton.classList.remove("d-none");
                    break;
                case "table":
                    TableWrapper.classList.remove("d-none");
                    this.toggleSidebar(true);
                    this._currentSection = "table";
                    InlineContent.innerHTML = "";
                    this._URLParams = new URLSearchParams("");

                    InlineContent.classList.add("d-none");
                    ReloadButton.classList.add("d-none");
                    EditButton.classList.add("d-none");
                    InputSearchGroup.classList.remove("d-none");
                    TableLengthChooserForm.classList.remove("d-none");

                    this.focusSearchInput();
                    // When going back to the index, restore the scroll position.
                    document.documentElement.scrollTop = this._mainScrollPosition;
                    break;
            }
        }

        /**
         * Load a Markdown or reStructuredText page inline.
         */
        loadPageInline() {
            let self = this;
            fetch("/handle_inline_content", {
                    method: "POST",
                    cache: "no-cache",
                    body: this._URLParams.toString()
                })
                .then((aResponse) => {
                    return aResponse.text();
                })
                .then((aData) => {
                    InlineContent.innerHTML = aData;

                    try {
                        self.displayMainSection("content");
                    } finally {
                        self.setupHTMLInlineContent();
                    }

                })
                .catch(aError => console.error(aError));
        }

        /**
         * Open links inside pages loaded inline in a new tab.
         *
         * @param {Object} aE - Event that triggered the function.
         */
        contentLinkLoadInNewTab(aE) {
            aE.preventDefault();
            Ody_Core.loadInNewTab(aE.target.getAttribute("href"));
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

            window.setTimeout(() => {
                Ody_Core.highlightAllCodeBlocks(InlineContent);
            }, 10);
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
                        case "display_cat_col":
                        case "display_subcat_col":
                        case "open_pdf_external":
                            Ody_Prefs[pref] = !Ody_Prefs[pref];

                            pref === "display_cat_col" &&
                                KB_Table.column("category:name").visible(Ody_Prefs.display_cat_col);
                            pref === "display_subcat_col" &&
                                KB_Table.column("sub-category:name").visible(Ody_Prefs.display_subcat_col);
                            break;
                        case "default_category":
                            Ody_Prefs[pref] = this._currentCategory;
                            break;
                    }
                    break;
                case "change":
                    switch (pref) {
                        case "table_page_length":
                            Ody_Prefs[pref] = aE.currentTarget.value;
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

            let href = aE.target.getAttribute("data-href");
            let handler = aE.target.getAttribute("data-handler");
            let source = aE.target.getAttribute("data-source");
            let title = aE.target.textContent;

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
                        Ody_Core.loadInNewTab(`?${this._URLParams.toString()}`);
                    }
                    break;
                case LOAD_IN_NEW_TAB:
                    this._URLParams = new URLSearchParams("");

                    if (handler === "epub" || (handler === "pdf" && this.getPref("open_pdf_external"))) {
                        this.actionClick(null, href, "file", aE);
                    } else {
                        Ody_Core.loadInNewTab(href);
                    }
                    break;
            }

            aE.stopPropagation();
        }

        /**
         * Action when clicking an action icon inside the dropdown menus attached to the table icons.
         *
         * @param {Object} aE           - Event that triggered the function.
         * @param {String} aActionMenu  - The dropdown menu where the data is stored.
         * @param {String} aHref        - The relative path to a file.
         * @param {String} aAction      - The type of action that will be used to decide what to do with the path.
         *
         * @return {Boolean} Stop propagation.
         */
        actionClick(aActionMenu, aHref, aAction, aE) {
            aE && aE.preventDefault();

            if (aActionMenu) {
                if (aAction === "new_tab") {
                    switch (this.getLoadActionFromHandler(aActionMenu.getAttribute("data-handler"))) {
                        case LOAD_INLINE:
                            // NOTE: Create a new query and leave the current one untouched.
                            let query = new URLSearchParams("");
                            query.set("inlinePageURL", aActionMenu.getAttribute("data-href"));
                            query.set("inlinePageHandler", aActionMenu.getAttribute("data-handler"));
                            query.set("inlinePageSource", aActionMenu.getAttribute("data-source"));
                            query.set("inlinePageTitle", aActionMenu.getAttribute("data-title"));
                            Ody_Core.loadInNewTab(`?${query.toString()}`);
                            break;
                        case LOAD_IN_NEW_TAB:
                            Ody_Core.loadInNewTab(aActionMenu.getAttribute("data-href"));
                            break;
                    }
                } else if (aAction === "source_url") {
                    Ody_Core.loadInNewTab(aActionMenu.getAttribute("data-source"));
                } else if (aAction === "file" || aAction === "folder") {
                    this.actionClickAjaxCall(aActionMenu.getAttribute("data-href"), aAction);
                }

                // NOTE: Close the menu manually so I can return false at the end so the f*cking
                // page will not scroll to the f*cking top.
                const dropdown = bootstrap.Dropdown.getOrCreateInstance(aActionMenu);
                dropdown && dropdown.hide();
                // aActionMenu.dropdown("hide");
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
            const formData = new FormData();
            formData.append("href", aHref);
            formData.append("action", aAction);
            fetch("/handle_local_files", {
                    method: "POST",
                    cache: "no-cache",
                    body: formData
                })
                .catch(aError => console.error(aError));
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
         * Reset index scroll position.
         */
        resetScrollPosition() {
            document.documentElement.scrollTop = this._mainScrollPosition = 0;
        }

        /**
         * Get preference.
         *
         * Preferences passed as URL parameters have precedence over the stored in localStorage.
         *
         * @param {String} aKey - A preference key.
         *
         * @return {String|Boolean} A preference value.
         */
        getPref(aKey) {
            if (this._URLParams.has(aKey)) {
                return decodeURIComponent(this._URLParams.get(aKey));
            }

            return Ody_Prefs[aKey];
        }
    }

    if ("Ody_Debugger" in window) {
        Ody_Debugger.wrapObjectMethods({
            KB_MainClass: KB_MainClass
        });
    }

    KB_Table = $Table.DataTable(TableOptions);
    KB_Main = new KB_MainClass();
})();

/* global Ody_Utils,
          Ody_Core,
          Ody_Debugger,
          Ody_SmoothScroll,
          Ody_PrefsClass,
          bootstrap
 */
