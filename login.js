"use strict";

document.addEventListener("DOMContentLoaded", async () => {
    const loginForm = document.getElementById("loginForm");
    const codeForm = document.getElementById("codeForm");
    const codeHint = document.getElementById("codeHint");
    const backButton = document.getElementById("backToLogin");
    const message = document.getElementById("formMessage");

    let pending = null; // { userId, phone }

    function normalizeDigits(value = "") {
        return value
            .replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
            .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
    }

    function say(text, color) {
        message.textContent = text;
        message.style.color = color || "#f8fafc";
    }

    function maskEmail(email) {
        const [name, domain] = email.split("@");
        return name.slice(0, 2) + "***@" + domain;
    }

    function saveLocalUser(account, phone) {
        localStorage.setItem("memoryUser", JSON.stringify({
            name: account.name || "",
            phone: phone || (account.prefs && account.prefs.phone) || "",
            email: ""
        }));
        localStorage.setItem("loggedIn", "true");
    }

    // اگر قبلاً وارد شده، مستقیم برو صفحهٔ اصلی
    try {
        const current = await appwriteAccount.get();
        if (current.$id !== ADMIN_USER_ID) {
            saveLocalUser(current);
            window.location.replace("index.html");
            return;
        }
    } catch (_) { /* نشست فعالی نیست */ }

    /* ---------- مرحلهٔ ۱: شماره + کد ملی → ارسال کد ---------- */

    loginForm.addEventListener("submit", async event => {
        event.preventDefault();

        const phone = normalizeDigits(document.getElementById("phone").value.trim());
        const nationalId = normalizeDigits(document.getElementById("nationalId").value.trim());
        const email = document.getElementById("loginEmail").value.trim().toLowerCase();

        if (!/^09\d{9}$/.test(phone) || !/^\d{10}$/.test(nationalId)) {
            say("شماره موبایل یا کد ملی معتبر نیست.", "#ef4444");
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
            say("ایمیل معتبر نیست.", "#ef4444");
            return;
        }

        const button = loginForm.querySelector('button[type="submit"]');
        button.disabled = true;
        say("در حال بررسی...", "#f59e0b");

        try {
            try { await appwriteAccount.deleteSession({ sessionId: "current" }); } catch (_) {}

            // تابع سرور شماره و کد ملی را چک می‌کند
            const info = await callServer({ action: "requestLogin", phone, nationalId, email });

            // Appwrite کد ۶ رقمی را به ایمیل عضو می‌فرستد
            const token = await appwriteAccount.createEmailToken({
                userId: info.userId,
                email: info.email
            });

            pending = { userId: token.userId, phone };
            codeHint.textContent = "کد ۶ رقمی به ایمیل " + maskEmail(info.email) +
                " ارسال شد. (پوشهٔ اسپم را هم نگاه کن)";
            loginForm.hidden = true;
            codeForm.hidden = false;
            document.getElementById("otpCode").focus();
            say("");
        } catch (error) {
            console.error("Request code error:", error && error.code, error && error.type);

            if (error && error.code === 429) {
                say("تلاش‌های زیاد؛ چند دقیقه بعد دوباره امتحان کن.", "#ef4444");
            } else {
                say(error.message || "ارسال کد ناموفق بود.", "#ef4444");
            }
        } finally {
            button.disabled = false;
        }
    });

    /* ---------- مرحلهٔ ۲: وارد کردن کد ---------- */

    codeForm.addEventListener("submit", async event => {
        event.preventDefault();
        if (!pending) return;

        const code = normalizeDigits(document.getElementById("otpCode").value.trim());
        if (!/^\d{6}$/.test(code)) {
            say("کد باید ۶ رقم باشد.", "#ef4444");
            return;
        }

        const button = codeForm.querySelector('button[type="submit"]');
        button.disabled = true;
        say("در حال ورود...", "#f59e0b");

        try {
            await appwriteAccount.createSession({ userId: pending.userId, secret: code });

            const account = await appwriteAccount.get();
            saveLocalUser(account, pending.phone);

            say("ورود موفق بود.", "#22c55e");
            window.location.replace("index.html");
        } catch (error) {
            console.error("Verify code error:", error && error.code, error && error.type);

            if (error && error.type === "user_blocked") {
                say("حساب شما غیرفعال است؛ با مدیر تماس بگیر.", "#ef4444");
            } else if (error && error.code === 429) {
                say("تلاش‌های زیاد؛ چند دقیقه بعد دوباره امتحان کن.", "#ef4444");
            } else {
                say("کد اشتباه یا منقضی شده است.", "#ef4444");
            }
            button.disabled = false;
        }
    });

    backButton.addEventListener("click", () => {
        pending = null;
        codeForm.hidden = true;
        loginForm.hidden = false;
        document.getElementById("otpCode").value = "";
        say("");
    });
});