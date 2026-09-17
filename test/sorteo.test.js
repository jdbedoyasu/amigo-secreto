import { test } from "node:test";
import assert from "node:assert/strict";
import { sortear, parejas, generarEnvios } from "../sorteo.js";
import { dec } from "../codec.js";

const NOMBRES = ["María", "Carlos", "Luisa", "Andrés", "Sofía", "Pedro", "Ana", "Juan"];

function verificarAsignacion(nombres, ciclo) {
  const pares = parejas(ciclo);
  assert.equal(pares.length, nombres.length);
  assert.deepEqual(pares.map(x => x.da).sort(), [...nombres].sort(), "cada quien regala una vez");
  assert.deepEqual(pares.map(x => x.recibe).sort(), [...nombres].sort(), "cada quien recibe una vez");
  for (const { da, recibe } of pares) assert.notEqual(da, recibe, "nadie se regala a sí mismo");
}

test("todos regalan y reciben exactamente una vez y nadie se saca a sí mismo", () => {
  for (let i = 0; i < 500; i++) verificarAsignacion(NOMBRES, sortear(NOMBRES));
});

test("no hay intercambios de dos (A→B y B→A) con 3 o más personas", () => {
  for (let i = 0; i < 200; i++) {
    const pares = parejas(sortear(NOMBRES));
    const mapa = new Map(pares.map(x => [x.da, x.recibe]));
    for (const [da, recibe] of mapa) assert.notEqual(mapa.get(recibe), da);
  }
});

test("respeta exclusiones en ambos sentidos", () => {
  const excluir = [["María", "Carlos"], ["Luisa", "Andrés"]];
  for (let i = 0; i < 500; i++) {
    const ciclo = sortear(NOMBRES, { excluir });
    verificarAsignacion(NOMBRES, ciclo);
    for (const { da, recibe } of parejas(ciclo)) {
      for (const [x, y] of excluir) {
        assert.ok(!(da === x && recibe === y) && !(da === y && recibe === x), `${da}→${recibe} estaba excluido`);
      }
    }
  }
});

test("el sorteo es aleatorio: no sale siempre igual", () => {
  const vistos = new Set();
  for (let i = 0; i < 50; i++) vistos.add(parejas(sortear(NOMBRES)).map(x => x.recibe).join());
  assert.ok(vistos.size > 40);
});

test("rechaza menos de 3 personas", () => {
  assert.throws(() => sortear(["Ana", "Beto"]), /al menos 3/);
});

test("rechaza nombres repetidos aunque cambien tildes o mayúsculas", () => {
  assert.throws(() => sortear(["Andrés", "andres", "Luisa"]), /repetidos/);
});

test("rechaza una exclusión con un nombre que no está en la lista (error de tipeo)", () => {
  assert.throws(() => sortear(NOMBRES, { excluir: [["Marta", "Carlos"]] }), /no está en la lista/);
});

test("avisa si las exclusiones hacen imposible el sorteo", () => {
  const tres = ["Ana", "Beto", "Caro"];
  assert.throws(() => sortear(tres, { excluir: [["Ana", "Beto"], ["Ana", "Caro"]] }), /imposible/);
});

test("cada link abre con el nombre de su dueño y a quien le regala", () => {
  const base = "https://ejemplo.github.io/amigo-secreto/";
  const { filas, linkMaestro, ciclo } = generarEnvios({ nombres: NOMBRES, presupuesto: "$80.000", fecha: "24 dic", base });
  const esperado = new Map(parejas(ciclo).map(x => [x.da, x.recibe]));
  assert.equal(filas.length, NOMBRES.length);
  for (const fila of filas) {
    assert.ok(fila.link.startsWith(base + "#"));
    const d = dec(fila.link.split("#")[1]);
    assert.equal(d.p, fila.p);
    assert.equal(d.a, esperado.get(fila.p));
    assert.equal(d.b, "$80.000");
    assert.equal(d.f, "24 dic");
    assert.ok(fila.mensaje.includes(fila.link));
    assert.ok(!fila.mensaje.includes(d.a), "el mensaje no revela a quién le regala");
  }
  assert.deepEqual(dec(linkMaestro.split("#")[1]).c, ciclo);
});

test("la base sin barra final igual produce links válidos", () => {
  const { filas } = generarEnvios({ nombres: NOMBRES, base: "https://ejemplo.github.io/amigo-secreto" });
  assert.ok(filas[0].link.startsWith("https://ejemplo.github.io/amigo-secreto/#"));
});
