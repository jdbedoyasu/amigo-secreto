// Abre el archivo de parejas cifrado.
// Uso: node descifrar.mjs [parejas.cifrado.json]   (pide la clave)
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { descifrar } from "./boveda.js";

const ruta = process.argv[2] ?? new URL("./parejas.cifrado.json", import.meta.url);
const sobre = JSON.parse(readFileSync(ruta, "utf8"));
const rl = createInterface({ input: process.stdin, output: process.stdout });
const clave = await rl.question("Clave: ");
rl.close();

try {
  console.log("\n" + (await descifrar(sobre, clave)));
} catch {
  console.error("Clave incorrecta o archivo alterado.");
  process.exit(1);
}
