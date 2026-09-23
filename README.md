# CRM Personal

CRM personal para gestionar contactos, clientes, oportunidades comerciales, tareas, proyectos y presupuestos.

Monorepo simple con dos paquetes independientes:

```
crm/
├── server/   API REST (Node + Express + TypeScript + Prisma + SQLite)
└── web/      SPA (React + TypeScript + Vite + Tailwind CSS)
```

---

## 1. Arquitectura

### Visión general

```
┌─────────────────────────┐        ┌──────────────────────────┐       ┌──────────────┐
│  Navegador (SPA React)  │  HTTP  │  API REST (Express/TS)   │ Prisma│  SQLite      │
│  - React Router         │ ─────► │  - Auth JWT (cookie)     │ ────► │  crm.db      │
│  - TanStack Query       │  JSON  │  - Validación Zod        │       │              │
│  - Tailwind + dark mode │ ◄───── │  - Scoping por usuario   │       │              │
└─────────────────────────┘        └──────────────────────────┘       └──────────────┘
```

- **Frontend**: React 18 + TypeScript, Vite, Tailwind CSS, React Router, TanStack Query para cache
  y sincronización de datos del servidor. Modo claro/oscuro persistente. Responsive (sidebar
  colapsable en móvil).
- **Backend**: Node + Express + TypeScript. Autenticación real con contraseña hasheada (bcrypt) y
  JWT en cookie `httpOnly`. Validación de todas las entradas con Zod. Manejo de errores
  centralizado. Rate limiting en las rutas de autenticación. Helmet para cabeceras de seguridad.
- **Base de datos**: SQLite gestionada con Prisma ORM (fichero `server/prisma/dev.db`, persistente).
  Migrar a PostgreSQL es cambiar el `provider` del `datasource` y la `DATABASE_URL`.
- **Aislamiento de datos**: cada registro pertenece a un `userId`. Todas las consultas se filtran
  por el usuario autenticado, de modo que un usuario nunca puede leer ni modificar datos de otro.

### Estructura de carpetas

```
server/
├── prisma/schema.prisma        Modelo de datos
└── src/
    ├── index.ts                Arranque del servidor
    ├── app.ts                  Configuración de Express y montaje de rutas
    ├── env.ts                  Carga y validación de variables de entorno
    ├── prisma.ts               Cliente Prisma singleton
    ├── lib/                    Utilidades (errores, csv, dinero, async handler)
    ├── middleware/             Autenticación y manejador de errores
    └── modules/                Un módulo por dominio (rutas + validación + lógica)
        ├── auth/  contacts/  tags/  stages/  deals/  tasks/
        ├── activities/  events/  projects/  quotes/  documents/
        └── dashboard/  reports/  data/ (CSV y backup)

web/src/
├── main.tsx  App.tsx           Arranque y enrutado
├── types/                      Modelos de datos compartidos (TypeScript)
├── services/                   Cliente HTTP y un servicio por dominio
├── hooks/                      Hooks de datos (TanStack Query) y utilidades
├── context/                    Sesión de usuario y tema claro/oscuro
├── components/
│   ├── ui/                     Componentes base (Button, Input, Modal, Card…)
│   ├── layout/                 Sidebar, Topbar, Shell
│   └── <dominio>/              Formularios y tarjetas por dominio
└── pages/                      Una página por módulo
```

---

## 2. Modelo de datos

| Entidad     | Descripción | Relaciones |
|-------------|-------------|------------|
| `User`      | Cuenta con acceso privado | dueño de todo lo demás |
| `Contact`   | Persona: datos personales, empresa, teléfono, correo, redes sociales, estado de cliente | `Tag[]`, `Activity[]`, `Task[]`, `Deal[]`, `Project[]`, `Quote[]` |
| `Tag`       | Etiqueta personalizada con color | N:M con `Contact` |
| `Stage`     | Etapa del pipeline (orden, probabilidad) | `Deal[]` |
| `Deal`      | Oportunidad: importe, moneda, fecha estimada de cierre, estado ganada/perdida | `Contact?`, `Stage`, `Activity[]`, `Task[]`, `Quote[]` |
| `Task`      | Tarea con prioridad, vencimiento y estado | `Contact?`, `Deal?`, `Project?` |
| `Activity`  | Interacción registrada: nota, llamada, reunión, correo, WhatsApp | `Contact?`, `Deal?`, `Project?` |
| `Event`     | Cita de agenda con inicio/fin y lugar | `Contact?` |
| `Project`   | Proyecto con estado, fechas y porcentaje de avance | `Contact?`, `Task[]`, `Activity[]` |
| `Quote`     | Presupuesto con número, estado de aprobación y líneas | `QuoteItem[]`, `Contact?`, `Deal?` |
| `Document`  | Enlace a un contrato, propuesta o factura externa | `Contact?`, `Deal?`, `Project?` |

