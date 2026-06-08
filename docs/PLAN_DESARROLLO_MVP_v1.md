# Plan de Desarrollo — Sistema de Inventario de Activos Fijos (MVP v1.0)

| | |
|---|---|
| **Cliente** | B&D Consultores Global EIRL |
| **RUC** | 20614326418 |
| **Versión documento** | 1.0 |
| **Fecha** | Junio 2026 |
| **Clasificación** | Uso interno |

---

## 1. Resumen ejecutivo

Este documento define las **fases de desarrollo** del MVP del Sistema de Inventario de Activos Fijos, para presentación y ejecución por el grupo de desarrollo.

El sistema está compuesto por tres componentes integrados:

| Componente | Tecnología | Propósito |
|---|---|---|
| App de Escritorio | Electron + TypeScript + React | Uso en campo: escaneo, registro, impresión de etiquetas, modo offline |
| Plataforma Web | Next.js 14 + shadcn/ui + Tailwind | Acceso remoto para contadores y administradores de entidad |
| Backend / API | Supabase (PostgreSQL + Auth + Storage) | Capa central de datos compartida entre escritorio y web |

**Volumen inicial estimado:** 4–10 entidades · 500–2.000 activos  
**Duración total estimada:** 14 semanas (3,5 meses)  
**Metodología:** Sprints de 2 semanas con entregables demoables

---

## 2. Stack tecnológico

| Capa | Tecnología | Justificación |
|---|---|---|
| Backend / BD / Auth / Storage | Supabase (PostgreSQL) | Multi-tenant con RLS, auth JWT, storage de fotos/PDFs, API REST |
| Web frontend | Next.js 14 + TypeScript + shadcn/ui | SSR, rutas por rol, deploy en Vercel |
| App escritorio | Electron + React + TypeScript | USB (pistola lectora), impresión, reutilización de componentes |
| Offline local | SQLite (better-sqlite3) | Caché y cola de sincronización en campo |
| Impresión etiquetas | ZPL via ZSim (Honeywell PC42E-T) | Máxima calidad en impresora térmica de etiquetas |
| Código de barras | Code 128 (ZPL nativo) | Estándar en inventarios; lectura por pistola USB |
| Reportes PDF | @react-pdf/renderer o Puppeteer | Membrete B&D, formato institucional |
| Reportes Excel | ExcelJS | Exportación con estilos y fórmulas |
| Monorepo | pnpm + Turborepo | Código compartido entre web y desktop |

---

## 3. Visión general de fases

```
Fase 0 ──► Fase 1 ──► Fase 2 ──► Fase 3 ──► Fase 4 ──► Fase 5 ──► Fase 6
 Setup      Backend     Web         Escritorio   Reportes    Piloto      Cierre
 (1 sem)    (2 sem)     (3 sem)     (3 sem)      (2 sem)     (2 sem)     (1 sem)
```

| Fase | Nombre | Duración | Entregable clave |
|---|---|---|---|
| 0 | Fundamentos | 1 semana | Repositorio, Supabase, CI/CD base |
| 1 | Backend y datos | 2 semanas | BD, RLS, auth, CRUD activos |
| 2 | Plataforma web | 3 semanas | Panel contador + admin entidad |
| 3 | App escritorio | 3 semanas | Escaneo, registro, ZPL, offline |
| 4 | Reportes | 2 semanas | PDF/Excel con membrete B&D |
| 5 | Piloto en campo | 2 semanas | Prueba con 1 entidad real |
| 6 | Cierre MVP | 1 semana | Documentación, deploy, capacitación |

---

## 4. Detalle por fase

### Fase 0 — Fundamentos y entorno (Semana 1)

**Objetivo:** Base técnica lista para que todo el equipo trabaje en paralelo.

#### Actividades

- Crear monorepo (`pnpm` + Turborepo)
- Estructura: `apps/web`, `apps/desktop`, `packages/types`, `packages/ui`, `supabase/`
- Proyecto Supabase (entornos dev + staging)
- Proyecto Next.js 14 con Tailwind + shadcn/ui
- Proyecto Electron base con React
- Repositorio Git, ramas (`main`, `develop`, `feature/*`)
- Deploy automático web en Vercel (staging)
- Definir convenciones: commits, PRs, code review
- Definir formato código de barras con equipo contable (Code 128)

