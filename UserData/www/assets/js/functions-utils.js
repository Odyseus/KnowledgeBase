"use strict"; // jshint ignore:line

var Ody_Utils = null;

(function() {
    const ElementsOffsetParams = Object.freeze({
        extraPercent: 0,
        offsetPosition: "Top",
        margin: true,
        padding: false
    });

    class UtilsClass {
        constructor() {
            this._toTopOfPageBtn = document.getElementById("to-top-of-page");

            this.OffsetPosition = {
                top: "Top",
                right: "Right",
                bottom: "Bottom",
                left: "Left"
            };

            this.delayedToggleBackToTopButtonVisibility = this.debounce(
                this.toggleBackToTopButtonVisibility, 200, true, true);

            if (this._toTopOfPageBtn) {
                this._toTopOfPageBtn.addEventListener("click", (aE) => { // jshint ignore:line
                    this.smoothScrollToTop();
                    return false;
                }, false);

                // The call to `delayedToggleBackToTopButtonVisibility` uses debounce to
                // avoid overhead when scrolling.
                window.addEventListener("scroll", (aE) => { // jshint ignore:line
                    this.delayedToggleBackToTopButtonVisibility();
                }, false);
            }
        }

        /**
         * Set elements top/right/bottom/left padding and/or margin (offset) based on another element height.
         *
         * @param {Object} aOffsetElement - The DOMM element from which to calculate the offset.
         * @param {Map}  aElements        - A map of elements to which to apply the offset.
         *                                Each key of the map should be a DOM element and their values
         *                                should be an object with options (see ElementsOffsetParams).
         */
        setElementsOffset(aOffsetElement, aElements) {
            let offset = parseInt(this.getElementOuterHeight(aOffsetElement, true), 10);

            for (let [el, options] of aElements) {
                let params = this.parseParams(options, ElementsOffsetParams);
                let extraPercent = (Math.max(0, Math.min(parseInt(params.extraPercent, 10), 100)) / 100) + 1.0;
                offset = Math.ceil(offset * extraPercent);

                if (params.margin) {
                    el.style["margin" + params.offsetPosition] = offset + "px";
                }

                if (params.padding) {
                    el.style["padding" + params.offsetPosition] = offset + "px";
                }
            }
        }

        /**
         * Get the outer height of an element.
         *
         * @param {Object}  aEl            - The DOM element to calculate the height of.
         * @param {Boolean} aIncludeMargin - Whether to include the margin when calculating aEl's height.
         *
         * @return {Number} The calculated aEl's height.
         */
        getElementOuterHeight(aEl, aIncludeMargin = false) {
            let height = aEl.offsetHeight;

            if (aIncludeMargin) {
                let style = getComputedStyle(aEl);
                height += parseInt(style.marginTop, 10) + parseInt(style.marginBottom, 10);
            }

            return height;
        }

        loadInNewTab(aHref) {
            window.open(decodeURIComponent(aHref), "_blank");
        }

        /**
         * Toggle visibility of the Back to top button if exists.
         */
        toggleBackToTopButtonVisibility() {
            if (this._toTopOfPageBtn) {
                if (window.scrollY > 100) {
                    this._toTopOfPageBtn.style.display = "block";
                } else {
                    this._toTopOfPageBtn.style.display = "none";
                }
            }
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
        debounce(aFunc, aDelay = 200, aImmediate = false, aImmediateDelayed = false) {
            let timeout,
                oneOff;

            return function() {
                let ctx = this,
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
        clearQueryString() {
            let newurl = window.location.protocol + "//" + window.location.host + window.location.pathname;
            window.history.pushState && window.history.pushState({
                path: newurl
            }, "", newurl);
        }

        /**
         * Smoothly scroll the page to the top.
         */
        smoothScrollToTop() {
            // Forget the browser specific garbage. I don't need the headache.
            if (window.requestAnimationFrame) {
                try {
                    let currentScroll = document.documentElement.scrollTop || document.body.scrollTop;
                    if (currentScroll > 0) {
                        window.requestAnimationFrame(this.smoothScrollToTop.bind(this));
                        window.scrollTo(0, currentScroll - (currentScroll / 5));
                    }
                } catch (aErr) {
                    console.error(aErr);
                    window.scrollTo(0, 0);
                }
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
        escapeRegExp(aString) {
            return aString.replace(/[.*+\-?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
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
        parseParams(aParams, aDefaults, aAllowExtras) {
            let ret = {};

            if (!aParams) {
                return Object.assign({}, aDefaults);
            }

            for (let prop in aParams) {
                if (!(prop in aDefaults) && !aAllowExtras) {
                    throw new Error('Unrecognized parameter "' + prop + '"');
                }
                ret[prop] = aParams[prop];
            }

            for (let prop in aDefaults) {
                if (!(prop in aParams)) {
                    ret[prop] = aDefaults[prop];
                }
            }

            return ret;
        }

    }

    // NOTE: I only use the debugger in the functions-index.js file.
    if (typeof Ody_Debugger === "object") {
        Ody_Debugger.wrapObjectMethods({
            UtilsClass: UtilsClass
        });
    }

    Ody_Utils = new UtilsClass();
})();

/* global Ody_Debugger
 */

/* exported Ody_Utils
 */