Notas de diseño:

- **Importes en céntimos** (`amountCents: Int`) para evitar errores de redondeo en coma flotante.
  El frontend convierte a y desde unidades monetarias en los formularios.
- **Enums como texto validado con Zod**, porque el conector SQLite de Prisma no soporta `enum`.
  Los valores permitidos están en `server/src/lib/enums.ts` y en `web/src/types/`.
- Al registrarse se crean automáticamente las **etapas por defecto del pipeline** y un juego de
  **etiquetas iniciales**; no se insertan contactos, ventas ni métricas ficticias.

---

## 3. Instalación y ejecución

Requisitos: **Node.js 18+** y npm.

```bash
# 1) Backend
cd crm/server
npm install
cp .env.example .env          # en Windows: copy .env.example .env
#   Edita .env y pon un JWT_SECRET largo y aleatorio
npm run db:push               # crea la base de datos SQLite y el esquema
npm run dev                   # API en http://localhost:4000

# 2) Frontend (en otra terminal)
cd crm/web
npm install
npm run dev                   # App en http://localhost:5173
```

Abre http://localhost:5173, crea tu cuenta desde «Crear cuenta» y entra. La primera cuenta parte de
cero: sin contactos ni ventas, solo con las etapas y etiquetas por defecto listas para editar.

### Scripts

**server**

| Script | Descripción |
|---|---|
| `npm run dev` | API con recarga en caliente |
| `npm run build` / `npm start` | Compilar y ejecutar en producción |
| `npm run db:push` | Sincronizar el esquema con la base de datos |
| `npm run db:migrate` | Crear una migración versionada |
| `npm run db:studio` | Explorador visual de la base de datos |

**web**

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo (proxy `/api` → `localhost:4000`) |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Servir el build |

### Acceso desde el móvil (red local)

La API sirve también el frontend compilado, así que desde el teléfono basta **un solo puerto**:

```bash
cd crm/web && npm run build     # genera web/dist
cd crm/server && npm run dev    # imprime las direcciones de red al arrancar
```

Con el móvil **en la misma red Wi‑Fi** que el ordenador, abre `http://<IP-del-PC>:4000`. El
servidor muestra la IP al arrancar:

```
API del CRM escuchando (development)
  Local:   http://localhost:4000
  Red:     http://192.168.x.x:4000
```

Notas:

- Recompila (`npm run build`) cada vez que cambies el frontend: `web/dist` es una foto fija.
  Para desarrollar con recarga en caliente desde otro dispositivo, usa `npm run dev:lan` en `web/`
  y entra por el puerto 5173.
- Si Windows bloquea la conexión, permite `node.exe` en el firewall para la red activa, o marca tu
  Wi‑Fi como red **privada** en Configuración → Red e Internet.
- La IP puede cambiar al reconectar el router. Si quieres que sea fija, reserva la IP por DHCP.
- **La conexión es HTTP, sin cifrar.** Dentro de tu Wi‑Fi doméstica el riesgo es bajo, pero no uses
  este modo en redes compartidas o públicas.

#### Fuera de casa

Para entrar desde datos móviles hacen falta opciones adicionales, **ninguna configurada aquí**:

