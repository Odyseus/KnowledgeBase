"use strict"; // jshint ignore:line

/**
 * This file is only used on third-party/standalone web pages.
 */

"Ody_Core" in window && Ody_Core.documentReady().then(() => {
    Ody_Core.delayedToggleBackToTopButtonVisibility();
    Ody_Core.highlightAllCodeBlocks();
});

/* global Ody_Core
 */
