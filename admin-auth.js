
"use strict";

document.addEventListener("DOMContentLoaded", async () => {
    const panel = document.getElementById("adminLoginPanel");
    const form = document.getElementById("adminLoginForm");
    const message = document.getElementById("adminLoginMessage");

    const protectedSections = [
        document.querySelector(".header"),
        ...document.querySelectorAll("main.container > .panel")
    ].filter(section => section && section !== panel);

    const account = new Appwrite.Account(appwriteClient);

    function showAdmin(isLoggedIn) {
        panel.hidden = isLoggedIn;
        protectedSections.forEach(section => {
            section.hidden = !isLoggedIn;
        });
    }

    const checkStaff = user =>
        user.$id === ADMIN_USER_ID || (user.labels || []).some(l => /^manager[1-5]$/.test(l));

    try {
        const currentUser = await account.get();

const isStaff = checkStaff(currentUser);

if (!isStaff) {
    await account.deleteSession({ sessionId: "current" });
    showAdmin(false);
    message.textContent = "این حساب اجازهٔ ورود به پنل مدیریت را ندارد.";
    message.style.color = "#ef4444";
} else {
    showAdmin(true);
}
    } catch (_) {
        showAdmin(false);
    }

    const logoutButton = document.getElementById("adminLogout");
    if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
            try { await account.deleteSession({ sessionId: "current" }); } catch (_) {}
            window.location.reload();
        });
    }

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const button = form.querySelector('button[type="submit"]');
        button.disabled = true;
        message.textContent = "در حال ورود...";
        message.style.color = "#f59e0b";

        try {
            // مدیر کل: ایمیل + رمز | مدیر حلقه: شماره موبایل + کد ملی
            const norm = v => v
                .replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
                .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));

            let identifier = norm(document.getElementById("adminEmail").value.trim());
            let password = document.getElementById("adminPassword").value;

            if (/^09\d{9}$/.test(identifier)) {
                identifier = identifier + "@fani.com";
                password = norm(password);
            }

            // اگر نشست قدیمی (مثلاً عضو عادی) باز مانده، اول بسته می‌شود
            try { await account.deleteSession({ sessionId: "current" }); } catch (_) {}

            await account.createEmailPasswordSession({ email: identifier, password });

            // مطمئن می‌شویم نشست واقعاً ساخته شده و این حساب اجازهٔ ورود دارد
            const user = await account.get();

            if (!checkStaff(user)) {
                try { await account.deleteSession({ sessionId: "current" }); } catch (_) {}
                message.textContent = "این حساب اجازهٔ ورود به پنل مدیریت را ندارد.";
                message.style.color = "#ef4444";
                button.disabled = false;
                return;
            }

            message.textContent = "ورود موفق بود.";
            message.style.color = "#22c55e";

            window.location.reload();
        } catch (error) {
            console.error("Admin login error:", error);

            if (error && error.code === 401) {
                message.textContent = "ایمیل (یا شماره) یا رمز اشتباه است.";
            } else if (error && error.code === 429) {
                message.textContent = "تلاش‌های زیاد؛ چند دقیقه صبر کن و دوباره امتحان کن.";
            } else if (error && error.type === "user_blocked") {
                message.textContent = "این حساب غیرفعال است.";
            } else {
                message.textContent = "ورود ناموفق بود: " + ((error && error.message) || "خطای نامشخص") +
                    " (کد: " + ((error && error.code) || "-") + ")";
            }
            message.style.color = "#ef4444";
            button.disabled = false;
        }
    });
});