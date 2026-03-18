/* =====================================================
   LEVARE TOOLS - HERRAMIENTAS
===================================================== */

import { auth, db, signOut } from "./firebase.js";
import {
    collection,
    getDocs,
    limit,
    query
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
    requireAuthFromNestedPages,
    bindCommonNavbar,
    applyRoleMenu,
    clearSession
} from "./auth-guard.js";
import { logEvent } from "./logger.js";

function safe(v) {
    return v === undefined || v === null ? "" : String(v);
}

async function renderHerramientas() {
    const tbody = document.getElementById("tablaHerramientas");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5">Cargando...</td></tr>`;

    const q = query(collection(db, "herramientas"), limit(100));
    const snapshot = await getDocs(q);
    const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="5">No hay registros.</td></tr>`;
        return;
    }

    tbody.innerHTML = "";
    rows.forEach((row) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
      <td>${safe(row.codigo)}</td>
      <td>${safe(row.descripcion)}</td>
      <td>${safe(row.numeroSerie)}</td>
      <td>${safe(row.estado)}</td>
      <td>${safe(row.ubicacion)}</td>
    `;
        tbody.appendChild(tr);
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    const session = requireAuthFromNestedPages();
    if (!session) return;

    bindCommonNavbar();
    applyRoleMenu();

    await logEvent({
        modulo: "herramientas",
        accion: "entrada_modulo",
        detalle: "Ingreso a Herramientas.html",
        pagina: "Herramientas.html"
    });

    try {
        await renderHerramientas();
    } catch (error) {
        console.error(error);
    }

    document.getElementById("btnLogout")?.addEventListener("click", async () => {
        try {
            await logEvent({
                modulo: "herramientas",
                accion: "logout",
                detalle: "Cierre de sesión desde Herramientas.html",
                pagina: "Herramientas.html"
            });

            clearSession();
            await signOut(auth);
        } catch (error) {
            console.error(error);
        } finally {
            window.location.replace("./index.html");
        }
    });
});