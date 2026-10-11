/* =========================================================
   قاب‌های ماندگار
   PRO-MUSIC-FIX.JS
   پلیر حرفه‌ای موسیقی
========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    /* =====================================================
       پیدا کردن عناصر
    ====================================================== */

    const audios = document.querySelectorAll(
        ".pro-music-player audio"
    );

    const tracks = document.querySelectorAll(
        ".pro-track"
    );

    const playButton =
        document.getElementById("proPlay");

    const nextButton =
        document.getElementById("proNext");

    const prevButton =
        document.getElementById("proPrev");

    const progress =
        document.getElementById("proProgress");

    const volume =
        document.getElementById("proVolume");

    const title =
        document.getElementById("proSongTitle");

    const artist =
        document.getElementById("proSongArtist");

    const currentTime =
        document.getElementById("proCurrentTime");


    /* =====================================================
       بررسی آهنگ‌ها
    ====================================================== */

    if (!audios.length) {

        console.error(
            "❌ هیچ audio داخل پلیر پیدا نشد."
        );

        return;
    }


    console.log(
        "✅ تعداد آهنگ‌ها:",
        audios.length
    );


    /* =====================================================
       آهنگ فعلی
    ====================================================== */

    let currentIndex = 0;


    /* =====================================================
       اطلاعات آهنگ‌ها
       ترتیب این لیست باید با ترتیب audio ها یکی باشد
    ====================================================== */

    const songs = [

        {
            title: "عنبر نسأ",
            artist: "ابوالفضل جمالی"
        },

        {
            title: "مدرسه",
            artist:
                "جواد ابراهیمی، حسین حق‌خواه، ابوالفضل جمالی، عرفان سرانجام"
        },

        {
            title: "شهر پایگاه",
            artist:
                "امیر علی پیرمراد - هوش مصنوعی"
        }, 
        
          {
            title: "پادکست یک گفت‌وگوی خصوصی",
            artist:
                "جواد ابراهیمی / ویرگول مدیا"
        }, 
        
        
         {
            title: "پادکست قایقی خواهم ساخت",
            artist:
                "عرفان سرانجام، امیرعلی پیرمراد، سبحان قادری، رضا اسدی / ویرگول مدیا" 
        }, 

    ];


    /* =====================================================
       تبدیل ثانیه به دقیقه
    ====================================================== */

    function formatTime(seconds) {

        if (!Number.isFinite(seconds)) {
            return "00:00";
        }


        const minutes =
            Math.floor(seconds / 60);


        const secondsPart =
            Math.floor(seconds % 60);


        return (
            String(minutes).padStart(2, "0") +
            ":" +
            String(secondsPart).padStart(2, "0")
        );

    }


    /* =====================================================
       اطلاعات آهنگ فعلی
    ====================================================== */

    function updateInfo() {

        const song =
            songs[currentIndex];


        if (song) {

            if (title) {

                title.textContent =
                    song.title;

            }


            if (artist) {

                artist.textContent =
                    song.artist;

            }

        }


        tracks.forEach(
            function (track, index) {

                track.classList.toggle(
                    "active",
                    index === currentIndex
                );

            }
        );

    }


    /* =====================================================
       تغییر آهنگ
    ====================================================== */

    function loadSong(
        index,
        autoplay = false
    ) {

        /* اگر از اول رد شد */

        if (index >= audios.length) {

            index = 0;

        }


        /* اگر از آخر رد شد */

        if (index < 0) {

            index =
                audios.length - 1;

        }


        currentIndex =
            index;


        /* توقف تمام آهنگ‌های دیگر */

        audios.forEach(
            function (audio, i) {

                if (i !== currentIndex) {

                    audio.pause();

                    audio.currentTime = 0;

                }

            }
        );


        const audio =
            audios[currentIndex];


        if (!audio) {
            return;
        }


        /* اطلاعات آهنگ */

        updateInfo();


        /* صفر کردن نوار */

        if (progress) {

            progress.value = 0;

        }


        /* صفر کردن زمان */

        if (currentTime) {

            currentTime.textContent =
                "00:00";

        }


        /* تغییر دکمه */

        if (playButton) {

            playButton.textContent =
                "▶";

        }


        /* پخش */

        if (autoplay) {

            playAudio(audio);

        }

    }


    /* =====================================================
       پخش آهنگ
    ====================================================== */

    function playAudio(audio) {

        if (!audio) {
            return;
        }


        const promise =
            audio.play();


        if (promise !== undefined) {

            promise
                .then(function () {

                    console.log(
                        "✅ آهنگ شروع به پخش کرد"
                    );

                })
                .catch(function (error) {

                    console.error(
                        "❌ خطا در پخش آهنگ:",
                        error
                    );

                });

        }

    }


    /* =====================================================
       PLAY / PAUSE
    ====================================================== */

    if (playButton) {

        playButton.addEventListener(
            "click",
            function () {

                const audio =
                    audios[currentIndex];


                if (!audio) {
                    return;
                }


                if (audio.paused) {

                    playAudio(audio);

                } else {

                    audio.pause();

                }

            }
        );

    }


    /* =====================================================
       کنترل تمام آهنگ‌ها
    ====================================================== */

    audios.forEach(
        function (audio, index) {


            /* =============================================
               صدای اولیه
            ============================================== */

            audio.volume = 1;


            /* =============================================
               PLAY
            ============================================== */

            audio.addEventListener(
                "play",
                function () {

                    currentIndex =
                        index;


                    updateInfo();


                    /* توقف بقیه */

                    audios.forEach(
                        function (
                            otherAudio,
                            otherIndex
                        ) {

                            if (
                                otherIndex !== index
                            ) {

                                otherAudio.pause();

                            }

                        }
                    );


                    if (playButton) {

                        playButton.textContent =
                            "❚❚";

                    }

                }
            );


            /* =============================================
               PAUSE
            ============================================== */

            audio.addEventListener(
                "pause",
                function () {

                    if (
                        index === currentIndex
                    ) {

                        if (playButton) {

                            playButton.textContent =
                                "▶";

                        }

                    }

                }
            );


            /* =============================================
               زمان آهنگ
            ============================================== */

            audio.addEventListener(
                "timeupdate",
                function () {

                    if (
                        index !== currentIndex
                    ) {

                        return;

                    }


                    if (
                        audio.duration &&
                        Number.isFinite(
                            audio.duration
                        )
                    ) {

                        const percent =
                            (
                                audio.currentTime /
                                audio.duration
                            ) * 100;


                        if (progress) {

                            progress.value =
                                percent;

                        }

                    }


                    if (currentTime) {

                        currentTime.textContent =
                            formatTime(
                                audio.currentTime
                            );

                    }

                }
            );


            /* =============================================
               مدت آهنگ
            ============================================== */

            audio.addEventListener(
                "loadedmetadata",
                function () {

                    if (
                        index !== currentIndex
                    ) {

                        return;

                    }


                    console.log(
                        "🎵 مدت آهنگ:",
                        formatTime(
                            audio.duration
                        )
                    );

                }
            );


            /* =============================================
               آماده پخش
            ============================================== */

            audio.addEventListener(
                "canplay",
                function () {

                    console.log(
                        "✅ آهنگ آماده پخش:",
                        index
                    );

                }
            );


            /* =============================================
               خطای آهنگ
            ============================================== */

            audio.addEventListener(
                "error",
                function () {

                    console.error(
                        "❌ خطای فایل صوتی:",
                        index,
                        audio.error
                    );

                }
            );


            /* =============================================
               پایان آهنگ
            ============================================== */

            audio.addEventListener(
                "ended",
                function () {

                    if (
                        index !== currentIndex
                    ) {

                        return;

                    }


                    /* آهنگ بعدی */

                    if (
                        currentIndex <
                        audios.length - 1
                    ) {

                        loadSong(
                            currentIndex + 1,
                            true
                        );

                    } else {

                        /* رسیدن به آخرین آهنگ */

                        if (playButton) {

                            playButton.textContent =
                                "▶";

                        }


                        if (progress) {

                            progress.value =
                                100;

                        }

                    }

                }
            );

        }
    );


