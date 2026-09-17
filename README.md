# Amigo secreto

Página estática que revela a cada persona a quién le regala. El sorteo no vive en
ningún servidor: cada link lleva su asignación después del `#`.

- `index.html` + `codec.js`: la página pública (solo muestra, no sortea).
- `sortear.mjs`: hace el sorteo **una vez** en local y genera un HTML privado con los
  mensajes. Se niega a sobrescribirlo sin `--forzar`, para no invalidar links enviados.
- `npm test`: pruebas del sorteo y del formato de los links.

La lista de nombres y el archivo de envíos nunca se suben (ver `.gitignore`).
