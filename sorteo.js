import { enc } from "./codec.js";

export const normalizar = n => n.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();

// Entero uniforme en [0, max) sin sesgo de módulo.
function enteroAleatorio(max) {
  const limite = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf); while (buf[0] >= limite);
  return buf[0] % max;
}

function barajar(lista) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = enteroAleatorio(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const parejas = ciclo => ciclo.map((da, i) => ({ da, recibe: ciclo[(i + 1) % ciclo.length] }));

const clavePar = (da, recibe) => JSON.stringify([normalizar(da), normalizar(recibe)]);

function validarNombres(nombres) {
  if (nombres.length < 3) throw new Error("Necesitas al menos 3 personas.");
  const vistos = new Set();
  const repes = [];
  for (const n of nombres) {
    if (vistos.has(normalizar(n))) repes.push(n);
    vistos.add(normalizar(n));
  }
  if (repes.length) throw new Error(`Hay nombres repetidos: ${repes.join(", ")}. Diferéncialos (ej. Ana M. y Ana P.).`);
}

function paresProhibidos(nombres, excluir) {
  const presentes = new Set(nombres.map(normalizar));
  const prohibidos = new Set();
  for (const [x, y] of excluir) {
    for (const n of [x, y]) {
      if (!presentes.has(normalizar(n))) throw new Error(`"${n}" (en excluir) no está en la lista de nombres.`);
    }
    prohibidos.add(clavePar(x, y)).add(clavePar(y, x));
  }
  return prohibidos;
}

// Un solo ciclo: cada quien le regala al siguiente. Nadie se saca a sí mismo
// y no hay intercambios de dos personas.
export function sortear(nombres, { excluir = [], intentos = 20000 } = {}) {
  validarNombres(nombres);
  const prohibidos = paresProhibidos(nombres, excluir);
  for (let i = 0; i < intentos; i++) {
    const ciclo = barajar(nombres);
    if (parejas(ciclo).every(({ da, recibe }) => !prohibidos.has(clavePar(da, recibe)))) return ciclo;
  }
  throw new Error("Con esas exclusiones el sorteo es imposible. Quita alguna.");
}

function normalizarBase(base) {
  let raiz = String(base).trim().split("#")[0];
  const ultimo = raiz.split("/").pop();
  if (!raiz.endsWith("/") && !ultimo.includes(".")) raiz += "/";
  return raiz;
}

export function generarEnvios({ nombres, presupuesto = "", fecha = "", base, excluir = [] }) {
  const ciclo = sortear(nombres, { excluir });
  const raiz = normalizarBase(base);
  const extra = {};
  if (presupuesto) extra.b = presupuesto;
  if (fecha) extra.f = fecha;

  const filas = parejas(ciclo)
    .map(({ da, recibe }) => {
      const link = raiz + "#" + enc({ p: da, a: recibe, ...extra });
      const lineas = [`${da}, vamos a jugar amigo secreto en familia. Abre este link cuando nadie te esté mirando para ver a quién le regalas:`, link];
      const condiciones = [];
      if (presupuesto) condiciones.push(`Presupuesto: ${presupuesto}`);
      if (fecha) condiciones.push(`Entrega: ${fecha}`);
      if (condiciones.length) lineas.push("", ...condiciones);
      return { p: da, link, mensaje: lineas.join("\n") };
    })
    .sort((x, y) => x.p.localeCompare(y.p, "es"));

  return { ciclo, filas, linkMaestro: raiz + "#" + enc({ t: "m", c: ciclo, ...extra }) };
}