| Opción | Qué implica |
|---|---|
| **Tailscale / WireGuard** | VPN privada entre tus dispositivos. Nada queda expuesto a internet. Es la opción recomendada. |
| **Cloudflare Tunnel / ngrok** | Publica la aplicación en una URL de internet con HTTPS. Queda accesible para cualquiera que la encuentre; el único filtro es tu contraseña. |
| **Servidor propio (VPS)** | Despliegue real con dominio, HTTPS y PostgreSQL. Más trabajo y coste, control total. |

### Despliegue (resumen)

1. `cd server && npm run build` y ejecutar `npm start` con `NODE_ENV=production`,
   `JWT_SECRET` fuerte y `CORS_ORIGIN` apuntando al dominio del frontend.
2. `cd web && npm run build` y servir `dist/` como estáticos, con `VITE_API_URL` apuntando a la API
   si no está en el mismo dominio.
3. Para PostgreSQL: cambiar `provider = "postgresql"` en `schema.prisma`, ajustar `DATABASE_URL` y
   ejecutar `npm run db:migrate`.

---

## 4. Estado de las funcionalidades

### Implementado y funcionando

- Registro, inicio de sesión, sesión persistente y cierre de sesión (JWT en cookie `httpOnly`).
- Dashboard con métricas reales calculadas sobre tus propios datos y gráficos interactivos.
- Contactos: alta, edición, borrado, búsqueda por nombre/empresa/teléfono/correo, filtro por estado
  y etiquetas, detección de posibles duplicados, ficha con historial.
- Clientes: clasificación en potencial, activo, recurrente e inactivo (vista filtrada de contactos).
- Pipeline de ventas tipo Kanban: arrastrar oportunidades entre etapas, importes, fecha estimada,
  total por etapa, marcar ganada o perdida.
- Tareas con prioridad, estado, vencimiento y aviso visual de vencidas.
- Agenda con calendario mensual de eventos y reuniones.
- Historial de interacciones cronológico (notas, llamadas, reuniones, correos, WhatsApp).
- Proyectos con estado y porcentaje de avance.
- Presupuestos con líneas, totales y estados de aprobación.
- Documentos: enlaces a archivos externos asociados a contactos, ventas o proyectos.
- Reportes: conversión del pipeline, ingresos ganados por mes, productividad de tareas.
- Configuración: etiquetas y etapas del pipeline personalizables, preferencias de moneda y tema.
- Importación y exportación CSV de contactos; copia de seguridad completa en JSON.

### No implementado (no conectado ni autorizado)

Estas integraciones **no** están conectadas. La interfaz no simula su funcionamiento:

- **WhatsApp**: el detalle de contacto abre un enlace `https://wa.me/<número>` en el navegador. Es
  un enlace normal, no una integración con la API de WhatsApp Business: no envía mensajes desde la
  aplicación ni registra automáticamente las conversaciones.
- **Correo electrónico**: los enlaces `mailto:` abren tu cliente de correo. No hay envío, ni
  sincronización, ni lectura de bandeja de entrada.
- **Google Calendar**: la agenda es interna. No hay sincronización con Google ni OAuth configurado.
- **Automatizaciones de seguimiento**: no hay motor de reglas ni tareas programadas en servidor.

Cada una requiere credenciales, consentimiento explícito y revisión de privacidad antes de
implementarse. Están fuera del alcance de este MVP.

---

## 5. Seguridad y datos personales

- Contraseñas con `bcrypt` (12 rondas). Nunca se devuelven hashes por la API.
- JWT firmado con `JWT_SECRET`, almacenado en cookie `httpOnly` + `sameSite=lax`
  (+ `secure` en producción), de modo que JavaScript de terceros no puede leerlo.
- Toda entrada se valida con Zod; los errores devuelven mensajes claros sin filtrar detalles internos.
- Todas las consultas se filtran por `userId`; los `404` evitan revelar la existencia de recursos ajenos.
- Rate limiting en `/api/auth` para frenar ataques de fuerza bruta.
- `helmet` para cabeceras HTTP seguras y CORS restringido al origen configurado.
- Exportación (CSV/JSON) y borrado de contactos disponibles para el titular de los datos.
- La base de datos SQLite es un fichero local: haz copias de `server/prisma/dev.db` o usa
  «Configuración → Copia de seguridad». No subas ese fichero ni tu `.env` a un repositorio.
