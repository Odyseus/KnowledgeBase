/* global delayedToggleBackToTopButtonVisibility,
          smoothScrollToTop
*/
/**
 * This file is only used on third-party/standalone web pages.
 */
jQuery(document).ready(($) => {
    delayedToggleBackToTopButtonVisibility();

    // This has a great performance cost because I use highlight.js with ALL languages that it supports.
    // The only way that I was able to fix this completely is by defining the window
    // property (__HLJS_LANGUAGES__) in pages that have a large amount of code blocks
    // to be used with hljs.configure().
    // A cookie was out of the picture because I hate them. And a global variable was also not
    // considered because JavaScript is the most retarded language that ever existed.
    // PERFORMANCE NOTE: On a page with 60 code blocks:
    // - WITHOUT using hljs.configure() to specify languages loads in aprox. 7 seconds.
    // - USING hljs.configure() to specify 2 languages loads in a fraction of a second.
    if (typeof hljs === "object") {
        if ("__HLJS_LANGUAGES__" in window) {
            hljs.configure({
                languages: window.__HLJS_LANGUAGES__
            });
        }

        let $codeBlocks = $("pre code");

        for (let i = $codeBlocks.length - 1; i >= 0; i--) {
            hljs.highlightBlock($codeBlocks[i]);
        }
    }

    $(window).scroll(() => {
        delayedToggleBackToTopButtonVisibility();
    });

    // Smooth Scroll library.
    // Source: https://github.com/julienetie/smooth-scroll
    (function(window, document) {
        var prefixes = ["moz", "webkit", "o"],
            stickyNavbarOffset = 50,
            animationFrame;

        // Modern rAF prefixing without setTimeout
        function requestAnimationFrameNative() {
            prefixes.map(function(prefix) {
                if (!window.requestAnimationFrame) {
                    animationFrame = window[prefix + "RequestAnimationFrame"];
                } else {
                    animationFrame = requestAnimationFrame;
                }
            });
        }
        requestAnimationFrameNative();

        function getOffsetTop(el) {
            if (!el) {
                // Account for the sticky navbar height.
                return -stickyNavbarOffset;
            }

            var yOffset = el.offsetTop,
                parent = el.offsetParent;

            yOffset += getOffsetTop(parent);

            return yOffset;
        }

        function getScrollTop(scrollable) {
            return scrollable.scrollTop || document.body.scrollTop || document.documentElement.scrollTop;
        }

        function scrollTo(scrollable, coords, millisecondsToTake) {
            var currentY = getScrollTop(scrollable),
                diffY = coords.y - currentY,
                startTimestamp = null;

            if (coords.y === currentY || typeof scrollable.scrollTo !== "function") {
                return;
            }

            function doScroll(currentTimestamp) {
                if (startTimestamp === null) {
                    startTimestamp = currentTimestamp;
                }

                var progress = currentTimestamp - startTimestamp,
                    fractionDone = (progress / millisecondsToTake),
                    pointOnSineWave = Math.sin(fractionDone * Math.PI / 2);
                scrollable.scrollTo(0, currentY + (diffY * pointOnSineWave));

                if (progress < millisecondsToTake) {
                    animationFrame(doScroll);
                } else {
                    // Ensure we're at our destination
                    scrollable.scrollTo(coords.x, coords.y);
                }
            }

            animationFrame(doScroll);
        }

        // Declaire scroll duration, (before script)
        var speed = window.smoothScrollSpeed || 750;

        function smoothScroll(e) { // no smooth scroll class to ignore links
            if (e.target.classList.contains("no-smooth-scroll")) {
                return;
            }

            var source = e.target,
                targetHref = source.hash,
                target = null;

            if (!source || !targetHref) {
                return;
            }

            targetHref = targetHref.substring(1);
            target = document.getElementById(targetHref);

            if (!target) {
                return;
            }

            scrollTo(window, {
                x: 0,
                y: getOffsetTop(target)
            }, speed);
        }

        // Uses target's hash for scroll
        document.addEventListener("click", smoothScroll, false);
    }(window, document));

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
});
