/* =====================================================
   LEVARE TOOLS - BD
===================================================== */

import { auth, db, signOut } from "./firebase.js";
import {
    collection,
    getDocs,
    limit,
    query
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
    requireAdmin,
    bindCommonNavbar,
    clearSession
} from "./auth-guard.js";
import { logEvent } from "./logger.js";

async function renderBDCollections() {
    const target = document.getElementById("bdInfo");
    if (!target) return;

    const collections = ["usuarios", "herramientas", "consultas", "registro_sistema"];
    const results = [];

    for (const colName of collections) {
        const snapshot = await getDocs(query(collection(db, colName), limit(200)));
        results.push({ name: colName, total: snapshot.size });
    }

    target.innerHTML = results.map((r) => `
    <div class="card">
      <h3>${r.name}</h3>
      <p>Total registros: ${r.total}</p>
    </div>
  `).join("");
}

document.addEventListener("DOMContentLoaded", async () => {
    const session = requireAdmin();
    if (!session) return;

    bindCommonNavbar();

    await logEvent({
        modulo: "bd",
        accion: "entrada_modulo",
        detalle: "Ingreso a BD.html",
        pagina: "BD.html"
    });

    try {
        await renderBDCollections();
    } catch (error) {
        console.error(error);
    }

    document.getElementById("btnLogout")?.addEventListener("click", async () => {
        try {
            await logEvent({
                modulo: "bd",
                accion: "logout",
                detalle: "Cierre de sesión desde BD.html",
                pagina: "BD.html"
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