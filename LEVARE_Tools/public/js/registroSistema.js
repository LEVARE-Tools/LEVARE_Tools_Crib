import { auth, db, signOut, collection, onSnapshot, query, orderBy } from "./firebase.js";
import {
    requireAdmin,
    bindCommonNavbar,
    clearSession
} from "./auth-guard.js";
import { logEvent } from "./logger.js";

const $ = (id) => document.getElementById(id);

function formatDate(value) {
    if (!value) return "";

    try {
        if (typeof value.toDate === "function") {
            return value.toDate().toLocaleString("es-MX");
        }

        return String(value);
    } catch {
        return "";
    }
}

function renderRows(rows) {
    const tbody = $("tablaRegistroSistema");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="6">No hay registros disponibles.</td></tr>`;
        return;
    }

    rows.forEach((row) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
      <td>${row.usuario || ""}</td>
      <td>${row.origen || row.ip || "web-client"}</td>
      <td>${formatDate(row.fecha)}</td>
      <td>${row.accion || ""}</td>
      <td>${row.estado || ""}</td>
      <td>${row.descripcion || ""}</td>
    `;
        tbody.appendChild(tr);
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    const session = requireAdmin();
    if (!session) return;

    bindCommonNavbar();

    await logEvent({
        modulo: "registro_sistema",
        accion: "abrir_registro_sistema",
        estado: "correcto",
        descripcion: "Ingreso a RegistroDelSistema.html",
        pagina: "RegistroDelSistema.html"
    });

    const qLogs = query(collection(db, "registro_sistema"), orderBy("fecha", "desc"));

    onSnapshot(qLogs, (snapshot) => {
        const rows = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data()
        }));

        renderRows(rows);
    });

    $("btnLogout")?.addEventListener("click", async () => {
        try {
            await logEvent({
                modulo: "registro_sistema",
                accion: "logout",
                estado: "finalizado",
                descripcion: "Cierre de sesión desde RegistroDelSistema.html",
                pagina: "RegistroDelSistema.html"
            });
        } catch (error) {
            console.error(error);
        }

        try {
            clearSession();
            await signOut(auth);
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
        } finally {
            window.location.replace("./index.html");
        }
    });
});