# Inventario Activos B&D — App de escritorio

Aplicación Electron para inventario de activos fijos (Windows). Usa Supabase para autenticación y datos, SQLite local para modo offline.

## Requisitos

- Node.js 20 LTS (recomendado; Node 24 puede fallar con `better-sqlite3`)
- pnpm ≥ 9
- Windows 10/11

## Configuración local

```powershell
# Desde la raíz del monorepo
pnpm install

# Variables de entorno (obligatorias para build y desarrollo)
cp .env.example apps/desktop/.env.local
# Editar: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
# Opcional: SUPABASE_SERVICE_ROLE_KEY (invitaciones y reenvío de correos)
# También puede estar en la raíz del monorepo (.env.local); al compilar se embebe en main-env.json
```

En Supabase → Authentication → URL Configuration, incluir en **Redirect URLs**:

- `http://localhost:54324/auth/callback`
- `http://127.0.0.1:54324/auth/callback`
- `pe.bdconsultores.inventario://auth/callback` (respaldo)

El **Site URL** puede quedarse en `http://localhost:3000` (web). La app captura ese redirect durante el login.

## Desarrollo

```powershell
pnpm dev:desktop
```

Abre Vite en `http://127.0.0.1:5173` y lanza Electron. El diagnóstico de login solo aparece en modo desarrollo.

## Generar instalador

```powershell
pnpm build:desktop:installer
```

Salida en `apps/desktop/release/`:

| Archivo | Uso |
|---------|-----|
| `Inventario Activos B&D Setup 0.1.0.exe` | Instalador NSIS para repartir |
| `win-unpacked/Inventario Activos B&D.exe` | Ejecutable portable (pruebas) |

Cierre la app antes de compilar si `electron-builder` reporta «Access denied».

## Instalar en varias computadoras

1. Compile el instalador **una vez** en la máquina de desarrollo (con `.env.local` correcto).
2. Copie `Inventario Activos B&D Setup 0.1.0.exe` a cada PC (USB, red, etc.).
3. Cada usuario ejecuta el instalador y abre la app desde el menú Inicio.
4. Inicia sesión con su cuenta Google autorizada en Supabase.

Las credenciales `VITE_SUPABASE_*` quedan **embebidas en el build**. Las PCs destino **no** necesitan `.env.local`.

Cada instalación tiene su propia base SQLite local (caché offline). La sesión de Supabase es por usuario y máquina.

### Notas de despliegue

- Windows puede mostrar «aplicación no reconocida» (instalador sin firma digital).
- Durante el login, la app escucha en **54324** (callback OAuth). Opcionalmente intenta capturar el Site URL en **3000**; si ese puerto está ocupado (p. ej. app web en desarrollo), el login continúa igual vía 54324.
- No incluya `SUPABASE_SERVICE_ROLE_KEY` en builds de producción salvo que necesite invitaciones desde escritorio.

## Impresión Honeywell (50×25 mm, 2 columnas)

- Plantilla ZPL: `shared/print/label-zpl.ts` (203 dpi, filas de 100×25 mm con hasta 2 etiquetas).
- Windows envía ZPL en **modo RAW** (`electron/print/raw-windows.ts`), igual que BarTender — no usa `Out-Printer`.
- En el diálogo de impresión, elija el nombre **exacto** de la impresora en Windows.
- Una etiqueta suelta se imprime en la **columna izquierda**; el lote agrupa de a **2 por fila**.
- Si no sale nada: guarde el `.zpl`, pruébelo en BarTender y calibre el rollo en la impresora (ZSim).

## Estructura del módulo de autenticación

```
apps/desktop/
├── shared/auth/          # Constantes y helpers OAuth (renderer + Electron)
├── electron/auth/        # Servidores locales, protocolo, flujo Google, IPC
└── src/hooks/useAuth.ts  # Login Supabase + callback de sesión
```

Flujo OAuth en escritorio:

1. Supabase genera URL de Google con `redirect_to` corregido a `localhost:54324`.
2. Se abre el navegador del sistema (Chrome/Edge).
3. Si Supabase redirige al Site URL (`localhost:3000`), un servidor temporal reenvía a `:54324`.
4. El servidor en `:54324` entrega tokens a la app y muestra «Inicio de sesión correcto».
