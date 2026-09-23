# CRM Personal — Documentación completa

Documento de referencia del CRM personal: qué es, cómo ejecutarlo, cómo entrar desde el móvil,
cómo está construido y qué queda pendiente.

**Fecha:** 22 de septiembre de 2026
**Ubicación del proyecto:** `Escritorio\m hero 917 fuera  dentro\crm`

---

## 1. Resumen

CRM personal para gestionar contactos, clientes, oportunidades de venta, tareas, agenda,
proyectos, presupuestos y documentos. Funciona en el ordenador y en el móvil, con los datos
guardados en una base de datos local propia.

Dos piezas independientes:

```
crm/
├── server/   API REST      (Node + Express + TypeScript + Prisma + SQLite)
└── web/      Interfaz web  (React + TypeScript + Vite + Tailwind CSS)
```

---

## 2. Cómo arrancarlo

### En el ordenador

```bash
cd crm/server
npm install
npm run db:push      # solo la primera vez: crea la base de datos
npm run dev          # API en http://localhost:4000
```

```bash
cd crm/web
npm install
npm run dev          # interfaz en http://localhost:5173
```

### Modo de un solo puerto (el que se usa desde el móvil)

La API también sirve la interfaz ya compilada, así que basta un puerto:

```bash
cd crm/web && npm run build     # genera web/dist
cd crm/server && npm run dev    # sirve API + interfaz en el 4000
```

Importante: `web/dist` es una foto fija. **Cada vez que se cambie algo de la interfaz hay que
volver a ejecutar `npm run build`** para que el móvil vea los cambios.

### Desde el móvil

| Vía | Dirección | Requisito |
|---|---|---|
| Tailscale (recomendada) | `http://100.124.90.104:4000` | Tailscale activo en el móvil |
| Wi-Fi local | `http://192.168.51.209:4000` | Mismo Wi-Fi; la IP cambia al reiniciar el router |
| Mismo ordenador | `http://localhost:4000` | — |

La dirección de Tailscale (`100.124.90.104`) es fija y funciona también con datos móviles, desde
cualquier sitio. Con MagicDNS activo, `http://desktop-po9675f:4000` lleva al mismo destino.

El servidor imprime las direcciones disponibles cada vez que arranca.

**Requisito:** el ordenador tiene que estar encendido y el servidor en marcha. Si se cierra la
terminal, el CRM deja de responder.

---

## 3. Arquitectura

```
┌──────────────────────┐        ┌────────────────────────┐       ┌───────────┐
│ Navegador (React)    │  HTTP  │ API REST (Express/TS)  │Prisma │ SQLite    │
│ - React Router       │ ─────► │ - Sesión JWT en cookie │ ────► │ dev.db    │
│ - TanStack Query     │  JSON  │ - Validación con Zod   │       │           │
│ - Tailwind CSS       │ ◄───── │ - Filtrado por usuario │       │           │
└──────────────────────┘        └────────────────────────┘       └───────────┘
```

### Estructura de carpetas

```
server/src/
├── index.ts            Arranque y direcciones de red
├── app.ts              Express, cabeceras de seguridad, rutas
├── env.ts              Variables de entorno validadas
├── lib/                Utilidades: errores, CSV, validación, enumeraciones
├── middleware/         Autenticación y manejo de errores
└── modules/            Un módulo por dominio
    auth, contacts, tags, stages, deals, tasks, activities,
    events, projects, quotes, documents, dashboard, reports, data

web/src/
├── types/models.ts     Modelos de datos compartidos
├── services/           Cliente HTTP y un servicio por dominio
├── context/            Sesión, tema y avisos
├── components/ui/      Componentes base (botón, campo, modal, tarjeta…)
├── components/layout/  Barra lateral y cabecera
└── pages/              Una página por módulo
```

### Decisiones de diseño técnico

- **Importes en céntimos** (números enteros). Evita los errores de redondeo típicos de los
  decimales en coma flotante al sumar dinero.
- **Enumeraciones como texto validado con Zod**, porque SQLite en Prisma no admite enumeraciones
  nativas. Los valores permitidos están en `server/src/lib/enums.ts`.
- **Aislamiento por usuario**: cada registro pertenece a un `userId` y toda consulta se filtra por
  el usuario de la sesión. Se devuelve `404` ante recursos ajenos, para no revelar ni que existen.
- **Cambiar a PostgreSQL** es cambiar el `provider` del `datasource` en `schema.prisma`, ajustar
  `DATABASE_URL` y ejecutar `npm run db:migrate`.

