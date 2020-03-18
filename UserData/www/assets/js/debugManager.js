"use strict"; // jshint ignore:line

var Ody_Debugger = null;

(function() {
    const LoggingLevel = {
        NORMAL: 0,
        VERBOSE: 1,
        VERY_VERBOSE: 2
    };
    const DebuggerParams = Object.freeze({
        objectName: "Object",
        methods: [],
        blacklistMethods: false,
        debug: true,
        verbose: true,
        threshold: 3
    });
    const DEFAULT_PREFS = {
        pref_LoggingLevel: LoggingLevel.NORMAL,
        pref_DebuggerEnabled: "false"
    };

    class DebuggerClass {
        constructor() {
            this._winStorage = "localStorage" in window ? window.localStorage : null;

            let prefs = this.getPrefsFromStorage();
            for (let pref in prefs) {
                this[pref] = prefs[pref];
            }

            this._initPreferenceHandlers();
            this.pref_DebuggerEnabled && this._findDuplicatedIDs();
        }

        /**
         * Find duplicated element IDs and log them.
         */
        _findDuplicatedIDs() {
            let idsSet = new Set();
            let duplicatedIDs = [];
            let all = document.querySelectorAll("[id]");

            for (let i = all.length - 1; i >= 0; i--) {
                let id = all[i].id;

                if (idsSet.has(id)) {
                    duplicatedIDs.push(id);
                } else {
                    idsSet.add(id);
                }
            }

            if (duplicatedIDs.length > 0) {
                console.error("Duplicated IDs found: " + duplicatedIDs.length + "\n" + duplicatedIDs.join("\n"));
            }
        }

        _initPreferenceHandlers() {
            let enabledCheckbox = document.getElementById("ody-debugger-enabled");
            let loggingLevelSelect = document.getElementById("ody-debugger-logging-level");

            if (enabledCheckbox) {
                enabledCheckbox.checked = this.pref_DebuggerEnabled;
                enabledCheckbox.addEventListener("click", () => {
                    this.pref_DebuggerEnabled = !this.pref_DebuggerEnabled;
                    this.savePrefToStorage("Ody_Debugger_Enabled", this.pref_DebuggerEnabled);
                }, false);
            }

            if (loggingLevelSelect) {
                loggingLevelSelect.value = "" + this.pref_LoggingLevel;
                loggingLevelSelect.addEventListener("change", (aE) => {
                    this.savePrefToStorage("Ody_Debugger_LoggingLevel", aE.currentTarget.value);
                }, false);
            }
        }

        /**
         * Get preferences from window.localStorage.
         *
         * @return {Object} Preferences stored in window.localStorage or the defaults if window.localStorage is not available.
         */
        getPrefsFromStorage() {
            if (!this._winStorage) {
                return DEFAULT_PREFS;
            }

            return {
                pref_LoggingLevel: parseInt(this._winStorage.getItem("Ody_Debugger_LoggingLevel"), 10) ||
                    DEFAULT_PREFS.pref_LoggingLevel,
                pref_DebuggerEnabled: (this._winStorage.getItem("Ody_Debugger_Enabled") ||
                    DEFAULT_PREFS.pref_DebuggerEnabled) === "true"
            };
        }

        /**
         * Save preference to window.localStorage.
         *
         * @param {String} aKey   - The window.localStorage key to save the preference into.
         * @param {String} aValue - The value associated to aKey.
         *
         * @return {String} description
         */
        savePrefToStorage(aKey, aValue) {
            if (!this._winStorage) {
                return;
            }

            this._winStorage.setItem(aKey, aValue);
        }

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

        methodWrapper(aObject, aParams) {
            let options = this.parseParams(aParams, DebuggerParams);
            let _obj = Object.getPrototypeOf(aObject) === Object.prototype ?
                aObject :
                aObject.prototype;
            let keys = Object.getOwnPropertyNames(_obj);

            if (options.methods.length > 0) {
                keys = keys.filter((aKey) => {
                    return options.blacklistMethods ?
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

            let times = [];
            let getHandler = (aKey) => {
                return {
                    apply: function(aTarget, aThisA, aArgs) {
                        let val;
                        let now;

                        if (options.verbose) {
                            now = new Date().getTime();
                        }

                        if (options.debug) {
                            try {
                                val = aTarget.apply(aThisA, aArgs);
                            } catch (aErr) {
                                console.error(aErr);
                            }
                        } else {
                            val = aTarget.apply(aThisA, aArgs);
                        }

                        if (options.verbose) {
                            let time = new Date().getTime() - now;

                            if (time >= options.threshold) {
                                times.push(time);
                                let total = 0;
                                let timesLength = times.length;

                                for (let z = timesLength - 1; z >= 0; z--) {
                                    total += times[z];
                                }

                                let max = (Math.max.apply(null, times) / 1000).toFixed(2);
                                let avg = ((total / timesLength) / 1000).toFixed(2);
                                time = (time / 1000).toFixed(2);

                                console.log(`[${options.objectName}.${aKey}]: ${time}ms (MAX: ${max}ms AVG: ${avg}ms)`);
                            }
                        }

                        return val;
                    }
                };
            };

            for (let i = keys.length - 1; i >= 0; i--) {
                let key = keys[i];
                /* NOTE: In the original Cinnamon function, getters/setters aren't ignored.
                 * As I understand it, a getter would be executed when doing _obj[key], instead
                 * of storing the getter function. So, as a workaround, I just ignore all
                 * setters/getters and move on.
                 */
                let fn = _obj[key];

                if (typeof fn !== "function") {
                    continue;
                }

                _obj[key] = new Proxy(fn, getHandler(key));
            }
        }

        wrapObjectMethods(aProtos, aExtraOptions = {}) {
            try {
                if (this.pref_LoggingLevel === LoggingLevel.VERY_VERBOSE || this.pref_DebuggerEnabled) {
                    for (let name in aProtos) {
                        let options = {
                            objectName: name,
                            verbose: this.pref_LoggingLevel === LoggingLevel.VERY_VERBOSE,
                            debug: this.pref_DebuggerEnabled
                        };

                        if (name in aExtraOptions) {
                            for (let opt in aExtraOptions[name]) {
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

    Ody_Debugger = new DebuggerClass();
})();

/* exported Ody_Debugger
 */
