"use strict";

(async function () {
    const POLL_MS = 5000; // پشتیبان؛ پیام‌ها اصلاً از طریق Realtime لحظه‌ای می‌رسند
    const MAX_VIDEO = 25 * 1024 * 1024;
    const MAX_IMAGE = 15 * 1024 * 1024;
    const REPORT_REASONS = ["محتوای نامناسب", "توهین یا آزار", "هرزنامه یا تبلیغ", "سایر"];

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
        readonly: document.getElementById("chatReadonly"),
        attachBtn: document.getElementById("chatAttachBtn"),
        file: document.getElementById("chatFile"),
        attachment: document.getElementById("chatAttachment"),
        context: document.getElementById("chatContext")
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

    let statusTimer = null;
    function notify(text, good) {
        el.status.textContent = text;
        el.status.style.color = good ? "#15803d" : "#dc2626";
        clearTimeout(statusTimer);
        if (text) statusTimer = setTimeout(() => { el.status.textContent = ""; }, 3500);
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
    const mgrLabel = labels.find(l => /^manager[1-5]$/.test(l));
    const isManager = !!mgrLabel;
    const managerRing = mgrLabel ? "ring" + mgrLabel.slice(7) : null;

    /* ---------- تشخیص گفت‌وگو و دسترسی ---------- */

    const params = new URLSearchParams(window.location.search);
    const type = params.get("type");
    const group = params.get("group");

    let channelId = null;   // announcements | ringN | null (پیام شخصی)
    let channelKey = null;  // مقدار group_id در جدول
    let otherId = null;
    let allowed = false;
    let canSend = false;

    if (type === "announcements") {
        channelId = "announcements";
        channelKey = "m:ann";
        allowed = isAdmin || labels.includes("member");
        canSend = isAdmin || isManager;

        el.title.textContent = "اطلاع‌رسانی پایگاه";
        el.description.textContent = "کانال رسمی اطلاعیه‌ها و برنامه‌های پایگاه";
        el.subtitle.textContent = "کانال پایگاه";
        el.icon.textContent = "📢";
        document.title = "کانال پایگاه | حلقات صالحین";
    } else if (type === "ring" && Object.prototype.hasOwnProperty.call(RING_NAMES, group)) {
        channelId = group;
        channelKey = "m:" + group;
        allowed = isAdmin || labels.includes(group);
        canSend = allowed;

        el.title.textContent = RING_NAMES[group];
        el.description.textContent = "گروه گفت‌وگوی " + RING_NAMES[group];
        el.subtitle.textContent = "گروه حلقه";
        el.icon.textContent = "👥";
        document.title = RING_NAMES[group] + " | حلقات صالحین";
    } else if (type === "dm") {
        otherId = params.get("user");

        if (!otherId || otherId === account.$id) {
            showBlocked("گفت‌وگو مشخص نیست", "از بخش «شخصی» یک نفر را انتخاب کن.", "↩️");
            return;
        }

        el.title.textContent = "پیام شخصی";
        el.description.textContent = "در حال بارگذاری...";
        el.subtitle.textContent = "پیام شخصی";
        el.icon.textContent = "💬";

        try {
            const info = await callServer({ action: "getContacts", ids: [otherId] });
            const contact = (info.users || [])[0];
            if (!contact) throw new Error("not found");

            channelKey = dmKey(account.$id, otherId);
            allowed = true;
            canSend = true;

            el.title.textContent = contact.name || "کاربر";
            el.description.textContent = "گفت‌وگوی خصوصی؛ فقط شما دو نفر می‌بینید";
            document.title = (contact.name || "پیام شخصی") + " | حلقات صالحین";

            // با لمس عنوان یا آیکون، پروفایل طرف مقابل باز می‌شود
            [el.title, el.icon].forEach(node => {
                node.style.cursor = "pointer";
                node.addEventListener("click", () => openProfileCard(otherId, contact.name, { hideDm: true }));
            });
        } catch (_) {
            showBlocked("کاربر پیدا نشد", "این کاربر وجود ندارد یا عضو نیست.", "🔍");
            return;
        }
    }

    if (!channelKey) {
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
        el.readonly.textContent = "فقط مدیران می‌توانند در این کانال اطلاعیه منتشر کنند.";
    }

    // پروفایل (عکس + بیوگرافی) کانال پایگاه و گروه‌ها
    const channelProfileId = channelId === "announcements" ? "chan-ann" : (channelId ? "chan-" + channelId : null);
    const canEditChannel = !!channelProfileId &&
        (isAdmin || (channelId === "announcements" ? isManager : managerRing === channelId));
    const channelTitle = el.title.textContent;

    // مدیر کل همه را؛ مدیر حلقه پیام‌های کانال پایگاه و حلقهٔ خودش را حذف می‌کند
    const canModerate = !otherId && (isAdmin || (!!managerRing && (channelId === "announcements" || channelId === managerRing)));

    /* ---------- محتوای پیام ---------- */

    function parseContent(row) {
        const info = { text: "", fileId: "", kind: "", size: 0, reply: null, edited: false };
        const raw = row.content || "";

        if (raw.startsWith('{"_m":1')) {
            try {
                const o = JSON.parse(raw);
                info.text = o.t || "";
                info.fileId = o.f || "";
                info.kind = o.k || "";
                info.size = o.s || 0;
                info.reply = o.r || null;
                info.edited = !!o.e;
            } catch (_) { info.text = raw; }
        } else {
            info.text = raw;
        }

        if (row.pendingKind) info.kind = row.pendingKind;
        if (row.pendingReply) info.reply = row.pendingReply;
        info.localUrl = row.localUrl || "";
        return info;
    }

    function buildContent(o) {
        if (!o.fileId && !o.reply && !o.edited) return o.text;
        const out = { _m: 1, t: o.text };
        if (o.fileId) { out.f = o.fileId; out.k = o.kind; out.s = o.size; }
        if (o.reply) out.r = o.reply;
        if (o.edited) out.e = 1;
        return JSON.stringify(out);
    }

    function snippetOf(info) {
        return (info.text || (info.kind === "video" ? "🎬 ویدیو" : info.kind === "image" ? "📷 تصویر" : "")).slice(0, 60);
    }

    /* ---------- فهرست پیام‌ها (در حافظه) ---------- */

    let currentRows = [];
    let lastSignature = null;

    const timeOf = row => new Date(row.$createdAt).getTime();

    function upsert(row) {
        const i = currentRows.findIndex(r => r.$id === row.$id);
        if (i >= 0) {
            // نسخهٔ محلی (پیش‌نمایش عکس) حفظ می‌شود
            row.localUrl = row.localUrl || currentRows[i].localUrl;
            currentRows[i] = row;
        } else {
            currentRows.push(row);
        }
        currentRows.sort((a, b) => timeOf(a) - timeOf(b));
    }

    function megabytes(bytes) {
        return (bytes / 1048576).toLocaleString("fa-IR", { maximumFractionDigits: 1 }) + " مگابایت";
    }

    function buildMedia(info) {
        const wrap = document.createElement("div");
        wrap.className = "chat-media";

        const setImage = url => {
            wrap.replaceChildren();
            const img = document.createElement("img");
            img.src = url;
            img.alt = "تصویر";
            img.addEventListener("click", () => {
                if (Date.now() - lastLongPress < 700) return;
                openImageViewer(url, "photo-" + Date.now());
            });
            wrap.appendChild(img);
        };

        const setVideo = url => {
            wrap.replaceChildren();
            const video = document.createElement("video");
            video.src = url;
            video.controls = true;
            video.playsInline = true;
            wrap.appendChild(video);
            return video;
        };

        if (info.kind === "image") {
            const ready = info.localUrl || fileUrlIfReady(info.fileId);
            if (ready) {
                setImage(ready);
            } else {
                const holder = document.createElement("div");
                holder.className = "chat-placeholder";
                holder.textContent = "در حال بارگذاری تصویر...";
                wrap.appendChild(holder);

                fileBlobUrl(info.fileId).then(setImage).catch(error => {
                    holder.textContent = "تصویر بارگذاری نشد" +
                        (error && error.code ? " (کد " + error.code + ")" : "");
                });
            }
        } else if (info.kind === "video") {
            if (info.localUrl) {
                setVideo(info.localUrl);
            } else {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "chat-video-btn";
                button.textContent = "▶ پخش ویدیو" + (info.size ? " (" + megabytes(info.size) + ")" : "");
                button.addEventListener("click", async () => {
                    button.disabled = true;
                    button.textContent = "در حال دریافت ویدیو...";
                    try {
                        const url = await fileBlobUrl(info.fileId);
                        setVideo(url).play().catch(() => {});
                    } catch (error) {
                        button.disabled = false;
                        button.textContent = "دریافت ناموفق بود" +
                            (error && error.code ? " (کد " + error.code + ")" : "") + "؛ دوباره بزن";
                    }
                });
                wrap.appendChild(button);
            }
        }
        return wrap;
    }

    function scrollToMessage(id) {
        const line = el.box.querySelector('.chat-row[data-id="' + CSS.escape(id) + '"]');
        if (!line) {
            notify("پیام اصلی در این فهرست نیست.");
            return;
        }
        line.scrollIntoView({ block: "center", behavior: "smooth" });
        line.classList.add("flash");
        setTimeout(() => line.classList.remove("flash"), 1400);
    }

    function render(forceScroll) {
        const rows = currentRows;
        const signature = rows.map(r => r.$id + (r.pending ? "*" : "") + "|" + (r.content || "").length).join(",");
        if (signature === lastSignature && !forceScroll) return;

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
            const info = parseContent(row);

            const line = document.createElement("div");
            line.className = "chat-row " + (mine ? "mine" : "theirs");
            line.dataset.id = row.$id;
            if (row.pending) line.style.opacity = "0.6";

            if (channelId === "announcements") {
                line.appendChild(createAvatar("chan-ann", "اطلاع‌رسانی"));
            } else {
                line.appendChild(createAvatar(row.owner_id, row.display_name || (mine ? account.name : "")));
            }

            const wrap = document.createElement("div");
            wrap.className = "chat-msg";

            // در کانال اطلاع‌رسانی اسم فرستنده نمایش داده نمی‌شود
            if (!mine && channelId !== "announcements" && row.owner_id !== lastSender) {
                const sender = document.createElement("span");
                sender.className = "chat-sender";
                sender.textContent = row.display_name || "عضو";
                wrap.appendChild(sender);
            }
            lastSender = row.owner_id;

            if (info.reply) {
                const quote = document.createElement("div");
                quote.className = "chat-quote";
                const qn = document.createElement("b");
                qn.textContent = info.reply.n || "پیام";
                const qt = document.createElement("span");
                qt.textContent = info.reply.t || "";
                quote.append(qn, qt);
                quote.addEventListener("click", () => {
                    if (Date.now() - lastLongPress < 700) return;
                    scrollToMessage(info.reply.i);
                });
                wrap.appendChild(quote);
            }

            if (info.kind) wrap.appendChild(buildMedia(info));

            if (info.text) {
                const bubble = document.createElement("p");
                bubble.className = "chat-bubble";
                bubble.dir = "auto";
                bubble.textContent = info.text;
                wrap.appendChild(bubble);
            }

            const meta = document.createElement("div");
            meta.className = "chat-meta";

            const time = document.createElement("span");
            time.textContent = row.pending
                ? "در حال ارسال..."
                : date.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
            meta.appendChild(time);

            if (info.edited) {
                const edited = document.createElement("span");
                edited.className = "chat-edited";
                edited.textContent = "ویرایش‌شده";
                meta.appendChild(edited);
            }

            wrap.appendChild(meta);
            line.appendChild(wrap);
            el.box.appendChild(line);
        });

        if (firstRender || nearBottom || forceScroll) {
            el.box.scrollTop = el.box.scrollHeight;
        }

        refreshProfiles();
    }

    /* ---------- عکس پروفایل کنار پیام‌ها ---------- */

    async function refreshProfiles() {
        const ids = currentRows.map(r => r.owner_id);
        if (channelProfileId) ids.push(channelProfileId);
        await loadProfiles(ids);
        paintAvatars(el.box);
        paintChannelHeader();
    }

    let lastLongPress = 0;

    el.box.addEventListener("click", event => {
        if (Date.now() - lastLongPress < 700) return;
        const avatar = event.target.closest(".avatar");
        if (avatar && avatar.dataset.user === "chan-ann") {
            openChannelCard();
        } else if (avatar) {
            openProfileCard(avatar.dataset.user, avatar.dataset.name, {
                hideDm: !!otherId && avatar.dataset.user === otherId
            });
        }
    });

    /* ---------- دریافت از سرور ---------- */

    let loading = false;

    async function loadMessages() {
        if (loading) return;
        loading = true;

        try {
            const result = await appwriteTablesDB.listRows({
                databaseId: APPWRITE_DATABASE_ID,
                tableId: APPWRITE_MESSAGES_TABLE_ID,
                queries: [
                    Appwrite.Query.equal("group_id", [channelKey]),
                    Appwrite.Query.orderDesc("$createdAt"),
                    Appwrite.Query.limit(100)
                ]
            });

            const serverRows = result.rows.filter(r => r.record_type === "message").reverse();
            const serverIds = new Set(serverRows.map(r => r.$id));
            const newest = serverRows.length ? serverRows[serverRows.length - 1].$createdAt : "";

            // پیش‌نمایش محلی عکس‌ها حفظ می‌شود
            const localUrls = new Map(currentRows.filter(r => r.localUrl).map(r => [r.$id, r.localUrl]));
            serverRows.forEach(r => { if (localUrls.has(r.$id)) r.localUrl = localUrls.get(r.$id); });

            // پیام‌های در حال ارسال یا تازه‌تر از آخرین پیام سرور را نگه می‌داریم
            const keep = currentRows.filter(
                r => !serverIds.has(r.$id) && (r.pending || r.$createdAt > newest)
            );

            currentRows = serverRows.concat(keep);
            if (!el.status.textContent.startsWith("گزارش")) el.status.textContent = "";
            render();
        } catch (error) {
            if (error && error.code === 401) {
                window.location.replace("login.html");
                return;
            }
            console.error("Load messages error:", error);
            notify("خطا در دریافت پیام‌ها؛ اتصال اینترنت را بررسی کن.");
        } finally {
            loading = false;
        }
    }

    /* ---------- دریافت لحظه‌ای (Realtime) ---------- */

    function startRealtime() {
        try {
            const channels = [
                `tablesdb.${APPWRITE_DATABASE_ID}.tables.${APPWRITE_TABLE_ID}.rows`,
                `databases.${APPWRITE_DATABASE_ID}.collections.${APPWRITE_TABLE_ID}.documents`
            ];

            appwriteClient.subscribe(channels, event => {
                const row = event && event.payload;
                if (!row || row.record_type !== "message" || row.group_id !== channelKey) return;

                const deleted = (event.events || []).some(name => /\.delete$/.test(name));

                if (deleted) {
                    currentRows = currentRows.filter(r => r.$id !== row.$id);
                } else {
                    upsert(row);
                }
                render();
            });
        } catch (error) {
            console.warn("Realtime در دسترس نیست؛ فقط بازخوانی دوره‌ای فعال است.", error);
        }
    }

    /* ---------- پروفایل کانال / گروه ---------- */

    function paintChannelHeader() {
        if (!channelProfileId) return;
        el.icon.dataset.user = channelProfileId;
        paintAvatar(el.icon);

        const profile = profileCache.get(channelProfileId) || {};
        if (profile.bio) el.description.textContent = profile.bio;
    }

    function openChannelCard() {
        if (!channelProfileId) return;
        openProfileCard(channelProfileId, channelTitle, {
            hideDm: true,
            actionLabel: canEditChannel ? "✏️ ویرایش عکس و بیوگرافی" : "",
            onAction: openChannelEditor
        });
    }

    if (channelProfileId) {
        [el.title, el.icon].forEach(node => {
            node.style.cursor = "pointer";
            node.addEventListener("click", openChannelCard);
        });
    }

    function openChannelEditor() {
        const profile = profileCache.get(channelProfileId) || {};
        let newFile = null;
        let removePhoto = false;

        const overlay = document.createElement("div");
        overlay.className = "pc-overlay";

        const card = document.createElement("div");
        card.className = "pc-card";

        const title = document.createElement("h2");
        title.textContent = "ویرایش " + channelTitle;

        const preview = document.createElement("div");
        preview.className = "pc-avatar";
        preview.style.cursor = "pointer";
        preview.textContent = (channelTitle || "?").trim().charAt(0);
        if (profile.avatar) {
            preview.dataset.user = channelProfileId;
            paintAvatar(preview);
        }

        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.hidden = true;

        preview.addEventListener("click", () => fileInput.click());
        fileInput.addEventListener("change", () => {
            const f = fileInput.files[0];
            if (!f || !f.type.startsWith("image/")) return;
            newFile = f;
            removePhoto = false;
            preview.textContent = "";
            preview.classList.add("has-img");
            preview.style.backgroundImage = 'url("' + URL.createObjectURL(f) + '")';
        });

        const hint = document.createElement("p");
        hint.className = "pc-bio empty";
        hint.textContent = "برای تغییر عکس، روی دایره بزن.";

        const bio = document.createElement("textarea");
        bio.className = "pc-textarea";
        bio.maxLength = 150;
        bio.rows = 3;
        bio.placeholder = "بیوگرافی (حداکثر ۱۵۰ کاراکتر)";
        bio.value = profile.bio || "";

        const message = document.createElement("p");
        message.className = "pc-bio empty";

        const save = document.createElement("button");
        save.type = "button";
        save.className = "pc-dm";
        save.textContent = "ذخیره";

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "pc-dm pc-secondary";
        removeBtn.textContent = "حذف عکس";
        removeBtn.addEventListener("click", () => {
            newFile = null;
            removePhoto = true;
            preview.classList.remove("has-img");
            preview.style.backgroundImage = "";
            preview.textContent = (channelTitle || "?").trim().charAt(0);
        });

        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.className = "pc-dm pc-secondary";
        cancel.textContent = "انصراف";
        cancel.addEventListener("click", () => overlay.remove());

        save.addEventListener("click", async () => {
            save.disabled = true;
            message.textContent = "در حال ذخیره...";

            try {
                const payload = { action: "updateChannelProfile", channel: channelId, bio: bio.value };

                if (newFile) {
                    const small = await compressImage(newFile, 512, 0.85);
                    payload.avatarFileId = await uploadToBucket(small);
                } else if (removePhoto) {
                    payload.removeAvatar = true;
                }

                await callServer(payload);

                profileCache.delete(channelProfileId);
                await loadProfiles([channelProfileId]);
                paintChannelHeader();
                el.box.querySelectorAll('[data-user="chan-ann"]').forEach(a => { a.dataset.painted = ""; });
                paintAvatars(el.box);

                overlay.remove();
                notify("پروفایل ذخیره شد.", true);
            } catch (error) {
                message.textContent = error.message || "ذخیره ناموفق بود.";
                save.disabled = false;
            }
        });

        card.append(title, preview, hint, fileInput, bio, message, save, removeBtn, cancel);
        overlay.appendChild(card);
        overlay.addEventListener("click", event => { if (event.target === overlay) overlay.remove(); });
        document.body.appendChild(overlay);
    }

    /* ---------- پنجرهٔ عملیات (نگه‌داشتن روی پیام) ---------- */

    let activeSheet = null;

    function closeSheet() {
        if (activeSheet) { activeSheet.remove(); activeSheet = null; }
    }

    function showSheet(titleText, items) {
        closeSheet();

        const overlay = document.createElement("div");
        overlay.className = "sheet-overlay";

        const sheet = document.createElement("div");
        sheet.className = "sheet";

        if (titleText) {
            const title = document.createElement("div");
            title.className = "sheet-title";
            title.textContent = titleText;
            sheet.appendChild(title);
        }

        items.forEach(item => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "sheet-item" + (item.danger ? " danger" : "");

            const icon = document.createElement("span");
            icon.textContent = item.icon;
            const label = document.createElement("b");
            label.textContent = item.label;
            label.style.fontWeight = "500";

            button.append(icon, label);
            button.addEventListener("click", () => { closeSheet(); item.run(); });
            sheet.appendChild(button);
        });

        overlay.appendChild(sheet);
        overlay.addEventListener("click", event => { if (event.target === overlay) closeSheet(); });
        document.body.appendChild(overlay);
        activeSheet = overlay;
    }

    function openActions(row) {
        if (row.pending || activeSheet) return;

        const info = parseContent(row);
        const mine = row.owner_id === account.$id;
        const items = [{ icon: "↩️", label: "پاسخ", run: () => startReply(row) }];

        if (info.text) items.push({ icon: "📋", label: "کپی کردن پیام", run: () => copyText(info.text) });
        if (mine) items.push({ icon: "✏️", label: "ویرایش", run: () => startEdit(row) });
        if (mine || canModerate) items.push({ icon: "🗑️", label: "حذف", danger: true, run: () => deleteMessage(row) });
        if (!mine) items.push({ icon: "🚩", label: "گزارش", run: () => chooseReportReason(row) });

        showSheet("", items);
    }

    async function copyText(text) {
        try {
            await navigator.clipboard.writeText(text);
        } catch (_) {
            const area = document.createElement("textarea");
            area.value = text;
            document.body.appendChild(area);
            area.select();
            try { document.execCommand("copy"); } catch (_) {}
            area.remove();
        }
        notify("پیام کپی شد.", true);
    }

    function chooseReportReason(row) {
        showSheet("دلیل گزارش این پیام چیست؟", REPORT_REASONS.map(reason => ({
            icon: "🚩",
            label: reason,
            run: () => sendReport(row, reason)
        })));
    }

    async function sendReport(row, reason) {
        try {
            await callServer({ action: "reportMessage", messageId: row.$id, reason });
            notify("گزارش ثبت شد و برای مدیران ارسال شد.", true);
        } catch (error) {
            notify(error.message || "ثبت گزارش ناموفق بود.");
        }
    }

    async function deleteMessage(row) {
        if (!confirm("این پیام حذف شود؟")) return;

        currentRows = currentRows.filter(r => r.$id !== row.$id);
        render();

        try {
            await callServer({ action: "deleteMessage", messageId: row.$id });
        } catch (error) {
            notify(error.message || "حذف ناموفق بود.");
            await loadMessages();
        }
    }

    /* ---------- پاسخ و ویرایش ---------- */

    let replyTo = null;   // { i, n, t }
    let editingId = null;

    function clearContext() {
        replyTo = null;
        editingId = null;
        el.context.hidden = true;
        el.context.replaceChildren();
    }

    function showContext(label, snippet) {
        el.context.replaceChildren();

        const body = document.createElement("div");
        const b = document.createElement("b");
        b.textContent = label;
        const s = document.createElement("span");
        s.textContent = snippet;
        body.append(b, s);

        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.textContent = "✕";
        cancel.setAttribute("aria-label", "لغو");
        cancel.addEventListener("click", () => {
            if (editingId) { el.input.value = ""; autosize(); }
            clearContext();
        });

        el.context.append(body, cancel);
        el.context.hidden = false;
    }

    function startReply(row) {
        if (!canSend) { notify("در این کانال امکان پاسخ نداری."); return; }
        const info = parseContent(row);
        const name = row.owner_id === account.$id ? "خودت" : (row.display_name || "عضو");

        editingId = null;
        replyTo = { i: row.$id, n: name, t: snippetOf(info) };
        showContext("پاسخ به " + name, snippetOf(info));
        el.input.focus();
    }

    function startEdit(row) {
        const info = parseContent(row);

        replyTo = null;
        editingId = row.$id;
        clearAttachmentUi();
        el.input.value = info.text;
        autosize();
        showContext("ویرایش پیام", snippetOf(info));
        el.input.focus();
    }

    /* ---------- حرکت‌ها: کشیدن به چپ = پاسخ ، نگه‌داشتن = منو ---------- */

    let gesture = null;

    function rowFromEvent(event) {
        const line = event.target.closest(".chat-row");
        if (!line) return null;
        const row = currentRows.find(r => r.$id === line.dataset.id);
        return row ? { line, row } : null;
    }

    el.box.addEventListener("touchstart", event => {
        if (event.touches.length !== 1) return;
        const hit = rowFromEvent(event);
        if (!hit) return;

        const touch = event.touches[0];
        gesture = { ...hit, x: touch.clientX, y: touch.clientY, dx: 0, mode: "" };
        gesture.timer = setTimeout(() => {
            if (gesture && !gesture.mode) {
                gesture.mode = "long";
                lastLongPress = Date.now();
                if (navigator.vibrate) navigator.vibrate(15);
                openActions(gesture.row);
            }
        }, 450);
    }, { passive: true });

    el.box.addEventListener("touchmove", event => {
        if (!gesture || gesture.mode === "long") return;

        const touch = event.touches[0];
        const dx = touch.clientX - gesture.x;
        const dy = touch.clientY - gesture.y;

        if (!gesture.mode && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
            clearTimeout(gesture.timer);
            gesture.mode = (Math.abs(dx) > Math.abs(dy) * 1.4 && dx < 0) ? "swipe" : "scroll";
        }

        if (gesture.mode === "swipe") {
            gesture.dx = dx;
            gesture.line.classList.add("swiping");
            gesture.line.style.transform = "translateX(" + Math.max(dx, -90) + "px)";
            gesture.line.classList.toggle("swipe-ready", dx <= -60);
        }
    }, { passive: true });

    function endGesture(cancelled) {
        if (!gesture) return;
        clearTimeout(gesture.timer);
        const g = gesture;
        gesture = null;

        if (g.mode === "swipe") {
            g.line.classList.remove("swiping", "swipe-ready");
            g.line.style.transform = "";
            if (!cancelled && g.dx <= -60 && !g.row.pending) startReply(g.row);
        }
    }

    el.box.addEventListener("touchend", () => endGesture(false));
    el.box.addEventListener("touchcancel", () => endGesture(true));

    // کامپیوتر: کلیک راست
    el.box.addEventListener("contextmenu", event => {
        const hit = rowFromEvent(event);
        if (hit) {
            event.preventDefault();
            openActions(hit.row);
        }
    });

    /* ---------- پیوست (عکس / ویدیو) ---------- */

    let attached = null; // { file, kind, previewUrl }

    function clearAttachmentUi() {
        attached = null;
        el.file.value = "";
        el.attachment.hidden = true;
        el.attachment.replaceChildren();
    }

    el.attachBtn.addEventListener("click", () => {
        if (editingId) { notify("در حالت ویرایش نمی‌شود فایل پیوست کرد."); return; }
        el.file.click();
    });

    el.file.addEventListener("change", () => {
        const file = el.file.files[0];
        if (!file) return;

        const kind = file.type.startsWith("image/") ? "image"
            : file.type.startsWith("video/") ? "video" : "";

        if (!kind) { notify("فقط عکس و ویدیو قابل ارسال است."); clearAttachmentUi(); return; }
        if (kind === "video" && file.size > MAX_VIDEO) { notify("حجم ویدیو حداکثر ۲۵ مگابایت باشد."); clearAttachmentUi(); return; }
        if (kind === "image" && file.size > MAX_IMAGE) { notify("حجم عکس حداکثر ۱۵ مگابایت باشد."); clearAttachmentUi(); return; }

        el.status.textContent = "";
        attached = { file, kind, previewUrl: URL.createObjectURL(file) };

        el.attachment.replaceChildren();

        if (kind === "image") {
            const img = document.createElement("img");
            img.src = attached.previewUrl;
            el.attachment.appendChild(img);
        } else {
            const icon = document.createElement("div");
            icon.className = "chat-attachment-icon";
            icon.textContent = "🎬";
            el.attachment.appendChild(icon);
        }

        const name = document.createElement("span");
        name.textContent = file.name + " — " + megabytes(file.size);
        el.attachment.appendChild(name);

        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "✕";
        remove.setAttribute("aria-label", "حذف پیوست");
        remove.addEventListener("click", clearAttachmentUi);
        el.attachment.appendChild(remove);

        el.attachment.hidden = false;
        el.input.focus();
    });

    /* ---------- ارسال / ویرایش (فوری و خوش‌بینانه) ---------- */

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

    async function submitEdit() {
        const text = el.input.value.trim();
        const row = currentRows.find(r => r.$id === editingId);

        if (!row) { clearContext(); return; }

        const info = parseContent(row);
        if (!text && !info.fileId && !info.kind) { notify("متن پیام خالی است."); return; }

        const oldContent = row.content;
        row.content = buildContent({ ...info, text, edited: true });

        el.input.value = "";
        autosize();
        const id = editingId;
        clearContext();
        render();

        try {
            await callServer({ action: "editMessage", messageId: id, text });
        } catch (error) {
            row.content = oldContent;
            render();
            notify(error.message || "ویرایش ناموفق بود.");
        }
    }

    el.form.addEventListener("submit", async event => {
        event.preventDefault();

        if (editingId) { await submitEdit(); return; }

        const text = el.input.value.trim();
        const attachment = attached;
        if (!text && !attachment) return;

        const reply = replyTo;
        const tempId = "tmp-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);

        // پیام همان لحظه نمایش داده می‌شود؛ ارسال واقعی در پس‌زمینه انجام می‌شود
        currentRows.push({
            $id: tempId,
            $createdAt: new Date().toISOString(),
            owner_id: account.$id,
            display_name: account.name,
            content: text,
            pending: true,
            pendingKind: attachment ? attachment.kind : "",
            pendingReply: reply,
            localUrl: attachment ? attachment.previewUrl : ""
        });

        el.input.value = "";
        autosize();
        clearContext();
        attached = null;
        el.attachment.hidden = true;
        el.attachment.replaceChildren();
        el.file.value = "";
        render(true);
        el.input.focus();

        try {
            let fileId = "";

            if (attachment) {
                const file = attachment.kind === "image"
                    ? await compressImage(attachment.file)
                    : attachment.file;
                fileId = await uploadToBucket(file);
            }

            const payload = { action: "sendMessage", text, fileId };
            if (reply) payload.reply = { id: reply.i };
            if (otherId) payload.to = otherId; else payload.groupId = channelId;

            const data = await callServer(payload);

            const temp = currentRows.find(r => r.$id === tempId);
            if (temp) {
                if (currentRows.some(r => r.$id === data.id)) {
                    // پیام واقعی قبلاً از Realtime رسیده
                    currentRows = currentRows.filter(r => r.$id !== tempId);
                } else {
                    temp.$id = data.id;
                    temp.pending = false;
                    temp.content = buildContent({
                        text, fileId,
                        kind: attachment ? attachment.kind : "",
                        size: attachment ? attachment.file.size : 0,
                        reply, edited: false
                    });
                    delete temp.pendingKind;
                    delete temp.pendingReply;
                }
            }
            render();
        } catch (error) {
            currentRows = currentRows.filter(r => r.$id !== tempId);
            if (!el.input.value) {
                el.input.value = text;
                autosize();
            }
            notify(error.message || "ارسال ناموفق بود.");
            render();
        }
    });

    /* ---------- شروع ---------- */

    await loadMessages();
    startRealtime();

    setInterval(() => {
        if (!document.hidden) loadMessages();
    }, POLL_MS);

    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) loadMessages();
    });
})();