#### Entregables

- [ ] Repositorio funcionando
- [ ] Supabase dev conectado desde web y desktop
- [ ] Login básico visible en web (pantalla post-login)
- [ ] Documento de arquitectura v1
- [ ] Especificación formato código de barras acordada

#### Equipo

| Rol | Responsabilidad |
|---|---|
| Líder técnico | Monorepo, Supabase, CI |
| Frontend | Next.js + shadcn base |
| Desktop | Electron shell + login |

---

### Fase 1 — Backend, modelo de datos y seguridad (Semanas 2–3)

**Objetivo:** Base de datos completa, roles, permisos y API funcional.

#### Modelo de datos

- Tablas: `entidades`, `sedes`, `ambientes`, `activos`, `historial_cambios`, `profiles`
- Estados del activo: `PREREGISTRADO`, `REGISTRADO`, `DADO_DE_BAJA`
- Correlativo automático **por entidad** (único: `entidad_id + correlativo`)
- Campos calculados de depreciación (vistas o funciones SQL)
- Triggers de historial de cambios automático

#### Seguridad (RLS)

- Rol `CONTADOR`: acceso a todas las entidades
- Rol `ADMIN_ENTIDAD`: solo su entidad asignada
- Policies en activos, sedes, ambientes y storage

#### Storage

- Bucket fotos con RLS por entidad
- Bucket comprobantes PDF
- Compresión de imágenes al subir (máx. ~500 KB)

#### Auth

- Supabase Auth con email/password
- Tabla `profiles` con rol y `entidad_id`
- Seed: 1 contador + 1 admin de prueba

#### Entregables

- [ ] Migraciones SQL versionadas
- [ ] RLS probado con ambos roles
- [ ] CRUD activos vía Supabase
- [ ] Historial automático en cada UPDATE
- [ ] Upload foto + PDF funcionando

#### Criterios de aceptación

- Contador crea activo → estado `REGISTRADO` + correlativo asignado
- Admin crea activo → estado `PREREGISTRADO` sin correlativo definitivo
- Admin no puede ver activos de otra entidad

---

### Fase 2 — Plataforma web (Semanas 4–6)

**Objetivo:** Web operativa para contador y administrador de entidad.

#### Sprint 2A — Módulos contador (Semanas 4–5)

| Módulo | Pantallas |
|---|---|
| Entidades | Lista, crear, editar, desactivar |
| Jerarquía | Sede → Ambiente por entidad |
| Inventario | Lista con filtros (entidad, sede, ambiente, estado) |
| Ficha activo | Detalle, foto, historial, documentos |
| Usuarios | CRUD admins por entidad |
| Preregistrados | Bandeja: aprobar / rechazar / editar |

#### Sprint 2B — Módulos admin entidad (Semana 6)

| Módulo | Pantallas |
|---|---|
| Mi inventario | Solo activos de su entidad |
| Registrar activo | Formulario → estado `PREREGISTRADO` |
| Editar ubicación | Solo campo Ambiente |
| Historial | Solo su entidad |

#### Entregables

- [ ] Flujo completo preregistro → validación contador
- [ ] Baja de activo (solo contador)
- [ ] UI responsive y accesible
- [ ] Indicadores visuales de estado (Bueno/Regular/Malo, PREREGISTRADO, etc.)

#### Criterios de aceptación

- Contador valida preregistrado → pasa a `REGISTRADO` + correlativo
- Admin no puede editar campos distintos a ubicación
- Filtros responden en menos de 1 segundo con 2.000 activos de prueba

---

### Fase 3 — App de escritorio Windows (Semanas 7–9)

**Objetivo:** Herramienta de campo para contadores: escaneo, registro, etiquetas y offline.

#### Sprint 3A — Core escritorio (Semanas 7–8)

| Módulo | Funcionalidad |
|---|---|
| Login | Sesión persistente (Supabase Auth) |
| Dashboard | Selector de entidad + acceso a módulos |
| Escaneo USB | Input pistola → búsqueda instantánea → ficha |
| Registro | Formulario completo + foto + PDF |
| Edición | Desde ficha escaneada |

#### Sprint 3B — Etiquetas + offline (Semana 9)

