/* =====================================================
   LEVARE TOOLS - TABLAS
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

async function renderTablas() {
    const container = document.getElementById("tablasContainer");
    if (!container) return;

    const collections = ["usuarios", "herramientas", "consultas"];
    const data = [];

    for (const colName of collections) {
        const snapshot = await getDocs(query(collection(db, colName), limit(20)));
        data.push({
            name: colName,
            total: snapshot.size
        });
    }

    container.innerHTML = data.map((item) => `
    <div class="card">
      <h3>${item.name}</h3>
      <p>Registros visibles: ${item.total}</p>
    </div>
  `).join("");
}

document.addEventListener("DOMContentLoaded", async () => {
    const session = requireAuthFromNestedPages();
    if (!session) return;

    bindCommonNavbar();
    applyRoleMenu();

    await logEvent({
        modulo: "tablas",
        accion: "entrada_modulo",
        detalle: "Ingreso a Tablas.html",
        pagina: "Tablas.html"
    });

    try {
        await renderTablas();
    } catch (error) {
        console.error(error);
    }

    document.getElementById("btnLogout")?.addEventListener("click", async () => {
        try {
            await logEvent({
                modulo: "tablas",
                accion: "logout",
                detalle: "Cierre de sesión desde Tablas.html",
                pagina: "Tablas.html"
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