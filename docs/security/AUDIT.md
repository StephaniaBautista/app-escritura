# Security Audit Report

**Fecha:** 2026-07-26  
**Herramienta:** pnpm audit

## Resumen

| Severidad | Cantidad | Estado |
|-----------|----------|--------|
| High | 1 | Mitigado (no aplica) |
| Moderate | 0 | Resuelto |

## Acciones Tomadas

### Overrides aplicados en pnpm-workspace.yaml

```yaml
overrides:
  "find-my-way@<=9.6.0": ">=9.6.1"
  "@fastify/static@<=10.1.1": ">=10.1.2"
  "valibot@<=1.4.1": ">=1.4.2"
```

Esto resolvio 4 de 5 vulnerabilidades:
- find-my-way (HIGH) - DDoS with HTTP2 - RESUELTO
- @fastify/static (HIGH) - Path Traversal - RESUELTO
- @fastify/static (MODERATE) - Authorization Bypass - RESUELTO
- valibot (MODERATE) - flatten() issue - RESUELTO

## Vulnerabilidad Restante

### react-router (HIGH) - RSC Mode CSRF Bypass

- **Paquete:** react-router >=7.12.0 <8.3.0
- **Fix:** >=8.3.0
- **Version actual:** 7.18.1
- **Riesgo real:** BAJO
  - Requiere RSC (React Server Components) que NO usamos
  - Usamos React 19 con client-side rendering
  - El bypass es especifico para acciones RSC
  - No hay forma de explotar esta vulnerabilidad en nuestra arquitectura
- **Mitigacion:** No usamos RSC, el vector de ataque no aplica
- **Nota:** Actualizar a 8.x requiere migracion mayor (breaking changes en API)

## Dependencias Seguras

Las siguientes dependencias estan actualizadas y sin vulnerabilidades conocidas:

- fastify@5.10.0
- @fastify/cors@11.3.0
- @fastify/helmet@13.1.0
- @fastify/rate-limit@11.1.0
- @fastify/static@10.1.2 (override)
- prisma@7.9.0
- better-auth@1.6.25
- react@19.2.8
- vite@8.1.5
- find-my-way@9.7.0 (override)
- valibot@1.4.2 (override)
