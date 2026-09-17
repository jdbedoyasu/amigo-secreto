// Empaqueta los datos de un link. No es cifrado: solo evita que el nombre se lea
// a simple vista. El secreto es el link mismo, que llega solo a su dueño.
// Usa hexadecimal para que ningún chat corte el link ni le aplique formato (_ * ~).
const CLAVE = new TextEncoder().encode("amigo-secreto-familia");

export function enc(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += (bytes[i] ^ CLAVE[i % CLAVE.length]).toString(16).padStart(2, "0");
  }
  return hex;
}

export function dec(token) {
  const hex = String(token).trim().toLowerCase();
  if (!/^(?:[0-9a-f]{2})+$/.test(hex)) throw new Error("link inválido");
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16) ^ CLAVE[i % CLAVE.length];
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}