/* =====================================================
   PROGRESS
   نوار پیشرفت حرفه‌ای
====================================================== */

if (progress) {

    /* ===============================
       حرکت نوار هنگام پخش
    =============================== */

    audios.forEach(function (audio, index) {

        audio.addEventListener(
            "timeupdate",
            function () {

                if (index !== currentIndex) {
                    return;
                }

                if (
                    Number.isFinite(audio.duration) &&
                    audio.duration > 0
                ) {

                    const percent =
                        (audio.currentTime /
                         audio.duration) * 100;

                    progress.value = percent;

                }

            }
        );

    });


    /* ===============================
       کلیک / کشیدن روی نوار
    =============================== */

    progress.addEventListener(
        "input",
        function () {

            const audio =
                audios[currentIndex];

            if (!audio) {
                return;
            }

            if (
                !Number.isFinite(audio.duration) ||
                audio.duration <= 0
            ) {
                return;
            }


            const percent =
                Number(this.value);


            audio.currentTime =
                (percent / 100) *
                audio.duration;


            /* زمان فعلی را هم فوراً آپدیت کن */

            if (currentTime) {

                currentTime.textContent =
                    formatTime(
                        audio.currentTime
                    );

            }

        }
    );


    /* ===============================
       وقتی آهنگ عوض می‌شود
    =============================== */

    audios.forEach(function (audio, index) {

        audio.addEventListener(
            "loadedmetadata",
            function () {

                if (index !== currentIndex) {
                    return;
                }

                progress.value = 0;

            }
        );


        audio.addEventListener(
            "ended",
            function () {

                if (index !== currentIndex) {
                    return;
                }

                progress.value = 100;

            }
        );

    });

}

    /* =====================================================
       آهنگ قبلی
    ====================================================== */

    if (prevButton) {

        prevButton.addEventListener(
            "click",
            function () {

                loadSong(
                    currentIndex - 1,
                    true
                );

            }
        );

    }


    /* =====================================================
       انتخاب آهنگ از لیست
    ====================================================== */

    tracks.forEach(
        function (track, index) {

            track.addEventListener(
                "click",
                function () {

                    loadSong(
                        index,
                        true
                    );

                }
            );

        }
    );


    /* =====================================================
       کنترل صدا
    ====================================================== */

    if (volume) {

        volume.addEventListener(
            "input",
            function () {

                const value =
                    Number(this.value);


                audios.forEach(
                    function (audio) {

                        audio.volume =
                            value;

                    }
                );

            }
        );

    }


    /* =====================================================
       مقدار اولیه صدا
    ====================================================== */

    audios.forEach(
        function (audio) {

            audio.volume = 1;

        }
    );


    /* =====================================================
       آهنگ اولیه
    ====================================================== */

    loadSong(
        0,
        false
    );


    console.log(
        "🎵 پلیر حرفه‌ای آماده است."
    );

});

