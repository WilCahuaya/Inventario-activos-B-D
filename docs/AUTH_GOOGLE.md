# Login con Google — Configuración

Autenticación OAuth con cuentas **@gmail.com** o **Google Workspace** (correo corporativo).

---

## Paso 1 — Google Cloud Console

1. Ir a [Google Cloud Console](https://console.cloud.google.com/)
2. Crear o seleccionar un proyecto (ej. `inventario-bd-consultores`)
3. **APIs & Services → OAuth consent screen**
   - User type: **Internal** (solo Workspace) o **External** (cualquier Gmail)
   - Completar nombre de app, email de soporte
   - Scopes: `email`, `profile`, `openid` (por defecto)
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `Inventario Activos Supabase`
   - **Authorized redirect URIs** — agregar **exactamente**:

```
https://TU-PROJECT-REF.supabase.co/auth/v1/callback
```

> Reemplace `TU-PROJECT-REF` por el ID de su proyecto Supabase  
> (visible en Project URL: `https://eeivmgvspexctjeowrmk.supabase.co` → ref = `eeivmgvspexctjeowrmk`)

5. Copiar **Client ID** y **Client Secret**

---

## Paso 2 — Supabase Dashboard

### 2.1 Activar proveedor Google

1. **Authentication → Providers → Google**
2. **Enable Google**
3. Pegar **Client ID** y **Client Secret** de Google Cloud
4. Guardar

### 2.2 URLs de redirección

**Authentication → URL Configuration**

| Campo | Valor |
|---|---|
| Site URL | `http://localhost:3000` (dev) |
| Redirect URLs | Ver lista abajo |

Agregar estas **Redirect URLs**:

```
http://localhost:3000/auth/callback
http://localhost:5173/auth/callback
```

> En producción agregar también:  
> `https://tu-dominio.vercel.app/auth/callback`

### 2.3 (Opcional) Restringir dominios

Para permitir solo correos `@bdconsultores.pe` (o su dominio):

**Authentication → Providers → Google → Advanced**  
O en Fase 1 con trigger/policy que valide el dominio del email al crear `profiles`.

Alternativa rápida en Supabase:  
**Authentication → Settings → Auth Hooks** o validación en Fase 1 al insertar perfil.

---

## Paso 3 — Ya NO crear usuario manual

Con Google OAuth **no hace falta** el Paso 5 anterior (Add user manual).

El primer login con Google crea el usuario automáticamente en Supabase.

---

## Paso 4 — Probar

### Web

```bash
pnpm dev:web
```

1. Abrir http://localhost:3000
2. Clic en **Continuar con Google**
3. Elegir cuenta corporativa
4. Debe redirigir a `/dashboard`

### Desktop

```bash
pnpm dev:desktop
```

1. Clic en **Continuar con Google**
2. Se abre ventana de Google dentro de Electron
3. Tras autorizar → vuelve al panel con su email

---

## Errores comunes

| Error | Solución |
|---|---|
| `redirect_uri_mismatch` | URI en Google Cloud debe ser `https://REF.supabase.co/auth/v1/callback` |
| Vuelve a login sin sesión | Agregar `http://localhost:3000/auth/callback` en Supabase Redirect URLs |
| Desktop no completa login | Agregar `http://localhost:5173/auth/callback` en Redirect URLs |
| `Access blocked: app not verified` | Completar OAuth consent screen o usar cuentas de prueba en External |

---

## Notas de seguridad

- No commitear Client Secret de Google ni `service_role` de Supabase
- En producción usar dominio HTTPS en Site URL y Redirect URLs
- Fase 1 asignará rol `CONTADOR` / `ADMIN_ENTIDAD` en tabla `profiles`
