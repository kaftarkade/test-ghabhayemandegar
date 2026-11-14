"use strict";

document.addEventListener("DOMContentLoaded", async () => {
    const loginForm = document.getElementById("loginForm");
    const message = document.getElementById("formMessage");

    function normalizeDigits(value = "") {
        return value
            .replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
            .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
    }

    function say(text, color) {
        message.textContent = text;
        message.style.color = color || "#f8fafc";
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

    loginForm.addEventListener("submit", async event => {
        event.preventDefault();

        const phone = normalizeDigits(document.getElementById("phone").value.trim());
        const nationalId = normalizeDigits(document.getElementById("nationalId").value.trim());

        if (!/^09\d{9}$/.test(phone) || !/^\d{10}$/.test(nationalId)) {
            say("شماره موبایل یا کد ملی معتبر نیست.", "#ef4444");
            return;
        }

        const button = loginForm.querySelector('button[type="submit"]');
        button.disabled = true;
        say("در حال ورود...", "#f59e0b");

        try {
            try { await appwriteAccount.deleteSession({ sessionId: "current" }); } catch (_) {}

            await appwriteAccount.createEmailPasswordSession({
                email: phone + "@fani.com",
                password: nationalId
            });

            const account = await appwriteAccount.get();
            saveLocalUser(account, phone);

            say("ورود موفق بود.", "#22c55e");
            window.location.replace("index.html");
        } catch (error) {
            console.error("Login error:", error && error.code, error && error.type);

            if (error && error.type === "user_blocked") {
                say("حساب شما غیرفعال است؛ با مسئول حلقه تماس بگیر.", "#ef4444");
            } else if (error && error.code === 429) {
                say("تلاش‌های زیاد؛ چند دقیقه بعد دوباره امتحان کن.", "#ef4444");
            } else if (error && error.code === 401) {
                say("شماره موبایل یا کد ملی اشتباه است.", "#ef4444");
            } else {
                say("ورود ناموفق بود؛ اتصال اینترنت را بررسی کن.", "#ef4444");
            }
            button.disabled = false;
        }
    });
});