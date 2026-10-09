const { Client, Account, TablesDB, ID, Query, Permission, Role } = Appwrite;

// ================================
// تنظیمات Appwrite
// ================================
const client = new Client()
    .setEndpoint("https://cloud.appwrite.io/v1")
    .setProject("6ac3b38f000976364cad");

const account = new Account(client);
const tablesDB = new TablesDB(client);

const DATABASE_ID = "6ac3b50f001bdd8488ff";
const TABLE_ID = "6ac3b51800052942e6b5";

// ================================
// عناصر صفحه
// ================================
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendMessage");
const chatBox = document.getElementById("chatBox");

const shownIds = new Set();

let me = null;
let myAvatar = "";
let myAvatarThumb = "";   // عکس کوچک (۹۶ پیکسل) که روی پیام‌ها ذخیره می‌شود
let replyTo = null;

const SWIPE_MAX = 64;      // بیشترین کشیدن (پیکسل)
const SWIPE_TRIGGER = 48;  // از این مقدار به بعد پاسخ فعال می‌شود

// ================================
// استایل پیام و عکس پروفایل
// ================================
const extraStyle = document.createElement("style");

extraStyle.textContent = `
.message-row {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    width: 100%;
    margin: 8px 0;
    box-sizing: border-box;
}

.message-row.incoming-message-row {
    justify-content: flex-start;
}

.message-row.own-message-row {
    justify-content: flex-end;
}

.message-row .message {
    margin: 0;
    min-width: 0;
    max-width: 80%;
}

.message-avatar {
    width: 36px;
    height: 36px;
    min-width: 36px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
}

.message .msg-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 2px;
    font-size: 10px;
    opacity: .65;
}

.message .msg-del,
.message .msg-btn {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    font-size: 12px;
    padding: 0;
}

#chatBox { overflow-x: hidden; }
.msg-swipe { position: relative; width: 100%; }
.msg-swipe .message-row { touch-action: pan-y; }
.reply-hint { display: none; position: absolute; right: 8px; top: 50%; margin-top: -15px; width: 30px; height: 30px; border-radius: 50%; background: rgba(168,85,247,.3); align-items: center; justify-content: center; font-size: 16px; opacity: 0; }
.msg-quote { background: rgba(0,0,0,.2); border-right: 3px solid rgba(255,255,255,.75); border-radius: 8px; padding: 4px 8px; margin-bottom: 4px; font-size: 12px; cursor: pointer; }
.msg-quote b { display: block; font-size: 11px; opacity: .85; }
.msg-quote span { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; opacity: .85; }
.msg-swipe.flash .message { outline: 2px solid #a855f7; }
#replyBar { display: none; align-items: center; gap: 10px; padding: 8px 14px; background: rgba(255,255,255,.04); border-top: 1px solid rgba(255,255,255,.08); font-size: 13px; }
#replyBar .rb-main { flex: 1; min-width: 0; border-right: 3px solid #a855f7; padding-right: 8px; }
#replyBar .rb-name { display: block; color: #a855f7; font-size: 12px; }
#replyBar .rb-text { display: block; opacity: .75; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#replyBar button { background: none; border: none; color: inherit; font-size: 18px; cursor: pointer; padding: 0 4px; }
`;

document.head.appendChild(extraStyle);

// ================================
// عکس کوچک برای ذخیره روی پیام‌ها
// ================================
function makeThumb(dataUrl) {
    return new Promise((resolve, reject) => {
        if (!dataUrl) { resolve(""); return; }

        const img = new Image();

        img.onload = () => {
            const c = document.createElement("canvas");
            c.width = 96;
            c.height = 96;

            const side = Math.min(img.naturalWidth, img.naturalHeight);
            const sx = (img.naturalWidth - side) / 2;
            const sy = (img.naturalHeight - side) / 2;

            c.getContext("2d").drawImage(img, sx, sy, side, side, 0, 0, 96, 96);

            let q = .75;
            let out = c.toDataURL("image/jpeg", q);

            while (out.length > 12000 && q > .3) {
                q -= .1;
                out = c.toDataURL("image/jpeg", q);
            }

            resolve(out);
        };

        img.onerror = () => reject(new Error("عکس خوانده نشد"));
        img.src = dataUrl;
    });
}

// ================================
// نوار «پاسخ به ...» بالای کادر نوشتن
// ================================
const replyBar = document.createElement("div");
replyBar.id = "replyBar";

