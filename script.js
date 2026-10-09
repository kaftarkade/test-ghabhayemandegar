/* =========================================================
   قاب‌های ماندگار
   SCRIPT.JS
   کدهای اصلی سایت
========================================================= */


/* =========================================================
   THEME
========================================================= */

const themeToggle =
    document.getElementById("theme-toggle");

const savedTheme =
    localStorage.getItem("theme");


function loadTheme() {

    if (savedTheme === "light") {

        document.body.classList.add("light-mode");

        if (themeToggle) {
            themeToggle.checked = false;
        }

    } else {

        document.body.classList.remove("light-mode");

        if (themeToggle) {
            themeToggle.checked = true;
        }

    }

}


loadTheme();


/* =========================================================
   CHANGE THEME
========================================================= */

if (themeToggle) {

    themeToggle.addEventListener(
        "change",
        function () {

            if (this.checked) {

                document.body.classList.remove(
                    "light-mode"
                );

                localStorage.setItem(
                    "theme",
                    "dark"
                );

            } else {

                document.body.classList.add(
                    "light-mode"
                );

                localStorage.setItem(
                    "theme",
                    "light"
                );

            }

        }
    );

}


/* =========================================================
   ACCOUNT MENU
========================================================= */

const accountLink =
    document.getElementById("accountLink");


if (accountLink) {

    const savedUser =
        localStorage.getItem("memoryUser");

    const loggedIn =
        localStorage.getItem("loggedIn");


    if (
        savedUser &&
        loggedIn === "true"
    ) {

        accountLink.textContent =
            "👤 پروفایل";

        accountLink.href =
            "profile.html";

    } else {

        accountLink.textContent =
            "👤 ورود / ثبت‌نام";

        accountLink.href =
            "login.html";

    }

}


/* =========================================================
   GALLERY
========================================================= */

const galleryCards =
    Array.from(
        document.querySelectorAll(".photo-card")
    );


let currentPhotoIndex = 0;


/* =========================================================
   FAVORITES STORAGE
========================================================= */

function getFavoriteImages() {

    try {

        return JSON.parse(
            localStorage.getItem(
                "favoriteImages"
            ) || "[]"
        );

    } catch (error) {

        return [];

    }

}


function saveFavoriteImages(favorites) {

    localStorage.setItem(
        "favoriteImages",
        JSON.stringify(favorites)
    );

}


/* =========================================================
   UPDATE ALL GALLERY FAVORITE BUTTONS
========================================================= */

function updateGalleryFavorites() {

    const favorites =
        getFavoriteImages();


    galleryCards.forEach(function (card) {

        const photoId =
            card.dataset.photo;


        const button =
            card.querySelector(
                ".favorite-btn"
            );


        if (!photoId || !button) {
            return;
        }


        const isFavorite =
            favorites.includes(photoId);


        if (isFavorite) {

            card.classList.add(
                "is-favorite"
            );

            button.textContent =
                "★";

            button.setAttribute(
                "aria-label",
                "حذف از موردعلاقه‌ها"
            );

        } else {

            card.classList.remove(
                "is-favorite"
            );

            button.textContent =
                "☆";

            button.setAttribute(
                "aria-label",
                "افزودن به موردعلاقه‌ها"
            );

        }

    });

}


/* =========================================================
   TOGGLE GALLERY FAVORITE
========================================================= */

function toggleGalleryFavorite(photoId) {

    if (!photoId) {
        return;
    }


    let favorites =
        getFavoriteImages();


    const index =
        favorites.indexOf(photoId);


    if (index !== -1) {

        favorites.splice(
            index,
            1
        );

    } else {

        favorites.push(
            photoId
        );

    }


    saveFavoriteImages(
        favorites
    );


    updateGalleryFavorites();


    return favorites.includes(
        photoId
    );

}


/* =========================================================
   GALLERY FAVORITE BUTTONS
========================================================= */

galleryCards.forEach(function (card) {

    const button =
        card.querySelector(
            ".favorite-btn"
        );


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            event.stopPropagation();


            toggleGalleryFavorite(
                card.dataset.photo
            );

        }
    );

});


/* =========================================================
   LIGHTBOX ELEMENTS
========================================================= */

const lightbox =
    document.getElementById("lightbox");

const lightboxImage =
    document.getElementById("lightboxImage");

const lightboxClose =
    document.getElementById("lightboxClose");

const lightboxPrev =
    document.getElementById("lightboxPrev");

const lightboxNext =
    document.getElementById("lightboxNext");

const lightboxNumber =
    document.getElementById("lightboxNumber");

const lightboxFavorite =
    document.getElementById("lightboxFavorite");


/* =========================================================
   UPDATE LIGHTBOX FAVORITE
========================================================= */

