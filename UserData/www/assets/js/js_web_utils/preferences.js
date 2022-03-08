/**
 * Preferences handling utilities.
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
        global.Ody_PrefsClass = factory();
    }
}((typeof window !== "undefined" ? window : this), (function() { // jshint ignore:line
    "use strict"; // jshint ignore:line

    class Ody_PrefsClass {
        constructor(aDefaults) {
            this._defaults = aDefaults;
            this._defaultKeys = Object.keys(this._defaults);
            this._winStorage = "localStorage" in window ? window.localStorage : null;
            this._bindToObject();
        }

        /**
         * Bind preference keys as properties of this class.
         */
        _bindToObject() {
            let i = this._defaultKeys.length;
            while (i--) {
                Object.defineProperty(
                    this,
                    this._defaultKeys[i],
                    this._getDescriptor(this._defaultKeys[i])
                );
            }
        }

        /**
         * Get the descriptor for the property being defined.
         *
         * @param {String} aKey - Preference key.
         *
         * @return {Object} The object to use as descriptor argument for Object.defineProperty.
         */
        _getDescriptor(aKey) {
            return Object.create({
                get: () => {
                    if (!this._winStorage || this._winStorage.getItem(aKey) === null) {
                        return this._defaults[aKey];
                    }

                    return this._handleValue(this._winStorage.getItem(aKey));
                },
                set: (aValue) => {
                    if (!this._winStorage) {
                        return;
                    }

                    this._winStorage.setItem(aKey, aValue);
                },
                enumerable: true,
                configurable: true
            });
        }

        _handleValue(aValue) {
            aValue = aValue.trim();

            if (aValue === "true") {
                return true;
            } else if (aValue === "false") {
                return false;
            } else if (!isNaN(aValue)) {
                // NOTE: Keep an eye on this. It is very simplistic and is apt for most of my use
                // cases, but it will fail in a lot of other use cases.
                // Luckily, a color in HEX notation isn't considered a number, otherwise I would be screwed. LOL
                return aValue.includes(".") ? parseFloat(aValue) : parseInt(aValue, 10);
            }

            return aValue;
        }

        clear() {
            if (!this._winStorage) {
                return;
            }

            this._winStorage.clear();
        }
    }

    return Ody_PrefsClass;
})));

/* global define,
          globalThis
 */

/* jshint browser: true */