| Módulo | Funcionalidad |
|---|---|
| ZPL (ZSim) | Plantilla etiqueta + envío RAW a Honeywell PC42E-T |
| Vista previa | Preview antes de imprimir |
| Impresión lote | Múltiples etiquetas en una operación |
| Reimpresión | Al escanear activo existente |
| Offline | SQLite + cola de sincronización |
| Sync | Automático al reconectar |

#### Comportamiento offline

| Situación | Comportamiento |
|---|---|
| Sin internet, primera vez | No puede hacer login (requiere conexión inicial) |
| Sin internet, sesión previa | Trabaja con sesión cacheada + SQLite local |
| Vuelve internet | Sincroniza cola pendiente automáticamente |
| Impresión ZPL | Funciona 100% offline (USB local) |

#### Entregables

- [ ] Escaneo → ficha en menos de 500 ms (online)
- [ ] Etiqueta ZPL impresa correctamente en PC42E-T
- [ ] Registro offline → sync al reconectar
- [ ] Indicador: Online / Offline / N cambios pendientes

#### Criterios de aceptación

- Trabajo de 4 horas sin internet sin pérdida de datos
- Etiqueta Code 128 legible por pistola USB
- Login offline solo con sesión previa activa

#### Dependencias externas

- Impresora Honeywell PC42E-T configurada (modo ZSim, calibración)
- Pistola lectora USB de prueba
- Formato código de barras definido (Fase 0)

---

### Fase 4 — Reportes (Semanas 10–11)

**Objetivo:** Reportes PDF y Excel con membrete institucional B&D.

#### Reportes a desarrollar

| # | Reporte | Formato | Roles |
|---|---|---|---|
| 1 | Inventario por ambiente (sin valores) | PDF, Excel | Contador, Admin |
| 2 | Inventario general por entidad (sin valores) | PDF, Excel | Contador, Admin |
| 3 | Inventario valorizado por ambiente | PDF, Excel | Contador, Admin |
| 4 | Inventario valorizado por entidad | PDF, Excel | Contador, Admin |
| 5 | Acta de inventario | PDF firmable | Contador |
| 6 | Reporte de bajas | PDF, Excel | Contador |

#### Contenido obligatorio en PDF

- Logo e información de B&D Consultores Global EIRL
- Nombre de entidad, fecha de generación, fecha de corte, usuario generador
- Numeración de páginas y pie de página institucional
- Columnas valorizadas: Precio, Tasa, Período, Depreciación Acumulada, Valor Neto
- Resumen por clasificación contable al final

#### Entregables

- [ ] 6 reportes funcionando en web
- [ ] Admin solo descarga reportes de su entidad
- [ ] PDF con formato institucional completo

#### Criterios de aceptación

- Reporte entidad con 500 activos en menos de 10 segundos
- Valores de depreciación coinciden con fórmula del MVP
- Excel abre correctamente en LibreOffice y Microsoft Excel

---

### Fase 5 — Piloto en campo (Semanas 12–13)

**Objetivo:** Validar con una entidad real antes del lanzamiento.

#### Actividades

- Seleccionar entidad piloto (50–200 activos)
- Migrar/importar datos iniciales si existen
- Capacitación a contadores (2 horas)
- Inventario real en campo (1–2 días)
- Recoger feedback y corregir bugs críticos
- Ajustes UX en escaneo, formulario e impresión

#### Entregables

- [ ] Acta de piloto firmada
- [ ] Lista de bugs priorizados (P0 resueltos)
- [ ] Manual de usuario v1 (contador + admin)
- [ ] Video corto de uso (opcional)

#### Métricas del piloto

| Métrica | Meta |
|---|---|
| Activos registrados | ≥ 50 |
| Etiquetas impresas | 100% de activos registrados |
| Errores sync offline | 0 pérdida de datos |
| Tiempo escaneo → ficha | < 1 segundo |
| Satisfacción contador | ≥ 4/5 |

---

### Fase 6 — Cierre MVP y go-live (Semana 14)

**Objetivo:** Entrega formal del MVP v1.0.

#### Actividades

- Deploy producción (Supabase Pro + Vercel)
- Instalador Windows (.exe)
- Política de backup y retención
- Documentación técnica (API, BD, deploy)
- Capacitación equipo B&D Consultores
- Handoff al equipo de soporte

