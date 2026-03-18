/* =====================================================
   LEVARE TOOLS - SYSTEM / CRUD USUARIOS EN TIEMPO REAL
   Ubicación: /public/js/system.js
===================================================== */

import { auth, db, signOut } from "./firebase.js";
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
    requireAdmin,
    clearSession,
    bindCommonNavbar,
    applyRoleMenu
} from "./auth-guard.js";

import { logEvent } from "./logger.js";

const $ = (id) => document.getElementById(id);

let cachedUsers = [];
let unsubscribeUsers = null;

/* =====================================================
   HELPERS
===================================================== */

function setMsg(text, ok = false) {
    const el = $("sysMsg");
    if (!el) return;
    el.textContent = text;
    el.style.color = ok ? "#16a34a" : "#dc2626";
}

function showModule(id) {
    document.querySelectorAll(".modulo").forEach((m) => {
        m.classList.add("hidden");
    });

    const target = $(id);
    if (target) {
        target.classList.remove("hidden");
    }
}

function clearForm() {
    if ($("userId")) $("userId").value = "";
    if ($("username")) $("username").value = "";
    if ($("nombre")) $("nombre").value = "";
    if ($("apellido")) $("apellido").value = "";
    if ($("correo")) $("correo").value = "";
    if ($("habilitado")) $("habilitado").value = "true";
    if ($("fechaContratacion")) $("fechaContratacion").value = "";
    if ($("loginCount")) $("loginCount").value = "0";
    if ($("rol")) $("rol").value = "usuario";
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function labelRole(role) {
    return role === "admin" ? "Administrador" : "Usuario Operador";
}

/* =====================================================
   RENDER TABLA USUARIOS
===================================================== */

function renderUsersCrud() {
    const tbody = $("tablaCrudUsuarios");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!cachedUsers.length) {
        tbody.innerHTML = `
      <tr>
        <td colspan="9">No hay usuarios registrados.</td>
      </tr>
    `;
        return;
    }

    cachedUsers.forEach((user) => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
      <td>
        <input type="checkbox" class="row-check" data-id="${user.id}" />
      </td>
      <td>${escapeHtml(user.username || "")}</td>
      <td>${escapeHtml(user.nombre || "")}</td>
      <td>${escapeHtml(user.apellido || "")}</td>
      <td>${escapeHtml(user.correo || "")}</td>
      <td>${user.habilitado === false ? "No" : "Sí"}</td>
      <td>${escapeHtml(user.fechaContratacion || "")}</td>
      <td>${Number(user.loginCount || 0)}</td>
      <td>
        <button class="icon-btn edit-user" data-id="${user.id}" type="button">Editar</button>
        <button class="icon-btn danger-btn delete-user" data-id="${user.id}" type="button">Eliminar</button>
      </td>
    `;

        tbody.appendChild(tr);
    });
}

/* =====================================================
   RENDER TABLA PRIVILEGIOS
===================================================== */

function renderPrivilegeTable() {
    const tbody = $("tablaPrivilegios");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!cachedUsers.length) {
        tbody.innerHTML = `
      <tr>
        <td colspan="5">No hay usuarios registrados.</td>
      </tr>
    `;
        return;
    }

    cachedUsers.forEach((user) => {
        const isAdmin = user.rol === "admin";

        const tr = document.createElement("tr");

        tr.innerHTML = `
      <td>
        <input type="checkbox" class="row-check" data-id="${user.id}" />
      </td>
      <td>${escapeHtml(user.nombre || user.username || "")}</td>
      <td>${escapeHtml(user.correo || "")}</td>
      <td>
        <span class="badge ${isAdmin ? "badge-admin" : "badge-user"}">
          ${isAdmin ? "Administrador" : "Usuario Operador"}
        </span>
      </td>
      <td>
        <button
          class="icon-btn toggle-role"
          data-id="${user.id}"
          data-role="${user.rol || "usuario"}"
          type="button"
        >
          ${isAdmin ? "Convertir en Usuario" : "Convertir en Admin"}
        </button>
      </td>
    `;

        tbody.appendChild(tr);
    });
}

/* =====================================================
   FORM FILL
===================================================== */

function fillForm(userId) {
    const user = cachedUsers.find((u) => u.id === userId);
    if (!user) return;

    if ($("userId")) $("userId").value = user.id;
    if ($("username")) $("username").value = user.username || "";
    if ($("nombre")) $("nombre").value = user.nombre || "";
    if ($("apellido")) $("apellido").value = user.apellido || "";
    if ($("correo")) $("correo").value = user.correo || "";
    if ($("habilitado")) $("habilitado").value = user.habilitado === false ? "false" : "true";
    if ($("fechaContratacion")) $("fechaContratacion").value = user.fechaContratacion || "";
    if ($("loginCount")) $("loginCount").value = String(user.loginCount || 0);
    if ($("rol")) $("rol").value = user.rol || "usuario";

    showModule("usuarios");
    setMsg("Usuario cargado para edición.", true);
}

/* =====================================================
   CRUD FIRESTORE
===================================================== */

async function createUser(payload) {
    await addDoc(collection(db, "usuarios"), {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
}

async function updateUser(userId, payload) {
    await updateDoc(doc(db, "usuarios", userId), {
        ...payload,
        updatedAt: serverTimestamp()
    });
}

async function removeUser(userId) {
    await deleteDoc(doc(db, "usuarios", userId));
}

async function toggleRole(userId, currentRole) {
    const nextRole = currentRole === "admin" ? "usuario" : "admin";

    await updateDoc(doc(db, "usuarios", userId), {
        rol: nextRole,
        updatedAt: serverTimestamp()
    });

    return nextRole;
}

/* =====================================================
   REALTIME USERS
===================================================== */

function startRealtimeUsers() {
    unsubscribeUsers = onSnapshot(
        collection(db, "usuarios"),
        async (snapshot) => {
            cachedUsers = snapshot.docs.map((d) => ({
                id: d.id,
                ...d.data()
            }));

            // Orden manual para evitar errores con orderBy si faltan campos
            cachedUsers.sort((a, b) => {
                const ua = String(a.username || "").toLowerCase();
                const ub = String(b.username || "").toLowerCase();
                return ua.localeCompare(ub);
            });

            renderUsersCrud();
            renderPrivilegeTable();
        },
        async (error) => {
            console.error("Error en tiempo real usuarios:", error);
            setMsg("Error al sincronizar usuarios con Firebase.");

            await logEvent({
                modulo: "sistema",
                accion: "error_realtime_usuarios",
                estado: "error",
                descripcion: "Falló la sincronización en tiempo real de usuarios",
                pagina: "Sistema.html",
                extra: { message: error.message || "" }
            });
        }
    );
}

/* =====================================================
   EVENTOS UI
===================================================== */

function bindUIEvents() {
    $("goPrivilegios")?.addEventListener("click", async () => {
        showModule("privilegios");

        await logEvent({
            modulo: "sistema",
            accion: "abrir_modulo_privilegios",
            estado: "abierto",
            descripcion: "Se abrió el módulo de privilegios",
            pagina: "Sistema.html"
        });
    });

    $("goUsuarios")?.addEventListener("click", async () => {
        showModule("usuarios");

        await logEvent({
            modulo: "sistema",
            accion: "abrir_modulo_usuarios",
            estado: "abierto",
            descripcion: "Se abrió el módulo de usuarios",
            pagina: "Sistema.html"
        });
    });

    $("volverDesdeUsuarios")?.addEventListener("click", () => {
        showModule("home");
    });

    $("volverDesdePrivilegios")?.addEventListener("click", () => {
        showModule("home");
    });

    $("btnLimpiar")?.addEventListener("click", () => {
        clearForm();
        setMsg("");
    });

    $("btnLogout")?.addEventListener("click", async () => {
        try {
            await logEvent({
                modulo: "sistema",
                accion: "logout",
                estado: "finalizado",
                descripcion: "Cierre de sesión desde Sistema.html",
                pagina: "Sistema.html"
            });
        } catch (error) {
            console.error(error);
        }

        try {
            if (unsubscribeUsers) unsubscribeUsers();
            clearSession();
            await signOut(auth);
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
        } finally {
            window.location.replace("./index.html");
        }
    });

    $("userForm")?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const id = $("userId")?.value.trim() || "";

        const payload = {
            username: $("username")?.value.trim() || "",
            nombre: $("nombre")?.value.trim() || "",
            apellido: $("apellido")?.value.trim() || "",
            correo: $("correo")?.value.trim() || "",
            habilitado: $("habilitado")?.value === "true",
            fechaContratacion: $("fechaContratacion")?.value || "",
            loginCount: Number($("loginCount")?.value || 0),
            rol: $("rol")?.value || "usuario"
        };

        if (!payload.username || !payload.nombre || !payload.apellido || !payload.correo) {
            setMsg("Completa todos los campos obligatorios.");
            return;
        }

        try {
            if (id) {
                await updateUser(id, payload);

                await logEvent({
                    modulo: "sistema",
                    accion: "editar_usuario",
                    estado: "modificado",
                    descripcion: `Usuario actualizado: ${payload.correo}`,
                    pagina: "Sistema.html",
                    extra: { userId: id, rol: payload.rol }
                });

                setMsg("Usuario actualizado correctamente.", true);
            } else {
                await createUser(payload);

                await logEvent({
                    modulo: "sistema",
                    accion: "crear_usuario",
                    estado: "correcto",
                    descripcion: `Usuario creado: ${payload.correo}`,
                    pagina: "Sistema.html",
                    extra: { rol: payload.rol }
                });

                setMsg("Usuario creado correctamente.", true);
            }

            clearForm();
        } catch (error) {
            console.error(error);
            setMsg("No se pudo guardar el usuario.");
        }
    });

    $("tablaCrudUsuarios")?.addEventListener("click", async (e) => {
        const editBtn = e.target.closest(".edit-user");
        const deleteBtn = e.target.closest(".delete-user");

        if (editBtn) {
            fillForm(editBtn.dataset.id);

            await logEvent({
                modulo: "sistema",
                accion: "seleccionar_edicion_usuario",
                estado: "abierto",
                descripcion: `Se preparó la edición del usuario ${editBtn.dataset.id}`,
                pagina: "Sistema.html"
            });

            return;
        }

        if (deleteBtn) {
            const userId = deleteBtn.dataset.id;
            const user = cachedUsers.find((u) => u.id === userId);

            const ok = confirm("¿Deseas eliminar este usuario?");
            if (!ok) return;

            try {
                await removeUser(userId);

                await logEvent({
                    modulo: "sistema",
                    accion: "eliminar_usuario",
                    estado: "finalizado",
                    descripcion: `Usuario eliminado: ${user?.correo || userId}`,
                    pagina: "Sistema.html",
                    extra: { userId }
                });

                setMsg("Usuario eliminado correctamente.", true);
            } catch (error) {
                console.error(error);
                setMsg("No se pudo eliminar el usuario.");
            }
        }
    });

    $("tablaPrivilegios")?.addEventListener("click", async (e) => {
        const btn = e.target.closest(".toggle-role");
        if (!btn) return;

        const userId = btn.dataset.id;
        const currentRole = btn.dataset.role;

        try {
            const nextRole = await toggleRole(userId, currentRole);

            await logEvent({
                modulo: "sistema",
                accion: "cambiar_privilegio",
                estado: "modificado",
                descripcion: `Rol actualizado a ${labelRole(nextRole)}`,
                pagina: "Sistema.html",
                extra: { userId, nextRole }
            });

            setMsg("Privilegio actualizado correctamente.", true);
        } catch (error) {
            console.error(error);
            setMsg("No se pudo actualizar el privilegio.");
        }
    });
}

/* =====================================================
   INIT
===================================================== */

document.addEventListener("DOMContentLoaded", async () => {
    const session = requireAdmin();
    if (!session) return;

    bindCommonNavbar();
    applyRoleMenu();
    showModule("home");
    bindUIEvents();
    startRealtimeUsers();

    await logEvent({
        modulo: "sistema",
        accion: "abrir_sistema",
        estado: "abierto",
        descripcion: "Ingreso a Sistema.html",
        pagina: "Sistema.html"
    });
});