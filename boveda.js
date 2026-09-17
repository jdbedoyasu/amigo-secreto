// Cifrado real (AES-256-GCM, clave derivada con PBKDF2-SHA256) para guardar las
// parejas en el repo público sin que se puedan leer. Sin la clave no se abre.
// Usa WebCrypto, así que funciona igual en Node y en el navegador.
const ITERACIONES = 600000;
const ALFABETO = "abcdefghjkmnpqrstuvwxyz23456789";

const aBase64 = bytes => btoa(String.fromCharCode(...bytes));
const deBase64 = b64 => Uint8Array.from(atob(b64), c => c.charCodeAt(0));

async function derivar(clave, sal, iteraciones) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(clave), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: sal, iterations: iteraciones },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export function generarClave() {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  const letras = [...bytes].map(b => ALFABETO[b % ALFABETO.length]).join("");
  return letras.match(/.{5}/g).join("-");
}

export async function cifrar(texto, clave) {
  const sal = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const llave = await derivar(clave, sal, ITERACIONES);
  const datos = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, llave, new TextEncoder().encode(texto)));
  return { v: 1, alg: "AES-256-GCM", kdf: "PBKDF2-SHA256", iteraciones: ITERACIONES, sal: aBase64(sal), iv: aBase64(iv), datos: aBase64(datos) };
}

export async function descifrar(sobre, clave) {
  const llave = await derivar(clave.trim(), deBase64(sobre.sal), sobre.iteraciones);
  const texto = await crypto.subtle.decrypt({ name: "AES-GCM", iv: deBase64(sobre.iv) }, llave, deBase64(sobre.datos));
  return new TextDecoder().decode(texto);
}