#### Entregables

- [ ] MVP v1.0 en producción
- [ ] Instalador desktop distribuible
- [ ] Documentación usuario + técnica
- [ ] Plan de soporte post-lanzamiento (30 días)

---

## 5. Hitos y demos

```
Mes 1              Mes 2              Mes 3              Mes 3.5
│                  │                  │                  │
▼                  ▼                  ▼                  ▼
H1: BD+Auth        H2: Web lista      H3: Desktop        H4: Go-live
    demo CRUD          demo roles          demo campo          piloto OK
```

| Hito | Semana | Demo al cliente |
|---|---|---|
| **H1** | 3 | Login + CRUD activo + RLS |
| **H2** | 6 | Web contador + bandeja preregistrados |
| **H3** | 9 | Escritorio: escaneo + etiqueta + offline |
| **H4** | 11 | Reportes PDF/Excel |
| **H5** | 14 | Piloto completado → MVP entregado |

---

## 6. Distribución del equipo

### Equipo mínimo (2 personas)

| Persona | Fases principales |
|---|---|
| **Dev A** (full-stack) | Fase 0–1, backend, web contador, reportes |
| **Dev B** (full-stack) | Electron, ZPL, offline, web admin |

### Equipo ideal (3 personas)

| Persona | Rol | Fases |
|---|---|---|
| Dev A | Backend + Supabase + RLS | 0, 1, 4 |
| Dev B | Web Next.js | 2, 4 |
| Dev C | Electron + ZPL + offline | 3, 5 |

---

## 7. Escalabilidad y costos

### Capacidad del stack

| Etapa | Volumen | Viabilidad |
|---|---|---|
| MVP actual | 4–10 entidades, 500–2.000 activos | Sobrado |
| Crecimiento 1 | 20–50 entidades, 5.000–15.000 activos | Sin cambios de arquitectura |
| Crecimiento 2 | 100+ entidades, 50.000+ activos | Supabase Pro/Team + optimizaciones |
| Enterprise | Integraciones SIAF/SAP | API propia encima de PostgreSQL |

### Costos estimados mensuales

| Servicio | Plan | Costo |
|---|---|---|
| Supabase | Pro (recomendado) | ~USD 25/mes |
| Vercel | Hobby | USD 0 |
| Dominio | .com / .pe | ~USD 10–15/año |
| **Total MVP** | | **USD 0–25/mes** |

---

## 8. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Formato código barras no definido | Bloquea Fase 3 | Definir en Semana 1 con contadores |
| PC42E-T no calibrada | Etiquetas mal impresas | Configurar impresora en Semana 7 |
| Fotos sin comprimir | Storage lleno | Compresión obligatoria desde Fase 1 |
| Conflictos sync offline | Datos duplicados | Cola + reglas de resolución en Fase 3 |
| Scope creep | Retraso en entrega | MVP estricto; backlog fase 2 separado |

---

## 9. Fuera del alcance del MVP

Los siguientes ítems **no** forman parte de estas 14 semanas y quedan para fases posteriores:

- App móvil Android/iOS
- Escaneo por cámara de celular
- Integración con sistemas contables externos (SIAF, SAP)
- Notificaciones y alertas automáticas
- Firma digital electrónica certificada
- Multi-idioma
- Nivel Piso como jerarquía formal (solo en descripción de Ambiente)

---

## 10. Próximos pasos inmediatos

1. Aprobar este plan con el grupo de desarrollo y B&D Consultores.
2. Definir formato código de barras (Code 128: `catálogo-correlativo`).
3. Asignar roles del equipo (Dev A, Dev B, QA, product owner).
4. Arrancar **Fase 0**: repositorio + Supabase + login base.
5. Agendar demo **H1** para dentro de 3 semanas.

---

## 11. Aprobaciones

| Rol | Nombre | Firma | Fecha |
|---|---|---|---|
| Responsable del proyecto | | | |
| Líder técnico / Desarrollador | | | |
| Representante B&D Consultores | | | |

---

*B&D Consultores Global EIRL · RUC 20614326418 · Documento confidencial · Versión 1.0 · Junio 2026*
