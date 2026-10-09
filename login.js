/* =========================================================
   APPWRITE
========================================================= */

if (typeof Appwrite === "undefined") {
    alert("شبکه در دسترس نیست، اینترنت / VPN را بررسی کنید.");
}

const appwriteClient = new Appwrite.Client()
    .setEndpoint("https://cloud.appwrite.io/v1")
    .setProject("6ac3b38f000976364cad");

const appwriteAccount = new Appwrite.Account(appwriteClient);

// شماره موبایل به‌صورت ایمیل مجازی در Appwrite ذخیره می‌شود
const PHONE_EMAIL_DOMAIN = "example.com";


/* =========================================================
   عناصر صفحه
========================================================= */

const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const tabs = document.querySelector(".tabs");


/* =========================================================
   جابه‌جایی بین ورود و ثبت‌نام
========================================================= */

loginTab.addEventListener("click", function () {
    loginTab.classList.add("active");
    registerTab.classList.remove("active");
    loginForm.classList.add("active-form");
    registerForm.classList.remove("active-form");
    tabs.classList.remove("register-active");
});

registerTab.addEventListener("click", function () {
    registerTab.classList.add("active");
    loginTab.classList.remove("active");
    registerForm.classList.add("active-form");
    loginForm.classList.remove("active-form");
    tabs.classList.add("register-active");
});


/* =========================================================
   نمایش / مخفی کردن رمز
========================================================= */

document.querySelectorAll(".show-password").forEach(function (button) {

    button.addEventListener("click", function () {

        const input = document.getElementById(button.dataset.target);

        if (!input) return;

        if (input.type === "password") {
            input.type = "text";
            button.textContent = "🙈";
        } else {
            input.type = "password";
            button.textContent = "👁";
        }

    });

});


/* =========================================================
   توابع کمکی
========================================================= */

function phoneToEmail(phone) {
    return phone + "@" + PHONE_EMAIL_DOMAIN;
}

function showMsg(el, text, type) {
    el.textContent = text;
    el.className = "message";
    if (type) el.classList.add(type);
}

function authErrorText(error) {
    if (error.code === 409) return "این شماره قبلاً ثبت‌نام کرده. وارد شو.";
    if (error.code === 401) return "شماره موبایل یا رمز عبور اشتباه است.";
    if (error.code === 429) return "تعداد تلاش‌ها زیاد بود. کمی بعد دوباره امتحان کن.";
    if (error.message && error.message.includes("Failed to fetch")) {
        return "اتصال به سرور برقرار نشد. اینترنت/VPN را بررسی کن.";
    }
    return "خطا: " + (error.message || "نامشخص");
}

// اگر نشست قبلی باز است ببند (وگرنه Appwrite خطای session فعال می‌دهد)
async function clearOldSession() {
    try {
        await appwriteAccount.deleteSession({ sessionId: "current" });
    } catch (e) {}
}

// ذخیره‌ی اطلاعات کاربر برای بقیه‌ی صفحات (بدون رمز عبور)
function saveLocalUser(acc) {

    let old = {};

    try {
        old = JSON.parse(localStorage.getItem("memoryUser") || "{}") || {};
    } catch (e) {}

    // اگر حساب دیگری بود، اطلاعات قبلی را نگه نمی‌داریم
    if (old.userid !== acc.$id) old = {};

    delete old.password;

    const email = acc.email || "";
    const isFakeEmail = email.endsWith("@" + PHONE_EMAIL_DOMAIN);

    const user = Object.assign(old, {
        userid: acc.$id,
        name: acc.name,
        phone: (acc.prefs && acc.prefs.phone) || (isFakeEmail ? email.split("@")[0] : ""),
        email: isFakeEmail ? "" : email,
        joinDate: new Date(acc.$createdAt).toLocaleDateString("fa-IR")
    });

    localStorage.setItem("memoryUser", JSON.stringify(user));
    localStorage.setItem("loggedIn", "true");

    // عکس پروفایل از دیتابیس (هر حساب عکس خودش را دارد)
    if (acc.prefs && acc.prefs.avatar) {
        localStorage.setItem("profileImage", acc.prefs.avatar);
    } else {
        localStorage.removeItem("profileImage");
    }
}


/* =========================================================
   ثبت‌نام
========================================================= */

registerForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const name = document.getElementById("registerName").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const password = document.getElementById("registerPassword").value;
    const password2 = document.getElementById("registerPassword2").value;
    const message = document.getElementById("registerMessage");
    const button = registerForm.querySelector(".submit-btn");

    showMsg(message, "");

    if (!name) {
        showMsg(message, "نام را وارد کن.", "error");
        return;
    }

    if (!/^09[0-9]{9}$/.test(phone)) {
        showMsg(message, "شماره موبایل باید مثل 09123456789 باشد.", "error");
        return;
    }

    if (password.length < 8) {
        showMsg(message, "رمز عبور باید حداقل ۸ کاراکتر باشد.", "error");
        return;
    }

    if (password !== password2) {
        showMsg(message, "رمزهای عبور یکسان نیستند.", "error");
        return;
    }

    button.disabled = true;

    try {

        await clearOldSession();

        const email = phoneToEmail(phone);

        await appwriteAccount.create({
            userId: Appwrite.ID.unique(),
            email: email,
            password: password,
            name: name
        });

        await appwriteAccount.createEmailPasswordSession({
            email: email,
            password: password
        });

        try {
            await appwriteAccount.updatePrefs({ prefs: { phone: phone } });
        } catch (e) {
            console.error(e);
        }

        const acc = await appwriteAccount.get();

        saveLocalUser(acc);

        showMsg(message, "حساب با موفقیت ساخته شد ❤️", "success");

        setTimeout(function () {
            window.location.href = "profile.html";
        }, 1000);

    } catch (error) {

        console.error(error);
        showMsg(message, authErrorText(error), "error");
        button.disabled = false;

    }

});


/* =========================================================
   ورود
========================================================= */

loginForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const identifier = document.getElementById("loginPhone").value.trim();
    const password = document.getElementById("loginPassword").value;
    const message = document.getElementById("loginMessage");
    const button = loginForm.querySelector(".submit-btn");

    showMsg(message, "");

    let loginEmail = "";

    if (/^09[0-9]{9}$/.test(identifier)) {
        loginEmail = phoneToEmail(identifier);
    } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
        loginEmail = identifier.toLowerCase();
    }

    if (!loginEmail) {
        showMsg(message, "شماره موبایل (مثل 09123456789) یا ایمیل را وارد کن.", "error");
        return;
    }

    if (!password) {
        showMsg(message, "رمز عبور را وارد کن.", "error");
        return;
    }

    button.disabled = true;

    try {

        await clearOldSession();

        await appwriteAccount.createEmailPasswordSession({
            email: loginEmail,
            password: password
        });

        const acc = await appwriteAccount.get();

        saveLocalUser(acc);

        showMsg(message, "خوش اومدی " + acc.name + " ❤️", "success");

        setTimeout(function () {
            window.location.href = "index.html";
        }, 1000);

    } catch (error) {

        console.error(error);
        showMsg(message, authErrorText(error), "error");
        button.disabled = false;

    }

});


/* =========================================================
   فراموشی رمز عبور (با ایمیل بازیابی ثبت‌شده در پروفایل)
========================================================= */

const forgotLink = document.getElementById("forgotLink");
const forgotBox = document.getElementById("forgotBox");
const forgotEmail = document.getElementById("forgotEmail");
const forgotSend = document.getElementById("forgotSend");
const forgotMessage = document.getElementById("forgotMessage");

async function sendRecovery() {

    const email = forgotEmail.value.trim().toLowerCase();

    showMsg(forgotMessage, "");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showMsg(forgotMessage, "ایمیل معتبر وارد کن.", "error");
        return;
    }

    forgotSend.disabled = true;

    try {

        await appwriteAccount.createRecovery({
            email: email,
            url: window.location.origin + "/reset.html"
        });

        showMsg(
            forgotMessage,
            "لینک بازیابی ارسال شد. ایمیلت (و پوشه‌ی اسپم) را چک کن.",
            "success"
        );

    } catch (error) {

        console.error(error);

        if (error.code === 404) {
            showMsg(
                forgotMessage,
                "حسابی با این ایمیل پیدا نشد. فقط کسانی که ایمیل بازیابی را در پروفایل ثبت کرده‌اند می‌توانند رمز را بازیابی کنند.",
                "error"
            );
        } else {
            showMsg(forgotMessage, authErrorText(error), "error");
        }

    } finally {

        forgotSend.disabled = false;

    }

}

if (forgotLink && forgotBox) {

    forgotLink.addEventListener("click", function (event) {
        event.preventDefault();
        forgotBox.style.display =
            forgotBox.style.display === "none" ? "block" : "none";
    });

    forgotSend.addEventListener("click", sendRecovery);

    forgotEmail.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            sendRecovery();
        }
    });

}


/* =========================================================
   تم (روشن / تاریک)
========================================================= */

const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");

function updateThemeIcon() {
    if (!themeIcon) return;
    themeIcon.textContent =
        document.body.classList.contains("light-mode") ? "🌙" : "☀️";
}

if (localStorage.getItem("theme") === "light") {
    document.body.classList.add("light-mode");
}

updateThemeIcon();

if (themeToggle) {
    themeToggle.addEventListener("click", function () {
        document.body.classList.toggle("light-mode");
        localStorage.setItem(
            "theme",
            document.body.classList.contains("light-mode") ? "light" : "dark"
        );
        updateThemeIcon();
    });
}