/* =========================================================
   قاب‌های ماندگار
   MUSIC FAVORITES
   علاقه‌مندی آهنگ‌ها
========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    const favoriteButtons =
        document.querySelectorAll(
            ".music-favorite-btn"
        );


    /* =====================================================
       دریافت علاقه‌مندی‌ها
    ===================================================== */

    let favorites =
        JSON.parse(
            localStorage.getItem("musicFavorites") || "[]"
        );


    /* =====================================================
       بررسی وضعیت ستاره‌ها
    ===================================================== */

    function updateFavoriteButtons() {

        favoriteButtons.forEach(function (button) {

            const track =
                button.closest(".pro-track");

            if (!track) return;


            const index =
                Number(
                    track.dataset.index
                );


            if (favorites.includes(index)) {

                button.textContent = "★";

                button.classList.add(
                    "favorite-active"
                );

                button.setAttribute(
                    "aria-label",
                    "حذف از موردعلاقه‌ها"
                );

            } else {

                button.textContent = "☆";

                button.classList.remove(
                    "favorite-active"
                );

                button.setAttribute(
                    "aria-label",
                    "افزودن به موردعلاقه‌ها"
                );

            }

        });

    }


    /* =====================================================
       کلیک روی ستاره
    ===================================================== */

    favoriteButtons.forEach(function (button) {

        button.addEventListener(
            "click",
            function (event) {

                /*
                 جلوگیری از اجرای کلیک آهنگ
                 */

                event.preventDefault();

                event.stopPropagation();


                const track =
                    this.closest(".pro-track");

                if (!track) return;


                const index =
                    Number(
                        track.dataset.index
                    );


                /* =========================
                   اضافه / حذف
                ========================= */

                if (favorites.includes(index)) {

                    favorites =
                        favorites.filter(
                            function (item) {
                                return item !== index;
                            }
                        );

                } else {

                    favorites.push(index);

                }


                /* =========================
                   ذخیره
                ========================= */

                localStorage.setItem(
                    "musicFavorites",
                    JSON.stringify(favorites)
                );


                /* =========================
                   بروزرسانی
                ========================= */

                updateFavoriteButtons();

            }
        );

    });


    /* =====================================================
       شروع
    ===================================================== */

    updateFavoriteButtons();

});
