/**
 * Color manipulation utilities.
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
        global.Ody_ColorUtils = factory();
    }
}((typeof window !== "undefined" ? window : this), (function() { // jshint ignore:line
    "use strict"; // jshint ignore:line

    /**
     * Contrast RGB color.
     *
     * Source: <3 https://stackoverflow.com/a/1855903
     *
     * @param {Object} aRGB - An RGB color.
     *
     * @return {Object} Black or white in RGB notation.
     */
    function contrastRGBColor(aRGB) {
        let d = 0;

        if (aRGB !== null) {
            let lum = (0.299 * aRGB.r + 0.587 * aRGB.g + 0.114 * aRGB.b) / 255;

            if (lum > 0.5) {
                d = 0; // Bright colors - Black font
            } else {
                d = 255; // Dark colors - White font
            }
        }

        return {
            r: d,
            g: d,
            b: d
        };
    }

    /**
     * Contrast HEX color.
     *
     * @param {String} aHex - An HEX color.
     *
     * @return {String} Black or white in HEX notation.
     */
    function contrastHexColor(aHex) {
        let contrastColor = contrastRGBColor(hexToRgb(aHex));
        return rgbToHex(contrastColor.r, contrastColor.g, contrastColor.b);
    }

    /**
     * RGB to HEX color convertion.
     *
     * Source: <3 https://stackoverflow.com/a/5624139
     *
     * @param {Number} aR - Red component of an RGB color.
     * @param {Number} aG - Green component of an RGB color.
     * @param {Number} aB - Blue component of an RGB color.
     *
     * @return {String} A color in HEX notation.
     */
    function rgbToHex(aR, aG, aB) {
        return "#" + ((1 << 24) + (aR << 16) + (aG << 8) + aB).toString(16).slice(1);
    }

    /**
     * HEX to RGB color convertion.
     *
     * Source: <3 https://stackoverflow.com/a/5624139
     *
     * @param {String} aHex - A color in HEX notation.
     *
     * @return {Object} An color in RGB notation.
     */
    function hexToRgb(aHex) {
        // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
        let shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        aHex = aHex.replace(shorthandRegex, function(aMatch, aR, aG, aB) {
            return aR + aR + aG + aG + aB + aB;
        });

        let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(aHex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    return {
        contrastRGBColor,
        contrastHexColor,
        rgbToHex,
        hexToRgb,
    };
})));

/* global define,
          globalThis
 */

/* jshint browser: true */
