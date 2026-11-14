"use strict";

// تنظیمات اتصال به Appwrite
const APPWRITE_ENDPOINT = "https://cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = "6ad8c664000392442826";
const APPWRITE_DATABASE_ID = "6ad8cb9d003bd982b313";

// جدول اعضا (همان جدول قبلی)
const APPWRITE_TABLE_ID = "fani_data";

// پیام‌ها هم در همین جدول ذخیره می‌شوند (نسخهٔ رایگان فقط یک جدول دارد)
const APPWRITE_MESSAGES_TABLE_ID = APPWRITE_TABLE_ID;

// فضای ذخیرهٔ عکس و ویدیو (Storage)
const APPWRITE_BUCKET_ID = "media";

// شناسهٔ حساب مدیر
const ADMIN_USER_ID = "6adb4b2600227975bf32";

// شناسهٔ تابع Appwrite (بعد از ساخت تابع، همین‌جا بنویس)
const FUNCTION_ID = "fani-admin";

// نام حلقه‌ها
const RING_NAMES = {
    ring1: "حلقه اول",
    ring2: "حلقه دوم",
    ring3: "حلقه سوم",
    ring4: "حلقه چهارم",
    ring5: "حلقه پنجم"
};

// ساخت اتصال مشترک
const appwriteClient = new Appwrite.Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

// سرویس حساب کاربری
const appwriteAccount = new Appwrite.Account(appwriteClient);

// سرویس جدول‌ها
const appwriteTablesDB = new Appwrite.TablesDB(appwriteClient);

// سرویس فایل‌ها
const appwriteStorage = new Appwrite.Storage(appwriteClient);

// سرویس توابع
const appwriteFunctions = new Appwrite.Functions(appwriteClient);

// اجرای تابع سمت سرور؛ هویت کاربر را خود Appwrite تأیید می‌کند
async function callServer(payload) {
    const execution = await appwriteFunctions.createExecution({
        functionId: FUNCTION_ID,
        body: JSON.stringify(payload),
        async: false,
        method: "POST",
        headers: { "content-type": "application/json" }
    });

    let data = {};
    try { data = JSON.parse(execution.responseBody || "{}"); } catch (_) {}

    if (execution.status === "failed" || !data.success) {
        throw new Error(data.error || "درخواست ناموفق بود.");
    }
    return data;
}