const rbMain = document.createElement("div");
rbMain.className = "rb-main";
const rbName = document.createElement("span");
rbName.className = "rb-name";
const rbText = document.createElement("span");
rbText.className = "rb-text";
rbMain.appendChild(rbName);
rbMain.appendChild(rbText);

const rbClose = document.createElement("button");
rbClose.type = "button";
rbClose.textContent = "✕";
rbClose.title = "لغو پاسخ";

replyBar.appendChild(rbMain);
replyBar.appendChild(rbClose);
chatBox.after(replyBar);

function snippet(text, max) {
    const t = String(text || "").replace(/\s+/g, " ").trim();
    return t.length > max ? t.slice(0, max) + "…" : t;
}

function setReply(row) {
    replyTo = {
        id: row.$id,
        name: snippet(row.userName || "کاربر", 40),
        text: snippet(row.massage, 120)
    };
    rbName.textContent = "پاسخ به " + replyTo.name;
    rbText.textContent = replyTo.text;
    replyBar.style.display = "flex";
    messageInput.focus();
}

function clearReply() {
    replyTo = null;
    replyBar.style.display = "none";
}

rbClose.addEventListener("click", clearReply);

// پرش به پیام اصلی (وقتی روی نقل‌قول بزنی)
function jumpTo(id) {
    const target = chatBox.querySelector('[data-id="' + id + '"]');
    if (!target) return;

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add("flash");
    setTimeout(() => target.classList.remove("flash"), 1300);
}

// ================================
// کشیدن پیام به چپ = پاسخ
// ================================
function enableSwipe(wrap, hint, onReply) {
    let startX = 0, startY = 0, dx = 0;
    let active = false, locked = false, fired = false;

    function reset() {
        wrap.style.transition = "transform .2s";
        wrap.style.transform = "translateX(0)";
        wrap.style.userSelect = "";
        hint.style.opacity = "0";
        setTimeout(() => { hint.style.display = "none"; }, 200);
        active = false;
        locked = false;
    }

    wrap.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        if (e.target.closest && e.target.closest("button")) return;
        startX = e.clientX;
        startY = e.clientY;
        dx = 0;
        active = true;
        locked = false;
        fired = false;
    });

    wrap.addEventListener("pointermove", (e) => {
        if (!active) return;

        const mx = e.clientX - startX;
        const my = e.clientY - startY;

        if (!locked) {
            // کشیدن عمودی = اسکرول عادی
            if (Math.abs(my) > 10 && Math.abs(my) > Math.abs(mx)) {
                active = false;
                return;
            }
            if (mx < -8 && Math.abs(mx) > Math.abs(my)) {
                locked = true;
                try { wrap.setPointerCapture(e.pointerId); } catch (err) {}
                wrap.style.transition = "none";
                wrap.style.userSelect = "none";
                hint.style.display = "flex";
            } else {
                return;
            }
        }

        dx = Math.max(-SWIPE_MAX, Math.min(0, mx));
        wrap.style.transform = "translateX(" + dx + "px)";

        const progress = Math.min(1, Math.abs(dx) / SWIPE_TRIGGER);
        hint.style.opacity = String(progress);
        hint.style.transform = "scale(" + (0.6 + 0.4 * progress) + ")";

        if (!fired && Math.abs(dx) >= SWIPE_TRIGGER) {
            fired = true;
            if (navigator.vibrate) navigator.vibrate(15);
        }
    });

    wrap.addEventListener("pointerup", () => {
        const shouldReply = locked && Math.abs(dx) >= SWIPE_TRIGGER;
        reset();
        if (shouldReply) onReply();
    });

    wrap.addEventListener("pointercancel", reset);
}

// ================================
// ساعت پیام
// ================================
function formatTime(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return "";

    const time = d.toLocaleTimeString("fa-IR", {
        hour: "2-digit",
        minute: "2-digit"
    });

    if (d.toDateString() === new Date().toDateString()) {
        return time;
    }

    const day = d.toLocaleDateString("fa-IR", {
        day: "numeric",
        month: "short"
    });

    return day + " - " + time;
}

// ================================
// بررسی اجازه حذف
// ================================
function canDelete(row) {
    return (row.$permissions || []).includes(
        'delete("user:' + me.$id + '")'
    );
}

