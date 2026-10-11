document.addEventListener("DOMContentLoaded", function () {

    const cards = document.querySelectorAll(
        ".music-player .player-info"
    );

    const miniPlayer =
        document.getElementById("miniPlayer");

    const miniTitle =
        document.getElementById("miniPlayerTitle");

    const miniArtist =
        document.getElementById("miniPlayerArtist");

    const miniButton =
        document.getElementById("miniPlayerButton");

    const miniClose =
        document.getElementById("miniPlayerClose");


    let currentAudio = null;


    cards.forEach(function (card) {

        const audio =
            card.querySelector("audio");

        const title =
            card.querySelector("h2");

        const artist =
            card.querySelector("p");

        const status =
            card.querySelector(".music-status");


        if (!audio) {
            return;
        }


        /* ==============================
           PLAY
        ============================== */

        audio.addEventListener("play", function () {

            cards.forEach(function (otherCard) {

                const otherAudio =
                    otherCard.querySelector("audio");

                if (
                    otherAudio &&
                    otherAudio !== audio
                ) {
                    otherAudio.pause();
                }

                otherCard.classList.remove(
                    "playing"
                );

                const otherStatus =
                    otherCard.querySelector(
                        ".music-status"
                    );

                if (otherStatus) {
                    otherStatus.textContent =
                        "آماده پخش";
                }

            });


            card.classList.add("playing");

            currentAudio = audio;


            if (status) {
                status.textContent =
                    "در حال پخش 🎵";
            }


            if (miniPlayer) {
                miniPlayer.classList.add(
                    "active"
                );
            }


            if (miniTitle && title) {
                miniTitle.textContent =
                    title.textContent.trim();
            }


            if (miniArtist && artist) {
                miniArtist.textContent =
                    artist.textContent
                        .replace(/\s+/g, " ")
                        .trim();
            }


            if (miniButton) {
                miniButton.textContent =
                    "❚❚";
            }

        });


        /* ==============================
           PAUSE
        ============================== */

        audio.addEventListener("pause", function () {

            card.classList.remove(
                "playing"
            );


            if (status) {
                status.textContent =
                    "متوقف شده";
            }


            if (currentAudio === audio) {

                if (miniButton) {
                    miniButton.textContent =
                        "▶";
                }

            }

        });


        /* ==============================
           END
        ============================== */

        audio.addEventListener("ended", function () {

            card.classList.remove(
                "playing"
            );


            if (status) {
                status.textContent =
                    "پایان آهنگ";
            }


            if (currentAudio === audio) {

                currentAudio = null;

                if (miniPlayer) {
                    miniPlayer.classList.remove(
                        "active"
                    );
                }

            }

        });

    });


    /* ==============================
       MINI PLAYER BUTTON
    ============================== */

    if (miniButton) {

        miniButton.addEventListener(
            "click",
            function () {

                if (!currentAudio) {
                    return;
                }


                if (currentAudio.paused) {

                    currentAudio.play();

                } else {

                    currentAudio.pause();

                }

            }
        );

    }


    /* ==============================
       CLOSE MINI PLAYER
    ============================== */

    if (miniClose) {

        miniClose.addEventListener(
            "click",
            function () {

                if (miniPlayer) {

                    miniPlayer.classList.remove(
                        "active"
                    );

                }

            }
        );

    }

});

/* =========================================
   FAVORITE MUSIC
========================================= */

document.addEventListener("DOMContentLoaded", function () {

    const favoriteButtons =
        document.querySelectorAll(".music-favorite");


    favoriteButtons.forEach(function (button, index) {

        const storageKey =
            "favorite-song-" + index;


        /* ذخیره وضعیت قبلی */

        if (localStorage.getItem(storageKey) === "true") {

            button.classList.add("active");

            button.textContent = "★";

            button.setAttribute(
                "aria-label",
                "حذف از علاقه‌مندی"
            );

        }


        /* کلیک روی مورد علاقه */

        button.addEventListener("click", function () {

            const isFavorite =
                button.classList.toggle("active");


            if (isFavorite) {

                button.textContent = "★";

                button.setAttribute(
                    "aria-label",
                    "حذف از علاقه‌مندی"
                );

                localStorage.setItem(
                    storageKey,
                    "true"
                );

            } else {

                button.textContent = "☆";

                button.setAttribute(
                    "aria-label",
                    "افزودن به علاقه‌مندی"
                );

                localStorage.removeItem(
                    storageKey
                );

            }

        });

    });

});

audio.addEventListener(
    "loadedmetadata",
    function () {

        if (index !== currentIndex) {
            return;
        }

        if (duration) {

            duration.textContent =
                formatTime(audio.duration);

        }

    }
);

audios.forEach(function (audio, index) {

    if (index !== currentIndex) {
        return;
    }

    if (audio.readyState >= 1) {

        if (duration) {
            duration.textContent =
                formatTime(audio.duration);
        }

    }

});