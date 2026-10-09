/* =========================================================
   SYNC.JS
   همگام‌سازی علاقه‌مندی‌ها (عکس‌ها و آهنگ‌ها) با حساب Appwrite
   فقط وقتی کاربر وارد شده باشد کار می‌کند.
========================================================= */

(function () {

    if (typeof Appwrite === "undefined") return;
    if (localStorage.getItem("loggedIn") !== "true") return;

    var client = new Appwrite.Client()
        .setEndpoint("https://cloud.appwrite.io/v1")
        .setProject("6ac3b38f000976364cad");

    var account = new Appwrite.Account(client);

    var SONG_PREFIX = "favorite-song-";

    var nativeSet = Storage.prototype.setItem;
    var nativeRemove = Storage.prototype.removeItem;

    var dirty = false;
    var timer = null;


    /* ---------- کمک‌ها ---------- */

    function isFavKey(key) {
        return key === "favoriteImages" ||
               key === "musicFavorites" ||
               (typeof key === "string" && key.indexOf(SONG_PREFIX) === 0);
    }

    function readArray(key) {
        try {
            var value = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(value) ? value : [];
        } catch (e) {
            return [];
        }
    }

    function readSongs() {
        var list = [];
        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            if (key && key.indexOf(SONG_PREFIX) === 0 &&
                localStorage.getItem(key) === "true") {
                var n = parseInt(key.slice(SONG_PREFIX.length), 10);
                if (!isNaN(n)) list.push(n);
            }
        }
        return list;
    }

    function snapshot() {
        return {
            favImages: readArray("favoriteImages"),
            favMusics: readArray("musicFavorites"),
            favSongs: readSongs()
        };
    }

    function same(a, b) {
        function norm(x) { return JSON.stringify((x || []).map(String).sort()); }
        return norm(a) === norm(b);
    }


    /* ---------- ارسال به حساب ---------- */

    async function push() {
        var acc = await account.get();
        var prefs = Object.assign({}, acc.prefs, snapshot());
        await account.updatePrefs({ prefs: prefs });
        dirty = false;
    }

    // هر تغییری در علاقه‌مندی‌ها، با کمی تأخیر به حساب ارسال می‌شود
    window.syncFavorites = function () {
        dirty = true;
        clearTimeout(timer);
        timer = setTimeout(function () {
            push().catch(function (e) { console.error("خطا در همگام‌سازی:", e); });
        }, 800);
    };

    window.syncFavoritesNow = async function () {
        clearTimeout(timer);
        if (dirty) await push();
    };

    // هر تغییر در localStorage روی این کلیدها را شناسایی کن
    Storage.prototype.setItem = function (key) {
        nativeSet.apply(this, arguments);
        if (this === localStorage && isFavKey(key)) window.syncFavorites();
    };

    Storage.prototype.removeItem = function (key) {
        nativeRemove.apply(this, arguments);
        if (this === localStorage && isFavKey(key)) window.syncFavorites();
    };


    /* ---------- دریافت از حساب ---------- */

    async function pull() {

        var acc = await account.get();
        var p = acc.prefs || {};

        var hasRemote = Array.isArray(p.favImages) ||
                        Array.isArray(p.favMusics) ||
                        Array.isArray(p.favSongs);

        // اولین بار: اطلاعات همین گوشی به حساب منتقل شود
        if (!hasRemote) {
            var s = snapshot();
            if (s.favImages.length || s.favMusics.length || s.favSongs.length) {
                dirty = true;
                await push();
            }
            return;
        }

        // کاربر همین الان تغییری داده؛ رویش ننویس
        if (dirty) return;

        var local = snapshot();

        if (same(local.favImages, p.favImages) &&
            same(local.favMusics, p.favMusics) &&
            same(local.favSongs, p.favSongs)) {
            return;
        }

        nativeSet.call(localStorage, "favoriteImages", JSON.stringify(p.favImages || []));
        nativeSet.call(localStorage, "musicFavorites", JSON.stringify(p.favMusics || []));

        Object.keys(localStorage).forEach(function (key) {
            if (key.indexOf(SONG_PREFIX) === 0) nativeRemove.call(localStorage, key);
        });

        (p.favSongs || []).forEach(function (n) {
            nativeSet.call(localStorage, SONG_PREFIX + n, "true");
        });

        // صفحه با اطلاعات جدید دوباره نمایش داده شود
        location.reload();
    }

    pull().catch(function (e) {
        if (e && e.code !== 401) console.error("خطا در دریافت علاقه‌مندی‌ها:", e);
    });

})();
