import {
    db,
    collection,
    getDocs
} from "./firebase.js";

const tabla = document.getElementById("tablaResultados");
const input = document.getElementById("buscador");
const btn = document.getElementById("btnBuscar");
const mensaje = document.getElementById("mensaje");

let cacheObjetos = [];
let cachePersonal = [];
let timer = null;

// ---------- RESALTAR TEXTO ----------
function resaltar(texto, busqueda) {
    if (!busqueda) return texto;
    const regex = new RegExp(`(${busqueda})`, "gi");
    return texto.toString().replace(regex, '<span class="highlight">$1</span>');
}

// ---------- CARGAR FIRESTORE ----------
async function cargarDatos() {

    const objetosSnap = await getDocs(collection(db, "objetos"));
    const personalSnap = await getDocs(collection(db, "personal"));

    cacheObjetos = objetosSnap.docs.map(d => d.data());
    cachePersonal = personalSnap.docs.map(d => d.data());

    mostrarResultados("");
}

// ---------- MOSTRAR RESULTADOS ----------
function mostrarResultados(texto) {

    tabla.innerHTML = "";
    mensaje.innerHTML = "";

    texto = texto.toLowerCase();

    let resultados = 0;

    // OBJETOS
    cacheObjetos.forEach(d => {

        const valores = Object.values(d).join(" ").toLowerCase();

        if (valores.includes(texto)) {
            resultados++;

            tabla.innerHTML += `
<tr>
<td>${resaltar(d.consecutivo, texto)}</td>
<td>${resaltar(d.descripcion, texto)}</td>
<td>${resaltar(d.area, texto)}</td>
<td>${resaltar(d.estado, texto)}</td>
<td>${resaltar(d.usuario, texto)}</td>
<td>Objeto</td>
</tr>`;
        }

    });

    // PERSONAL
    cachePersonal.forEach(d => {

        const valores = Object.values(d).join(" ").toLowerCase();

        if (valores.includes(texto)) {
            resultados++;

            tabla.innerHTML += `
<tr>
<td>${resaltar(d.nomina, texto)}</td>
<td>${resaltar(d.nombre + " " + d.apellido, texto)}</td>
<td>-</td>
<td>${resaltar(d.rol, texto)}</td>
<td>${resaltar(d.usuario, texto)}</td>
<td>Usuario</td>
</tr>`;
        }

    });

    if (resultados === 0) {
        mensaje.innerHTML = `<div class="no-results">Sin coincidencias</div>`;
    }
}

// ---------- BUSCADOR PRO (DEBOUNCE) ----------
function buscar() {
    clearTimeout(timer);
    timer = setTimeout(() => {
        mostrarResultados(input.value);
    }, 300);
}

// eventos
input.addEventListener("input", buscar);
btn.addEventListener("click", () => mostrarResultados(input.value));
input.addEventListener("keypress", e => {
    if (e.key === "Enter") mostrarResultados(input.value);
});

// iniciar
cargarDatos();
