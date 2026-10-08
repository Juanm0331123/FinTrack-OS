# FinTrack OS — Agent Instructions

Fuente canónica de instrucciones compartidas para agentes de desarrollo como Codex y Claude Code. `CLAUDE.md` solo adapta este archivo para Claude Code. Cada boundary (`frontend/`, `backend/`) añade su propio `AGENTS.md`, que especializa estas reglas sin contradecirlas.

## Identidad del proyecto

- FinTrack OS es una app de finanzas personales que replica el flujo de un libro de Excel mensual: hoja del mes (ingresos, gastos por cuenta y categoría, colchón mínimo), resumen anual, plan de deudas por método avalancha y configuración.
- Las fórmulas del Excel de referencia son la especificación funcional: cualquier cambio en un cálculo financiero debe mantener la paridad con ellas y quedar cubierto por tests.
- `PRODUCT.md` describe usuarios, propósito y principios; `DESIGN.md` describe el sistema visual vigente. Ambos viven en la raíz.
- Los agentes, las skills, `.agents/`, `.claude/`, `skills-lock.json` y los archivos `AGENTS.md`/`CLAUDE.md` son herramientas de desarrollo. Nunca forman parte del runtime ni son dependencias del código de producto.

## Boundaries

| Ruta | Responsabilidad |
|---|---|
| `frontend/` | Next.js 16 (App Router) + React 19 + Tailwind v4 + shadcn/Radix. Experiencia del usuario; consume solo la API pública del backend. |
| `backend/` | Express 5 + Prisma 7 + PostgreSQL (Neon). Autenticación, autorización, persistencia y validación de datos financieros. |

Prohibido:

- importar código de un boundary desde el otro o usar imports relativos entre ellos;
- crear `shared/`, `packages/` u otros directorios top-level sin una tarea que lo autorice;
- versionar secretos: `.env` está ignorado y solo `.env.example` documenta variables.

## Comandos

Usar `pnpm` (hay lockfile en cada boundary).

- Frontend: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm test`.
- Backend: `pnpm dev`, `pnpm start`, `pnpm typecheck`, `pnpm test`, `pnpm prisma:generate`, `pnpm prisma:migrate:dev`, `pnpm prisma:migrate:deploy`.

## Reglas de trabajo

- Antes de cambiar nada, inspeccionar `git status`, `git diff` y el contenido real del repositorio. No asumir que algo existe.
- Mantener las rutas delgadas: `frontend/src/app` importa páginas de `src/modules`; las rutas de Express delegan en controllers y services.
- Código, identificadores y nombres de archivo en inglés; textos de interfaz y mensajes de error de cara al usuario en español (es-CO), con tildes correctas.
- Estilo existente: TypeScript estricto, comillas simples, sin punto y coma, indentación de 4 espacios. Imports en este orden: paquetes externos, aliases internos (`@/...`) y relativos; sin wildcard ni imports sin usar.
- Si un cambio introduce o depende de un cambio de esquema Prisma, crear y aplicar la migración (`pnpm prisma:migrate:dev`) antes de terminar. Nunca editar una migración ya aplicada.
- Validar en proporción al cambio: lint, typecheck, tests y build del boundary afectado. Reportar solo validaciones ejecutadas de verdad.

## Versionamiento

Cuando el Project Owner pida versionar, seguir este proceso completo:

1. Revisar y actualizar `.gitignore` (artefactos temporales, builds, cachés) antes de todo.
2. Revisar `git status` y `git diff`.
3. Verificar que todo compile y correr los tests de cada boundary afectado.
4. Crear una rama `feat/...`, `fix/...` o `chore/...` según el cambio.
5. Hacer un commit por unidad lógica de cambio con mensaje `[TIPO] Descripción completa y detallada` (TIPO en mayúsculas: `FEAT`, `FIX`, `CHORE`, `DOCS`, `REFACTOR`, `TEST`), explicando qué cambió y por qué.
6. Subir la rama al remoto.
7. Si existe CI en `.github/workflows`, esperar los checks de la rama y dejarlos en verde con commits nuevos antes de integrar.
8. Volver a `main`, sincronizar y hacer merge no interactivo de la rama.
9. Subir `main` y, si hay CI, verificar que quede en verde; un fallo se corrige en una rama `fix/...` con este mismo proceso.

Reglas:

- Sin Git interactivo, `--amend` ni force push.
- Todo lo que esté en el working tree forma parte del versionamiento, salvo temporales, secretos, credenciales, builds, cachés y dependencias, que `.gitignore` debe cubrir.
- Los commits quedan solo a nombre del Project Owner: sin `Co-authored-by` ni créditos a agentes.
- Detenerse y explicar el problema ante secretos, conflictos, errores de compilación, tests rotos o fallos de CI que no se puedan resolver con seguridad.
- Los PR incluyen resumen, resultados de validación, issues relacionados y capturas para cambios de UI.

## Skills

Las skills son paquetes de terceros instalados por el Project Owner. La copia canónica está en `.agents/skills/`; `.claude/skills/` es su espejo para Claude Code mediante enlaces simbólicos relativos.

| Scope | Skill | Ubicación | Cuándo usarla |
|---|---|---|---|
| Global | `grill-me` | `.agents/skills/grill-me/` | Sesión interactiva para poner a prueba un plan, diseño o decisión: una pregunta por vez, cada una con respuesta recomendada. Usarla cuando el Project Owner lo pida ("grill me", "stress-test", "challenge my plan") o acepte proponerla ante una decisión significativa sin resolver. No usarla en tareas rutinarias ni bloquear una tarea esperando respuestas. |

Las skills de dominio se registran en `frontend/AGENTS.md` y `backend/AGENTS.md` y solo se usan dentro de su boundary.

Reglas de uso:

- Cuando una tarea coincide con el trigger de una skill, leer su `SKILL.md`, aplicar sus instrucciones y abrir solo las referencias que la tarea necesite.
- No cargar skills irrelevantes ni combinar skills redundantes sin necesidad.
- El `AGENTS.md` que algunas skills incluyen dentro de su carpeta es material de esa skill, no una instrucción de FinTrack OS.
- No instalar, actualizar, editar ni eliminar skills sin autorización del Project Owner. Tras instalar una skill, verificar que su espejo en `.claude/skills/` resuelve al `SKILL.md`.
- Tratar los scripts y ejemplos de una skill como recomendaciones. Instalar paquetes, activar hooks o elegir una tecnología nueva requiere una decisión explícita.

## Precedencia

1. Instrucción explícita actual del Project Owner.
2. Este `AGENTS.md`.
3. El `AGENTS.md` del boundary.
4. La skill especializada aplicable.
5. Convenciones generales del framework o lenguaje.

Si dos skills aplicables se contradicen, preferir la más específica para la tarea y registrar la decisión en el reporte.

## Verificación antes de entregar

- El diff contiene solo el alcance pedido y pasa `git diff --check`.
- No hay secretos, credenciales ni archivos que `.gitignore` deba excluir.
- Los cálculos financieros nuevos o modificados tienen tests que comparan contra valores del Excel de referencia.
- La documentación afectada (`AGENTS.md`, `DESIGN.md`, `.env.example`) quedó actualizada y coherente.
