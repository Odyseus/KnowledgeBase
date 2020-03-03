var KB_LoggingLevel = {
    NORMAL: 0,
    VERBOSE: 1,
    VERY_VERBOSE: 2
};

var KB_DebuggerClass = class KB_DebuggerClass {
    constructor(aDebuggerEnabled = false, aLoggingLevel = null) {
        this._loggingLevel = aLoggingLevel || KB_LoggingLevel.NORMAL;
        this._debuggerEnabled = aDebuggerEnabled;
        this._debugger_params = Object.freeze({
            objectName: "Object",
            methods: [],
            blacklistMethods: false,
            debug: true,
            verbose: true,
            threshold: 3
        });
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
        let options = this.parseParams(aParams, this._debugger_params);
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
                            let z = timesLength;

                            while (z--) {
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

        let i = keys.length;
        while (i--) {
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
            if (this._loggingLevel === KB_LoggingLevel.VERY_VERBOSE || this._debuggerEnabled) {
                for (let name in aProtos) {
                    let options = {
                        objectName: name,
                        verbose: this._loggingLevel === KB_LoggingLevel.VERY_VERBOSE,
                        debug: this._debuggerEnabled
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
};

var KB_Debugger = new KB_DebuggerClass(true, KB_LoggingLevel.NORMAL);
// var KB_Debugger = new KB_DebuggerClass(true, KB_LoggingLevel.VERY_VERBOSE);

/* exported KB_DebuggerClass,
            KB_LoggingLevel,
            KB_Debugger
 */
