const { Client, Account, TablesDB, Storage, ID, Query, Permission, Role } = Appwrite;

// ================================
// تنظیمات Appwrite
// ================================
const client = new Client()
    .setEndpoint("https://cloud.appwrite.io/v1")
    .setProject("6ac3b38f000976364cad");

const account = new Account(client);
const tablesDB = new TablesDB(client);
const storage = new Storage(client);

const DATABASE_ID = "6ac3b50f001bdd8488ff";
const TABLE_ID = "6ac3b51800052942e6b5";

// فضای ذخیره‌ی عکس‌های چت (Storage ← Create bucket، با شناسه‌ی chat-images)
const BUCKET_ID = "chat-images";
const ENDPOINT = "https://cloud.appwrite.io/v1";
const PROJECT_ID = "6ac3b38f000976364cad";

// ================================
// عناصر صفحه
// ================================
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendMessage");
const chatBox = document.getElementById("chatBox");

const shownIds = new Set();

let me = null;
let myAvatar = "";
let myBio = "";
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

/* انیمیشن حذف پیام */
.msg-swipe.removing {
    height: 0 !important;
    margin-top: -12px;
    opacity: 0;
    transform: translateX(-40px) scale(.9);
    transition: height .35s ease, margin .35s ease, opacity .3s ease, transform .35s ease;
}

