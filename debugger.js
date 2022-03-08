/**
 * Debugging utilities.
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
        global.Ody_Debugger = factory();
    }
}((typeof window !== "undefined" ? window : this), (function() { // jshint ignore:line
    "use strict"; // jshint ignore:line

    const LoggingLevel = {
        NORMAL: 0,
        VERBOSE: 1,
        VERY_VERBOSE: 2
    };
    const DebuggerParams = Object.freeze({
        object_name: "Object",
        methods: null,
        blacklist_methods: false,
        debug: true,
        verbose: true,
        threshold: 3
    });

    // NOTE: Class defined to avoid depending on the preferences.js module.
    class PrefsClass {
        constructor() {
            this._defaults = {
                logging_level: LoggingLevel.NORMAL,
                debugger_enabled: false
            };
            this._winStorage = "localStorage" in window ? window.localStorage : null;
        }

        get debugger_enabled() {
            if (!this._winStorage || this._winStorage.getItem("debugger_enabled") === null) {
                return this._defaults["debugger_enabled"];
            }

            return this._winStorage.getItem("debugger_enabled") === "true";
        }

        set debugger_enabled(aValue) {
            if (!this._winStorage) {
                return;
            }

            this._winStorage.setItem("debugger_enabled", aValue);
        }

        get logging_level() {
            if (!this._winStorage || this._winStorage.getItem("logging_level") === null) {
                return this._defaults["logging_level"];
            }

            return parseInt(this._winStorage.getItem("logging_level"), 10);
        }

        set logging_level(aValue) {
            if (!this._winStorage) {
                return;
            }

            this._winStorage.setItem("logging_level", aValue);
        }
    }

    const Prefs = new PrefsClass();

    function _getHandler(aKey, aOptions, aTimes) {
        return {
            apply: function(aTarget, aThisA, aArgs) {
                let val;
                let now;

                if (aOptions.verbose) {
                    now = new Date().getTime();
                }

                if (aOptions.debug) {
                    Ody_Core.tryFn(() => {
                        val = aTarget.apply(aThisA, aArgs);
                    }, (aErr) => console.error(aErr));
                } else {
                    val = aTarget.apply(aThisA, aArgs);
                }

                if (aOptions.verbose) {
                    let time = new Date().getTime() - now;

                    if (time >= aOptions.threshold) {
                        aTimes.push(time);
                        let total = 0;
                        const timesLength = aTimes.length;
                        let z = timesLength;

                        while (z--) {
                            total += aTimes[z];
                        }

                        const max = (Math.max.apply(null, aTimes) / 1000).toFixed(2);
                        const avg = ((total / timesLength) / 1000).toFixed(2);
                        time = (time / 1000).toFixed(2);

                        console.log(`[${aOptions.object_name}.${aKey}]: ${time}ms (MAX: ${max}ms AVG: ${avg}ms)`);
                    }
                }

                return val;
            }
        };
    }

    if (Prefs.debugger_enabled) {
        const debouncedFindDuplicatedIDs = Ody_Core.debounce(Ody_Core.findDuplicatedIDs, 500);

        const observerCallback = function(aMutationsList, aObserver) { // jshint ignore:line
            Ody_Core.arrayEach(aMutationsList, (aMutation) => {
                if (aMutation.type === "childList" || aMutation.type === "characterData") {
                    debouncedFindDuplicatedIDs();
                }
            });
        };

        const observer = new MutationObserver(observerCallback);
        observer.observe(document.querySelector("html"), {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    class DebuggerClass {
        constructor() {
            this.initDebuggerPreferenceHandlers();
            Prefs.debugger_enabled && Ody_Core.findDuplicatedIDs();
        }

        get logging_level() {
            return Prefs.logging_level;
        }

        get debugger_enabled() {
            return Prefs.debugger_enabled;
        }

        initDebuggerPreferenceHandlers() {
            let enabledCheckbox = document.getElementById("ody-debugger-enabled");
            let loggingLevelSelect = document.getElementById("ody-debugger-logging-level");

            if (enabledCheckbox) {
                enabledCheckbox.checked = Prefs.debugger_enabled;
                enabledCheckbox.addEventListener("click", () => {
                    Prefs.debugger_enabled = !Prefs.debugger_enabled;
                }, false);
            }

            if (loggingLevelSelect) {
                loggingLevelSelect.value = "" + Prefs.logging_level;
                loggingLevelSelect.addEventListener("change", (aE) => {
                    Prefs.logging_level = aE.currentTarget.value;
                }, false);
            }
        }

        methodWrapper(aObject, aParams) {
            const options = Ody_Core.parseParams(aParams, DebuggerParams);
            const _obj = Object.getPrototypeOf(aObject) === Object.prototype ?
                aObject :
                aObject.prototype;
            // TODO: The constructor method of JavaScript classes isn't listed with Object.getOwnPropertyNames().
            // Investigate what is it that can be done to fix this.
            let keys = Object.getOwnPropertyNames(aObject.prototype);

            if (Array.isArray(options.methods) && options.methods.length > 0) {
                keys = keys.filter((aKey) => {
                    return options.blacklist_methods ?
                        // Treat aMethods as a blacklist, so don't include these keys.
                        options.methods.indexOf(aKey) === -1 :
                        // Keep ONLY the keys in aMethods.
                        options.methods.indexOf(aKey) >= 0;
                });
            }

            /* FIXME: For now, I'm just ignoring setters/getters.
             * See if I can wrap getters/setters too.
             * See note inside the last while loop.
             */
            keys = keys.filter((aKey) => {
                return !Object.getOwnPropertyDescriptor(_obj, aKey)["get"] &&
                    !Object.getOwnPropertyDescriptor(_obj, aKey)["set"];
            });

            const times = [];

            let i = keys.length;
            while (i--) {
                const key = keys[i];
                /* NOTE: In the original Cinnamon function, getters/setters aren't ignored.
                 * As I understand it, a getter would be executed when doing _obj[key], instead
                 * of storing the getter function. So, as a workaround, I just ignore all
                 * setters/getters and move on.
                 */
                const fn = _obj[key];

                if (typeof fn !== "function") {
                    continue;
                }

                _obj[key] = new Proxy(fn, _getHandler(key, options, times));
            }
        }

        wrapObjectMethods(aProtos, aExtraOptions = {}) {
            try {
                if (Prefs.logging_level === LoggingLevel.VERY_VERBOSE || Prefs.debugger_enabled) {
                    for (const name in aProtos) {
                        const options = {
                            object_name: name,
                            verbose: Prefs.logging_level === LoggingLevel.VERY_VERBOSE,
                            debug: Prefs.debugger_enabled
                        };

                        if (name in aExtraOptions) {
                            for (const opt in aExtraOptions[name]) {
                                if (aExtraOptions[name].hasOwnProperty(opt)) {
                                    options[opt] = aExtraOptions[name][opt];
                                }
                            }
                        }

                        this.methodWrapper(aProtos[name], options);
                    }
                }
            } catch (aErr) {
                console.error(aErr);
            }
        }
    }

    return new DebuggerClass();
})));

/* global Ody_Core,
          define,
          globalThis
 */

/* jshint browser: true */
