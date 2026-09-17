// Hace el sorteo UNA vez y escribe un archivo privado con el mensaje de cada persona.
// Uso: node sortear.mjs <lista.json> <envios.html> [--forzar]
//
// lista.json:
// {
//   "nombres": ["María", "Carlos", ...],
//   "presupuesto": "$80.000",            (opcional)
//   "fecha": "24 de diciembre",          (opcional)
//   "base": "https://usuario.github.io/amigo-secreto/",
//   "excluir": [["María", "Carlos"]]     (opcional: no se regalan entre sí)
// }
//
// No imprime las parejas: quien lo corre también puede estar jugando.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dec } from "./codec.js";
import { generarEnvios, normalizar } from "./sorteo.js";

const args = process.argv.slice(2);
const forzar = args.includes("--forzar");
const [rutaLista, rutaSalida] = args.filter(a => !a.startsWith("--"));

if (!rutaLista || !rutaSalida) {
  console.error("Uso: node sortear.mjs <lista.json> <envios.html> [--forzar]");
  process.exit(2);
}
if (existsSync(rutaSalida) && !forzar) {
  console.error(`Ya existe ${rutaSalida}: el sorteo ya está hecho.\nVolver a sortear invalida los links que ya enviaste. Si de verdad quieres, usa --forzar.`);
  process.exit(1);
}

const config = JSON.parse(readFileSync(rutaLista, "utf8"));
const nombres = config.nombres.map(n => n.trim()).filter(Boolean);
const envios = generarEnvios({ ...config, nombres });

verificar(envios, nombres, config.excluir ?? []);
writeFileSync(rutaSalida, paginaEnvios(envios, config), { flag: forzar ? "w" : "wx" });
console.log(`Sorteo hecho y verificado: ${nombres.length} personas, cada una regala y recibe una vez, nadie se saca a sí mismo, exclusiones respetadas.\nMensajes en: ${rutaSalida}`);

function verificar({ filas, linkMaestro }, nombres, excluir) {
  const fallar = msg => { console.error("FALLÓ LA VERIFICACIÓN: " + msg); process.exit(1); };
  const datos = filas.map(f => dec(f.link.split("#")[1]));
  const ordenar = xs => [...xs].map(normalizar).sort();
  const todos = JSON.stringify(ordenar(nombres));
  if (JSON.stringify(ordenar(datos.map(d => d.p))) !== todos) fallar("no todos tienen link");
  if (JSON.stringify(ordenar(datos.map(d => d.a))) !== todos) fallar("alguien recibe dos veces o nadie le regala");
  if (datos.some(d => normalizar(d.p) === normalizar(d.a))) fallar("alguien se regala a sí mismo");
  for (const [x, y] of excluir) {
    const choca = datos.some(d => [normalizar(d.p), normalizar(d.a)].sort().join() === [normalizar(x), normalizar(y)].sort().join());
    if (choca) fallar("se violó una exclusión");
  }
  const c = dec(linkMaestro.split("#")[1]).c;
  const deMaestro = new Map(c.map((da, i) => [da, c[(i + 1) % c.length]]));
  if (datos.some(d => deMaestro.get(d.p) !== d.a)) fallar("el link maestro no coincide con los links");
}

function paginaEnvios({ filas, linkMaestro }, config) {
  const datos = JSON.stringify({ filas: filas.map(({ p, mensaje }) => ({ p, mensaje })), linkMaestro }).replace(/</g, "\\u003c");
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Envíos amigo secreto (privado)</title>
<style>
  body{margin:0;padding:28px 20px 80px;background:#1B1030;color:#F4EFE6;font:16px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
  .wrap{max-width:660px;margin:0 auto}
  h1{font-family:Georgia,serif;font-weight:400;font-size:40px;margin:0 0 10px}
  .sub{color:#A392C4}
  .aviso{border-left:3px solid #F2B138;padding:2px 0 2px 16px;color:#A392C4;margin:22px 0}
  .fila{display:flex;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid #37225A;flex-wrap:wrap}
  .nombre{flex:1;min-width:8em}
  button,a.chip{font:14px -apple-system,sans-serif;background:transparent;color:#4FB3A3;border:1px solid #4FB3A3;padding:7px 13px;border-radius:8px;cursor:pointer;text-decoration:none}
  .listo{background:#4FB3A3 !important;color:#06231f !important}
  .contador{color:#A392C4;margin-top:18px}
</style>
</head>
<body>
<div class="wrap">
  <h1>Envíos</h1>
  <p class="sub">${filas.length} personas${config.presupuesto ? " · Presupuesto: " + escapar(config.presupuesto) : ""}${config.fecha ? " · Entrega: " + escapar(config.fecha) : ""}. Manda a cada persona su mensaje por chat privado.</p>
  <div class="aviso">
    <p>Este archivo es privado: no lo subas ni lo compartas. Tampoco abras los links de otros: al abrirlos verías a quién le regalan.</p>
    <p>Link maestro con todas las parejas (tu respaldo, ábrelo solo si alguien pierde el suyo o el día de la entrega):</p>
    <button id="maestro">Copiar link maestro</button>
  </div>
  <div id="lista"></div>
  <div class="contador" id="contador"></div>
</div>
<script>
const DATOS = ${datos};
const enviados = new Set();
function copiar(texto, boton, etiqueta) {
  const listo = () => { boton.textContent = etiqueta; boton.classList.add("listo"); };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(texto).then(listo, () => { window.prompt("Copia este texto:", texto); listo(); });
  else { window.prompt("Copia este texto:", texto); listo(); }
}
function contar() { document.getElementById("contador").textContent = enviados.size + " de " + DATOS.filas.length + " copiados"; }
document.getElementById("maestro").addEventListener("click", e => copiar(DATOS.linkMaestro, e.currentTarget, "Link maestro copiado"));
for (const f of DATOS.filas) {
  const fila = document.createElement("div");
  fila.className = "fila";
  const nombre = document.createElement("div");
  nombre.className = "nombre";
  nombre.textContent = f.p;
  const boton = document.createElement("button");
  boton.textContent = "Copiar mensaje";
  boton.addEventListener("click", () => { copiar(f.mensaje, boton, "Copiado"); enviados.add(f.p); contar(); });
  const wa = document.createElement("a");
  wa.className = "chip";
  wa.textContent = "Abrir en WhatsApp";
  wa.href = "https://wa.me/?text=" + encodeURIComponent(f.mensaje);
  wa.target = "_blank";
  wa.rel = "noopener";
  wa.addEventListener("click", () => { wa.classList.add("listo"); enviados.add(f.p); contar(); });
  fila.append(nombre, boton, wa);
  document.getElementById("lista").append(fila);
}
contar();
</script>
</body>
</html>
`;
}

function escapar(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
