"use strict";

(async function () {
    const POLL_MS = 5000; // پشتیبان؛ پیام‌ها اصلاً از طریق Realtime لحظه‌ای می‌رسند
    const MAX_VIDEO = 25 * 1024 * 1024;
    const MAX_IMAGE = 15 * 1024 * 1024;

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
        attachment: document.getElementById("chatAttachment")
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
    const isManager = labels.some(l => /^manager[1-5]$/.test(l));

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

    /* ---------- فهرست پیام‌ها (در حافظه) ---------- */

    let currentRows = [];
    let lastSignature = null;

    const timeOf = row => new Date(row.$createdAt).getTime();

    function upsert(row) {
        const i = currentRows.findIndex(r => r.$id === row.$id);
        if (i >= 0) currentRows[i] = row; else currentRows.push(row);
        currentRows.sort((a, b) => timeOf(a) - timeOf(b));
    }

    function parseContent(row) {
        if (row.localUrl || row.kind) {
            return { text: row.content || "", fileId: "", kind: row.kind || "", size: 0, localUrl: row.localUrl || "" };
        }
        const raw = row.content || "";
        if (raw.startsWith('{"_m":1')) {
            try {
                const o = JSON.parse(raw);
                return { text: o.t || "", fileId: o.f || "", kind: o.k || "", size: o.s || 0, localUrl: "" };
            } catch (_) {}
        }
        return { text: raw, fileId: "", kind: "", size: 0, localUrl: "" };
    }

    function megabytes(bytes) {
        return (bytes / 1048576).toLocaleString("fa-IR", { maximumFractionDigits: 1 }) + " مگابایت";
    }

    function openLightbox(url) {
        const box = document.createElement("div");
        box.className = "chat-lightbox";
        const img = document.createElement("img");
        img.src = url;
        box.appendChild(img);
        box.addEventListener("click", () => box.remove());
        document.body.appendChild(box);
    }

    function buildMedia(info) {
        const wrap = document.createElement("div");
        wrap.className = "chat-media";

        const setImage = url => {
            wrap.replaceChildren();
            const img = document.createElement("img");
            img.src = url;
            img.alt = "تصویر";
            img.addEventListener("click", () => openLightbox(url));
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

    function render(forceScroll) {
        const rows = currentRows;
        const signature = rows.map(r => r.$id + (r.pending ? "*" : "")).join(",");
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
            if (row.pending) line.style.opacity = "0.6";

            line.appendChild(createAvatar(row.owner_id, row.display_name || (mine ? account.name : "")));

            const wrap = document.createElement("div");
            wrap.className = "chat-msg";

            if (!mine && row.owner_id !== lastSender) {
                const sender = document.createElement("span");
                sender.className = "chat-sender";
                sender.textContent = row.display_name || "عضو";
                wrap.appendChild(sender);
            }
            lastSender = row.owner_id;

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

            if (isAdmin && !row.pending) {
                const del = document.createElement("button");
                del.type = "button";
                del.className = "chat-delete";
                del.textContent = "حذف";
                del.addEventListener("click", () => deleteMessage(row.$id));
                meta.appendChild(del);
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
        await loadProfiles(ids);
        paintAvatars(el.box);
    }

    el.box.addEventListener("click", event => {
        const avatar = event.target.closest(".avatar");
        if (avatar) {
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

            // پیام‌های در حال ارسال یا تازه‌تر از آخرین پیام سرور را نگه می‌داریم
            const keep = currentRows.filter(
                r => !serverIds.has(r.$id) && (r.pending || r.$createdAt > newest)
            );

            currentRows = serverRows.concat(keep);
            el.status.textContent = "";
            render();
        } catch (error) {
            if (error && error.code === 401) {
                window.location.replace("login.html");
                return;
            }
            console.error("Load messages error:", error);
            el.status.textContent = "خطا در دریافت پیام‌ها؛ اتصال اینترنت را بررسی کن.";
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

    /* ---------- حذف (مدیر کل) ---------- */

    async function deleteMessage(messageId) {
        if (!confirm("این پیام حذف شود؟")) return;

        currentRows = currentRows.filter(r => r.$id !== messageId);
        render();

        try {
            await callServer({ action: "deleteMessage", messageId });
        } catch (error) {
            el.status.textContent = error.message;
            await loadMessages();
        }
    }

    /* ---------- پیوست (عکس / ویدیو) ---------- */

    let attached = null; // { file, kind, previewUrl }

    function clearAttachment() {
        attached = null;
        el.file.value = "";
        el.attachment.hidden = true;
        el.attachment.replaceChildren();
    }

    el.attachBtn.addEventListener("click", () => el.file.click());

    el.file.addEventListener("change", () => {
        const file = el.file.files[0];
        if (!file) return;

        const kind = file.type.startsWith("image/") ? "image"
            : file.type.startsWith("video/") ? "video" : "";

        if (!kind) {
            el.status.textContent = "فقط عکس و ویدیو قابل ارسال است.";
            clearAttachment();
            return;
        }
        if (kind === "video" && file.size > MAX_VIDEO) {
            el.status.textContent = "حجم ویدیو حداکثر ۲۵ مگابایت باشد.";
            clearAttachment();
            return;
        }
        if (kind === "image" && file.size > MAX_IMAGE) {
            el.status.textContent = "حجم عکس حداکثر ۱۵ مگابایت باشد.";
            clearAttachment();
            return;
        }

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
        remove.addEventListener("click", clearAttachment);
        el.attachment.appendChild(remove);

        el.attachment.hidden = false;
        el.input.focus();
    });

    /* ---------- ارسال (فوری و خوش‌بینانه) ---------- */

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
        const attachment = attached;
        if (!text && !attachment) return;

        // پیام همان لحظه نمایش داده می‌شود؛ ارسال واقعی در پس‌زمینه انجام می‌شود
        const tempId = "tmp-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
        currentRows.push({
            $id: tempId,
            $createdAt: new Date().toISOString(),
            owner_id: account.$id,
            display_name: account.name,
            content: text,
            pending: true,
            kind: attachment ? attachment.kind : "",
            localUrl: attachment ? attachment.previewUrl : ""
        });

        el.input.value = "";
        autosize();
        el.status.textContent = "";
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
                }
            }
            render();
        } catch (error) {
            currentRows = currentRows.filter(r => r.$id !== tempId);
            if (!el.input.value) {
                el.input.value = text;
                autosize();
            }
            el.status.textContent = error.message || "ارسال ناموفق بود.";
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