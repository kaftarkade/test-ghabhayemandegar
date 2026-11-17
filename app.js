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

    function conversationItem({ href, avatarClass, avatarText, title, badge, description, userId }) {
        const link = document.createElement("a");
        link.href = href;
        link.className = "conversation-item";

        const avatar = document.createElement("div");
        avatar.className = "conversation-avatar " + avatarClass;
        avatar.textContent = avatarText;
        if (userId) avatar.dataset.user = userId;

        const details = document.createElement("div");
        details.className = "conversation-details";

        const titleBox = document.createElement("div");
        titleBox.className = "conversation-title";

        const h2 = document.createElement("h2");
        h2.textContent = title;

        titleBox.append(h2);
        if (badge) {
            const status = document.createElement("span");
            status.className = "member-status";
            status.textContent = badge;
            titleBox.append(status);
        }

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

        const isManager = labels.some(l => /^manager[1-5]$/.test(l));

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

        // بررسی گزارش‌ها (مدیران)
        if (isAdmin || isManager) {
            channelsList.appendChild(conversationItem({
                href: "reports.html",
                avatarClass: "channel-avatar",
                avatarText: "🛡️",
                title: "گزارش‌ها",
                badge: isAdmin ? "مدیر کل" : "مدیر حلقه",
                description: "بررسی پیام‌های گزارش‌شده"
            }));
        }

        // پنل مدیریت برای مدیر کل و مدیران حلقه
        if (isAdmin || isManager) {
            channelsList.appendChild(conversationItem({
                href: "admin.html",
                avatarClass: "channel-avatar",
                avatarText: "⚙️",
                title: "پنل مدیریت",
                badge: isAdmin ? "مدیر کل" : "مدیر حلقه",
                description: isAdmin ? "مدیریت اعضا و حلقه‌ها" : "مدیریت اعضای حلقهٔ خودت"
            }));
        }

        initPersonal(account);
    })();

    /* ---------------- پیام‌های شخصی ---------------- */

    function initPersonal(account) {
        const searchInput = document.getElementById("dmSearch");
        const searchStatus = document.getElementById("dmSearchStatus");
        const resultsBox = document.getElementById("dmResults");
        const listBox = document.getElementById("dmList");
        const listTitle = document.getElementById("dmListTitle");
        const hint = document.getElementById("dmHint");

        const myKey = convListKey(account.$id);

        function dmItem(userId, name, description) {
            return conversationItem({
                href: "chat.html?type=dm&user=" + encodeURIComponent(userId),
                avatarClass: "ring-avatar",
                avatarText: (name || "?").trim().charAt(0) || "?",
                title: name || "کاربر",
                badge: "",
                description,
                userId
            });
        }

        /* ---- فهرست گفت‌وگوها ---- */

        async function loadConversations() {
            try {
                const result = await appwriteTablesDB.listRows({
                    databaseId: APPWRITE_DATABASE_ID,
                    tableId: APPWRITE_TABLE_ID,
                    queries: [
                        Appwrite.Query.equal("group_id", [myKey]),
                        Appwrite.Query.orderDesc("$updatedAt"),
                        Appwrite.Query.limit(50)
                    ]
                });

                const rows = result.rows.filter(r => r.record_type === "conv");

                listBox.replaceChildren();
                const ids = [];

                rows.forEach(row => {
                    let info = {};
                    try { info = JSON.parse(row.content || "{}"); } catch (_) {}
                    if (!info.w) return;

                    ids.push(info.w);
                    listBox.appendChild(dmItem(info.w, row.display_name, info.l || "گفت‌وگوی شخصی"));
                });

                listTitle.hidden = !ids.length;
                hint.hidden = !!ids.length || !!searchInput.value.trim();

                if (ids.length) {
                    await loadProfiles(ids);
                    paintAvatars(listBox);
                }
            } catch (error) {
                console.warn("loadConversations failed", error && error.message);
            }
        }

        loadConversations();

        // تازه‌سازی دوره‌ای و لحظه‌ای
        setInterval(() => { if (!document.hidden) loadConversations(); }, 10000);

        try {
            appwriteClient.subscribe([
                `tablesdb.${APPWRITE_DATABASE_ID}.tables.${APPWRITE_TABLE_ID}.rows`,
                `databases.${APPWRITE_DATABASE_ID}.collections.${APPWRITE_TABLE_ID}.documents`
            ], event => {
                const row = event && event.payload;
                if (row && row.record_type === "conv" && row.group_id === myKey) loadConversations();
            });
        } catch (_) {}

        /* ---- جستجوی اکانت ---- */

        let timer = null;
        let counter = 0;

        searchInput.addEventListener("input", () => {
            clearTimeout(timer);
            const q = searchInput.value.trim();

            if (q.length < 2) {
                resultsBox.replaceChildren();
                searchStatus.textContent = q ? "حداقل ۲ حرف بنویس." : "";
                hint.hidden = !!listBox.children.length || !!q;
                return;
            }

            searchStatus.textContent = "در حال جستجو...";
            timer = setTimeout(async () => {
                const ticket = ++counter;

                try {
                    const data = await callServer({ action: "searchUsers", q });
                    if (ticket !== counter) return; // نتیجهٔ قدیمی

                    resultsBox.replaceChildren();

                    (data.users || []).forEach(user => {
                        resultsBox.appendChild(dmItem(user.id, user.name, "شروع پیام شخصی"));
                    });

                    searchStatus.textContent = data.users && data.users.length
                        ? ""
                        : "اکانتی با این اسم پیدا نشد.";
                    hint.hidden = true;

                    await loadProfiles((data.users || []).map(u => u.id));
                    paintAvatars(resultsBox);
                } catch (error) {
                    if (ticket !== counter) return;
                    searchStatus.textContent = error.message || "جستجو ناموفق بود.";
                }
            }, 300);
        });
    }
})();