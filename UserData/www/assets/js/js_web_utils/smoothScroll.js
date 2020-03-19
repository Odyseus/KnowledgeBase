// Based on: https://github.com/alicelieutier/smoothScroll

var Ody_SmoothScroll = null;

(function() {
    "use strict"; // jshint ignore:line

    class SmoothScrollClass {
        constructor(aTopOffset = 0, aSpeed = 400, aPreventDefault = true, aStopPropagation = true, aHandleHistory = false) {
            this._topElementOffset = aTopOffset;
            this._scrollSpeed = aSpeed;
            this._preventDefault = aPreventDefault;
            this._stopPropagation = aStopPropagation;
            this._handleHistory = aHandleHistory;
            this._supportsRequestAnimationFrame = "requestAnimationFrame" in window;
        }

        /**
         * Initialize links handler.
         *
         * Add a click listener to document so all anchors, existent or dynamically added,
         * are handled.
         */
        initLinksHandler() {
            document.addEventListener("click", this.linksHandler.bind(this), false);
        }

        get topElementOffset() {
            return this._topElementOffset;
        }

        set topElementOffset(aVal) {
            this._topElementOffset = aVal;
        }

        get scrollSpeed() {
            return this._scrollSpeed;
        }

        set scrollSpeed(aVal) {
            this._scrollSpeed = aVal;
        }

        get preventDefault() {
            return this._preventDefault;
        }

        set preventDefault(aVal) {
            this._preventDefault = aVal;
        }

        get stopPropagation() {
            return this._stopPropagation;
        }

        set stopPropagation(aVal) {
            this._stopPropagation = aVal;
        }

        get handleHistory() {
            return this._handleHistory;
        }

        set handleHistory(aVal) {
            this._handleHistory = aVal;
        }

        /**
         * Get top offset of target element.
         *
         * @param {Object} aEl    - The DOM element to get the top offset of.
         * @param {Number} aStart - The current position of an element or the window.
         *
         * @return {[type]} Description
         */
        getOffsetTop(aEl, aStart) {
            return aEl ? aEl.getBoundingClientRect().top + aStart : -aStart;
        }

        /**
         * Calculate the scroll position we should be in given the aStart and aEnd point of the scroll,
         * the aElapsed time from the beginning of the scroll.
         *
         * @param {Number} aStart   - Scroll start position.
         * @param {Number} aEnd     - Scroll end position.
         * @param {Number} aElapsed - Elapsed time.
         *
         * @return {Number} Scroll position.
         */
        position(aStart, aEnd, aElapsed) {
            return (aElapsed > this.scrollSpeed) ?
                aEnd :
                (aStart + (aEnd - aStart) * (aElapsed / this.scrollSpeed));
        }

        /**
         * Smooth scroll
         *
         * window.requestAnimationFrame is called by the browser before every repaint. If the
         * first argument is an element then scroll to the top of this element. If the first
         * argument is numeric then scroll to this location. If aCallback exist, it is called
         * when the scrolling is finished. If aContext is set then scroll that element,
         * else scroll window.
         *
         * @param {Object\Number} aEl - The DOM element or position to scroll to.
         */
        smoothScroll(aEl, aCallback, aContext) {
            let context = aContext || window;
            let start = context.scrollTop || window.pageYOffset;
            let end;

            if (typeof aEl === "number") {
                end = parseInt(aEl, 10);
            } else {
                end = this.getOffsetTop(aEl, start);
            }

            let currentTime = Date.now();

            let step = () => {
                let elapsedTime = Date.now() - currentTime;

                if (context !== window) {
                    context.scrollTop = this.position(
                        start, end, elapsedTime, this.scrollSpeed) - this.topElementOffset;
                } else {
                    window.scrollTo(0, this.position(
                        start, end, elapsedTime, this.scrollSpeed) - this.topElementOffset);
                }

                if (elapsedTime < this.scrollSpeed) {
                    window.requestAnimationFrame(step);
                } else {
                    typeof aCallback === "function" && aCallback(aEl);
                }
            };

            this._supportsRequestAnimationFrame ?
                step() :
                window.scrollTo(0, end - this.topElementOffset);
        }

        /**
         * Why this is needed, I have no idea. I keep it but will never use it.
         *
         * @param {Object} aEl - A DOM element.
         */
        replaceLocation(aEl) {
            aEl && location.replace("#" + aEl.id);
        }

        /**
         * Only used when calling initLinksHandler.
         *
         * @param {Object} aE - The event that triggered the function.
         */
        linksHandler(aE) {
            if (!aE.defaultPrevented) {
                let source = aE.target;

                // If source is a ghost, move on.
                if (!source ||
                    // Ignore all non-anchors.
                    source.tagName.toLowerCase() !== "a" ||
                    // no-smooth-scroll class to ignore specific anchors.
                    source.classList.contains("no-smooth-scroll")) {
                    return;
                }

                let targetHref = source.hash ? source.hash.substring(1) : null;

                // If no target reference, move on.
                if (!targetHref) {
                    return;
                }

                let target = document.getElementById(targetHref);

                // If no target element, move on.
                if (!target) {
                    return;
                }

                this.preventDefault && aE.preventDefault();

                if (this.handleHistory && location.hash !== source.hash) {
                    window.history.pushState(null, null, source.hash);
                }

                this.smoothScroll(target, (this.handleHistory ? this.replaceLocation : null));
                this.stopPropagation && aE.stopPropagation();
            }
        }
    }

    if (typeof Ody_Debugger === "object") {
        Ody_Debugger.wrapObjectMethods({
            SmoothScrollClass: SmoothScrollClass
        });
    }

    Ody_SmoothScroll = new SmoothScrollClass();
})();

/* global Ody_Debugger
 */
