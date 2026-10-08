# Claude Code — FinTrack OS

@AGENTS.md

`AGENTS.md`, importado arriba, es la fuente canónica: leerlo y obedecerlo. Este archivo solo añade lo específico de Claude Code.

- Al trabajar en `frontend/` o `backend/`, aplicar también el `AGENTS.md` de ese boundary. Su `CLAUDE.md` lo importa y Claude Code lo carga al leer archivos del boundary; si no está en contexto, leerlo antes de editar.
- Las skills se invocan con la herramienta Skill. `grill-me` está en `.claude/skills/`; las skills de cada boundary aparecen al trabajar con archivos de ese boundary y solo se usan allí. Si una skill no aparece en la herramienta, leer su `SKILL.md` desde `.agents/skills/` del boundary.
- En commits y PRs no añadir `Co-Authored-By`, "Generated with Claude Code" ni otra atribución a Claude.
- Los cambios en instrucciones compartidas se hacen en `AGENTS.md`, no aquí.
