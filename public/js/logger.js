import { db, collection, addDoc, serverTimestamp } from "./firebase.js";
import { getSession } from "./auth-guard.js";

export async function logEvent({
    accion = "sin_accion",
    estado = "correcto",
    descripcion = "",
    pagina = "",
    modulo = "general",
    extra = {}
} = {}) {
    try {
        const session = getSession();

        await addDoc(collection(db, "registro_sistema"), {
            usuario: session?.email || "sin_usuario",
            origen: "web-client",
            fecha: serverTimestamp(),
            accion,
            estado,
            descripcion,
            modulo,
            pagina: pagina || window.location.pathname.split("/").pop(),
            ruta: window.location.pathname,
            role: session?.role || "sin_rol",
            uid: session?.uid || "anon",
            userAgent: navigator.userAgent,
            extra
        });
    } catch (error) {
        console.error("No se pudo registrar evento:", error);
    }
}