"use strict"; // jshint ignore:line

/**
 * This file is only used on third-party/standalone web pages.
 */
jQuery(document).ready(() => {
    KB_Utils.delayedToggleBackToTopButtonVisibility();

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

        let codeBlocks = document.querySelectorAll("pre code");
        let i = codeBlocks.length;
        while (i--) {
            hljs.highlightBlock(codeBlocks[i]);
        }
    }

    let boxedContainers = document.querySelectorAll(".container.boxed");

    let i = boxedContainers.length;
    while (i--) {
        let container = boxedContainers[i];
        let contentLinks = container.querySelectorAll("a[href]");

        let l = contentLinks.length;
        while (l--) {
            let targetHref = contentLinks[l].getAttribute("href");

            if (targetHref[0] === "#") {
                contentLinks[l].addEventListener("click",
                    // NOTE: The second null is to force the event to be the second argument of the
                    // smoothScrollInternalTarget() function.
                    KB_Utils.smoothScrollInternalTarget.bind(null, null),
                    false);
            }
        }
    }
});

/* global KB_Utils
 */