function updateLightboxFavorite() {

    if (!lightboxFavorite) {
        return;
    }


    const card =
        galleryCards[currentPhotoIndex];


    if (!card) {
        return;
    }


    const photoId =
        card.dataset.photo;


    const favorites =
        getFavoriteImages();


    const isFavorite =
        favorites.includes(photoId);


    if (isFavorite) {

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


/* =========================================================
   OPEN LIGHTBOX
========================================================= */

function openLightbox(index) {

    if (
        !lightbox ||
        !lightboxImage ||
        !galleryCards.length
    ) {
        return;
    }


    currentPhotoIndex =
        index;


    updateLightbox();


    lightbox.classList.add(
        "active"
    );


    lightbox.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.style.overflow =
        "hidden";

}


/* =========================================================
   UPDATE LIGHTBOX
========================================================= */

function updateLightbox(direction = null) {

    const card =
        galleryCards[currentPhotoIndex];


    if (!card || !lightboxImage) {
        return;
    }


    const image =
        card.querySelector("img");


    if (!image) {
        return;
    }


    /* حذف انیمیشن قبلی */

    lightboxImage.classList.remove(
        "slide-out-left",
        "slide-out-right",
        "slide-in-left",
        "slide-in-right"
    );


    void lightboxImage.offsetWidth;


    /* تغییر عکس */

    lightboxImage.src =
        image.currentSrc ||
        image.src;


    lightboxImage.alt =
        image.alt ||
        "عکس";


    /* انیمیشن */

    if (direction === "next") {

        lightboxImage.classList.add(
            "slide-in-right"
        );

    } else if (
        direction === "previous"
    ) {

        lightboxImage.classList.add(
            "slide-in-left"
        );

    }


    /* شماره */

    if (lightboxNumber) {

        lightboxNumber.textContent =
            `${currentPhotoIndex + 1} / ${galleryCards.length}`;

    }


    /* ستاره */

    updateLightboxFavorite();

}


/* =========================================================
   CLOSE LIGHTBOX
========================================================= */

function closeLightbox() {

    if (!lightbox) {
        return;
    }


    lightbox.classList.remove(
        "active"
    );


    lightbox.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.style.overflow =
        "";

}


/* =========================================================
   NEXT PHOTO
========================================================= */

function nextPhoto() {

    if (!galleryCards.length) {
        return;
    }


    currentPhotoIndex =
        (
            currentPhotoIndex + 1
        ) %
        galleryCards.length;


    updateLightbox(
        "next"
    );

}


/* =========================================================
   PREVIOUS PHOTO
========================================================= */

function previousPhoto() {

    if (!galleryCards.length) {
        return;
    }


    currentPhotoIndex--;


    if (
        currentPhotoIndex < 0
    ) {

        currentPhotoIndex =
            galleryCards.length - 1;

    }


    updateLightbox(
        "previous"
    );

}


/* =========================================================
   IMAGE CLICK
========================================================= */

galleryCards.forEach(
    function (card, index) {

        const image =
            card.querySelector("img");


        if (!image) {
            return;
        }


        image.addEventListener(
            "click",
            function (event) {

                event.stopPropagation();

                openLightbox(index);

            }
        );

    }
);


/* =========================================================
   LIGHTBOX CLOSE
========================================================= */

if (lightboxClose) {

    lightboxClose.addEventListener(
        "click",
        function (event) {

            event.stopPropagation();

            closeLightbox();

        }
    );

}


/* =========================================================
   LIGHTBOX NEXT
========================================================= */

if (lightboxNext) {

    lightboxNext.addEventListener(
        "click",
        function (event) {

            event.stopPropagation();

            nextPhoto();

        }
    );

}


/* =========================================================
   LIGHTBOX PREVIOUS
========================================================= */

if (lightboxPrev) {

    lightboxPrev.addEventListener(
        "click",
        function (event) {

            event.stopPropagation();

            previousPhoto();

        }
    );

}


/* =========================================================
   LIGHTBOX BACKDROP
========================================================= */

if (lightbox) {

    lightbox.addEventListener(
        "click",
        function (event) {

            if (
                event.target === lightbox
            ) {

                closeLightbox();

            }

        }
    );

}


/* =========================================================
   LIGHTBOX FAVORITE BUTTON
========================================================= */

if (lightboxFavorite) {

    lightboxFavorite.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            event.stopPropagation();


            const card =
                galleryCards[
                    currentPhotoIndex
                ];


            if (!card) {
                return;
            }


            const photoId =
                card.dataset.photo;


            toggleGalleryFavorite(
                photoId
            );


            updateLightboxFavorite();

        }
    );

}


/* =========================================================
   KEYBOARD
========================================================= */