/* تب‌ها و نوار گفتگو */
#chatTabs { display: flex; gap: 8px; padding: 8px 14px; border-bottom: 1px solid rgba(255,255,255,.08); }
#chatTabs button { flex: 1; padding: 9px 0; border: 1px solid rgba(255,255,255,.1); border-radius: 12px; background: transparent; color: inherit; font-family: inherit; font-size: 14px; cursor: pointer; transition: .25s; }
#chatTabs button.active { background: linear-gradient(135deg, var(--main-color), var(--main-color-2)); border-color: transparent; color: #fff; }
.tab-badge { display: none; min-width: 18px; height: 18px; padding: 0 5px; margin-right: 6px; border-radius: 9px; background: #ef4444; color: #fff; font-size: 11px; line-height: 18px; text-align: center; }
#convBar { display: none; align-items: center; gap: 12px; padding: 8px 14px; border-bottom: 1px solid rgba(255,255,255,.08); }
#convBar button { background: none; border: none; color: var(--main-color); font-family: inherit; font-size: 13px; cursor: pointer; padding: 4px 0; }
.conv-item { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 14px; cursor: pointer; transition: background .2s; }
.conv-item:hover { background: rgba(255,255,255,.05); }
.conv-avatar { width: 46px; height: 46px; border-radius: 50%; overflow: hidden; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, var(--main-color), var(--main-color-2)); color: #fff; font-size: 18px; }
.conv-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.conv-main { flex: 1; min-width: 0; }
.conv-name { font-weight: bold; font-size: 15px; }
.conv-last { font-size: 13px; opacity: .65; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.conv-side { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.conv-time { font-size: 11px; opacity: .55; }
body.light-mode #chatTabs, body.light-mode #convBar { border-color: rgba(0,0,0,.08); }
body.light-mode #chatTabs button { border-color: rgba(0,0,0,.1); }
body.light-mode .conv-item:hover { background: rgba(0,0,0,.04); }

/* دکمه‌ی پیام خصوصی در بزرگ‌نمایی عکس */
.avatar-preview-dm { margin-top: 14px; padding: 10px 22px; border: none; border-radius: 14px; background: linear-gradient(135deg, var(--main-color), var(--main-color-2)); color: #fff; font-family: inherit; font-size: 14px; cursor: pointer; }

/* نوار گفتگو: عکس + نام قابل لمس */
.conv-info-btn { display: flex; align-items: center; gap: 10px; flex: 0 1 auto; min-width: 0; max-width: 100%; padding: 4px 8px; border-radius: 12px; background: none; border: none; color: inherit; font-family: inherit; font-size: 15px; cursor: pointer; transition: background .2s; }
.conv-info-btn:hover { background: rgba(255,255,255,.06); }
.conv-info-btn strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.conv-avatar-sm { width: 34px; height: 34px; font-size: 14px; }
body.light-mode .conv-info-btn:hover { background: rgba(0,0,0,.05); }

/* کارت اطلاعات طرف مقابل */
.peer-info-overlay { position: fixed; inset: 0; z-index: 99998; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(0,0,0,.7); }
.peer-info-card { width: min(100%, 340px); padding: 26px 22px 20px; border-radius: 22px; background: var(--section-bg, #111116); color: var(--text-color, #fff); border: 1px solid rgba(255,255,255,.1); text-align: center; box-shadow: 0 25px 70px rgba(0,0,0,.5); animation: peerInfoPop .25s ease; }
.peer-info-avatar { width: 120px; height: 120px; margin: 0 auto 14px; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, var(--main-color), var(--main-color-2)); color: #fff; font-size: 48px; }
.peer-info-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.peer-info-name { font-size: 20px; font-weight: bold; margin-bottom: 14px; }
.peer-info-bio { margin: -4px 0 14px; padding: 10px 12px; border-radius: 12px; background: rgba(255,255,255,.05); font-size: 13px; line-height: 1.9; opacity: .9; white-space: pre-wrap; overflow-wrap: anywhere; }
.avatar-preview-bio { margin-top: 14px; max-width: min(90%, 340px); color: #fff; text-align: center; font-size: 14px; line-height: 1.9; opacity: .92; white-space: pre-wrap; overflow-wrap: anywhere; cursor: default; }
.peer-info-lines { display: flex; flex-direction: column; gap: 8px; margin-bottom: 18px; }
.peer-info-line { display: flex; justify-content: space-between; gap: 10px; padding: 10px 12px; border-radius: 12px; background: rgba(255,255,255,.05); font-size: 13px; }
.peer-info-line span { opacity: .65; }
.peer-info-close { width: 100%; padding: 11px 0; border: none; border-radius: 14px; background: linear-gradient(135deg, var(--main-color), var(--main-color-2)); color: #fff; font-family: inherit; font-size: 14px; cursor: pointer; }
body.light-mode .peer-info-card { border-color: rgba(0,0,0,.08); }
body.light-mode .peer-info-line, body.light-mode .peer-info-bio { background: rgba(0,0,0,.04); }
@keyframes peerInfoPop { from { opacity: 0; transform: scale(.92); } to { opacity: 1; transform: scale(1); } }

/* دایره‌ی حرف اول برای کاربر بدون عکس */
.message-avatar-letter { display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, var(--main-color), var(--main-color-2)); color: #fff; font-size: 15px; font-weight: bold; cursor: pointer; }
.peer-info-dm { width: 100%; margin-bottom: 10px; padding: 11px 0; border: 1px solid var(--main-color); border-radius: 14px; background: transparent; color: var(--main-color); font-family: inherit; font-size: 14px; cursor: pointer; transition: background .2s, color .2s; }
.peer-info-dm:hover { background: var(--main-color); color: #fff; }

/* عنوان کوچک بیوگرافی */
.bio-title { display: block; margin-bottom: 4px; font-size: 11px; color: var(--main-color); opacity: .9; letter-spacing: .3px; }

/* نوار رنگی لغزنده زیر تب‌ها */
#chatTabs { position: relative; }
#chatTabs::before { content: ""; position: absolute; top: 8px; bottom: 8px; right: 14px; width: calc((100% - 36px) / 2); border-radius: 12px; background: linear-gradient(135deg, var(--main-color), var(--main-color-2)); transition: transform .38s cubic-bezier(.4, 1.3, .5, 1); }
#chatTabs.tabs-private::before { transform: translateX(calc(-100% - 8px)); }
#chatTabs button { position: relative; z-index: 1; }
#chatTabs button.active { background: transparent; border-color: transparent; color: #fff; }

/* انیمیشن جابه‌جایی بین عمومی / لیست / گفتگو */
@keyframes slideInLeft  { from { opacity: 0; transform: translateX(-34px); } to { opacity: 1; transform: translateX(0); } }
@keyframes slideInRight { from { opacity: 0; transform: translateX(34px); }  to { opacity: 1; transform: translateX(0); } }
@keyframes dropIn       { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
#chatBox.slide-in-left  { animation: slideInLeft .34s ease; }
#chatBox.slide-in-right { animation: slideInRight .34s ease; }
#convBar, #userSearchBar { animation: dropIn .3s ease; }

/* جستجوی کاربر */
#userSearchBar { display: none; padding: 10px 14px 4px; }
#userSearchBar input { width: 100%; height: 42px; padding: 0 14px; border-radius: 14px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.05); color: inherit; font-family: inherit; font-size: 14px; outline: none; transition: border-color .2s; }
#userSearchBar input:focus { border-color: var(--main-color); }
body.light-mode #userSearchBar input { border-color: rgba(0,0,0,.12); background: rgba(0,0,0,.04); }

/* دکمه و نوار ارسال عکس */
#attachBtn { width: 48px; height: 48px; flex-shrink: 0; border-radius: 14px; border: 1px solid rgba(255,255,255,.12); background: transparent; color: inherit; font-size: 20px; cursor: pointer; transition: background .2s, border-color .2s, transform .2s; }
#attachBtn:hover { background: rgba(255,255,255,.08); border-color: var(--main-color); }
#attachBtn:active { transform: scale(.92); }
body.light-mode #attachBtn { border-color: rgba(0,0,0,.12); }
#attachBar { display: none; align-items: center; gap: 10px; padding: 8px 14px; background: rgba(255,255,255,.04); border-top: 1px solid rgba(255,255,255,.08); font-size: 13px; animation: dropIn .25s ease; }
#attachBar img { width: 44px; height: 44px; border-radius: 10px; object-fit: cover; }
#attachBar span { flex: 1; opacity: .8; }
#attachBar button { background: none; border: none; color: inherit; font-size: 18px; cursor: pointer; padding: 0 4px; }

/* عکس داخل پیام */
.chat-image { display: block; max-width: 100%; max-height: 320px; margin-bottom: 6px; border-radius: 12px; object-fit: cover; cursor: zoom-in; background: rgba(255,255,255,.06); min-height: 60px; min-width: 120px; }
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
            c.width = 128;
            c.height = 128;

            const side = Math.min(img.naturalWidth, img.naturalHeight);
            const sx = (img.naturalWidth - side) / 2;
            const sy = (img.naturalHeight - side) / 2;

            c.getContext("2d").drawImage(img, sx, sy, side, side, 0, 0, 128, 128);

            let q = .82;
            let out = c.toDataURL("image/jpeg", q);

            while (out.length > 16000 && q > .3) {
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
        text: snippet(previewText(row.massage), 120)
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
// عکس در چت: پیام با برچسب [[img:شناسه]] ذخیره می‌شود
// ================================
const IMG_RE = /^\[\[img:([A-Za-z0-9._-]{1,36})\]\]/;

function parseImage(text) {
    const m = IMG_RE.exec(text || "");
    return m ? { id: m[1], caption: String(text).slice(m[0].length).trim() } : null;
}

// متن کوتاه برای لیست گفتگوها و نقل‌قول
function previewText(text) {
    const im = parseImage(text);
    return im ? "📷 عکس" + (im.caption ? " " + im.caption : "") : text;
}

function imageUrl(fileId) {
    return ENDPOINT + "/storage/buckets/" + BUCKET_ID + "/files/" + fileId +
           "/view?project=" + PROJECT_ID;
}


async function downloadChatImage(fileId) {
    try {
        const url =
            ENDPOINT + "/storage/buckets/" +
            BUCKET_ID + "/files/" + fileId +
            "/download?project=" + PROJECT_ID;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("دریافت عکس انجام نشد.");
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = "ghabhaye-mandegar-" + fileId + ".jpg";

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

    } catch (error) {
        console.error("خطا در دانلود عکس:", error);
        alert("دانلود عکس انجام نشد. دوباره تلاش کن.");
    }
}

// کوچک کردن عکس قبل از آپلود (سریع‌تر و کم‌حجم‌تر)
function compressImage(file, maxSide, quality) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            URL.revokeObjectURL(url);

            const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
            const w = Math.max(1, Math.round(img.naturalWidth * scale));
            const h = Math.max(1, Math.round(img.naturalHeight * scale));

            const c = document.createElement("canvas");
            c.width = w;
            c.height = h;

            const ctx = c.getContext("2d");
            ctx.fillStyle = "#ffffff";           // عکس‌های شفاف (PNG) پس‌زمینه‌ی سفید می‌گیرند
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);

            c.toBlob((blob) => {
                if (!blob) { reject(new Error("تبدیل عکس انجام نشد")); return; }
                resolve(new File([blob], "photo.jpg", { type: "image/jpeg" }));
            }, "image/jpeg", quality);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("عکس خوانده نشد"));
        };

        img.src = url;
    });
}

function openImageViewer(src) {
    const viewer = document.createElement("div");
    viewer.className = "avatar-preview";

    const big = document.createElement("img");
    big.src = src;
    big.alt = "عکس";

    const closeButton = document.createElement("button");
    closeButton.className = "avatar-preview-close";
    closeButton.type = "button";
    closeButton.textContent = "×";
    closeButton.setAttribute("aria-label", "بستن تصویر");

    function close() { viewer.remove(); }

    closeButton.addEventListener("click", (event) => { event.stopPropagation(); close(); });
    viewer.addEventListener("click", close);
    big.addEventListener("click", (event) => event.stopPropagation());

    viewer.appendChild(big);
    viewer.appendChild(closeButton);
    document.body.appendChild(viewer);
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
        if (row.userAvatar && mode !== "dm") {
            const avatar = document.createElement("img");

            avatar.src = row.userAvatar;
            avatar.alt = "عکس پروفایل " + (row.userName || "کاربر");
            avatar.className = "message-avatar";
            
            avatar.title = "برای بزرگ‌نمایی کلیک کنید";

avatar.addEventListener("click", () => openAvatarPreview(row, avatar.src));

            avatar.onerror = function () {
                this.replaceWith(makeLetterAvatar(row));
            };

            rowEl.appendChild(avatar);
        } else if (mode !== "dm") {
            // کاربر عکس پروفایل ندارد: دایره‌ی حرف اول (برای شروع پیام خصوصی)
            rowEl.appendChild(makeLetterAvatar(row));
        }

        const name = document.createElement("small");

        name.textContent = row.userName || "کاربر";

        name.style.cssText =
            "display:block;opacity:.6;font-size:11px;margin-bottom:2px";

        if (mode !== "dm") {
            name.style.cursor = "pointer";
            name.title = "اطلاعات کاربر";
            name.addEventListener("click", () => openUserCard(row));
        }

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
    const imgInfo = parseImage(row.massage);

    if (imgInfo) {
        const pic = document.createElement("img");
        pic.className = "chat-image";
        pic.loading = "lazy";
        pic.alt = "عکس";
        pic.src = imageUrl(imgInfo.id);
        pic.addEventListener("click", () => openImageViewer(pic.src));
        
        
const downloadBtn = document.createElement("button");

downloadBtn.type = "button";
downloadBtn.className = "chat-image-download";
downloadBtn.textContent = "ذخیره";
downloadBtn.title = "دانلود عکس";

downloadBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    downloadChatImage(imgInfo.id);
});

el.appendChild(pic);
el.appendChild(downloadBtn);

        
        pic.addEventListener("error", () => {
            pic.style.display = "none";
            const miss = document.createElement("span");
            miss.textContent = "🖼️ عکس در دسترس نیست";
            el.insertBefore(miss, pic.nextSibling);
        });

        if (imgInfo.caption) {
            const cap = document.createElement("span");
            cap.textContent = imgInfo.caption;
            cap.style.display = "block";
            el.appendChild(cap);
        }
    } else {
        const text = document.createElement("span");

        text.textContent = row.massage;

        el.appendChild(text);
    }

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
// حالت‌های صفحه: گروه / لیست گفتگوها / گفتگوی خصوصی
// ================================
const PRIVATE_PREFIX = "dm:";

let mode = "group";        // "group" | "list" | "dm"
let peer = null;           // { id, name } وقتی در گفتگوی خصوصی هستیم
let groupRows = [];
let privateRows = [];
const knownIds = new Set();
const nameCache = {};      // userId ← نام
const avatarCache = {};    // userId ← عکس باکیفیت (از ردیف پروفایل)

function isPrivate(row) {
    return typeof row.recieverid === "string" &&
           row.recieverid.indexOf(PRIVATE_PREFIX) === 0;
}

function peerOf(row) {
    return row.userId === me.$id
        ? row.recieverid.slice(PRIVATE_PREFIX.length)
        : row.userId;
}

function isMyPrivate(row) {
    return isPrivate(row) &&
           (row.userId === me.$id || row.recieverid === PRIVATE_PREFIX + me.$id);
}

function byTime(a, b) {
    return new Date(a.$createdAt) - new Date(b.$createdAt);
}

function dmRowsFor(id) {
    return privateRows.filter((r) => peerOf(r) === id).sort(byTime);
}

// ردیف جدید را در لیست‌ها ذخیره کن؛ اگر قبلاً بوده false برمی‌گرداند
function addRow(row) {
    if (!row || !row.$id || !row.massage) return false;
    if (row.recieverid === "profile") return false;
    if (knownIds.has(row.$id)) return false;

    if (isPrivate(row)) {
        if (!isMyPrivate(row)) return false;
        privateRows.push(row);
    } else {
        groupRows.push(row);
        if (row.userId && row.userName) nameCache[row.userId] = row.userName;
    }

    knownIds.add(row.$id);
    return true;
}

// ---------- نام‌ها و «خوانده‌شده» (روی همین گوشی) ----------
function readJson(key) {
    try { return JSON.parse(localStorage.getItem(key) || "{}") || {}; }
    catch (e) { return {}; }
}

function savedNames() { return readJson("dmNames_" + me.$id); }

function saveName(id, name) {
    const n = savedNames();
    n[id] = name;
    localStorage.setItem("dmNames_" + me.$id, JSON.stringify(n));
}

function seenMap() { return readJson("dmSeen_" + me.$id); }

function markRead(id) {
    const s = seenMap();
    s[id] = new Date().toISOString();
    localStorage.setItem("dmSeen_" + me.$id, JSON.stringify(s));
    updateBadges();
}

// بار اول: پیام‌های قدیمی را «خوانده‌شده» حساب کن
function initSeen() {
    const key = "dmSeen_" + me.$id;
    if (localStorage.getItem(key) !== null) return;

    const s = {};
    privateRows.forEach((r) => {
        const id = peerOf(r);
        if (!s[id] || r.$createdAt > s[id]) s[id] = r.$createdAt;
    });
    localStorage.setItem(key, JSON.stringify(s));
}

function isUnread(row) {
    if (row.userId === me.$id) return false;
    const seen = seenMap()[peerOf(row)];
    return !seen || new Date(row.$createdAt) > new Date(seen);
}

function buildConversations() {
    const map = {};

    privateRows.forEach((r) => {
        const id = peerOf(r);
        const c = map[id] || (map[id] = { id: id, name: "", avatar: "", last: null, unread: 0 });

        if (r.userId !== me.$id) {
            if (r.userName) c.name = r.userName;
            if (r.userAvatar) c.avatar = r.userAvatar;
        }

        if (!c.last || new Date(r.$createdAt) > new Date(c.last.$createdAt)) c.last = r;
        if (isUnread(r)) c.unread++;
    });

    const names = savedNames();

    return Object.values(map)
        .map((c) => {
            if (!c.name) c.name = nameCache[c.id] || names[c.id] || "کاربر";
            return c;
        })
        .sort((a, b) => new Date(b.last.$createdAt) - new Date(a.last.$createdAt));
}

// ================================
// نوار تب‌ها و نوار گفتگو
// ================================
const headerEl = document.querySelector(".messenger-header");
const inputBar = document.querySelector(".message-input");

const tabsBar = document.createElement("div");
tabsBar.id = "chatTabs";

const tabGroup = document.createElement("button");
tabGroup.type = "button";
tabGroup.textContent = "💬 عمومی";

const tabPrivate = document.createElement("button");
tabPrivate.type = "button";
tabPrivate.appendChild(document.createTextNode("🔒 خصوصی"));

const tabBadge = document.createElement("span");
tabBadge.className = "tab-badge";
tabPrivate.appendChild(tabBadge);

tabsBar.appendChild(tabGroup);
tabsBar.appendChild(tabPrivate);

const convBar = document.createElement("div");
convBar.id = "convBar";

const convBack = document.createElement("button");
convBack.type = "button";
convBack.textContent = "← گفتگوها";

// عکس + نام طرف مقابل؛ با زدن روی آن، اطلاعاتش باز می‌شود
const convInfoBtn = document.createElement("button");
convInfoBtn.type = "button";
convInfoBtn.className = "conv-info-btn";
convInfoBtn.title = "اطلاعات";

const convAvatar = document.createElement("div");
convAvatar.className = "conv-avatar conv-avatar-sm";

const convName = document.createElement("strong");

convInfoBtn.appendChild(convAvatar);
convInfoBtn.appendChild(convName);

convBar.appendChild(convBack);
convBar.appendChild(convInfoBtn);

if (headerEl) {
    headerEl.after(tabsBar);
} else {
    chatBox.before(tabsBar);
}
tabsBar.after(convBar);

// کادر جستجوی کاربر (فقط در تب «خصوصی»)
const searchBar = document.createElement("div");
searchBar.id = "userSearchBar";

const searchInput = document.createElement("input");
searchInput.type = "search";
searchInput.placeholder = "🔍 جستجوی کاربر با اسم...";
searchInput.autocomplete = "off";

searchBar.appendChild(searchInput);
convBar.after(searchBar);

let searchQuery = "";
let directory = null;          // [{ id, name }] کاربرانی که ردیف پروفایل دارند
let directoryLoading = null;

// ---- عکس: دکمه + نوار پیش‌نمایش ----
let pendingImage = null;       // فایل فشرده‌شده‌ی آماده‌ی ارسال
let pendingUrl = "";

const fileInput = document.createElement("input");
fileInput.type = "file";
fileInput.accept = "image/*";
fileInput.style.display = "none";

const attachBtn = document.createElement("button");
attachBtn.type = "button";
attachBtn.id = "attachBtn";
attachBtn.title = "ارسال عکس";
attachBtn.textContent = "📷";

if (sendButton.parentNode) {
    sendButton.parentNode.insertBefore(attachBtn, sendButton);
    sendButton.parentNode.appendChild(fileInput);
}

const attachBar = document.createElement("div");
attachBar.id = "attachBar";

const attachThumb = document.createElement("img");
attachThumb.alt = "";

const attachText = document.createElement("span");

const attachClose = document.createElement("button");
attachClose.type = "button";
attachClose.textContent = "✕";
attachClose.title = "حذف عکس";

attachBar.appendChild(attachThumb);
attachBar.appendChild(attachText);
attachBar.appendChild(attachClose);
replyBar.after(attachBar);

function clearPending() {
    if (pendingUrl) URL.revokeObjectURL(pendingUrl);
    pendingImage = null;
    pendingUrl = "";
    attachBar.style.display = "none";
}

function setPending(file) {
    if (pendingUrl) URL.revokeObjectURL(pendingUrl);

    pendingImage = file;
    pendingUrl = URL.createObjectURL(file);

    attachThumb.src = pendingUrl;
    attachText.textContent = "عکس آماده‌ی ارسال (" + Math.max(1, Math.round(file.size / 1024)) + " کیلوبایت)";
    attachBar.style.display = "flex";
}

attachBtn.addEventListener("click", () => fileInput.click());
attachClose.addEventListener("click", clearPending);

fileInput.addEventListener("change", async () => {
    const f = fileInput.files && fileInput.files[0];
    fileInput.value = "";

    if (!f) return;

    if (!/^image\//.test(f.type)) {
        alert("فقط عکس می‌شه فرستاد.");
        return;
    }

    try {
        const small = await compressImage(f, 1280, 0.82);

        if (small.size > 4 * 1024 * 1024) {
            alert("حجم عکس خیلی زیاده.");
            return;
        }

        setPending(small);
        messageInput.focus();
    } catch (e) {
        alert("خطا در خواندن عکس: " + e.message);
    }
});

tabGroup.addEventListener("click", () => setMode("group"));
tabPrivate.addEventListener("click", () => setMode("list"));
convBack.addEventListener("click", () => setMode("list"));
convInfoBtn.addEventListener("click", () => openPeerInfo());

searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value.trim();

    if (searchQuery && !directory) {
        loadDirectory().then(() => { if (mode === "list") render(); });
    }

    if (mode === "list") render();
});

function totalUnread() {
    return privateRows.filter(isUnread).length;
}

function updateBadges() {
    const n = totalUnread();
    tabBadge.textContent = n > 99 ? "99+" : String(n);
    tabBadge.style.display = n > 0 && mode !== "dm" ? "inline-block" : "none";
}

function updateChrome() {
    tabGroup.className = mode === "group" ? "active" : "";
    tabPrivate.className = mode === "group" ? "" : "active";

    convBar.style.display = mode === "dm" ? "flex" : "none";
    convName.textContent = mode === "dm" && peer ? peer.name : "";

    if (mode === "dm" && peer) {
        fillAvatar(convAvatar, peerThumb(peer.id), peer.name);
    }

    messageInput.placeholder =
        mode === "dm" && peer ? "پیام خصوصی به " + peer.name + "..." : "بنویس...";

    if (inputBar) inputBar.style.display = mode === "list" ? "none" : "";

    searchBar.style.display = mode === "list" ? "block" : "none";

    if (mode !== "list" && searchInput.value) {
        searchInput.value = "";
        searchQuery = "";
    }

    // نوار رنگی زیر تب‌ها بین «عمومی» و «خصوصی» می‌لغزد
    if (mode === "group") {
        tabsBar.classList.remove("tabs-private");
    } else {
        tabsBar.classList.add("tabs-private");
    }

    updateBadges();
}

const MODE_ORDER = { group: 0, list: 1, dm: 2 };

// محتوا از سمتی که تب انتخابی آنجاست می‌لغزد تو
function animateChat(direction) {
    chatBox.classList.remove("slide-in-left", "slide-in-right");
    void chatBox.offsetWidth;
    chatBox.classList.add(direction > 0 ? "slide-in-left" : "slide-in-right");

    setTimeout(() => {
        chatBox.classList.remove("slide-in-left", "slide-in-right");
    }, 400);
}

function setMode(newMode, newPeer) {
    if (!me) return;   // هنوز ورود/اتصال کامل نشده

    const direction = MODE_ORDER[newMode] - MODE_ORDER[mode];

    mode = newMode;
    peer = newPeer || null;

    clearReply();
    updateChrome();
    render();

    if (direction !== 0) animateChat(direction);
}

function startDm(userId, name) {
    if (!me || !userId || userId === me.$id) return;
    saveName(userId, name || "کاربر");
    setMode("dm", { id: userId, name: name || "کاربر" });
}

// ================================
// نمایش محتوای صفحه بر اساس حالت
// ================================
function render() {
    shownIds.clear();
    chatBox.innerHTML = "";

    if (mode === "list") {
        renderConversationList();
        return;
    }

    const rows = mode === "dm" && peer ? dmRowsFor(peer.id) : groupRows.slice().sort(byTime);

    if (!rows.length) {
        chatBox.appendChild(emptyState());
    } else {
        rows.forEach(showMessage);
    }

    if (mode === "dm" && peer) markRead(peer.id);
}

function emptyState(text) {
    const d = document.createElement("div");
    d.className = "empty-chat";
    d.textContent = text || (mode === "dm"
        ? "هنوز پیامی نفرستادی. اولین پیام رو بنویس 👋"
        : "پیامی نیست...");
    return d;
}

function norm(s) {
    return String(s || "")
        .toLowerCase()
        .replace(/ي/g, "ی")
        .replace(/ك/g, "ک")
        .replace(/\u200c/g, " ")
        .trim();
}

// فهرست کاربران (ردیف‌های پروفایل) را یک بار بگیر
async function loadDirectory() {
    if (directory) return directory;
    if (directoryLoading) return directoryLoading;

    directoryLoading = (async () => {
        let rows = [];

        try {
            const res = await tablesDB.listRows({
                databaseId: DATABASE_ID,
                tableId: TABLE_ID,
                queries: [
                    Query.equal("recieverid", "profile"),
                    Query.select(["$id", "userId", "userName"]),
                    Query.limit(500)
                ]
            });
            rows = res.rows;
        } catch (e) {
            try {
                const res = await tablesDB.listRows({
                    databaseId: DATABASE_ID,
                    tableId: TABLE_ID,
                    queries: [Query.equal("recieverid", "profile"), Query.limit(100)]
                });
                rows = res.rows;
            } catch (e2) {
                console.error("خطا در خواندن فهرست کاربران:", e2);
            }
        }

        directory = rows
            .map((r) => ({ id: r.userId || r.$id, name: r.userName || "کاربر" }))
            .filter((u) => u.id);

        directoryLoading = null;
        return directory;
    })();

    return directoryLoading;
}

function searchUsers(q) {
    const seen = {};
    const all = [];

    (directory || []).forEach((u) => { seen[u.id] = true; all.push(u); });

    // کسانی که توی عمومی پیام داده‌اند هم پیدا شوند
    Object.keys(nameCache).forEach((id) => {
        if (!seen[id]) all.push({ id: id, name: nameCache[id] });
    });

    const nq = norm(q);

    return all.filter((u) => u.id !== me.$id && norm(u.name).indexOf(nq) !== -1);
}

function renderSearchResults() {
    if (!directory) {
        chatBox.appendChild(emptyState("در حال جستجو..."));
        return;
    }

    const found = searchUsers(searchQuery);

    if (!found.length) {
        chatBox.appendChild(emptyState(
            "کاربری با این اسم پیدا نشد. فقط کسانی که حداقل یک بار پیام‌رسان رو باز کرده‌ان پیدا می‌شن."
        ));
        return;
    }

    found.forEach((u) => {
        const item = document.createElement("div");
        item.className = "conv-item";

        const av = document.createElement("div");
        av.className = "conv-avatar";
        fillAvatar(av, peerThumb(u.id), u.name);

        const main = document.createElement("div");
        main.className = "conv-main";

        const nm = document.createElement("div");
        nm.className = "conv-name";
        nm.textContent = u.name;

        const hint = document.createElement("div");
        hint.className = "conv-last";
        hint.textContent = "شروع گفتگوی خصوصی";

        main.appendChild(nm);
        main.appendChild(hint);

        item.appendChild(av);
        item.appendChild(main);
        item.addEventListener("click", () => startDm(u.id, u.name));

        chatBox.appendChild(item);
    });
}

function renderConversationList() {
    if (searchQuery) {
        renderSearchResults();
        return;
    }

    const convs = buildConversations();

    if (!convs.length) {
        chatBox.appendChild(emptyState(
            "هنوز گفتگوی خصوصی نداری. توی عمومی روی عکس یکی بزن (یا بالا جستجو کن) و «پیام خصوصی» رو انتخاب کن."
        ));
        return;
    }

    convs.forEach((c) => {
        const item = document.createElement("div");
        item.className = "conv-item";

        const av = document.createElement("div");
        av.className = "conv-avatar";

        if (c.avatar) {
            const img = document.createElement("img");
            img.src = c.avatar;
            img.alt = "";
            av.appendChild(img);
        } else {
            av.textContent = (c.name || "?").trim().charAt(0) || "?";
        }

        const main = document.createElement("div");
        main.className = "conv-main";

        const nm = document.createElement("div");
        nm.className = "conv-name";
        nm.textContent = c.name;

        const last = document.createElement("div");
        last.className = "conv-last";
        last.textContent = (c.last.userId === me.$id ? "تو: " : "") + snippet(previewText(c.last.massage), 60);

        main.appendChild(nm);
        main.appendChild(last);

        const side = document.createElement("div");
        side.className = "conv-side";

        const tm = document.createElement("div");
        tm.className = "conv-time";
        tm.textContent = formatTime(c.last.$createdAt);
        side.appendChild(tm);

        if (c.unread > 0) {
            const b = document.createElement("span");
            b.className = "tab-badge";
            b.style.display = "inline-block";
            b.textContent = String(c.unread);
            side.appendChild(b);
        }

        item.appendChild(av);
        item.appendChild(main);
        item.appendChild(side);
        item.addEventListener("click", () => startDm(c.id, c.name));

        chatBox.appendChild(item);
    });
}

// ================================
// حذف پیام از صفحه (با انیمیشن)
// ================================
function animateOut(el, done) {
    if (el.classList.contains("removing")) return;

    el.style.height = el.offsetHeight + "px";
    el.style.overflow = "hidden";
    void el.offsetHeight;
    el.classList.add("removing");

    setTimeout(() => {
        el.remove();
        if (done) done();
    }, 380);
}

function removeMessage(id) {
    groupRows = groupRows.filter((r) => r.$id !== id);
    privateRows = privateRows.filter((r) => r.$id !== id);
    knownIds.delete(id);
    shownIds.delete(id);

    if (replyTo && replyTo.id === id) clearReply();

    updateBadges();

    const el = chatBox.querySelector('[data-id="' + id + '"]');

    const afterRemove = () => {
        if (mode === "list") {
            render();
        } else if (!chatBox.querySelector(".message")) {
            chatBox.innerHTML = "";
            chatBox.appendChild(emptyState());
        }
    };

    if (el) {
        animateOut(el, afterRemove);
    } else if (mode === "list") {
        render();
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

        // اگر پیام عکس داشت، فایلش هم پاک شود
        const im = parseImage(row.massage);

        if (im) {
            storage.deleteFile({ bucketId: BUCKET_ID, fileId: im.id }).catch(() => {});
        }
    } catch (error) {
        console.error("خطا در حذف پیام:", error);

        alert("حذف پیام انجام نشد: " + error.message);
    }
}

// ================================
// عکس باکیفیت (بزرگ‌نمایی)
// ================================
const profileCache = {};   // userId ← ردیف پروفایل (یا null)

async function getProfileRow(userId) {
    if (userId in profileCache) return profileCache[userId];

    let row = null;

    try {
        row = await tablesDB.getRow({
            databaseId: DATABASE_ID,
            tableId: TABLE_ID,
            rowId: userId
        });
    } catch (e) {}

    profileCache[userId] = row;
    return row;
}

async function getFullAvatar(userId) {
    const row = await getProfileRow(userId);
    return row ? (row.userAvatar || "") : "";
}

// آخرین عکس کوچکی که این کاربر روی پیام‌هایش گذاشته
function peerThumb(id) {
    const rows = groupRows.concat(privateRows);

    for (let i = rows.length - 1; i >= 0; i--) {
        if (rows[i].userId === id && rows[i].userAvatar) return rows[i].userAvatar;
    }

    return "";
}

// عکس یا حرف اول اسم داخل یک دایره
function fillAvatar(el, src, name) {
    el.textContent = "";

    if (src) {
        const img = document.createElement("img");
        img.src = src;
        img.alt = "";
        el.appendChild(img);
    } else {
        el.textContent = (name || "?").trim().charAt(0) || "?";
    }
}

// ================================
// اطلاعات طرف مقابل (گفتگوی خصوصی)
// ================================
function openPeerInfo() {
    if (!peer) return;

    const id = peer.id;
    const name = peer.name;

    const overlay = document.createElement("div");
    overlay.className = "peer-info-overlay";

    const card = document.createElement("div");
    card.className = "peer-info-card";

    const av = document.createElement("div");
    av.className = "peer-info-avatar";
    fillAvatar(av, peerThumb(id), name);

    const nm = document.createElement("div");
    nm.className = "peer-info-name";
    nm.textContent = name;

    
const bioLabel = document.createElement("div");

bioLabel.textContent ="بیوگرافی: ";

bioLabel.style.cssText = `
    text-align: right;
    font-size: 11px;
    font-weight: bold;
    opacity: 0.65;
    margin: 0 4px 5px;
    display: none;
`;

const bioEl = document.createElement("div");

bioEl.className = "peer-info-bio";
bioEl.style.display = "none";


    const lines = document.createElement("div");
    lines.className = "peer-info-lines";

    function addLine(label, value) {
        const l = document.createElement("div");
        l.className = "peer-info-line";

        const k = document.createElement("span");
        k.textContent = label;

        const v = document.createElement("b");
        v.textContent = value;

        l.appendChild(k);
        l.appendChild(v);
        lines.appendChild(l);
    }

    const rows = dmRowsFor(id);
    const mineCount = rows.filter((r) => r.userId === me.$id).length;

    addLine("پیام‌های این گفتگو", rows.length + " (" + mineCount + " از تو، " + (rows.length - mineCount) + " از او)");

    if (rows.length) {
        addLine("اولین پیام", formatTime(rows[0].$createdAt));
    }

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "peer-info-close";
    closeBtn.textContent = "بستن";

    let closed = false;

    function close() {
        closed = true;
        overlay.remove();
    }

    closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", close);
    card.addEventListener("click", (event) => event.stopPropagation());

    card.appendChild(av);
    card.appendChild(nm);
    card.appendChild(bioLabel);
    card.appendChild(bioEl);
    card.appendChild(lines);
    card.appendChild(closeBtn);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // عکس باکیفیت و تاریخ عضویت (از ردیف پروفایل) که رسید اضافه می‌شود
    getProfileRow(id).then((row) => {
        if (closed || !row) return;

        if (row.userAvatar) fillAvatar(av, row.userAvatar, name);

        
if (row.bio && row.bio.trim()) {
    bioEl.textContent = row.bio;
    bioEl.style.display = "block";
    bioLabel.style.display = "block";
}


        if (row.$createdAt) {
            const d = new Date(row.$createdAt);

            if (!isNaN(d)) {
                addLine(
                    "عضو از",
                    d.toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric" })
                );
            }
        }
    });
}

// ================================
// کاربر بدون عکس پروفایل: دایره‌ی حرف اول + کارت اطلاعات
// ================================
function makeLetterAvatar(row) {
    const el = document.createElement("div");
    el.className = "message-avatar message-avatar-letter";
    el.textContent = (row.userName || "?").trim().charAt(0) || "?";
    el.title = "اطلاعات کاربر";
    el.addEventListener("click", () => openUserCard(row));
    return el;
}

function openUserCard(row) {
    const id = row.userId;
    const name = row.userName || "کاربر";

    const overlay = document.createElement("div");
    overlay.className = "peer-info-overlay";

    const card = document.createElement("div");
    card.className = "peer-info-card";

    const av = document.createElement("div");
    av.className = "peer-info-avatar";
    fillAvatar(av, row.userAvatar || peerThumb(id), name);

    const nm = document.createElement("div");
    nm.className = "peer-info-name";
    nm.textContent = name;

    const bioBox = document.createElement("div");
    bioBox.className = "peer-info-bio";
    bioBox.style.display = "none";

    const bioTitle = document.createElement("small");
    bioTitle.className = "bio-title";
    bioTitle.textContent = "بیوگرافی";

    const bioText = document.createElement("div");

    bioBox.appendChild(bioTitle);
    bioBox.appendChild(bioText);

    let closed = false;

    function close() {
        closed = true;
        overlay.remove();
    }

    card.appendChild(av);
    card.appendChild(nm);
    card.appendChild(bioBox);

    // پیام خصوصی: برای همه‌ی کاربران (حتی بدون عکس و بیو)
    if (id && id !== me.$id) {
        const dmBtn = document.createElement("button");
        dmBtn.type = "button";
        dmBtn.className = "peer-info-dm";
        dmBtn.textContent = "💬 پیام خصوصی";
        dmBtn.addEventListener("click", () => {
            close();
            startDm(id, name);
        });
        card.appendChild(dmBtn);
    }

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "peer-info-close";
    closeBtn.textContent = "بستن";
    closeBtn.addEventListener("click", close);
    card.appendChild(closeBtn);

    overlay.addEventListener("click", close);
    card.addEventListener("click", (event) => event.stopPropagation());

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // عکس باکیفیت و بیوگرافی (اگر ثبت کرده باشد) که رسید اضافه می‌شود
    getProfileRow(id).then((prow) => {
        if (closed || !prow) return;

        if (prow.userAvatar) fillAvatar(av, prow.userAvatar, name);

        if (prow.bio && prow.bio.trim()) {
            bioText.textContent = prow.bio;
            bioBox.style.display = "block";
        }
    });
}

function openAvatarPreview(row, thumbSrc) {
    const preview = document.createElement("div");
    preview.className = "avatar-preview";
    preview.style.flexDirection = "column";

    const largeImage = document.createElement("img");
    largeImage.src = thumbSrc;
    largeImage.alt = "عکس پروفایل " + (row.userName || "کاربر");

    const closeButton = document.createElement("button");
    closeButton.className = "avatar-preview-close";
    closeButton.textContent = "×";
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "بستن تصویر");

    let closed = false;

    function close() {
        closed = true;
        preview.remove();
    }

    closeButton.addEventListener("click", (event) => {
        event.stopPropagation();
        close();
    });

    preview.addEventListener("click", close);

    largeImage.addEventListener("click", (event) => {
        event.stopPropagation();
    });

    preview.appendChild(largeImage);

    // دکمه‌ی پیام خصوصی (برای عکس دیگران)
    if (row.userId && row.userId !== me.$id) {
        const dmBtn = document.createElement("button");
        dmBtn.type = "button";
        dmBtn.className = "avatar-preview-dm";
        dmBtn.textContent = "💬 پیام خصوصی";
        dmBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            close();
            startDm(row.userId, row.userName);
        });
        preview.appendChild(dmBtn);
    }

    preview.appendChild(closeButton);
    document.body.appendChild(preview);

    // عکس کوچک بلافاصله؛ نسخه‌ی باکیفیت و بیوگرافی که رسید اضافه می‌شود
    getProfileRow(row.userId).then((prow) => {
        if (!prow || closed) return;

        if (prow.userAvatar) largeImage.src = prow.userAvatar;

        if (prow.bio) {
            const cap = document.createElement("div");
            cap.className = "avatar-preview-bio";

            const capTitle = document.createElement("small");
            capTitle.className = "bio-title";
            capTitle.textContent = "بیوگرافی";

            const capText = document.createElement("div");
            capText.textContent = prow.bio;

            cap.appendChild(capTitle);
            cap.appendChild(capText);
            cap.addEventListener("click", (event) => event.stopPropagation());
            preview.insertBefore(cap, preview.children[1] || null);
        }
    });
}