---

## 4. Modelo de datos

| Entidad | Contenido | Relaciones |
|---|---|---|
| `User` | Cuenta de acceso, moneda, idioma, tema | Dueño de todo lo demás |
| `Contact` | Datos personales, empresa, teléfono, correo, redes, estado | Etiquetas, ventas, tareas, interacciones, proyectos, presupuestos |
| `Tag` | Etiqueta personalizada con color | N:M con contactos |
| `Stage` | Etapa del pipeline: orden, probabilidad, color | Oportunidades |
| `Deal` | Oportunidad: importe, moneda, cierre previsto, ganada/perdida | Contacto, etapa, tareas, interacciones |
| `Task` | Tarea con prioridad, estado y vencimiento | Contacto, oportunidad, proyecto |
| `Activity` | Interacción: nota, llamada, reunión, correo, WhatsApp | Contacto, oportunidad, proyecto |
| `Event` | Cita de agenda con inicio, fin y lugar | Contacto |
| `Project` | Proyecto con estado, fechas y porcentaje de avance | Contacto, tareas |
| `Quote` | Presupuesto con número, estado e impuesto | Líneas, contacto, oportunidad |
| `QuoteItem` | Línea de presupuesto: concepto, cantidad, precio | Presupuesto |
| `Document` | Enlace a un archivo externo | Contacto, oportunidad, proyecto, presupuesto |

### Estados posibles

- **Contacto:** potencial, activo, recurrente, inactivo
- **Oportunidad:** abierta, ganada, perdida
- **Tarea:** pendiente, en curso, completada, cancelada — prioridad baja, media, alta, urgente
- **Proyecto:** planificado, en curso, en pausa, completado, cancelado
- **Presupuesto:** borrador, enviado, aprobado, rechazado, caducado
- **Interacción:** nota, llamada, reunión, correo, WhatsApp, otro

---

## 5. Módulos

| Módulo | Qué hace |
|---|---|
| **Dashboard** | Métricas reales: contactos, pipeline abierto, ganado este mes, tareas pendientes. Gráficos de valor por etapa y reparto de clientes. Próximas tareas, agenda de 7 días y últimas interacciones |
| **Contactos** | Alta, edición, borrado. Búsqueda por nombre, empresa, teléfono o correo. Filtro por estado y etiqueta. Detección de posibles duplicados. Ficha con historial completo |
| **Clientes** | Los mismos contactos agrupados en pestañas por estado, con contadores |
| **Pipeline** | Tablero Kanban. Arrastrar oportunidades entre etapas, total por columna, marcar ganada o perdida con motivo, reabrir. Vista aparte de cerradas |
| **Agenda** | Calendario mensual. Doble clic en un día para crear evento. Panel lateral con el detalle del día y próximos eventos |
| **Tareas** | Vistas: pendientes, vencidas, para hoy, esta semana, todas. Filtro por prioridad. Aviso visual de vencidas y contador en el menú |
| **Interacciones** | Historial cronológico agrupado por día, con tipo, duración y contacto |
| **Proyectos** | Tarjetas con estado, fechas, barra de avance y número de tareas |
| **Presupuestos** | Numeración automática, líneas con cantidad y precio, impuesto configurable, totales y cambio de estado desde la tabla |
| **Documentos** | Enlaces a contratos, propuestas y facturas, asociados a contactos, ventas o proyectos |
| **Reportes** | Tasa de conversión, ingresos ganados por mes, venta media, productividad, pipeline por etapa. Periodo de 3 a 24 meses |
| **Configuración** | Perfil, moneda, idioma, tema, contraseña, etiquetas, etapas del pipeline y copias de seguridad |

### Importación y exportación

- **Exportar contactos a CSV**, con todas las columnas y las etiquetas incluidas.
- **Importar desde CSV** reconociendo cabeceras en español e inglés (nombre/firstName,
  correo/email, teléfono/phone, empresa/company, etiquetas/tags…). Solo el nombre es obligatorio.
  Permite previsualizar sin guardar, y decidir qué hacer con los duplicados: omitir, actualizar o
  crear igualmente. Las filas con error se informan con su número de línea.
- **Plantilla CSV** descargable con las cabeceras correctas.
- **Copia de seguridad completa en JSON** con todas las entidades.

---

## 6. Sistema de diseño

Tema rojo sobre negro, oscuro por defecto.