document.addEventListener(
    "keydown",
    function (event) {

        if (
            !lightbox ||
            !lightbox.classList.contains(
                "active"
            )
        ) {

            return;

        }


        if (
            event.key === "Escape"
        ) {

            closeLightbox();

        }


        if (
            event.key === "ArrowLeft"
        ) {

            nextPhoto();

        }


        if (
            event.key === "ArrowRight"
        ) {

            previousPhoto();

        }

    }
);


/* =========================================================
   MOBILE SWIPE
========================================================= */

let touchStartX = 0;


if (lightbox) {

    lightbox.addEventListener(
        "touchstart",
        function (event) {

            touchStartX =
                event.changedTouches[0]
                    .screenX;

        },
        {
            passive: true
        }
    );


    lightbox.addEventListener(
        "touchend",
        function (event) {

            const touchEndX =
                event.changedTouches[0]
                    .screenX;


            const difference =
                touchEndX -
                touchStartX;


            if (
                Math.abs(difference) < 50
            ) {

                return;

            }


            if (
                difference < 0
            ) {

                nextPhoto();

            } else {

                previousPhoto();

            }

        },
        {
            passive: true
        }
    );

}


/* =========================================================
   IMAGE PROTECTION
========================================================= */

document.addEventListener(
    "contextmenu",
    function (event) {

        if (
            event.target.tagName === "IMG"
        ) {

            event.preventDefault();

        }

    }
);


document.addEventListener(
    "dragstart",
    function (event) {

        if (
            event.target.tagName === "IMG"
        ) {

            event.preventDefault();

        }

    }
);


/* =========================================================
   GALLERY PHOTO REVEAL
========================================================= */

galleryCards.forEach(
    function (photo, index) {

        photo.style.opacity = "0";

        photo.style.transform =
            "translateY(35px) scale(.96)";

        photo.style.transition =
            "opacity .7s ease, transform .7s ease";


        setTimeout(
            function () {

                photo.style.opacity = "1";

                photo.style.transform =
                    "translateY(0) scale(1)";

            },
            120 + (
                index * 100
            )
        );

    }
);


/* =========================================================
   GLOBAL PROFILE COLOR
========================================================= */

(function () {

    const savedColor =
        localStorage.getItem(
            "profileColor"
        ) || "purple";


    const themeNames = [
        "theme-purple",
        "theme-blue",
        "theme-pink",
        "theme-green",
        "theme-orange"
    ];


    document.body.classList.remove(
        ...themeNames
    );


    const allowedColors = [
        "purple",
        "blue",
        "pink",
        "green",
        "orange"
    ];


    if (
        allowedColors.includes(
            savedColor
        )
    ) {

        document.body.classList.add(
            "theme-" + savedColor
        );

    } else {

        document.body.classList.add(
            "theme-purple"
        );

    }

})();


/* =========================================================
   INITIALIZE FAVORITES
========================================================= */

updateGalleryFavorites();
updateLightboxFavorite();


/* =========================================================
   PROFILE FAVORITE COUNT
   آهنگ + عکس
========================================================= */

const profileFavoriteCount =
    document.getElementById(
        "favoriteCount"
    );


if (profileFavoriteCount) {

    let count = 0;


    /* آهنگ‌ها */

    for (
        let i = 0;
        i < localStorage.length;
        i++
    ) {

        const key =
            localStorage.key(i);


        if (
            key &&
            key.startsWith(
                "favorite-song-"
            ) &&
            localStorage.getItem(key) ===
                "true"
        ) {

            count++;

        }

    }


    /* عکس‌ها */

    const favoriteImages =
        getFavoriteImages();


    count +=
        favoriteImages.length;


    profileFavoriteCount.textContent =
        count;

}

/* =========================================================
   MUSIC PROTECTION
   جلوگیری از دانلود معمولی آهنگ‌ها
========================================================= */


/* جلوگیری از راست‌کلیک روی پلیر و آهنگ */

document.addEventListener(
    "contextmenu",
    function (event) {

        if (
            event.target.closest("audio") ||
            event.target.closest(".music-player")
        ) {

            event.preventDefault();

        }

    }
);


/* جلوگیری از Drag کردن آهنگ */

document.addEventListener(
    "dragstart",
    function (event) {

        if (
            event.target.closest("audio") ||
            event.target.closest(".music-player")
        ) {

            event.preventDefault();

        }

    }
);


/* جلوگیری از کلیک معمولی روی لینک فایل صوتی */

document.addEventListener(
    "click",
    function (event) {

        const link =
            event.target.closest("a");

        if (!link) {
            return;
        }


        const href =
            link.getAttribute("href");


        if (
            href &&
            /\.(mp3|wav|ogg|m4a|aac)$/i.test(href)
        ) {

            event.preventDefault();

        }

    }
);
