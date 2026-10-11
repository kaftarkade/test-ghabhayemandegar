/* =========================================================
   FAVORITES SYSTEM
========================================================= */


/* گرفتن تمام کارت‌های عکس */

const photoCards =
    document.querySelectorAll(".photo-card");


/* دریافت موردعلاقه‌های قبلی */

let favorites = [];


try {

    favorites =
        JSON.parse(
            localStorage.getItem(
                "favoriteImages"
            ) || "[]"
        );

} catch (error) {

    favorites = [];

}



/* =========================================================
   UPDATE BUTTONS
========================================================= */

photoCards.forEach(function (card) {

    const photoId =
        card.dataset.photo;


    const favoriteBtn =
        card.querySelector(
            ".favorite-btn"
        );


    if (!favoriteBtn) {
        return;
    }


    /* بررسی اینکه قبلاً موردعلاقه بوده یا نه */

    if (
        favorites.includes(photoId)
    ) {

        card.classList.add(
            "is-favorite"
        );

        favoriteBtn.textContent =
            "★";

    }



    /* =====================================================
       CLICK
    ===================================================== */

    favoriteBtn.addEventListener(
        "click",
        function (event) {

            /*
               جلوگیری از اجرای
               کلیک احتمالی روی خود عکس
            */

            event.stopPropagation();


            const index =
                favorites.indexOf(
                    photoId
                );


            /* حذف از موردعلاقه‌ها */

            if (index !== -1) {

                favorites.splice(
                    index,
                    1
                );


                card.classList.remove(
                    "is-favorite"
                );


                favoriteBtn.textContent =
                    "☆";


            }

            /* اضافه کردن */

            else {

                favorites.push(
                    photoId
                );


                card.classList.add(
                    "is-favorite"
                );


                favoriteBtn.textContent =
                    "★";

            }


            /* ذخیره */

            localStorage.setItem(
                "favoriteImages",
                JSON.stringify(
                    favorites
                )
            );


        }
    );


});

/* =========================================================
   PREVENT IMAGE CONTEXT MENU
========================================================= */

document.addEventListener("contextmenu", function (event) {

    if (event.target.tagName === "IMG") {
        event.preventDefault();
    }

});


/* =========================================================
   PREVENT IMAGE DRAG
========================================================= */