### Paleta

Todo el aspecto sale de **dos escalas de color** definidas en `web/tailwind.config.js`:

| Escala | Uso | Valor base |
|---|---|---|
| `brand` | Acentos, acciones, estado activo, foco | `#d01228` |
| `slate` | Neutros; se sobrescribe el gris azulado de Tailwind por grises neutros que acaban en negro real | `#0a0a0c` |

Como todos los componentes usan esas dos escalas, **cambiar esos dos bloques repinta la aplicación
entera** sin tocar ninguna página. Para cambiar de color corporativo, ese es el único sitio.

El rojo `#d01228` da un contraste de 5,5:1 con texto blanco, por encima del mínimo de
accesibilidad AA (4,5:1).

### Criterios aplicados

- El botón de **eliminar no es rojo sólido**: con el rojo como color de marca se confundiría con la
  acción principal. Lleva contorno rojo y se rellena al pasar por encima.
- Se **conservan verde y ámbar para los estados** (ganada, completada, urgente). Teñirlo todo de
  rojo habría sido más uniforme pero se perdería información de un vistazo.
- Elementos: franja roja vertical en el apartado activo del menú, tarjetas con borde translúcido y
  desenfoque, resplandor rojo en el botón principal, modales con animación de entrada, barras de
  progreso en degradado.

---

## 7. Seguridad

- Contraseñas cifradas con **bcrypt** (12 rondas). La API nunca devuelve el hash.
- Sesión mediante **JWT en cookie `httpOnly`** con `sameSite=lax`, de modo que JavaScript de
  terceros no puede leerla.
- **Validación de toda entrada con Zod**; los errores indican el campo concreto sin filtrar
  detalles internos del servidor.
- **Límite de intentos** en las rutas de autenticación: 20 cada 15 minutos.
- Mismo mensaje ante correo inexistente y contraseña incorrecta, para no revelar qué correos
  están registrados.
- **Cabeceras de seguridad** con helmet y CORS restringido al origen configurado.
- Cada consulta filtra por el usuario de la sesión: una cuenta no puede leer ni modificar datos de
  otra (comprobado: devuelve 404 en lectura y en borrado).

### Variables de entorno (`server/.env`)

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Ruta de la base de datos |
| `JWT_SECRET` | Clave de firma de la sesión. Obligatoria y larga |
| `JWT_EXPIRES_IN` | Duración de la sesión (7 días por defecto) |
| `PORT` | Puerto de la API (4000) |
| `CORS_ORIGIN` | Origen permitido del frontend |
| `ALLOW_REGISTRATION` | Poner en `false` para impedir nuevos registros |
| `HTTPS_ENABLED` | Solo `true` si se sirve realmente por HTTPS |

### Datos personales

La base de datos es un fichero local (`server/prisma/dev.db`) que contiene datos de contacto de
terceros. Conviene:

- Hacer copias periódicas con «Configuración → Copia de seguridad».
- No subir nunca `dev.db` ni el fichero `.env` a un repositorio (ya están excluidos en
  `.gitignore`).
- Recordar que la copia de seguridad en JSON también contiene esos datos personales.

---

## 8. Integraciones NO implementadas

Ninguna de estas está conectada. La aplicación no simula su funcionamiento, y la pantalla de
Configuración las marca explícitamente como «No conectado».

| Integración | Situación real |
|---|---|
| **WhatsApp** | Solo un enlace `wa.me` desde la ficha de contacto, que abre WhatsApp Web o la app. No hay integración con la API de WhatsApp Business: no envía mensajes ni registra conversaciones automáticamente |
| **Correo electrónico** | Solo enlaces `mailto:`, que abren el cliente de correo. No hay envío ni sincronización de bandeja de entrada |
| **Google Calendar** | No conectado. La agenda es interna y no se sincroniza |
| **Automatizaciones de seguimiento** | No implementadas. No hay motor de reglas ni tareas programadas en el servidor |

Cada una requiere credenciales, consentimiento explícito y revisión de privacidad antes de
implementarse.

---

## 9. Registro de incidencias resueltas

### Pantalla negra en el móvil

**Síntoma:** el CRM funcionaba en el ordenador por el puerto 5173, pero en el móvil por el
puerto 4000 se veía una pantalla completamente negra.

**Causa:** las cabeceras de seguridad de helmet asumen HTTPS. Servidas por HTTP rompían la carga:

- `upgrade-insecure-requests` hacía que el navegador pidiera los recursos por `https://`, y el
  servidor no habla TLS.
- `script-src 'self'` bloqueaba el script de tema que iba incrustado en el HTML.
- `Strict-Transport-Security` forzaba HTTPS para ese host durante un año.

El resultado era un documento vacío que, al declarar `color-scheme: dark` y estar el móvil en modo
oscuro, Safari pintaba en negro. No se detectó antes porque en el ordenador se probó el puerto
5173, donde helmet no interviene.

**Solución:**

1. El script de tema se movió a un fichero externo (`web/public/theme-init.js`), cumpliendo
   `script-src 'self'` sin recurrir a `unsafe-inline`.
2. Se añadió la variable `HTTPS_ENABLED` (por defecto `false`): HSTS y `upgrade-insecure-requests`
   solo se activan si de verdad se sirve por HTTPS.
3. Se añadió captura de errores de arranque: si algo vuelve a fallar, la pantalla muestra el
   mensaje técnico en texto en lugar de quedarse en negro.

### Acceso desde el móvil bloqueado por el firewall

El adaptador de Tailscale queda en el perfil de red **Privado**, mientras que las reglas de
`node.exe` del firewall de Windows solo cubrían el perfil **Público**.

**Solución:** regla de entrada «CRM Tailscale (TCP 4000)», limitada al puerto 4000 y al rango
`100.64.0.0/10` (el que Tailscale asigna a sus nodos). No abre el puerto ni a la Wi-Fi local ni a
internet: solo llegan los dispositivos propios conectados a Tailscale.

---

## 10. Acceso remoto

Montado con **Tailscale** (plan personal gratuito), que crea una red privada entre los
dispositivos propios. El CRM **no queda expuesto a internet**.

| Dispositivo | Dirección Tailscale |
|---|---|
| Ordenador (`desktop-po9675f`) | 100.124.90.104 |
| iPhone (`iphone173`) | 100.109.100.33 |

Para que funcione: Tailscale activo en el móvil y el servidor en marcha en el ordenador.

### Alternativas descartadas por ahora

| Opción | Motivo |
|---|---|
| Cloudflare Tunnel / ngrok | Publican la aplicación en internet; la única barrera sería la contraseña |
| Servidor propio (VPS) | Despliegue real con dominio y HTTPS; más trabajo y coste mensual |

---

## 11. Estado y próximos pasos

### Verificado

- Registro, inicio de sesión y sesión persistente.
- Validaciones: contraseña débil, correo inválido y acceso sin sesión devuelven el error correcto.
- Flujo completo de venta: crear oportunidad, mover de etapa, marcar ganada. Al ganar, el contacto
  pasa de potencial a activo automáticamente.
- Importación CSV con acentos, etiquetas y filas erróneas informadas por número de línea.
- Exportación CSV y copia de seguridad JSON.
- Aislamiento entre cuentas.
- Interfaz sin errores de consola ni desbordamiento horizontal, comprobada a 390 px (móvil) y
  1280 px (escritorio).

### Pendiente

- **No hay tests automatizados.** Todas las comprobaciones se han hecho a mano.
- El tamaño del paquete JavaScript es de unos 760 KB; se podría dividir en varios trozos para que
  cargue más rápido.
- El servidor no arranca solo al encender el ordenador; habría que configurarlo como servicio.
- Las etapas del pipeline creadas antes del rediseño conservan los colores antiguos; se pueden
  cambiar en Configuración.

### Ideas para más adelante

- Instalarlo como aplicación en el móvil (manifiesto PWA).
- HTTPS real mediante `tailscale cert`.
- Migrar a PostgreSQL si se despliega en un servidor.
- Fusión asistida de contactos duplicados (ahora solo se detectan y se avisan).

---

## 12. Comandos de referencia

### Servidor

| Comando | Qué hace |
|---|---|
| `npm run dev` | Arranca la API con recarga automática |
| `npm run build` / `npm start` | Compila y ejecuta en modo producción |
| `npm run db:push` | Sincroniza el esquema con la base de datos |
| `npm run db:migrate` | Crea una migración con versión |
| `npm run db:studio` | Explorador visual de la base de datos |

### Interfaz

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en el puerto 5173 |
| `npm run dev:lan` | Igual, pero accesible desde otros dispositivos de la red |
| `npm run build` | Compila a `web/dist` (necesario para el acceso por el puerto 4000) |
| `npm run preview` | Sirve lo compilado |