// ================================
// نمایش پیام
// ================================
function showMessage(row) {
    if (!row.massage || !row.$id) return;
    if (shownIds.has(row.$id)) return;

    shownIds.add(row.$id);

    const empty = chatBox.querySelector(".empty-chat");
    if (empty) empty.remove();

    const isMine = row.userId === me.$id;

    // بیرونی: ثابت می‌ماند (آیکن پاسخ پشتش دیده می‌شود)
    const outer = document.createElement("div");
    outer.className = "msg-swipe";
    outer.dataset.id = row.$id;

    const hint = document.createElement("div");
    hint.className = "reply-hint";
    hint.textContent = "↩";

    // ردیف بیرونی پیام
    const rowEl = document.createElement("div");

    rowEl.className = isMine
        ? "message-row own-message-row"
        : "message-row incoming-message-row";


    // حباب پیام
    const el = document.createElement("div");

    el.className = "message " + (isMine ? "sent" : "received");

    // فقط برای پیام دریافتی عکس و نام نشان بده
    if (!isMine) {
        if (row.userAvatar) {
            const avatar = document.createElement("img");

            avatar.src = row.userAvatar;
            avatar.alt = "عکس پروفایل " + (row.userName || "کاربر");
            avatar.className = "message-avatar";
            
            avatar.title = "برای بزرگ‌نمایی کلیک کنید";

avatar.addEventListener("click", () => {
    const preview = document.createElement("div");
    preview.className = "avatar-preview";

    const largeImage = document.createElement("img");
    largeImage.src = avatar.src;
    largeImage.alt = avatar.alt;

    const closeButton = document.createElement("button");
    closeButton.className = "avatar-preview-close";
    closeButton.textContent = "×";
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "بستن تصویر");

    closeButton.addEventListener("click", (event) => {
        event.stopPropagation();
        preview.remove();
    });

    preview.addEventListener("click", () => {
        preview.remove();
    });

    largeImage.addEventListener("click", (event) => {
        event.stopPropagation();
    });

    preview.appendChild(largeImage);
    preview.appendChild(closeButton);
    document.body.appendChild(preview);
});

            avatar.onerror = function () {
                this.remove();
            };

            rowEl.appendChild(avatar);
        }

        const name = document.createElement("small");

        name.textContent = row.userName || "کاربر";

        name.style.cssText =
            "display:block;opacity:.6;font-size:11px;margin-bottom:2px";

        el.appendChild(name);
    }

    // نقل‌قول پیامی که به آن پاسخ داده شده
    if (row.reply) {
        let q = null;
        try { q = JSON.parse(row.reply); } catch (e) {}

        if (q && q.text) {
            const quote = document.createElement("div");
            quote.className = "msg-quote";

            const qn = document.createElement("b");
            qn.textContent = q.name || "کاربر";
            const qt = document.createElement("span");
            qt.textContent = q.text;

            quote.appendChild(qn);
            quote.appendChild(qt);
            quote.addEventListener("click", () => jumpTo(q.id));
            el.appendChild(quote);
        }
    }

    // متن پیام
    const text = document.createElement("span");

    text.textContent = row.massage;

    el.appendChild(text);

    // ساعت و دکمه حذف
    const meta = document.createElement("div");

    meta.className = "msg-meta";

    const time = document.createElement("span");

    time.textContent = formatTime(row.$createdAt);

    meta.appendChild(time);

    // دکمه‌ی پاسخ (برای کامپیوتر یا وقتی کشیدن سخت است)
    const replyBtn = document.createElement("button");
    replyBtn.className = "msg-btn";
    replyBtn.type = "button";
    replyBtn.title = "پاسخ";
    replyBtn.textContent = "↩";
    replyBtn.addEventListener("click", () => setReply(row));
    meta.appendChild(replyBtn);

    if (isMine && canDelete(row)) {
        const del = document.createElement("button");

        del.className = "msg-del";
        del.type = "button";
        del.title = "حذف پیام";
        del.textContent = "🗑";

        del.addEventListener("click", () => deleteMessage(row));

        meta.appendChild(del);
    }

    el.appendChild(meta);

    // اضافه کردن حباب به ردیف
    rowEl.appendChild(el);

    outer.appendChild(hint);
    outer.appendChild(rowEl);

    enableSwipe(rowEl, hint, () => setReply(row));

    chatBox.appendChild(outer);

    chatBox.scrollTop = chatBox.scrollHeight;
}

