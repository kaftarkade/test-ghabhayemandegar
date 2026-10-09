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

// استایل ساعت و دکمه‌ی حذف
const extraStyle = document.createElement("style");
extraStyle.textContent = `
.message .msg-meta{display:flex;align-items:center;gap:8px;margin-top:2px;font-size:10px;opacity:.65}
.message .msg-del{background:none;border:none;color:inherit;cursor:pointer;font-size:12px;padding:0}
`;
document.head.appendChild(extraStyle);

// ================================
// ساعت پیام (به وقت گوشی)
// ================================
function formatTime(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return "";

    const time = d.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });

    if (d.toDateString() === new Date().toDateString()) return time;

    const day = d.toLocaleDateString("fa-IR", { day: "numeric", month: "short" });
    return day + " - " + time;
}

// ================================
// آیا این پیام را من می‌توانم حذف کنم؟
// ================================
function canDelete(row) {
    return (row.$permissions || []).includes('delete("user:' + me.$id + '")');
}

// ================================
// نمایش یک پیام
// ================================
function showMessage(row) {
    // این جدول ممکن است ردیف‌های غیرپیام هم داشته باشد
    if (!row.massage) return;
    if (shownIds.has(row.$id)) return;
    shownIds.add(row.$id);

    const empty = chatBox.querySelector(".empty-chat");
    if (empty) empty.remove();

    const isMine = row.userId === me.$id;

    const el = document.createElement("div");
    el.className = "message " + (isMine ? "sent" : "received");
    el.dataset.id = row.$id;

    if (!isMine) {
        const name = document.createElement("small");
        name.textContent = row.userName || "کاربر";
        name.style.cssText = "display:block;opacity:.6;font-size:11px;margin-bottom:2px";
        el.appendChild(name);
    }

    const text = document.createElement("span");
    text.textContent = row.massage;
    el.appendChild(text);

    const meta = document.createElement("div");
    meta.className = "msg-meta";

    const time = document.createElement("span");
    time.textContent = formatTime(row.$createdAt);
    meta.appendChild(time);

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
    chatBox.appendChild(el);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ================================
// حذف از صفحه
// ================================
function removeMessage(id) {
    const el = chatBox.querySelector('[data-id="' + id + '"]');
    if (el) el.remove();
    shownIds.delete(id);

    if (!chatBox.querySelector(".message")) {
        chatBox.innerHTML = '<div class="empty-chat">هنوز پیامی ارسال نشده است.</div>';
    }
}

// ================================
// حذف پیام (فقط پیام خودم)
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
// خواندن پیام‌های قبلی (۱۰۰ پیام آخر)
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
    if (!message) return;

    messageInput.value = "";

    try {
        const row = await tablesDB.createRow({
            databaseId: DATABASE_ID,
            tableId: TABLE_ID,
            rowId: ID.unique(),
            data: {
                userId: me.$id,
                userName: me.name || "کاربر",
                massage: message,
                recieverid: "public",
                createdat: new Date().toISOString()
            },
            // فقط صاحب پیام می‌تواند آن را ویرایش یا حذف کند
            permissions: [
                Permission.update(Role.user(me.$id)),
                Permission.delete(Role.user(me.$id))
            ]
        });
        showMessage(row);
    } catch (error) {
        console.error("خطا در ارسال پیام:", error);
        messageInput.value = message;
        alert("ارسال پیام انجام نشد: " + error.message);
    }
}

sendButton.addEventListener("click", sendMessageNow);
messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessageNow();
});

// ================================
// شروع
// ================================
(async function init() {
    try {
        me = await account.get();
    } catch (e) {
        // فقط وقتی نشست معتبر نیست از حساب خارج کن؛
        // قطعی اینترنت/VPN نباید باعث خروج شود
        if (e.code === 401) {
            localStorage.removeItem("loggedIn");
            window.location.href = "login.html";
        } else {
            console.error("خطا در اتصال به Appwrite:", e);
            alert("اتصال به سرور برقرار نشد. اینترنت/VPN را بررسی کن و صفحه را رفرش کن.");
        }
        return;
    }

    try {
        await loadMessages();
    } catch (e) {
        console.error("خطا در خواندن پیام‌ها:", e);
    }

    // دریافت لحظه‌ای: پیام جدید و حذف پیام
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
