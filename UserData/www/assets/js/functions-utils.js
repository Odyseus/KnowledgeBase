// The delay is mostly to avoid triggering the function a million times when scrolling.
let delayedToggleBackToTopButtonVisibility = utilThrottle(function() {
    toggleBackToTopButtonVisibility();
}, 100);

function loadInNewTab(aHref) {
    window.open(aHref, "_blank");
}

function toggleBackToTopButtonVisibility() {
    let scroll = $(document).scrollTop();

    if (scroll > 100) {
        $("#to-top-of-page").show();
    } else {
        $("#to-top-of-page").hide();
    }
}

function utilThrottle(aFunc, aFreq) {
    let frequency = aFreq !== undefined ? aFreq : 200,
        last,
        timer;

    return function() {
        let that = this,
            now = +new Date(),
            args = arguments;

        if (last && now < last + frequency) {
            clearTimeout(timer);

            timer = setTimeout(function() {
                last = undefined;
                aFunc.apply(that, args);
            }, frequency);
        } else {
            last = now;
            aFunc.apply(that, args);
        }
    };
}

String.prototype.format = function(aPlaceholders) {
    let s = this;
    for (let propertyName in aPlaceholders) {
        let re = new RegExp("{" + propertyName + "}", "gm");
        s = s.replace(re, aPlaceholders[propertyName]);
    }
    return s;
};

function getQueryString() {
    let queryDict = {};

    location.search.substr(1).split("&").forEach(function(item) {
        queryDict[item.split("=")[0]] = item.split("=")[1];
    });

    return queryDict;
}

function ends_with(str1, str2) {
    return str1.slice(-str2.length) == str2;
}

function smoothScrollToTop() {
    // THIS IS GARBAGE!!! The animation is jerky on Firefox 62+ (ANOTHER GARBAGE!!!).
    // $("html, body").animate({
    //     scrollTop: 0
    // }, 400);

    // Forget the browser specific garbage. I don't need the headache.
    if (window.requestAnimationFrame) {
        try {
            let currentScroll = document.documentElement.scrollTop || document.body.scrollTop;
            if (currentScroll > 0) {
                window.requestAnimationFrame(smoothScrollToTop);
                window.scrollTo(0, currentScroll - (currentScroll / 5));
            }
        } catch (aErr) {
            console.error(aErr);
            window.scrollTo(0, 0);
        }
    } else {
        window.scrollTo(0, 0);
    }
}

/* exported loadInNewTab,
            toggleBackToTopButtonVisibility,
            delayedToggleBackToTopButtonVisibility,
            utilThrottle,
            getQueryString,
            ends_with,
            smoothScrollToTop
*/

/* jshint varstmt: false */
