
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

    try {
        const currentUser = await account.get();

if (currentUser.$id !== ADMIN_USER_ID) {
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
            await account.createEmailPasswordSession({
                email: document.getElementById("adminEmail").value.trim(),
                password: document.getElementById("adminPassword").value
            });

            message.textContent = "ورود موفق بود.";
            message.style.color = "#22c55e";

            window.location.reload();
        } catch (error) {
            console.error("Admin login error:", error);
            message.textContent =
                "ورود ناموفق بود؛ ایمیل، رمز و تنظیمات Appwrite را بررسی کن.";
            message.style.color = "#ef4444";
            button.disabled = false;
        }
    });
});