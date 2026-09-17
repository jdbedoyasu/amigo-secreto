import { test } from "node:test";
import assert from "node:assert/strict";
import { cifrar, descifrar, generarClave } from "../boveda.js";

const TEXTO = "María José → Íñigo Peña\nCarlos → Ana";

test("con la clave correcta se recupera el texto exacto", async () => {
  const clave = generarClave();
  assert.equal(await descifrar(await cifrar(TEXTO, clave), clave), TEXTO);
});

test("el archivo cifrado no contiene ningún nombre legible", async () => {
  const sobre = JSON.stringify(await cifrar(TEXTO, generarClave()));
  for (const nombre of ["María", "Maria", "Carlos", "Ana", "Peña"]) assert.ok(!sobre.includes(nombre));
});

test("con una clave equivocada no abre", async () => {
  const sobre = await cifrar(TEXTO, generarClave());
  await assert.rejects(() => descifrar(sobre, generarClave()));
});

test("si alguien altera el archivo no abre", async () => {
  const clave = generarClave();
  const sobre = await cifrar(TEXTO, clave);
  const datos = Buffer.from(sobre.datos, "base64");
  datos[0] ^= 1;
  await assert.rejects(() => descifrar({ ...sobre, datos: datos.toString("base64") }, clave));
});

test("la clave generada es larga y distinta cada vez", () => {
  const a = generarClave();
  assert.match(a, /^[a-z2-9]{5}(-[a-z2-9]{5}){3}$/);
  assert.notEqual(a, generarClave());
});