// عکس باکیفیت من برای دیگران (ردیف پروفایل)
async function ensureMyProfileRow() {
    let row = null;

    try {
        row = await tablesDB.getRow({
            databaseId: DATABASE_ID,
            tableId: TABLE_ID,
            rowId: me.$id
        });
    } catch (e) {
        if (e.code !== 404) return;
    }

    const name = me.name || "کاربر";

    if (row) {
        const same =
            (row.userAvatar || "") === (myAvatar || "") &&
            row.userName === name &&
            (row.bio || "") === (myBio || "");

        if (same) return;

        const data = { userName: name, userAvatar: myAvatar || "" };

        // ستون bio فقط وقتی لازم است فرستاده می‌شود
        if (myBio || row.bio) data.bio = myBio || "";

        try {
            await tablesDB.updateRow({
                databaseId: DATABASE_ID,
                tableId: TABLE_ID,
                rowId: me.$id,
                data: data
            });
        } catch (e) {
            // ستون bio هنوز در جدول ساخته نشده؛ بدون آن ذخیره کن
            if (data.bio === undefined) throw e;

            delete data.bio;

            await tablesDB.updateRow({
                databaseId: DATABASE_ID,
                tableId: TABLE_ID,
                rowId: me.$id,
                data: data
            });
        }

        return;
    }

    const base = {
        userId: me.$id,
        userName: name,
        userAvatar: myAvatar || "",
        massage: "",
        recieverid: "profile",
        createdat: new Date().toISOString()
    };

    const permissions = [
        Permission.read(Role.users()),
        Permission.update(Role.user(me.$id)),
        Permission.delete(Role.user(me.$id))
    ];

    try {
        await tablesDB.createRow({
            databaseId: DATABASE_ID,
            tableId: TABLE_ID,
            rowId: me.$id,
            data: myBio ? Object.assign({ bio: myBio }, base) : base,
            permissions: permissions
        });
    } catch (e) {
        if (!myBio) throw e;

        await tablesDB.createRow({
            databaseId: DATABASE_ID,
            tableId: TABLE_ID,
            rowId: me.$id,
            data: base,
            permissions: permissions
        });
    }
}

