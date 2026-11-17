"use strict";

(async function () {
    const el = {
        list: document.getElementById("rpList"),
        status: document.getElementById("rpStatus"),
        openCount: document.getElementById("openCount"),
        tabs: document.querySelectorAll(".rp-tab")
    };

    let account;
    try {
        account = await appwriteAccount.get();
    } catch (_) {
        window.location.replace("login.html");
        return;
    }

    const isAdmin = account.$id === ADMIN_USER_ID;
    const isManager = (account.labels || []).some(l => /^manager[1-5]$/.test(l));

    if (!isAdmin && !isManager) {
        el.list.innerHTML = "";
        const msg = document.createElement("div");
        msg.className = "rp-empty";
        msg.textContent = "فقط مدیران به این صفحه دسترسی دارند.";
        el.list.appendChild(msg);
        return;
    }

    let rows = [];
    let tab = "open";

    function parse(row) {
        let c = {};
        try { c = JSON.parse(row.content || "{}"); } catch (_) {}
        return c;
    }

    function placeName(g) {
        g = String(g || "");
        if (g === "m:ann") return "کانال اطلاع‌رسانی پایگاه";
        if (g.startsWith("m:ring")) return RING_NAMES["ring" + g.slice(6)] || "گروه حلقه";
        if (g.startsWith("d:")) return "پیام شخصی";
        return "نامشخص";
    }

    function when(iso) {
        const d = new Date(iso);
        return d.toLocaleDateString("fa-IR") + " ساعت " +
            d.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
    }

    function line(label, value) {
        const p = document.createElement("div");
        const b = document.createElement("b");
        b.textContent = label + ": ";
        p.append(b, document.createTextNode(value));
        return p;
    }

    function buildMedia(c) {
        const wrap = document.createElement("div");
        wrap.className = "rp-media";

        if (c.k === "image") {
            const holder = document.createElement("button");
            holder.type = "button";
            holder.textContent = "در حال بارگذاری تصویر...";
            wrap.appendChild(holder);

            fileBlobUrl(c.f).then(url => {
                wrap.replaceChildren();
                const img = document.createElement("img");
                img.src = url;
                img.addEventListener("click", () => openImageViewer(url, "report-" + Date.now()));
                wrap.appendChild(img);
            }).catch(error => {
                holder.textContent = "تصویر بارگذاری نشد" + (error && error.code ? " (کد " + error.code + ")" : "");
            });
        } else if (c.k === "video") {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = "▶ نمایش ویدیو";
            button.addEventListener("click", async () => {
                button.disabled = true;
                button.textContent = "در حال دریافت...";
                try {
                    const url = await fileBlobUrl(c.f);
                    wrap.replaceChildren();
                    const video = document.createElement("video");
                    video.src = url;
                    video.controls = true;
                    video.playsInline = true;
                    wrap.appendChild(video);
                } catch (error) {
                    button.disabled = false;
                    button.textContent = "دریافت ناموفق بود" + (error && error.code ? " (کد " + error.code + ")" : "");
                }
            });
            wrap.appendChild(button);
        }
        return wrap;
    }

    async function resolve(row, decision, buttons) {
        const sure = decision === "approve"
            ? "گزارش تأیید و پیام برای همیشه حذف شود؟"
            : "این گزارش رد شود؟ پیام سر جایش می‌ماند.";
        if (!confirm(sure)) return;

        buttons.forEach(b => { b.disabled = true; });
        try {
            await callServer({ action: "resolveReport", reportId: row.$id, decision });
            await load();
        } catch (error) {
            el.status.textContent = error.message || "انجام نشد.";
            buttons.forEach(b => { b.disabled = false; });
        }
    }

    function render() {
        const open = rows.filter(r => parse(r).st === "open");
        const done = rows.filter(r => parse(r).st !== "open");

        el.openCount.textContent = open.length ? "(" + open.length.toLocaleString("fa-IR") + ")" : "";

        const shown = tab === "open" ? open : done;
        el.list.replaceChildren();

        if (!shown.length) {
            const empty = document.createElement("div");
            empty.className = "rp-empty";
            empty.textContent = tab === "open" ? "گزارشی در انتظار بررسی نیست. ✅" : "هنوز گزارشی بررسی نشده است.";
            el.list.appendChild(empty);
            return;
        }

        shown.forEach(row => {
            const c = parse(row);

            const card = document.createElement("article");
            card.className = "rp-card";

            const head = document.createElement("div");
            head.className = "rp-head";
            const time = document.createElement("span");
            time.textContent = when(c.at || row.$createdAt);
            const badge = document.createElement("span");
            badge.className = "rp-badge " + (c.st || "open");
            badge.textContent = c.st === "approved" ? "تأیید و حذف شد" : c.st === "rejected" ? "رد شد" : "در انتظار";
            head.append(time, badge);
            card.appendChild(head);

            const info = document.createElement("div");
            info.className = "rp-info";
            info.append(line("محل پیام", placeName(c.g)), line("نویسندهٔ پیام", c.on || "نامشخص"));
            card.appendChild(info);

            if (c.f) card.appendChild(buildMedia(c));

            if (c.tx) {
                const quote = document.createElement("div");
                quote.className = "rp-quote";
                quote.dir = "auto";
                quote.textContent = c.tx;
                card.appendChild(quote);
            } else if (!c.f) {
                const quote = document.createElement("div");
                quote.className = "rp-quote";
                quote.textContent = "(پیام دیگر وجود ندارد)";
                card.appendChild(quote);
            }

            const reporters = document.createElement("ul");
            reporters.className = "rp-reporters";
            (c.rs || []).forEach(r => {
                const li = document.createElement("li");
                li.textContent = "🚩 " + (r.n || "عضو") + " — " + (r.r || "");
                reporters.appendChild(li);
            });
            card.appendChild(reporters);

            if (c.st === "open") {
                const actions = document.createElement("div");
                actions.className = "rp-actions";

                const approve = document.createElement("button");
                approve.type = "button";
                approve.className = "rp-approve";
                approve.textContent = "✅ تأیید و حذف پیام";

                const reject = document.createElement("button");
                reject.type = "button";
                reject.className = "rp-reject";
                reject.textContent = "❌ رد گزارش";

                approve.addEventListener("click", () => resolve(row, "approve", [approve, reject]));
                reject.addEventListener("click", () => resolve(row, "reject", [approve, reject]));

                actions.append(approve, reject);
                card.appendChild(actions);
            } else {
                const result = document.createElement("p");
                result.className = "rp-result";
                result.textContent = "بررسی‌شده توسط " + (c.rb || "مدیر") + (c.rt ? " — " + when(c.rt) : "");
                card.appendChild(result);
            }

            el.list.appendChild(card);
        });
    }

    async function load() {
        try {
            const result = await appwriteTablesDB.listRows({
                databaseId: APPWRITE_DATABASE_ID,
                tableId: APPWRITE_TABLE_ID,
                queries: [
                    Appwrite.Query.equal("group_id", ["rp"]),
                    Appwrite.Query.orderDesc("$createdAt"),
                    Appwrite.Query.limit(100)
                ]
            });

            rows = result.rows.filter(r => r.record_type === "report");
            el.status.textContent = "";
            render();
        } catch (error) {
            if (error && error.code === 401) { window.location.replace("login.html"); return; }
            el.status.textContent = "خطا در دریافت گزارش‌ها؛ اتصال اینترنت را بررسی کن.";
        }
    }

    el.tabs.forEach(button => {
        button.addEventListener("click", () => {
            tab = button.dataset.tab;
            el.tabs.forEach(b => b.classList.toggle("active", b === button));
            render();
        });
    });

    await load();

    try {
        appwriteClient.subscribe([
            `tablesdb.${APPWRITE_DATABASE_ID}.tables.${APPWRITE_TABLE_ID}.rows`,
            `databases.${APPWRITE_DATABASE_ID}.collections.${APPWRITE_TABLE_ID}.documents`
        ], event => {
            const row = event && event.payload;
            if (row && row.record_type === "report") load();
        });
    } catch (_) {}

    setInterval(() => { if (!document.hidden) load(); }, 15000);
})();
