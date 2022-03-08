/**
 * Core utility functions.
 *
 * NOTE: No other modules required.
 */
(function(global, factory) {
    if (typeof exports === "object" && typeof module !== "undefined") {
        module.exports = factory();
    } else if (typeof define === "function" && define.amd) {
        define(factory);
    } else {
        global = typeof globalThis !== "undefined" ? globalThis : global || self;
        global.Ody_Core = factory();
    }
}((typeof window !== "undefined" ? window : this), (function() { // jshint ignore:line
    "use strict"; // jshint ignore:line

    const HLJS_LOG_TIMEOUT_DELAY = 5000;
    // NOTE: Defining it here this way to avoid depending on the preferences.js or debugger.js modules.
    const DEBUGGER_ENABLED = "localStorage" in window ?
        window.localStorage.getItem("debugger_enabled") === "true" :
        false;

    /**
     * Highlight a code block with Highlight.js.
     *
     * NOTE: The DOMParser() trick (<3 https://stackoverflow.com/a/47140708) for security reasons
     * and to avoid having to clean up code blocks of HTML files that contains already highlighted
     * code blocks.
     *
     * @param {Object} aEl - The element to highlight.
     */
    function highlightCodeBlock(aEl) {
        const html = new DOMParser().parseFromString(aEl.innerHTML, "text/html");
        aEl.textContent = html.body.textContent;
        hljs.highlightElement(aEl);

        if (DEBUGGER_ENABLED) {
            if ("__HLJS_BLOCKS_COUNTER__" in window) {
                window.__HLJS_BLOCKS_COUNTER__++;
            } else {
                window.__HLJS_BLOCKS_COUNTER__ = 1;
            }

            if ("__HLJS_BLOCKS_COUNTER_LOGGER__" in window) {
                window.clearTimeout(window.__HLJS_BLOCKS_COUNTER_LOGGER__);
            }

            if (!("__HLJS_BLOCKS_START_TIME__" in window)) {
                window.__HLJS_BLOCKS_START_TIME__ = Date.now();
            }

            window.__HLJS_BLOCKS_COUNTER_LOGGER__ = window.setTimeout(() => {
                // NOTE: Subtracting HLJS_LOG_TIMEOUT_DELAY to remove the time offset added by the time out itself.
                // Divided by 1000 to convert milliseconds to seconds.
                const elapsed = (Date.now() - HLJS_LOG_TIMEOUT_DELAY - window.__HLJS_BLOCKS_START_TIME__) / 1000;
                console.info(
                    `Highlight.js highlighted ${window.__HLJS_BLOCKS_COUNTER__} code blocks in ${elapsed} seconds.`
                );
                delete window.__HLJS_BLOCKS_COUNTER_LOGGER__;
                delete window.__HLJS_BLOCKS_START_TIME__;
                delete window.__HLJS_BLOCKS_COUNTER_LOGGER__;
            }, HLJS_LOG_TIMEOUT_DELAY);
        }
    }

    /**
     * Highlight all code blocks inside a container.
     *
     * @param {Object} aContainer - The DOM element where to make the query.
     * @param {String} aSelectors - A string containing one or more selectors to match
     *                              against. This string must be a valid CSS selector
     *                              string; if it's not, a SyntaxError exception is thrown.
     */
    function highlightAllCodeBlocks(aContainer = document.documentElement, aSelectors = "pre > code") {
        // This has a great performance cost because I use highlight.js with ALL languages that it supports.
        // The only way that I was able to fix this completely is by defining the window
        // property (__HLJS_LANGUAGES__) in pages that have a large amount of code blocks
        // to be used with hljs.configure().
        // A cookie was out of the picture because I hate them. And a global variable was also not
        // considered because JavaScript is the most retarded language that ever existed.
        // PERFORMANCE NOTE: On a page with 60 code blocks:
        // - WITHOUT using hljs.configure() to specify languages the page loads in aprox. 7 seconds.
        // - USING hljs.configure() to specify 2 languages the page loads in a fraction of a second.
        if (typeof hljs === "object") {
            let selectors = aSelectors;

            if ("__HLJS_LANGUAGES__" in window) {
                hljs.configure({
                    languages: window.__HLJS_LANGUAGES__
                });
            }

            if ("__HLJS_SELECTORS__" in window) {
                selectors = window.__HLJS_SELECTORS__;
            }

            if (DEBUGGER_ENABLED) {
                window.__HLJS_BLOCKS_COUNTER__ = 0;
                window.__HLJS_BLOCKS_START_TIME__ = Date.now();
            }

            const codeBlocks = aContainer.querySelectorAll(selectors);
            arrayEach(codeBlocks, (aEl) => {
                window.setTimeout(highlightCodeBlock, 10, aEl);
            });
        }
    }

    /**
     * try/catch/finally wrapper.
     *
     * NOTE: Extracted from the Cinnamon's original docstring (js/misc/util.js).
     * Try-catch can degrade performance in the function scope it is
     * called in. By using a wrapper for try-catch, the function scope is
     * reduced to the wrapper and not a potentially performance critical
     * function calling the wrapper. Use of try-catch in any form will
     * be slower than writing defensive code.
     *
     * @param {Function} aTryCB     - The function to wrap in a try-catch block.
     * @param {Function} aCatchCB   - The function to call on error.
     * @param {Function} aFinallyCB - The function to always call.
     *
     * @return {Any} The output of whichever callback gets called.
     */
    function tryFn(aTryCB, aCatchCB, aFinallyCB) {
        try {
            return aTryCB();
        } catch (aErr) {
            if (typeof aCatchCB === "function") {
                return aCatchCB(aErr);
            }
        } finally {
            if (typeof aFinallyCB === "function") {
                return aFinallyCB();
            }
        }

        // NOTE: To shut the hell up warning!!!
        return undefined;
    }

    /**
     * Replacement for jQuery.ready().
     *
     * @return {Promise} A promise that resolves after page finish loading.
     */
    function documentReady() { // jshint ignore:line
        return new Promise((aResolve, aReject) => { // jshint ignore:line
            function completed() {
                document.removeEventListener("DOMContentLoaded", completed);
                window.removeEventListener("load", completed);
                aResolve();
            }

            if (document.readyState === "complete" ||
                (document.readyState !== "loading" &&
                    !document.documentElement.doScroll)) {
                window.setTimeout(aResolve, 10);
            } else {
                document.addEventListener("DOMContentLoaded", completed);
                window.addEventListener("load", completed);
            }
        });
    }

    /**
     * Toggle elements classes.
     *
     * @param {String} aSelectors       - A string containing one or more selectors to match
     *                                    against. This string must be a valid CSS selector
     *                                    string; if it's not, a SyntaxError exception is thrown.
     * @param {Array}  aClassesToRemove - description
     * @param {Array}  aClassesToAdd    - description
     */
    function toggleElementsClasses(aSelectorsOrElements, aClassesToRemove, aClassesToAdd) { // jshint ignore:line
        // NOTE: Clean up empty strings from class arrays or it will throw error since
        // an empty strings isn't a valid CSS selector.
        aClassesToRemove = aClassesToRemove.filter(e => e);
        aClassesToAdd = aClassesToAdd.filter(e => e);

        if (typeof aSelectorsOrElements === "string") {
            const els = document.querySelectorAll(aSelectorsOrElements);

            arrayEach(els, (aEl) => {
                _toggleClasses(aEl, aClassesToRemove, aClassesToAdd);
            });
        } else {
            _toggleClasses(aSelectorsOrElements, aClassesToRemove, aClassesToAdd);
        }
    }

    function _toggleClasses(aElement, aClassesToRemove, aClassesToAdd) {
        tryFn(() => {
            aElement && aClassesToRemove.length && aElement.classList.remove(...aClassesToRemove);
        }, aErr => console.error(aErr));

        window.setTimeout(() => {
            tryFn(() => {
                aElement && aClassesToAdd.length && aElement.classList.add(...aClassesToAdd);
            }, aErr => console.error(aErr));
        }, 20);
    }

    /**
     * Load a URL into a new tab.
     *
     * @param {String} aHref - The URL to open in a new tab.
     */
    function loadInNewTab(aHref) { // jshint ignore:line
        window.open(decodeURIComponent(aHref), "_blank");
    }

    /**
     * Utility function to prevent "rapid fire" of functions.
     *
     * Correct usage:
     *
     * let delayedCall = debounce(() => {
     *     console.info("Debounced function called.");
     * }, 200);
     *
     * delayedCall();
     *
     * @param {Function} aFunc             - The function to debounce.
     * @param {Number}   aDelay            - Delay in milliseconds to wait for aFunc to be executed.
     * @param {Boolean}  aImmediate        - Whether to execute aFunc immediatelly upon the first call.
     * @param {Boolean}  aImmediateDelayed - Whether the first immediate call should be delayed.
     *
     * @return {Function} aFunc wrapped in a debounce function.
     */
    function debounce(aFunc, aDelay = 200, aImmediate = false, aImmediateDelayed = false) {
        let timeout,
            oneOff;

        return function() {
            const ctx = this,
                args = arguments;

            if (aImmediate && !timeout) {
                if (aImmediateDelayed) {
                    oneOff = window.setTimeout(() => {
                        aFunc.apply(ctx, args);
                        window.clearTimeout(oneOff);
                    }, aDelay);
                } else {
                    aFunc.apply(ctx, args);
                }
            }

            window.clearTimeout(timeout);
            timeout = window.setTimeout(() => {
                timeout = null;
                aFunc.apply(ctx, args);
            }, aDelay);
        };
    }

    /**
     * Clear current page URL of all queries.
     */
    function clearQueryString() { // jshint ignore:line
        const newurl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.pushState && window.history.pushState({
            path: newurl
        }, "", newurl);
    }

    /**
     * Smoothly scroll the page to the top.
     */
    function smoothScrollToTop() { // jshint ignore:line
        // Forget the browser specific garbage. I don't need the headache.
        if ("scroll" in window) {
            tryFn(() => {
                window.scroll({
                    top: 0,
                    behavior: "smooth"
                });

            }, (aErr) => {
                console.error(aErr);
                window.scrollTo(0, 0);
            });
        } else if ("requestAnimationFrame" in window) {
            tryFn(() => {
                const currentScroll = document.documentElement.scrollTop || document.body.scrollTop;
                if (currentScroll > 0) {
                    window.requestAnimationFrame(smoothScrollToTop);
                    window.scrollTo(0, currentScroll - (currentScroll / 5));
                }
            }, (aErr) => {
                console.error(aErr);
                window.scrollTo(0, 0);
            });
        } else {
            window.scrollTo(0, 0);
        }
    }

    /**
     * Escape string to be able to use it in a regular expression.
     *
     * Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Escaping
     *
     * @param {String} aString - String to escape.
     *
     * @return {String} Escaped string.
     */
    function escapeRegExp(aString) { // jshint ignore:line
        return String(aString).replace(/[.*+\-?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
    }

    /**
     * Parse parameters.
     *
     * Examines aParams and fills in default values from aDefaults for any properties in
     * aDefaults that don't appear in aParams. If aAllowExtras is not true, it will throw
     * an error if aParams contains any properties that aren't in aDefaults.
     *
     * If aParams is null, this returns the values from aDefaults.
     *
     * @param {Object}  aParams      - Caller-provided parameter object, or null.
     * @param {Object}  aDefaults    - Function-provided defaults object.
     * @param {Boolean} aAllowExtras - Whether or not to allow properties not in aDefaults.
     *
     * @return {Object} A new object, containing the merged parameters from aParams and aDefaults.
     */
    function parseParams(aParams, aDefaults, aAllowExtras) {
        const ret = {};

        if (!aParams) {
            return Object.assign({}, aDefaults);
        }

        for (const prop in aParams) {
            if (!(prop in aDefaults) && !aAllowExtras) {
                throw new Error('Unrecognized parameter "' + prop + '"');
            }
            ret[prop] = aParams[prop];
        }

        for (const prop in aDefaults) {
            if (!(prop in aParams)) {
                ret[prop] = aDefaults[prop];
            }
        }

        return ret;
    }

    /**
     * Find elements with duplicated IDs.
     *
     * @param {Boolean} aInform - Inform about no duplicates found.
     */
    function findDuplicatedIDs(aInform = false) {
        const idsSet = new Set();
        const duplicatedIDs = [];
        const all = document.querySelectorAll("[id]");

        arrayEach(all, (aEl) => {
            const id = aEl.id;

            if (idsSet.has(id)) {
                duplicatedIDs.push(id);
            } else {
                idsSet.add(id);
            }
        });

        if (duplicatedIDs.length > 0) {
            console.warn("Duplicated IDs found: " + duplicatedIDs.length + "\n" + duplicatedIDs.join("\n"));
        } else {
            aInform && console.info("No duplicated IDs were found.");
        }
    }

    /**
     * An iterator function to iterate over arrays. Explicitly returning false will break iteration.
     *
     * @param {Array}    aObj      - Array to be iterated.
     * @param {Function} aCallback - The function to call on every iteration. The arguments
     *                               passed to aCallback will be (Element, Index, Length).
     * @param {Boolean}  aReverse  - Whether to iterate in reverse.
     */
    function arrayEach(aObj, aCallback, aReverse = false) {
        const iLen = aObj.length;

        if (aReverse) {
            for (let i = iLen - 1; i > -1; i--) {
                if (aCallback.call(null, aObj[i], i, iLen) === false) {
                    break;
                }
            }
        } else {
            let i = 0;
            for (; i < iLen; i++) {
                if (aCallback.call(null, aObj[i], i, iLen) === false) {
                    break;
                }
            }
        }
    }

    /**
     * An iterator function to iterate over objects. Explicitly returning false will break iteration.
     *
     * @param  {Object}   aObj      - Object to be iterated.
     * @param  {Function} aCallback - The function to call on every iteration. The arguments passed
     *                                to aCallback will be (Key, Value, Index, Length).
     */
    function objectEach(aObj, aCallback) {
        const keys = Object.keys(aObj);
        const iLen = keys.length;
        let i = 0;
        for (; i < iLen; i++) {
            const key = keys[i];
            if (aCallback.call(null, key, aObj[key], i, iLen) === false) {
                break;
            }
        }
    }

    class BackToTopHandlerClass {
        constructor() {
            // NOTE: In case that the button has another ID and/or it's inserted dynamically into
            // the page, I added a setter/getter so it is easy to handle it and to initialize it.
            this.toTopOfPageButton = document.getElementById("to-top-of-page");

            this.delayedToggleBackToTopButtonVisibility = debounce(
                this.toggleBackToTopButtonVisibility, 200, true, true);

            this.handleToTopOfPageButton();
        }

        get toTopOfPageButton() {
            return this._toTopOfPageButton;
        }

        set toTopOfPageButton(aVal) {
            this._toTopOfPageButton = aVal;
        }

        /**
         * Handle to Back to top button.
         *
         * Adds a click listener to perform its action and a scroll listener to control
         * its visibility.
         *
         * NOTE: The data-button-handled attribute is to avoid adding a trillion times the listeners.
         */
        handleToTopOfPageButton() {
            if (this._toTopOfPageButton && !this._toTopOfPageButton.getAttribute("data-button-handled")) {
                this._toTopOfPageButton.addEventListener("click", () => {
                    smoothScrollToTop();
                    return false;
                }, false);

                // The call to `delayedToggleBackToTopButtonVisibility` uses debounce to
                // avoid overhead when scrolling.
                window.addEventListener("scroll", this.delayedToggleBackToTopButtonVisibility.bind(this), false);

                this._toTopOfPageButton.setAttribute("data-button-handled", true);
            }
        }

        /**
         * Toggle visibility of the Back to top button if exists.
         */
        toggleBackToTopButtonVisibility() {
            if (this._toTopOfPageButton) {
                if (window.scrollY > 100) {
                    this._toTopOfPageButton.style.display = "block";
                } else {
                    this._toTopOfPageButton.style.display = "none";
                }
            }
        }
    }

    documentReady().then(() => {
        /**
         * Prevent empty links from modifying URL bar.
         */
        document.addEventListener("click", function emptyLinksHandler(aE) {
            const source = aE.target;

            if (source &&
                source.tagName.toLowerCase() === "a" &&
                source.getAttribute("href") === "#"
            ) {
                aE.preventDefault();
            }
        }, false);
    });

    const BackToTopHandler = new BackToTopHandlerClass();
    const delayedToggleBackToTopButtonVisibility = BackToTopHandler.delayedToggleBackToTopButtonVisibility;

    return {
        arrayEach,
        clearQueryString,
        debounce,
        delayedToggleBackToTopButtonVisibility,
        documentReady,
        escapeRegExp,
        findDuplicatedIDs,
        highlightAllCodeBlocks,
        highlightCodeBlock,
        loadInNewTab,
        objectEach,
        parseParams,
        smoothScrollToTop,
        toggleElementsClasses,
        tryFn,
    };
})));

/* global define,
          globalThis
 */

/* jshint browser: true */
