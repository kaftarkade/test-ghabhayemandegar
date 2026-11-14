"use strict";

/* =========================================================
   ابزارهای مشترک: هش گفت‌وگو، آپلود، نمایش فایل، پروفایل‌ها
========================================================= */

// هش کوتاه و ثابت (دقیقاً همان الگوریتم تابع سرور)
function convHash(str) {
    let h1 = 0x811c9dc5, h2 = 5381;
    for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i);
        h1 ^= c; h1 = Math.imul(h1, 16777619) >>> 0;
        h2 = (Math.imul(h2, 33) ^ c) >>> 0;
    }
    return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}
const dmKey = (a, b) => "d:" + convHash([a, b].sort().join("|")).slice(0, 12);
const convListKey = id => "c:" + convHash(id).slice(0, 12);

/* ---------- توکن موقت برای خواندن فایل‌ها ---------- */

let _jwt = null, _jwtAt = 0;
async function getJwt() {
    if (_jwt && Date.now() - _jwtAt < 10 * 60 * 1000) return _jwt;
    const result = await appwriteAccount.createJWT();
    _jwt = result.jwt;
    _jwtAt = Date.now();
    return _jwt;
}

const _blobPromises = new Map();
const _blobUrls = new Map();

// آدرس آماده (اگر قبلاً دانلود شده)
const fileUrlIfReady = fileId => _blobUrls.get(fileId) || null;

// دانلود امن فایل و تبدیل به آدرس قابل نمایش
function fileBlobUrl(fileId) {
    if (_blobPromises.has(fileId)) return _blobPromises.get(fileId);

    const promise = (async () => {
        const jwt = await getJwt();
        const response = await fetch(
            `${APPWRITE_ENDPOINT}/storage/buckets/${APPWRITE_BUCKET_ID}/files/${fileId}/view`,
            { headers: { "X-Appwrite-Project": APPWRITE_PROJECT_ID, "X-Appwrite-JWT": jwt } }
        );
        if (!response.ok) throw new Error("file " + response.status);
        const url = URL.createObjectURL(await response.blob());
        _blobUrls.set(fileId, url);
        return url;
    })();

    _blobPromises.set(fileId, promise);
    promise.catch(() => _blobPromises.delete(fileId));
    return promise;
}

/* ---------- آپلود ---------- */

let _meId = null;
async function myId() {
    if (!_meId) _meId = (await appwriteAccount.get()).$id;
    return _meId;
}

// آپلود با دسترسی موقت فقط برای خود کاربر؛ تابع سرور دسترسی نهایی را تعیین می‌کند
async function uploadToBucket(file, onProgress) {
    const id = await myId();
    const created = await appwriteStorage.createFile({
        bucketId: APPWRITE_BUCKET_ID,
        fileId: Appwrite.ID.unique(),
        file,
        permissions: [
            Appwrite.Permission.read(Appwrite.Role.user(id)),
            Appwrite.Permission.delete(Appwrite.Role.user(id))
        ],
        onProgress
    });
    return created.$id;
}

// کوچک‌کردن عکس قبل از آپلود (سرعت و حجم کمتر)
async function compressImage(file, maxSide = 1280, quality = 0.8) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file; // gif و غیره دست‌نخورده
    try {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
        if (!blob || blob.size >= file.size) return file;
        return new File([blob], "photo.jpg", { type: "image/jpeg" });
    } catch (_) {
        return file;
    }
}

/* ---------- پروفایل‌ها ---------- */

const profileCache = new Map(); // userId -> { name, bio, avatar } یا {}

async function loadProfiles(ids) {
    const missing = [...new Set(ids)].filter(id => id && !profileCache.has(id));

    for (let i = 0; i < missing.length; i += 50) {
        const chunk = missing.slice(i, i + 50);
        try {
            const result = await appwriteTablesDB.listRows({
                databaseId: APPWRITE_DATABASE_ID,
                tableId: APPWRITE_TABLE_ID,
                queries: [Appwrite.Query.equal("$id", chunk), Appwrite.Query.limit(50)]
            });

            const found = new Set();
            result.rows.forEach(row => {
                if (row.record_type !== "profile") return;
                let content = {};
                try { content = JSON.parse(row.content || "{}"); } catch (_) {}
                profileCache.set(row.$id, {
                    name: row.display_name || "",
                    bio: content.bio || "",
                    avatar: content.avatar || ""
                });
                found.add(row.$id);
            });
            chunk.forEach(id => { if (!found.has(id)) profileCache.set(id, {}); });
        } catch (error) {
            console.warn("loadProfiles failed", error && error.message);
        }
    }
}

