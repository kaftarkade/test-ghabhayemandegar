/* =========================================================
   قاب‌های ماندگار
   THEME.JS
   مدیریت حالت تاریک / روشن
========================================================= */

(function () {

    const themeToggle =
        document.getElementById("theme-toggle");


    /* =====================================================
       LOAD SAVED THEME
    ===================================================== */

    const savedTheme =
        localStorage.getItem("theme") || "dark";


    if (savedTheme === "light") {

        document.body.classList.add(
            "light-mode"
        );

        if (themeToggle) {
            themeToggle.checked = false;
        }

    } else {

        document.body.classList.remove(
            "light-mode"
        );

        if (themeToggle) {
            themeToggle.checked = true;
        }

    }


    /* =====================================================
       CHANGE THEME
    ===================================================== */

    if (themeToggle) {

        themeToggle.addEventListener(
            "change",
            function () {

                if (this.checked) {

                    document.body.classList.remove(
                        "light-mode"
                    );

                    localStorage.setItem(
                        "theme",
                        "dark"
                    );

                } else {

                    document.body.classList.add(
                        "light-mode"
                    );

                    localStorage.setItem(
                        "theme",
                        "light"
                    );

                }

            }
        );

    }

})();

/* =========================================================
   ACCOUNT LINK
   ورود / پروفایل
   (هر بار که صفحه نمایش داده شد دوباره بررسی می‌شود)
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

    // وقتی از صفحه‌ی دیگر برمی‌گردی یا صفحه از حافظه‌ی مرورگر باز می‌شود
    window.addEventListener("pageshow", updateAccountLink);
    window.addEventListener("focus", updateAccountLink);
    window.addEventListener("storage", updateAccountLink);

})();
