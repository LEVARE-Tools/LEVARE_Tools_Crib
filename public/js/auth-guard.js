export const SESSION_KEY = "levare_session";

export function getSession() {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    try {
        return JSON.parse(raw);
    } catch (error) {
        console.error("Error leyendo sesión:", error);
        return null;
    }
}

export function clearSession() {
    localStorage.removeItem(SESSION_KEY);
}

export function isSessionValid(session = getSession()) {
    if (!session) return false;
    if (!session.expiresAt) return false;

    if (Date.now() > session.expiresAt) {
        clearSession();
        return false;
    }

    return true;
}

export function requireAuthFromNestedPages() {
    const session = getSession();

    if (!isSessionValid(session)) {
        clearSession();
        window.location.replace("./index.html");
        return null;
    }

    return session;
}

export function requireAdmin() {
    const session = requireAuthFromNestedPages();
    if (!session) return null;

    if (session.role !== "admin") {
        window.location.replace("./dashboard.html");
        return null;
    }

    return session;
}

export function applyRoleMenu({
    sistemaSelector = '[data-menu="sistema"]'
} = {}) {
    const session = getSession();
    const isAdmin = session?.role === "admin";

    document.querySelectorAll(sistemaSelector).forEach((el) => {
        el.style.display = isAdmin ? "" : "none";
    });
}

export function bindCommonNavbar() {
    const btnHamburger = document.getElementById("btnHamburger");
    const navMenu = document.getElementById("navMenu");

    if (!btnHamburger || !navMenu) return;

    btnHamburger.addEventListener("click", () => {
        navMenu.classList.toggle("open");

        const expanded = btnHamburger.getAttribute("aria-expanded") === "true";
        btnHamburger.setAttribute("aria-expanded", String(!expanded));
    });
}