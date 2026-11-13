"use strict";

(async function () {
    const POLL_MS = 3000;

    const el = {
        title: document.getElementById("chatTitle"),
        description: document.getElementById("chatDescription"),
        subtitle: document.getElementById("chatHeaderSubtitle"),
        icon: document.getElementById("chatIcon"),
        box: document.getElementById("chatMessages"),
        status: document.getElementById("chatStatus"),
        form: document.getElementById("chatForm"),
        input: document.getElementById("chatInput"),
        send: document.getElementById("chatSend"),
        readonly: document.getElementById("chatReadonly")
    };

    function showBlocked(titleText, text, iconText) {
        el.title.textContent = titleText;
        el.description.textContent = "";
        el.icon.textContent = iconText || "⚠️";
        el.box.replaceChildren();

        const hint = document.createElement("div");
        hint.className = "chat-empty";
        hint.textContent = text;
        el.box.appendChild(hint);
    }

    /* ---------- ورود ---------- */

    let account;

    try {
        account = await appwriteAccount.get();
    } catch (_) {
        localStorage.removeItem("loggedIn");
        localStorage.removeItem("memoryUser");
        window.location.replace("login.html");
        return;
    }

    const isAdmin = account.$id === ADMIN_USER_ID;
    const labels = account.labels || [];

    /* ---------- تشخیص گفت‌وگو و دسترسی ---------- */

    const params = new URLSearchParams(window.location.search);
    const type = params.get("type");
    const group = params.get("group");

    let channelId = null;
    let allowed = false;
    let canSend = false;

    if (type === "announcements") {
        channelId = "announcements";
        allowed = isAdmin || labels.includes("member");
        canSend = isAdmin;

        el.title.textContent = "اطلاع‌رسانی پایگاه";
        el.description.textContent = "کانال رسمی اطلاعیه‌ها و برنامه‌های پایگاه";
        el.subtitle.textContent = "کانال پایگاه";
        el.icon.textContent = "📢";
        document.title = "کانال پایگاه | حلقات صالحین";
    } else if (type === "ring" && Object.prototype.hasOwnProperty.call(RING_NAMES, group)) {
        channelId = group;
        allowed = isAdmin || labels.includes(group);
        canSend = allowed;

        el.title.textContent = RING_NAMES[group];
        el.description.textContent = "گروه گفت‌وگوی " + RING_NAMES[group];
        el.subtitle.textContent = "گروه حلقه";
        el.icon.textContent = "👥";
        document.title = RING_NAMES[group] + " | حلقات صالحین";
    }

    if (!channelId) {
        showBlocked("گفت‌وگو مشخص نیست", "از صفحهٔ اصلی یک گروه یا کانال را انتخاب کن.", "↩️");
        return;
    }

    if (!allowed) {
        showBlocked("دسترسی نداری", "تو عضو این گفت‌وگو نیستی.", "🔒");
        return;
    }

    if (canSend) {
        el.form.hidden = false;
    } else {
        el.readonly.hidden = false;
        el.readonly.textContent = "فقط مدیر می‌تواند در این کانال اطلاعیه منتشر کند.";
    }

    /* ---------- نمایش پیام‌ها ---------- */

    let lastSignature = null;

    function render(rows) {
        const signature = rows.map(r => r.$id).join(",");
        if (signature === lastSignature) return;

        const firstRender = lastSignature === null;
        const nearBottom = el.box.scrollHeight - el.box.scrollTop - el.box.clientHeight < 90;
        lastSignature = signature;

        el.box.replaceChildren();

        if (!rows.length) {
            const empty = document.createElement("div");
            empty.className = "chat-empty";
            empty.textContent = canSend
                ? "هنوز پیامی نیست؛ اولین پیام را بفرست."
                : "هنوز اطلاعیه‌ای منتشر نشده است.";
            el.box.appendChild(empty);
            return;
        }

        let lastDay = "";
        let lastSender = "";

        rows.forEach(row => {
            const date = new Date(row.$createdAt);
            const day = date.toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric" });

            if (day !== lastDay) {
                const separator = document.createElement("div");
                separator.className = "chat-day";
                separator.textContent = day;
                el.box.appendChild(separator);
                lastDay = day;
                lastSender = "";
            }

            const mine = row.owner_id === account.$id;
            const wrap = document.createElement("div");
            wrap.className = "chat-msg " + (mine ? "mine" : "theirs");

            if (!mine && row.owner_id !== lastSender) {
                const sender = document.createElement("span");
                sender.className = "chat-sender";
                sender.textContent = row.display_name || "عضو";
                wrap.appendChild(sender);
            }
            lastSender = row.owner_id;

            const bubble = document.createElement("p");
            bubble.className = "chat-bubble";
            bubble.dir = "auto";
            bubble.textContent = row.content || "";
            wrap.appendChild(bubble);

            const meta = document.createElement("div");
            meta.className = "chat-meta";

            const time = document.createElement("span");
            time.textContent = date.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
            meta.appendChild(time);

            if (isAdmin) {
                const del = document.createElement("button");
                del.type = "button";
                del.className = "chat-delete";
                del.textContent = "حذف";
                del.addEventListener("click", () => deleteMessage(row.$id));
                meta.appendChild(del);
            }

            wrap.appendChild(meta);
            el.box.appendChild(wrap);
        });

        if (firstRender || nearBottom) {
            el.box.scrollTop = el.box.scrollHeight;
        }
    }

    /* ---------- دریافت پیام‌ها (هر چند ثانیه) ---------- */

    let loading = false;

    async function loadMessages() {
        if (loading) return;
        loading = true;

        try {
            const result = await appwriteTablesDB.listRows({
                databaseId: APPWRITE_DATABASE_ID,
                tableId: APPWRITE_MESSAGES_TABLE_ID,
                queries: [
                    Appwrite.Query.equal("group_id", ["m:" + (channelId === "announcements" ? "ann" : channelId)]),
                    Appwrite.Query.orderDesc("$createdAt"),
                    Appwrite.Query.limit(100)
                ]
            });

            el.status.textContent = "";
            render(result.rows.filter(r => r.record_type === "message").reverse());
        } catch (error) {
            if (error && error.code === 401) {
                window.location.replace("login.html");
                return;
            }
            console.error("Load messages error:", error);
            el.status.textContent = "خطا در دریافت پیام‌ها؛ اتصال یا تنظیمات جدول پیام‌ها را بررسی کن.";
        } finally {
            loading = false;
        }
    }

    /* ---------- کار با Worker ---------- */

    function callWorker(payload) {
        return callServer(payload);
    }

    async function deleteMessage(messageId) {
        if (!confirm("این پیام حذف شود؟")) return;

        try {
            await callWorker({ action: "deleteMessage", messageId });
            lastSignature = null;
            await loadMessages();
        } catch (error) {
            el.status.textContent = error.message;
        }
    }

    /* ---------- ارسال ---------- */

    function autosize() {
        el.input.style.height = "auto";
        el.input.style.height = Math.min(el.input.scrollHeight, 140) + "px";
    }

    el.input.addEventListener("input", autosize);

    el.input.addEventListener("keydown", event => {
        if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
            event.preventDefault();
            el.form.requestSubmit();
        }
    });

    el.form.addEventListener("submit", async event => {
        event.preventDefault();

        const text = el.input.value.trim();
        if (!text) return;

        el.send.disabled = true;
        el.status.textContent = "";

        try {
            await callWorker({ action: "sendMessage", groupId: channelId, text });
            el.input.value = "";
            autosize();
            await loadMessages();
            el.box.scrollTop = el.box.scrollHeight;
        } catch (error) {
            el.status.textContent = error.message || "ارسال ناموفق بود.";
        } finally {
            el.send.disabled = false;
            el.input.focus();
        }
    });

    /* ---------- شروع ---------- */

    await loadMessages();

    setInterval(() => {
        if (!document.hidden) loadMessages();
    }, POLL_MS);

    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) loadMessages();
    });
})();