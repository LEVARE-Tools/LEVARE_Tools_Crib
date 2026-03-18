import {
  auth,
  db,
  signInWithEmailAndPassword,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  increment
} from "./firebase.js";

import { logEvent } from "./logger.js";
import { SESSION_KEY } from "./auth-guard.js";

const SESSION_DURATION = 24 * 60 * 60 * 1000;

const $ = (id) => document.getElementById(id);

function setMsg(text, success = false) {
  const el = $("msg");
  if (!el) return;

  el.textContent = text;
  el.style.color = success ? "#16a34a" : "#dc2626";
}

function redirectToDashboard() {
  window.location.href = "./pages/dashboard.html";
}

function isOnline() {
  return navigator.onLine;
}

function saveSession(data) {
  const now = Date.now();

  const sessionData = {
    mode: "online",
    uid: data.uid,
    email: data.email,
    username: data.username || "",
    role: data.role || "usuario",
    createdAt: now,
    expiresAt: now + SESSION_DURATION
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
}

function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error("Error leyendo sesión:", error);
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function isSessionValid() {
  const session = getSession();
  if (!session) return false;

  if (Date.now() > session.expiresAt) {
    clearSession();
    return false;
  }

  return true;
}

async function firebaseLogin(email, password) {
  if (!email.includes("@")) {
    throw new Error("auth/invalid-email");
  }

  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

async function getUserProfile(uid) {
  const ref = doc(db, "usuarios", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return {
      username: "",
      nombre: "",
      apellido: "",
      rol: "usuario",
      habilitado: true
    };
  }

  return snap.data();
}

async function registerUserLoginStats(user, profile = {}) {
  const ref = doc(db, "usuarios", user.uid);

  await setDoc(ref, {
    uid: user.uid,
    correo: user.email || "",
    username: profile.username || user.email?.split("@")[0] || "usuario",
    nombre: profile.nombre || "",
    apellido: profile.apellido || "",
    rol: profile.rol || "usuario",
    habilitado: profile.habilitado !== false,
    loginCount: increment(1),
    ultimoLogin: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });
}

document.addEventListener("DOMContentLoaded", () => {
  if (isSessionValid()) {
    redirectToDashboard();
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .then((reg) => console.log("✔ SW registrado:", reg.scope))
      .catch((err) => console.error("Error SW:", err));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const form = $("loginForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = $("username")?.value.trim();
    const password = $("password")?.value.trim();

    if (!email || !password) {
      setMsg("Completa usuario y contraseña.");
      return;
    }

    if (!isOnline()) {
      setMsg("Sin conexión a internet.");
      return;
    }

    try {
      setMsg("Iniciando sesión...", true);

      const user = await firebaseLogin(email, password);
      const profile = await getUserProfile(user.uid);

      if (profile.habilitado === false) {
        await logEvent({
          modulo: "login",
          accion: "login_denegado",
          estado: "finalizado",
          descripcion: `Usuario inhabilitado: ${email}`,
          pagina: "index.html"
        });

        setMsg("Tu usuario está deshabilitado.");
        return;
      }

      await registerUserLoginStats(user, profile);

      saveSession({
        uid: user.uid,
        email: user.email,
        username: profile.username || user.email?.split("@")[0] || "usuario",
        role: profile.rol || "usuario"
      });

      await logEvent({
        modulo: "login",
        accion: "login",
        estado: "correcto",
        descripcion: `Inicio de sesión exitoso: ${user.email}`,
        pagina: "index.html"
      });

      setMsg("Login exitoso ✅", true);
      setTimeout(redirectToDashboard, 500);

    } catch (error) {
      console.error("Error Login:", error);

      await logEvent({
        modulo: "login",
        accion: "login",
        estado: "error",
        descripcion: `Intento fallido con usuario: ${email}`,
        pagina: "index.html",
        extra: {
          code: error.code || "",
          message: error.message || ""
        }
      });

      switch (error.code || error.message) {
        case "auth/user-not-found":
          setMsg("Usuario no encontrado.");
          break;
        case "auth/wrong-password":
          setMsg("Contraseña incorrecta.");
          break;
        case "auth/invalid-email":
          setMsg("Email inválido.");
          break;
        case "auth/too-many-requests":
          setMsg("Demasiados intentos. Intenta más tarde.");
          break;
        case "auth/invalid-credential":
          setMsg("Credenciales inválidas.");
          break;
        default:
          setMsg("Error al iniciar sesión. Verifica los datos.");
      }
    }
  });
});