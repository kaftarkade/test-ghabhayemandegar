"use strict";

document.addEventListener("DOMContentLoaded", async function () {
    const form = document.getElementById("memberForm");
    const message = document.getElementById("formMessage");
    const membersList = document.getElementById("membersList");
    const refreshButton = document.getElementById("refreshButton");
    const syncButton = document.getElementById("syncButton");
    const syncMessage = document.getElementById("syncMessage");
    const searchInput = document.getElementById("searchMember");

    const editPanel = document.getElementById("editPanel");
    const editForm = document.getElementById("editMemberForm");
    const editMessage = document.getElementById("editMessage");
    const cancelEdit = document.getElementById("cancelEdit");

    const account = appwriteAccount;
    const tablesDB = appwriteTablesDB;
    const ringNames = RING_NAMES;

    let membersCache = [];

    function showMessage(element, text, color = "#f8fafc") {
        element.textContent = text;
        element.style.color = color;
    }

    function normalizeDigits(value = "") {
        return value
            .replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
            .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
    }

    function getMemberData(member) {
        let content = {};
        try { content = JSON.parse(member.content || "{}"); } catch (_) {}

        return {
            phone: content.phone || "",
            nationalId: member.national_id || "",
            fullName: member.display_name || "",
            ring: member.group_id || "ring1",
            status: member.status || "active"
        };
    }

    // همهٔ درخواست‌های مدیریتی از طریق تابع Appwrite انجام می‌شود
    function callWorker(action, payload) {
        return callServer({ action, ...payload });
    }

    function validate(data) {
        if (!data.fullName) return "نام را وارد کن.";
        if (!/^09[0-9]{9}$/.test(data.phone)) return "شمارهٔ موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد.";
        if (!/^[0-9]{10}$/.test(data.nationalId)) return "کد ملی باید ۱۰ رقم باشد.";
        if (!ringNames[data.ring] || !["active", "inactive"].includes(data.status)) {
            return "اطلاعات انتخاب‌شده معتبر نیست.";
        }
        return "";
    }

    // فقط مدیر اجازهٔ استفاده دارد
    try {
        const currentUser = await account.get();
        if (currentUser.$id !== ADMIN_USER_ID) return;
    } catch (_) {
        membersList.textContent = "ابتدا وارد حساب مدیر شو.";
        return;
    }

    function renderMembers() {
        const query = normalizeDigits(searchInput.value.trim().toLowerCase());

        const filtered = membersCache.filter(member => {
            const data = getMemberData(member);
            return [data.fullName, data.phone, data.nationalId, ringNames[data.ring]]
                .some(value => normalizeDigits(String(value).toLowerCase()).includes(query));
        });

        membersList.replaceChildren();

        if (!filtered.length) {
            membersList.textContent = query
                ? "عضوی با این مشخصات پیدا نشد."
                : "هنوز عضوی ثبت نشده است.";
            return;
        }

        filtered.forEach(member => {
            const data = getMemberData(member);
            const card = document.createElement("article");
            card.className = "member";

            const name = document.createElement("h3");
            name.textContent = data.fullName || "بدون نام";

            const phone = document.createElement("p");
            phone.textContent = "تلفن: " + (data.phone || "ثبت نشده");

            const ring = document.createElement("p");
            ring.textContent = "حلقه: " + (ringNames[data.ring] || "نامشخص");

            const status = document.createElement("p");
            status.textContent = "وضعیت: " + (data.status === "active" ? "فعال" : "غیرفعال");

            const actions = document.createElement("div");
            actions.className = "member-actions";

            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.className = "edit-button";
            editButton.textContent = "ویرایش";
            editButton.addEventListener("click", () => openEdit(member));

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "delete-button";
            deleteButton.textContent = "حذف";
            deleteButton.addEventListener("click", () => deleteMember(member));

            actions.append(editButton, deleteButton);
            card.append(name, phone, ring, status, actions);
            membersList.appendChild(card);
        });
    }

    async function loadMembers() {
        refreshButton.disabled = true;
        membersList.textContent = "در حال دریافت اعضا...";

        try {
            const rows = [];
            let cursor = null;

            // صفحه‌به‌صفحه می‌خوانیم تا بیشتر از ۲۵ عضو هم نمایش داده شود
            for (;;) {
                const queries = [Appwrite.Query.limit(100)];
                if (cursor) queries.push(Appwrite.Query.cursorAfter(cursor));

                const page = await tablesDB.listRows({
                    databaseId: APPWRITE_DATABASE_ID,
                    tableId: APPWRITE_TABLE_ID,
                    queries
                });

                rows.push(...page.rows);
                if (page.rows.length < 100) break;
                cursor = page.rows[page.rows.length - 1].$id;
            }

            membersCache = rows.filter(row => row.record_type === "member");
            renderMembers();
        } catch (error) {
            console.error("Load members error:", error);
            membersList.textContent = "خطا در دریافت اعضا؛ مجوزهای جدول را بررسی کن.";
        } finally {
            refreshButton.disabled = false;
        }
    }

    function openEdit(member) {
        const data = getMemberData(member);

        document.getElementById("editMemberId").value = member.$id;
        document.getElementById("editFullName").value = data.fullName;
        document.getElementById("editPhone").value = data.phone;
        document.getElementById("editResetEmail").checked = false;
        document.getElementById("editNationalId").value = data.nationalId;
        document.getElementById("editRing").value = data.ring;
        document.getElementById("editStatus").value = data.status;

        showMessage(editMessage, "");
        editPanel.hidden = false;
        editPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    cancelEdit.addEventListener("click", () => {
        editPanel.hidden = true;
        editForm.reset();
    });

    searchInput.addEventListener("input", renderMembers);
    refreshButton.addEventListener("click", loadMembers);

    editForm.addEventListener("submit", async event => {
        event.preventDefault();

        const rowId = document.getElementById("editMemberId").value;
        const data = {
            fullName: document.getElementById("editFullName").value.trim(),
            phone: normalizeDigits(document.getElementById("editPhone").value.trim()),
            nationalId: normalizeDigits(document.getElementById("editNationalId").value.trim()),
            ring: document.getElementById("editRing").value,
            status: document.getElementById("editStatus").value
        };

        const problem = validate(data);
        if (problem) {
            showMessage(editMessage, problem, "#ef4444");
            return;
        }

        const saveButton = editForm.querySelector('button[type="submit"]');
        saveButton.disabled = true;
        showMessage(editMessage, "در حال ذخیره...", "#f59e0b");

        try {
            await callWorker("updateMember", {
                rowId,
                resetEmail: document.getElementById("editResetEmail").checked,
                name: data.fullName,
                phone: data.phone,
                nationalId: data.nationalId,
                ring: data.ring,
                status: data.status
            });

            showMessage(editMessage, "تغییرات ذخیره شد.", "#22c55e");
            editPanel.hidden = true;
            editForm.reset();
            await loadMembers();
        } catch (error) {
            console.error("Update member failed.");
            showMessage(editMessage, error.message || "ویرایش ناموفق بود.", "#ef4444");
        } finally {
            saveButton.disabled = false;
        }
    });

    async function deleteMember(member) {
        const data = getMemberData(member);

        const confirmed = confirm(
            `عضو «${data.fullName}» و حساب ورود او برای همیشه حذف می‌شود. ادامه می‌دهی؟`
        );
        if (!confirmed) return;

        try {
            await callWorker("deleteMember", { rowId: member.$id });

            if (document.getElementById("editMemberId").value === member.$id) {
                editPanel.hidden = true;
                editForm.reset();
            }

            showMessage(message, "عضو و حساب او حذف شد.", "#22c55e");
            await loadMembers();
        } catch (error) {
            console.error("Delete member failed.");
            showMessage(message, error.message || "حذف ناموفق بود.", "#ef4444");
        }
    }

    // اعمال دوبارهٔ اطلاعات همهٔ اعضا روی حساب‌ها (برچسب حلقه، رمز، وضعیت)
    syncButton.addEventListener("click", async () => {
        if (!membersCache.length) return;
        if (!confirm("اطلاعات همهٔ اعضا دوباره روی حساب‌های ورودشان اعمال شود؟")) return;

        syncButton.disabled = true;
        let ok = 0;
        const failed = [];

        for (const member of membersCache) {
            const data = getMemberData(member);
            showMessage(syncMessage, `در حال همگام‌سازی ${ok + failed.length + 1} از ${membersCache.length}...`, "#f59e0b");

            try {
                await callWorker("updateMember", {
                    rowId: member.$id,
                    name: data.fullName,
                    phone: data.phone,
                    nationalId: data.nationalId,
                    ring: data.ring,
                    status: data.status
                });
                ok++;
            } catch (error) {
                failed.push((data.fullName || data.phone) + ": " + error.message);
            }
        }

        showMessage(
            syncMessage,
            failed.length
                ? `${ok} مورد موفق، ${failed.length} مورد ناموفق — ` + failed.join(" | ")
                : `همهٔ ${ok} حساب همگام شد.`,
            failed.length ? "#ef4444" : "#22c55e"
        );

        syncButton.disabled = false;
        await loadMembers();
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const data = {
            fullName: document.getElementById("fullName").value.trim(),
            phone: normalizeDigits(document.getElementById("phone").value.trim()),
            nationalId: normalizeDigits(document.getElementById("nationalId").value.trim()),
            ring: document.getElementById("ring").value,
            status: document.getElementById("status").value
        };

        const problem = validate(data);
        if (problem) {
            showMessage(message, problem, "#ef4444");
            return;
        }

        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        showMessage(message, "در حال ساخت حساب و ثبت عضو...", "#f59e0b");

        try {
            await callWorker("createMember", {
                name: data.fullName,
                phone: data.phone,
                nationalId: data.nationalId,
                ring: data.ring,
                status: data.status
            });

            showMessage(message, "عضو و حساب ورود با موفقیت ساخته شد.", "#22c55e");
            form.reset();
            await loadMembers();
        } catch (error) {
            console.error("Create member failed.");
            showMessage(message, error.message || "ثبت عضو ناموفق بود.", "#ef4444");
        } finally {
            submitButton.disabled = false;
        }
    });

    await loadMembers();
});