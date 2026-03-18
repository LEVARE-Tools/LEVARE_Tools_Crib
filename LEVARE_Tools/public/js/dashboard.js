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
    const email = session.email || "Sin correo";
    const role = session.role === "admin" ? "Administrador" : "Usuario Operador";
    userEmail.textContent = `Usuario activo: ${email} | Rol: ${role}`;
  }

  const isAdmin = session.role === "admin";

  if (!isAdmin) {
    document.querySelectorAll('[data-card="sistema"]').forEach((el) => {
      el.style.display = "none";
    });
  }

  await logEvent({
    modulo: "dashboard",
    accion: "abrir_dashboard",
    estado: "correcto",
    descripcion: "Ingreso a dashboard.html",
    pagina: "dashboard.html"
  });

  document.querySelectorAll(".nav-btn, .card-link").forEach((el) => {
    if (el.id === "btnLogout") return;

    el.addEventListener("click", async () => {
      const label = el.textContent?.trim() || "elemento";

      await logEvent({
        modulo: "dashboard",
        accion: "click_ui",
        estado: "modificado",
        descripcion: `Click en ${label}`,
        pagina: "dashboard.html"
      });
    });
  });

  const btnLogout = document.getElementById("btnLogout");
  btnLogout?.addEventListener("click", async () => {
    try {
      await logEvent({
        modulo: "dashboard",
        accion: "logout",
        estado: "finalizado",
        descripcion: "Cierre de sesión desde dashboard",
        pagina: "dashboard.html"
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
      window.location.replace("../index.html");
    }
  });
});