document.addEventListener("dragstart", function (event) {

    if (event.target.tagName === "IMG") {
        event.preventDefault();
    }

});

 /* =========================================================
    GALLERY FAVORITE → PROFILE COUNT
 ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    const favoriteCount =
        document.getElementById("favoriteCount");

    if (!favoriteCount) {
        return;
    }

    let favorites = [];

    try {

        favorites = JSON.parse(
            localStorage.getItem("favoriteImages") || "[]"
        );

    } catch (error) {

        favorites = [];

    }

    favoriteCount.textContent = favorites.length;

});

/* =========================================================
   LIGHTBOX FAVORITE SYNC
========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    const lightboxFavorite =
        document.getElementById("lightboxFavorite");

    const lightbox =
        document.getElementById("lightbox");

    const photoCards =
        document.querySelectorAll(".photo-card");


    if (!lightboxFavorite || !lightbox) {
        return;
    }


    let currentPhotoId = null;


    /* =====================================================
       پیدا کردن عکس انتخاب شده در Lightbox
    ===================================================== */

    function getCurrentPhotoId() {

        const lightboxImage =
            document.getElementById("lightboxImage");

        if (!lightboxImage) {
            return null;
        }


        const imageSrc =
            lightboxImage.getAttribute("src");


        for (const card of photoCards) {

            const image =
                card.querySelector("img");

            if (!image) {
                continue;
            }


            if (
                image.getAttribute("src") === imageSrc
            ) {

                return card.dataset.photo;

            }

        }


        return null;

    }


    /* =====================================================
       بروزرسانی ستاره Lightbox
    ===================================================== */

    function updateLightboxFavorite() {

        currentPhotoId =
            getCurrentPhotoId();


        if (!currentPhotoId) {
            return;
        }


        let favorites = [];

        try {

            favorites =
                JSON.parse(
                    localStorage.getItem(
                        "favoriteImages"
                    ) || "[]"
                );

        } catch (error) {

            favorites = [];

        }


        if (
            favorites.includes(
                currentPhotoId
            )
        ) {

            lightboxFavorite.textContent =
                "★";

            lightboxFavorite.classList.add(
                "is-favorite"
            );

            lightboxFavorite.setAttribute(
                "aria-label",
                "حذف از موردعلاقه‌ها"
            );

        } else {

            lightboxFavorite.textContent =
                "☆";

            lightboxFavorite.classList.remove(
                "is-favorite"
            );

            lightboxFavorite.setAttribute(
                "aria-label",
                "افزودن به موردعلاقه‌ها"
            );

        }

    }


    /* =====================================================
       کلیک روی ستاره Lightbox
    ===================================================== */

    lightboxFavorite.addEventListener(
        "click",
        function (event) {

            event.stopPropagation();


            if (!currentPhotoId) {
                return;
            }


            let favorites = [];

            try {

                favorites =
                    JSON.parse(
                        localStorage.getItem(
                            "favoriteImages"
                        ) || "[]"
                    );

            } catch (error) {

                favorites = [];

            }


            const index =
                favorites.indexOf(
                    currentPhotoId
                );


            /* =========================
               حذف
            ========================= */

            if (index !== -1) {

                favorites.splice(
                    index,
                    1
                );

            }


            /* =========================
               اضافه کردن
            ========================= */

            else {

                favorites.push(
                    currentPhotoId
                );

            }


            /* ذخیره */

            localStorage.setItem(
                "favoriteImages",
                JSON.stringify(
                    favorites
                )
            );


            /* بروزرسانی ستاره Lightbox */

            updateLightboxFavorite();


            /* بروزرسانی ستاره کارت */

            photoCards.forEach(function (card) {

                if (
                    card.dataset.photo !==
                    currentPhotoId
                ) {
                    return;
                }


                const button =
                    card.querySelector(
                        ".favorite-btn"
                    );


                const isFavorite =
                    favorites.includes(
                        currentPhotoId
                    );


                if (isFavorite) {

                    card.classList.add(
                        "is-favorite"
                    );

                    if (button) {
                        button.textContent =
                            "★";
                    }

                } else {

                    card.classList.remove(
                        "is-favorite"
                    );

                    if (button) {
                        button.textContent =
                            "☆";
                    }

                }

            });

        }
    );


    /* =====================================================
       تشخیص تغییر عکس در Lightbox
    ===================================================== */

    const observer =
        new MutationObserver(function () {

            updateLightboxFavorite();

        });


    const lightboxImage =
        document.getElementById("lightboxImage");


    if (lightboxImage) {

        observer.observe(
            lightboxImage,
            {
                attributes: true,
                attributeFilter: ["src"]
            }
        );

    }


    /* =====================================================
       کلیک روی کارت عکس
    ===================================================== */

    photoCards.forEach(function (card) {

        card.addEventListener(
            "click",
            function () {

                setTimeout(
                    updateLightboxFavorite,
                    100
                );

            }
        );

    });


});

/* =========================================================
   حرکت مستقل و خودکار عکس‌های گالری
========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    document.querySelectorAll(".photo-card").forEach(function (card) {

        const duration =
            3 + Math.random() * 4;

        const distance =
            6 + Math.random() * 14;

        const delay =
            Math.random() * -6;

        card.style.setProperty(
            "--float-duration",
            duration + "s"
        );

        card.style.setProperty(
            "--float-distance",
            distance + "px"
        );

        card.style.setProperty(
            "--float-delay",
            delay + "s"
        );

    });

});