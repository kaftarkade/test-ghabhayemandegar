/* =========================================================
قاب‌های ماندگار
THEME.JS
مدیریت حالت تاریک / روشن
========================================================= */

(function () {

const themeToggle = document.getElementById("theme-toggle");
const messageThemeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");

/* اعمال تم */

function applyTheme(theme) {

    const isLight = theme === "light";

    document.body.classList.toggle("light-mode", isLight);

    // چک‌باکس صفحات قبلی
    if (themeToggle) {
        themeToggle.checked = !isLight;
    }

    // آیکون پیام‌رسان
    if (themeIcon) {
        themeIcon.textContent = isLight ? "🌙" : "☀️";
    }

}

/* بازیابی تم ذخیره‌شده */

const savedTheme = localStorage.getItem("theme") || "dark";

applyTheme(savedTheme);

/* تغییر تم با چک‌باکس */

if (themeToggle) {

    themeToggle.addEventListener("change", function () {

        const newTheme = this.checked ? "dark" : "light";

        localStorage.setItem("theme", newTheme);

        applyTheme(newTheme);

    });

}

/* تغییر تم با دکمه پیام‌رسان */

if (messageThemeToggle) {

    messageThemeToggle.addEventListener("click", function () {

        const newTheme =
            document.body.classList.contains("light-mode")
                ? "dark"
                : "light";

        localStorage.setItem("theme", newTheme);

        applyTheme(newTheme);

        // انیمیشن چرخشی آیکون
        if (themeIcon) {

            themeIcon.classList.remove("rotate");

            void themeIcon.offsetWidth;

            themeIcon.classList.add("rotate");

        }

    });

}

/* پایان انیمیشن */

if (themeIcon) {

    themeIcon.addEventListener("animationend", function () {
        this.classList.remove("rotate");
    });

}

})();

/* =========================================================
ACCOUNT LINK
ورود / پروفایل
========================================================= */

(function () {

function updateAccountLink() {

    const accountLinks =
        document.querySelectorAll("#accountLink, .account-link");

    if (!accountLinks.length) {
        return;
    }

    let isLoggedIn = false;

    try {

        isLoggedIn =
            !!localStorage.getItem("memoryUser") &&
            localStorage.getItem("loggedIn") === "true";

    } catch (error) {}

    accountLinks.forEach(function (accountLink) {

        if (isLoggedIn) {

            accountLink.textContent = "👤 پروفایل";
            accountLink.href = "profile.html";

        } else {

            accountLink.textContent = "👤 ورود / ثبت‌نام";
            accountLink.href = "login.html";

        }

    });

}

updateAccountLink();

window.addEventListener("pageshow", updateAccountLink);
window.addEventListener("focus", updateAccountLink);
window.addEventListener("storage", updateAccountLink);

})();


/* =========================================================
GLOBAL PROFILE COLOR
هماهنگی رنگ پروفایل در تمام صفحات
========================================================= */

(function () {

const themeNames = [
    "theme-purple",
    "theme-blue",
    "theme-pink",
    "theme-green",
    "theme-orange"
];

function applyProfileColor() {

    const savedColor =
        localStorage.getItem("profileColor") || "purple";

    const validColors = [
        "purple",
        "blue",
        "pink",
        "green",
        "orange"
    ];

    const color = validColors.includes(savedColor)
        ? savedColor
        : "purple";

    document.body.classList.remove(...themeNames);

    document.body.classList.add("theme-" + color);
}

document.documentElement.style.setProperty("--main-color", getComputedStyle(document.body).getPropertyValue("--main-color").trim());

applyProfileColor();

window.addEventListener("pageshow", applyProfileColor);

window.addEventListener("storage", function (event) {
    if (event.key === "profileColor") {
        applyProfileColor();
    }
});

})();


/* =========================================================
   انیمیشن خروج از صفحه
   - کلیک روی لینک‌های داخلی سایت
   - window.pageNavigate("آدرس") برای رفتن با کد
   - window.pageNavigate("back") برای برگشت
========================================================= */

(function () {

    var DURATION = 260;

    var reduceMotion =
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var leaving = false;

    function showBar() {

        var bar = document.createElement("div");

        bar.style.cssText =
            "position:fixed;top:0;right:0;height:3px;width:0;" +
            "background:linear-gradient(90deg,var(--main-color,#a855f7)," +
            "var(--main-color-2,#ec4899));z-index:2147483647;" +
            "transition:width " + DURATION + "ms ease;pointer-events:none;";

        document.documentElement.appendChild(bar);

        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                bar.style.width = "100%";
            });
        });

    }

    function go(target) {

        if (target === "back") {
            window.history.back();
        } else {
            window.location.href = target;
        }

    }

    function leave(target) {

        if (reduceMotion || leaving) {
            if (!leaving) go(target);
            return;
        }

        leaving = true;

        document.body.classList.add("page-leave");

        showBar();

        setTimeout(function () {
            go(target);
        }, DURATION);

    }

    window.pageNavigate = leave;

    document.addEventListener("click", function (event) {

        if (event.defaultPrevented || event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

        var link = event.target.closest && event.target.closest("a[href]");

        if (!link) return;
        if (link.target && link.target !== "_self") return;
        if (link.hasAttribute("download")) return;

        var href = link.getAttribute("href");

        if (!href || href.charAt(0) === "#") return;
        if (/^(mailto:|tel:|javascript:)/i.test(href)) return;

        var url;

        try {
            url = new URL(link.href, window.location.href);
        } catch (e) {
            return;
        }

        if (url.origin !== window.location.origin) return;

        // همان صفحه (فقط hash عوض می‌شود)
        if (
            url.pathname === window.location.pathname &&
            url.search === window.location.search
        ) return;

        event.preventDefault();

        leave(url.href);

    });

    // برگشت با دکمه‌ی back: صفحه از حافظه برمی‌گردد
    window.addEventListener("pageshow", function (event) {

        if (!event.persisted) return;

        leaving = false;

        document.body.classList.remove("page-leave");
        document.body.classList.remove("page-enter");

        void document.body.offsetWidth;

        document.body.classList.add("page-enter");

        var bars = document.documentElement.querySelectorAll("div[style*='2147483647']");

        bars.forEach(function (b) { b.remove(); });

    });

})();
