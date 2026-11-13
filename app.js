(function () {
    "use strict";

    const tabs = document.querySelectorAll(".messenger-tab");
    const groupsPanel = document.getElementById("groups-panel");
    const channelsPanel = document.getElementById("channels-panel");
    const personalPanel = document.getElementById("personal-panel");

    // اگر در صفحه‌ای غیر از صفحهٔ اصلی اجرا شد، بدون خطا خارج شو.
    if (!tabs.length || !groupsPanel || !channelsPanel || !personalPanel) return;

    /* ---------------- تب‌ها ---------------- */

    const panels = { groups: groupsPanel, channels: channelsPanel, personal: personalPanel };
    const tabSections = {
        all: ["groups", "channels", "personal"],
        base: ["groups", "channels"],
        personal: ["personal"]
    };

    function showTab(name) {
        const visible = tabSections[name];
        if (!visible) return;

        tabs.forEach(tab => {
            const active = tab.dataset.tab === name;
            tab.classList.toggle("active", active);
            tab.setAttribute("aria-selected", String(active));
        });

        Object.keys(panels).forEach(key => {
            panels[key].hidden = !visible.includes(key);
        });
    }

    tabs.forEach(tab => tab.addEventListener("click", () => showTab(tab.dataset.tab)));
    showTab("all");

    /* ---------------- ساخت آیتم گفت‌وگو ---------------- */

    const faDigits = "۰۱۲۳۴۵۶۷۸۹";

    function conversationItem({ href, avatarClass, avatarText, title, badge, description }) {
        const link = document.createElement("a");
        link.href = href;
        link.className = "conversation-item";

        const avatar = document.createElement("div");
        avatar.className = "conversation-avatar " + avatarClass;
        avatar.textContent = avatarText;

        const details = document.createElement("div");
        details.className = "conversation-details";

        const titleBox = document.createElement("div");
        titleBox.className = "conversation-title";

        const h2 = document.createElement("h2");
        h2.textContent = title;

        const status = document.createElement("span");
        status.className = "member-status";
        status.textContent = badge;

        titleBox.append(h2, status);

        const p = document.createElement("p");
        p.textContent = description;

        details.append(titleBox, p);

        const arrow = document.createElement("span");
        arrow.className = "conversation-arrow";
        arrow.textContent = "←";

        link.append(avatar, details, arrow);
        return link;
    }

    /* ---------------- ورود و نمایش بر اساس دسترسی ---------------- */

    (async function init() {
        let account;

        try {
            account = await appwriteAccount.get();
        } catch (_) {
            localStorage.removeItem("loggedIn");
            localStorage.removeItem("memoryUser");
            window.location.replace("login.html");
            return;
        }

        // برای صفحهٔ پروفایل که از localStorage استفاده می‌کند
        if (localStorage.getItem("loggedIn") !== "true" || !localStorage.getItem("memoryUser")) {
            localStorage.setItem("memoryUser", JSON.stringify({
                name: account.name || "",
                phone: (account.prefs && account.prefs.phone) || "",
                email: ""
            }));
            localStorage.setItem("loggedIn", "true");
        }

        const isAdmin = account.$id === ADMIN_USER_ID;
        const labels = account.labels || [];
        const isMember = isAdmin || labels.includes("member");

        const groupsList = document.getElementById("groupsList");
        const channelsList = document.getElementById("channelsList");
        const groupsHint = document.getElementById("groupsHint");

        // گروه‌ها: فقط حلقهٔ خود کاربر (مدیر همه را می‌بیند)
        const myRings = Object.keys(RING_NAMES).filter(key => isAdmin || labels.includes(key));

        groupsList.replaceChildren();
        myRings.forEach(key => {
            const number = Number(key.replace("ring", ""));
            groupsList.appendChild(conversationItem({
                href: "chat.html?type=ring&group=" + key,
                avatarClass: "ring-avatar",
                avatarText: faDigits[number],
                title: RING_NAMES[key],
                badge: "گروه",
                description: "گروه گفت‌وگوی " + RING_NAMES[key]
            }));
        });

        if (!myRings.length) {
            groupsHint.hidden = false;
            groupsHint.querySelector("p").textContent =
                "هنوز به حلقه‌ای اختصاص داده نشده‌ای؛ با مدیر تماس بگیر.";
        }

        // کانال اطلاع‌رسانی پایگاه
        channelsList.replaceChildren();
        if (isMember) {
            channelsList.appendChild(conversationItem({
                href: "chat.html?type=announcements",
                avatarClass: "channel-avatar",
                avatarText: "📢",
                title: "اطلاع‌رسانی پایگاه",
                badge: "کانال",
                description: "اخبار، برنامه‌ها و اطلاعیه‌های پایگاه"
            }));
        }
    })();
})();