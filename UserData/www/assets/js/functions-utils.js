"use strict"; // jshint ignore:line
var KB_Utils = null;

class KB_UtilsClass {
    constructor() {
        this._toTopOfPageBtn = document.getElementById("to-top-of-page");
        this.delayedToggleBackToTopButtonVisibility = this.debounce(
            this.toggleBackToTopButtonVisibility, 200, true, true);

        this._toTopOfPageBtn && this._toTopOfPageBtn.addEventListener("click", (aE) => { // jshint ignore:line
            this.smoothScrollToTop();
            return false;
        }, false);

        // The call to `delayedToggleBackToTopButtonVisibility` uses debounce to
        // avoid overhead when scrolling.
        window.addEventListener("scroll", (aE) => { // jshint ignore:line
            this.delayedToggleBackToTopButtonVisibility();
        }, false);
    }

    loadInNewTab(aHref) {
        window.open(aHref, "_blank");
    }

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

    clearQueryString() {
        let newurl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.pushState && window.history.pushState({
            path: newurl
        }, "", newurl);
    }

    ends_with(aStr1, aStr2) {
        return aStr1.slice(-aStr2.length) == aStr2;
    }

    smoothScrollToTop() {
        // THIS IS GARBAGE!!! The animation is jerky on Firefox 62+ (ANOTHER GARBAGE!!!).
        // $("html, body").animate({
        //     scrollTop: 0
        // }, 400);

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

    smoothScrollInternalTarget(aTopEl, aE) {
        aE.preventDefault();
        KB_Utils.delayedToggleBackToTopButtonVisibility();
        let href = aE.currentTarget.getAttribute("href");

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
                            (aTopEl ?
                                // NOTE: I add targetElement.offsetHeight in both instances so the
                                // scroll destination is separated from the edge of the top of the
                                // page or top element.
                                aTopEl.offsetHeight + targetElement.offsetHeight :
                                targetElement.offsetHeight)
                    }, 400);
                }
            } catch (aErr) {
                console.error(aErr);
            }
        }
    }
}

// NOTE: I only use the debugger in the functions-index.js file.
if (typeof KB_Debugger === "object") {
    KB_Debugger.wrapObjectMethods({
        KB_UtilsClass: KB_UtilsClass
    });
}

KB_Utils = new KB_UtilsClass();

/* global KB_Debugger
 */

/* exported KB_Utils
 */
