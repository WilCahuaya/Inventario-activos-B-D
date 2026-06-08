# Guía de contribución

## Ramas

| Rama | Uso |
|---|---|
| `main` | Producción — solo merges aprobados |
| `develop` | Integración continua |
| `feature/*` | Nueva funcionalidad (`feature/fase1-rls`) |
| `fix/*` | Corrección de bugs |

## Flujo de trabajo

1. Crear rama desde `develop`: `git checkout -b feature/mi-feature develop`
2. Commits pequeños y descriptivos en español o inglés técnico
3. Abrir Pull Request hacia `develop`
4. Al menos 1 revisión antes de merge
5. `develop` → `main` solo en releases (hitos H1–H5)

## Formato de commits

```
tipo(alcance): descripción breve

feat(web): pantalla login con Supabase Auth
fix(desktop): persistencia de sesión offline
docs: actualizar arquitectura v1
chore: bump dependencias
```

Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Convenciones de código

- TypeScript estricto en todos los paquetes
- Componentes compartidos en `@inventario/ui`
- Tipos de dominio en `@inventario/types`
- No commitear `.env` ni credenciales
- Variables de entorno documentadas en `.env.example`

## PR checklist

- [ ] `pnpm typecheck` pasa
- [ ] `pnpm build` pasa (si aplica)
- [ ] Sin secretos en el diff
- [ ] Documentación actualizada si cambia arquitectura o setup
