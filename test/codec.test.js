import { test } from "node:test";
import assert from "node:assert/strict";
import { enc, dec } from "../codec.js";

test("ida y vuelta conserva tildes, eñes y símbolos", () => {
  const dato = { p: "María José", a: "Íñigo Peña", b: "$80.000", f: "24 de diciembre · 8 pm" };
  assert.deepEqual(dec(enc(dato)), dato);
});

test("el token solo usa caracteres que ningún chat puede cortar o formatear", () => {
  for (let i = 0; i < 300; i++) {
    const token = enc({ p: "Persona " + i, a: "Otra ñ " + Math.random(), b: "$" + i, f: "_*~-" });
    assert.match(token, /^[0-9a-f]+$/);
  }
});

test("el nombre no se lee a simple vista en el link", () => {
  assert.ok(!enc({ p: "Carlos", a: "Luisa" }).includes(Buffer.from("Luisa").toString("hex")));
});

test("un link cortado o alterado se rechaza", () => {
  const token = enc({ p: "Ana", a: "Beto" });
  assert.throws(() => dec(token.slice(0, -1)));
  assert.throws(() => dec(token.slice(0, 10)));
  assert.throws(() => dec("zz" + token));
  assert.throws(() => dec(""));
});