// ================================
// بارگذاری پیام‌های قبلی (گروه + خصوصی)
// ================================
async function loadAll() {
    // گروه: ۱۰۰ پیام آخر
    try {
        const res = await tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: TABLE_ID,
            queries: [
                Query.equal("recieverid", "public"),
                Query.isNotNull("massage"),
                Query.orderDesc("$createdAt"),
                Query.limit(100)
            ]
        });
        res.rows.reverse().forEach(addRow);
    } catch (e) {
        console.error("خطا در خواندن پیام‌های گروه:", e);

        const res = await tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: TABLE_ID,
            queries: [Query.isNotNull("massage"), Query.orderDesc("$createdAt"), Query.limit(100)]
        });
        res.rows.reverse().forEach(addRow);
    }

    // خصوصی
    try {
        const res = await tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: TABLE_ID,
            queries: [
                Query.startsWith("recieverid", PRIVATE_PREFIX),
                Query.orderDesc("$createdAt"),
                Query.limit(200)
            ]
        });
        res.rows.forEach(addRow);
    } catch (e) {
        console.error("خطا در خواندن پیام‌های خصوصی:", e);
    }
}

// پیام تازه‌رسیده (از سرور یا ارسال خودم)
function handleIncoming(row) {
    if (!addRow(row)) return;

    if (isPrivate(row)) {
        const id = peerOf(row);

        if (mode === "dm" && peer && peer.id === id) {
            showMessage(row);
            if (row.userId !== me.$id) markRead(id);
        } else if (mode === "list") {
            render();
        }

        updateBadges();
    } else if (mode === "group") {
        showMessage(row);
    }
}

