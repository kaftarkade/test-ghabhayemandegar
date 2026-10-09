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