// ================================
// حذف پیام از صفحه
// ================================
function removeMessage(id) {
    const el = chatBox.querySelector('[data-id="' + id + '"]');

    if (el) el.remove();

    shownIds.delete(id);

    if (replyTo && replyTo.id === id) clearReply();

    if (!chatBox.querySelector(".message")) {
        chatBox.innerHTML =
            '<div class="empty-chat">هنوز پیامی ارسال نشده است.</div>';
    }
}

// ================================
// حذف پیام
// ================================
async function deleteMessage(row) {
    if (!confirm("این پیام حذف شود؟")) return;

    try {
        await tablesDB.deleteRow({
            databaseId: DATABASE_ID,
            tableId: TABLE_ID,
            rowId: row.$id
        });

        removeMessage(row.$id);
    } catch (error) {
        console.error("خطا در حذف پیام:", error);

        alert("حذف پیام انجام نشد: " + error.message);
    }
}

// ================================
// بارگذاری پیام‌های قبلی
// ================================
async function loadMessages() {
    const res = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: TABLE_ID,
        queries: [
            Query.isNotNull("massage"),
            Query.orderDesc("$createdAt"),
            Query.limit(100)
        ]
    });

    res.rows.reverse().forEach(showMessage);
}

// ================================
// ارسال پیام
// ================================
async function sendMessageNow() {
    const message = messageInput.value.trim();

    if (!message || !me) return;

    const currentReply = replyTo;

    messageInput.value = "";
    clearReply();

    if (typeof resizeMessageInput === "function") resizeMessageInput();

    try {
        const row = await tablesDB.createRow({
            databaseId: DATABASE_ID,
            tableId: TABLE_ID,
            rowId: ID.unique(),

            data: {
                userId: me.$id,
                userName: me.name || "کاربر",
                userAvatar: myAvatarThumb || "",
                massage: message,
                recieverid: "public",
                createdat: new Date().toISOString(),
                // فقط وقتی پاسخ است ستون reply فرستاده می‌شود
                ...(currentReply ? { reply: JSON.stringify(currentReply) } : {})
            },

            permissions: [
                Permission.update(Role.user(me.$id)),
                Permission.delete(Role.user(me.$id))
            ]
        });

        showMessage(row);

    } catch (error) {
        console.error("خطا در ارسال پیام:", error);

        messageInput.value = message;
        if (currentReply) {
            setReply({ $id: currentReply.id, userName: currentReply.name, massage: currentReply.text });
        }

        alert("ارسال پیام انجام نشد: " + error.message);
    }
}

sendButton.addEventListener("click", sendMessageNow);

messageInput.addEventListener("keydown", (e) => {
    // با Enter پیام ارسال نشود؛ خط جدید ایجاد شود
    if (e.key === "Enter") {
        return;
    }
});

// ================================
// شروع پیام‌رسان
// ================================
(async function init() {
    try {
        me = await account.get();

        const prefs = await account.getPrefs();

        myAvatar =
            prefs.avatar ||
            localStorage.getItem("profileImage") ||
            "";

    } catch (e) {
        if (e.code === 401) {
            localStorage.removeItem("loggedIn");
            window.location.href = "login.html";
        } else {
            console.error("خطا در اتصال به Appwrite:", e);

            alert(
                "اتصال به سرور برقرار نشد. اینترنت/VPN را بررسی کن و صفحه را رفرش کن."
            );
        }

        return;
    }

    try {
        myAvatarThumb = await makeThumb(myAvatar);
    } catch (e) {
        console.error("خطا در ساخت عکس کوچک:", e);
        myAvatarThumb = "";
    }

    try {
        await loadMessages();
    } catch (e) {
        console.error("خطا در خواندن پیام‌ها:", e);
    }

    // دریافت لحظه‌ای پیام‌ها
    client.subscribe(
        `databases.${DATABASE_ID}.tables.${TABLE_ID}.rows`,
        (event) => {
            if (event.events.some((x) => x.endsWith(".create"))) {
                showMessage(event.payload);
            }

            if (event.events.some((x) => x.endsWith(".delete"))) {
                removeMessage(event.payload.$id);
            }
        }
    );
})();



// تنظیم ارتفاع خودکار کادر نوشتن پیام
function resizeMessageInput() {
    messageInput.style.height = "auto";

    const maxHeight = 140;
    messageInput.style.height =
        Math.min(messageInput.scrollHeight, maxHeight) + "px";
}

messageInput.addEventListener("input", resizeMessageInput);