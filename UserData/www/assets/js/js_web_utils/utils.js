/**
 * Miscellaneous utilities.
 *
 * NOTE: core.js module required.
 */
(function(global, factory) {
    if (!("Ody_Core" in window)) {
        throw new Error("Module required: core.js");
    }

    if (typeof exports === "object" && typeof module !== "undefined") {
        module.exports = factory();
    } else if (typeof define === "function" && define.amd) {
        define(factory);
    } else {
        global = typeof globalThis !== "undefined" ? globalThis : global || self;
        global.Ody_Utils = factory();
    }
}((typeof window !== "undefined" ? window : this), (function() { // jshint ignore:line
    "use strict"; // jshint ignore:line

    const ElementsOffsetParams = Object.freeze({
        extraPercent: 0,
        offsetPosition: "Top",
        setMargin: true,
        setPadding: false
    });

    /**
     * Initialize Bootstrap components.
     *
     * @param {Object} aContainer - A DOM element where to search for elements.
     */
    function initializeBaseBootstrapComponents(aContainer = document.documentElement) { // jshint ignore:line
        if ("bootstrap" in window && "Alert" in window.bootstrap) {
            const bsVersion = window.bootstrap.Alert.VERSION[0];

            Ody_Core.tryFn(() => {
                switch (bsVersion) {
                    case "4":
                        $(aContainer.querySelectorAll('[data-toggle="popover"], .bootstrap-popover')).popover();
                        // NOTE: I don't remember why I added the click event.
                        $(aContainer.querySelectorAll('[data-toggle="tooltip"], .bootstrap-tooltip'))
                            .on("click", (aE) => {
                                setTimeout(() => {
                                    $(aE.target).tooltip("hide");
                                }, 20);
                            }).tooltip();

                        // Workaround for Firefox in Linux. ¬¬
                        Ody_Core.arrayEach(aContainer.getElementsByClassName("modal"), (aModal) => {
                            aModal.addEventListener("keyup", (aE) => {
                                if (aE.keyCode === 27) { // Escape key.
                                    $(aE.target).modal("hide");
                                }
                            }, false);
                        });
                        break;
                    case "5":
                        Ody_Core.arrayEach(
                            aContainer.querySelectorAll('[data-bs-toggle="popover"], .bootstrap-popover'),
                            (aEl) => {
                                window.bootstrap.Popover.getOrCreateInstance(aEl);
                            });
                        Ody_Core.arrayEach(
                            aContainer.querySelectorAll('[data-bs-toggle="tooltip"], .bootstrap-tooltip'),
                            (aEl) => {
                                window.bootstrap.Tooltip.getOrCreateInstance(aEl);
                                aEl.addEventListener("click", (aE) => {
                                    const tooltip = window.bootstrap.Tooltip.getOrCreateInstance(aE.target);
                                    setTimeout(() => {
                                        tooltip && tooltip.hide();
                                    }, 20);
                                }, false);
                            });
                        Ody_Core.arrayEach(aContainer.getElementsByClassName("modal"), (aModal) => {
                            aModal.addEventListener("keyup", (aE) => {
                                if (aE.keyCode === 27) { // Escape key.
                                    const modal = window.bootstrap.Modal.getOrCreateInstance(aE.target);
                                    modal && modal.hide();
                                }
                            }, false);
                        });
                        break;
                }
            }, aErr => console.error(aErr));
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
    function getElementOuterHeight(aEl, aIncludeMargin = false) {
        let height = aEl.offsetHeight;

        if (aIncludeMargin) {
            let style = getComputedStyle(aEl);
            height += parseInt(style.marginTop, 10) + parseInt(style.marginBottom, 10);
        }

        return height;
    }

    /**
     * Set elements top/right/bottom/left padding and/or margin (offset) based on another element height.
     *
     * NOTE: I opted for a Map instead of an array or individual arguments for two reasons.
     * 1. Multiple arguments handling in JavaScirpt is garbage. Maybe in 20 years time, when the
     *     "developers" developing JavaScript are tired of adding useless syntactic sugar to the
     *     language, this might get fixed.
     * 2. I wanted to use the parseParams function so I can use default values without having to
     *     specify them.
     *
     * @param {Object} aOffsetElement - The DOMM element from which to calculate the offset.
     * @param {Map}  aElements        - A map of elements to which to apply the offset.
     *                                Each key of the map should be a DOM element and their values
     *                                should be an object with options (see ElementsOffsetParams).
     */
    function setElementsOffset(aOffsetElement, aElements) { // jshint ignore:line
        let baseOffset = parseInt(getElementOuterHeight(aOffsetElement, true), 10);

        for (let [el, options] of aElements) {
            let params = Ody_Core.parseParams(options, ElementsOffsetParams);
            let extraPercent = (Math.max(0, Math.min(parseInt(params.extraPercent, 10), 100)) / 100) + 1.0;
            let offset = baseOffset * extraPercent;

            if (params.setMargin) {
                el.style["margin" + params.offsetPosition] = offset + "px";
            }

            if (params.setPadding) {
                el.style["padding" + params.offsetPosition] = offset + "px";
            }
        }
    }

    return {
        initializeBaseBootstrapComponents,
        getElementOuterHeight,
        setElementsOffset,
    };
})));

/* global Ody_Core,
          define,
          globalThis
 */

/* jshint browser: true */