// عکس یک عنصر (دایره‌ای) را از روی پروفایل می‌گذارد
async function paintAvatar(element) {
    const profile = profileCache.get(element.dataset.user);
    if (!profile || !profile.avatar || element.dataset.painted === profile.avatar) return;

    element.dataset.painted = profile.avatar;
    try {
        const url = await fileBlobUrl(profile.avatar);
        element.style.backgroundImage = `url("${url}")`;
        element.classList.add("has-img");
        element.textContent = "";
    } catch (_) { /* همان حرف اول اسم می‌ماند */ }
}

function paintAvatars(root) {
    (root || document).querySelectorAll("[data-user]").forEach(paintAvatar);
}

function createAvatar(userId, name, extraClass) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "avatar " + (extraClass || "");
    button.dataset.user = userId;
    button.dataset.name = name || "";
    button.setAttribute("aria-label", "پروفایل " + (name || ""));
    button.textContent = (name || "?").trim().charAt(0) || "?";
    return button;
}

/* ---------- پنجرهٔ پروفایل ---------- */

async function openProfileCard(userId, nameHint) {
    const selfId = await myId();

    const overlay = document.createElement("div");
    overlay.className = "pc-overlay";

    const card = document.createElement("div");
    card.className = "pc-card";
    card.setAttribute("role", "dialog");

    const close = document.createElement("button");
    close.type = "button";
    close.className = "pc-close";
    close.textContent = "✕";
    close.setAttribute("aria-label", "بستن");

    const big = document.createElement("div");
    big.className = "pc-avatar";
    big.dataset.user = userId;
    big.textContent = (nameHint || "?").trim().charAt(0) || "?";

    const nameEl = document.createElement("h2");
    nameEl.textContent = nameHint || "کاربر";

    const bioEl = document.createElement("p");
    bioEl.className = "pc-bio";
    bioEl.textContent = "در حال بارگذاری...";

    card.append(close, big, nameEl, bioEl);

    if (userId !== selfId) {
        const dmButton = document.createElement("a");
        dmButton.className = "pc-dm";
        dmButton.href = "chat.html?type=dm&user=" + encodeURIComponent(userId);
        dmButton.textContent = "✉️ پیام شخصی";
        card.appendChild(dmButton);
    }

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    const remove = () => { overlay.remove(); document.removeEventListener("keydown", onKey); };
    const onKey = event => { if (event.key === "Escape") remove(); };
    document.addEventListener("keydown", onKey);
    close.addEventListener("click", remove);
    overlay.addEventListener("click", event => { if (event.target === overlay) remove(); });

    await loadProfiles([userId]);
    const profile = profileCache.get(userId) || {};

    nameEl.textContent = profile.name || nameHint || "کاربر";
    bioEl.textContent = profile.bio || "بیوگرافی ثبت نشده است.";
    bioEl.classList.toggle("empty", !profile.bio);
    paintAvatar(big);
}

/* ---------- انتشار پروفایل خود کاربر (برای صفحهٔ پروفایل) ---------- */

async function publishPublicProfile(patch) {
    try {
        const payload = { action: "updateProfile" };

        if ("bio" in patch) payload.bio = patch.bio || "";

        if ("avatarDataUrl" in patch) {
            if (!patch.avatarDataUrl) {
                payload.removeAvatar = true;
            } else {
                const blob = await (await fetch(patch.avatarDataUrl)).blob();
                const file = new File([blob], "avatar.jpg", { type: blob.type || "image/jpeg" });
                payload.avatarFileId = await uploadToBucket(file);
            }
        }

        await callServer(payload);
        profileCache.delete(await myId());
        return true;
    } catch (error) {
        console.warn("publishPublicProfile failed:", error && error.message);
        return false;
    }
}

// اگر عکس/بیوگرافی قبلاً فقط در prefs بوده، یک بار برای بقیه منتشر می‌شود
async function ensurePublicProfileSynced(prefs) {
    try {
        const key = ((prefs && prefs.avatar) || "").length + ":" + ((prefs && prefs.bio) || "");
        if (localStorage.getItem("pubProfileKey") === key) return;

        const patch = { bio: (prefs && prefs.bio) || "" };
        if (prefs && prefs.avatar) patch.avatarDataUrl = prefs.avatar;

        if (await publishPublicProfile(patch)) localStorage.setItem("pubProfileKey", key);
    } catch (_) {}
}
