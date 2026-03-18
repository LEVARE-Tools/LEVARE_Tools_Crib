/* =====================================================
   LEVARE TOOLS - INICIO
===================================================== */

import { auth, signOut } from "./firebase.js";
import {
    requireAuthFromNestedPages,
    bindCommonNavbar,
    applyRoleMenu,
    clearSession
} from "./auth-guard.js";
import { logEvent } from "./logger.js";

document.addEventListener("DOMContentLoaded", async () => {
    const session = requireAuthFromNestedPages();
    if (!session) return;

    bindCommonNavbar();
    applyRoleMenu();

    const userEmail = document.getElementById("userEmail");
    if (userEmail) {
        userEmail.textContent = `Usuario activo: ${session.email}`;
    }

    await logEvent({
        modulo: "inicio",
        accion: "entrada_modulo",
        detalle: "Ingreso a Inicio.html",
        pagina: "Inicio.html"
    });

    document.getElementById("btnLogout")?.addEventListener("click", async () => {
        try {
            await logEvent({
                modulo: "inicio",
                accion: "logout",
                detalle: "Cierre de sesión desde Inicio.html",
                pagina: "Inicio.html"
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