// ================================
// ارسال پیام
// ================================
async function sendMessageNow() {
    const message = messageInput.value.trim();
    const image = pendingImage;

    if ((!message && !image) || !me) return;
    if (mode === "list") return;

    const currentReply = replyTo;
    const toPeer = mode === "dm" ? peer : null;

    // اول عکس آپلود شود (اگر خطا داد، متن و عکس سر جایشان می‌مانند)
    let imageTag = "";

    if (image) {
        sendButton.disabled = true;
        attachText.textContent = "در حال ارسال عکس...";

        try {
            const file = await storage.createFile({
                bucketId: BUCKET_ID,
                fileId: ID.unique(),
                file: image,
                permissions: [
                    Permission.read(Role.any()),
                    Permission.delete(Role.user(me.$id))
                ]
            });

            imageTag = "[[img:" + file.$id + "]]";
        } catch (error) {
            console.error("خطا در آپلود عکس:", error);

            attachText.textContent = "عکس آماده‌ی ارسال (" + Math.max(1, Math.round(image.size / 1024)) + " کیلوبایت)";

            alert(
                error.code === 404
                    ? "فضای ذخیره‌ی عکس (bucket با شناسه‌ی chat-images) توی Appwrite ساخته نشده."
                    : "ارسال عکس انجام نشد: " + error.message
            );

            return;
        } finally {
            sendButton.disabled = false;
        }
    }

    messageInput.value = "";
    clearReply();
    clearPending();

    if (typeof resizeMessageInput === "function") resizeMessageInput();

    // نکته: Appwrite اجازه نمی‌دهد به آیدی یک کاربر دیگر دسترسی بدهیم
    // (فقط users، any و آیدی خودمان)؛ پس خصوصی‌بودن گفتگو در خود برنامه
    // (فیلتر گیرنده) اعمال می‌شود.
    const permissions = [
        Permission.read(Role.users()),
        Permission.update(Role.user(me.$id)),
        Permission.delete(Role.user(me.$id))
    ];

    try {
        const row = await tablesDB.createRow({
            databaseId: DATABASE_ID,
            tableId: TABLE_ID,
            rowId: ID.unique(),

            data: {
                userId: me.$id,
                userName: me.name || "کاربر",
                userAvatar: myAvatarThumb || "",
                massage: imageTag + message,
                recieverid: toPeer ? PRIVATE_PREFIX + toPeer.id : "public",
                createdat: new Date().toISOString(),
                // فقط وقتی پاسخ است ستون reply فرستاده می‌شود
                ...(currentReply ? { reply: JSON.stringify(currentReply) } : {})
            },

            permissions: permissions
        });

        handleIncoming(row);

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

        myBio = prefs.bio || "";

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
        await loadAll();
    } catch (e) {
        console.error("خطا در خواندن پیام‌ها:", e);
    }

    initSeen();
    setMode("group");

    // دریافت لحظه‌ای پیام‌ها
    client.subscribe(
        `databases.${DATABASE_ID}.tables.${TABLE_ID}.rows`,
        (event) => {
            if (event.events.some((x) => x.endsWith(".delete"))) {
                removeMessage(event.payload.$id);
                return;
            }

            if (event.events.some((x) => x.endsWith(".create"))) {
                handleIncoming(event.payload);
            }
        }
    );

    // عکس باکیفیت من برای دیگران (ردیف پروفایل)
    ensureMyProfileRow().catch((e) => console.error("ردیف پروفایل:", e));
})();



// تنظیم ارتفاع خودکار کادر نوشتن پیام
function resizeMessageInput() {
    messageInput.style.height = "auto";

    const maxHeight = 140;
    messageInput.style.height =
        Math.min(messageInput.scrollHeight, maxHeight) + "px";
}

messageInput.addEventListener("input", resizeMessageInput);
