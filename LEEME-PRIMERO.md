# CRM Personal — Instalación en un equipo nuevo

## Requisito único

**Node.js 18 o superior.** Si no lo tienes: <https://nodejs.org> → descarga la versión **LTS** e
instálala con las opciones por defecto.

Para comprobar si ya lo tienes, abre una terminal y escribe `node -v`.

---

## Windows

1. Descomprime el ZIP donde quieras (por ejemplo, en el Escritorio).
2. Doble clic en **`INSTALAR.bat`** y espera. Tarda unos minutos: descarga las dependencias,
   crea la base de datos y compila la interfaz.
3. Doble clic en **`INICIAR.bat`**. Se abre el navegador en <http://localhost:4000>.
4. Pulsa **«Crear cuenta»** y regístrate.

A partir de ahí, solo necesitas `INICIAR.bat` cada vez que quieras usarlo.

> Si Windows muestra un aviso de SmartScreen, pulsa «Más información» → «Ejecutar de todas formas».
> Ocurre con cualquier `.bat` descargado de internet.

## macOS o Linux

```bash
cd crm
bash instalar.sh     # una sola vez
bash iniciar.sh      # cada vez que quieras usarlo
```

---

## Qué NO viene en el paquete

| Ausente | Motivo |
|---|---|
| `node_modules` | Se descarga en la instalación; son cientos de megas |
| `server/.env` | Contiene la clave de firma de sesión. El instalador **genera una nueva y distinta** en cada equipo |
| `server/prisma/dev.db` | Es la base de datos con tus contactos. El equipo nuevo empieza vacío |

---

## Llevarte tus datos al equipo nuevo

El instalador crea una base de datos **vacía**. Para trasladar lo que ya tienes:

1. En el equipo original, cierra el CRM (para que no esté escribiendo en la base de datos).
2. Copia el fichero `crm\server\prisma\dev.db`.
3. Pégalo en la misma ruta del equipo nuevo, **después** de haber ejecutado `INSTALAR.bat`,
   sustituyendo el que haya.
4. Arranca con `INICIAR.bat`. Entrarás con el mismo correo y contraseña de siempre.

Ese fichero contiene datos personales de tus contactos: trátalo como información sensible y no lo
envíes por canales abiertos.

> La exportación CSV y la copia de seguridad JSON de «Configuración» sirven para consultar o
> archivar datos, pero **todavía no existe una función para volver a importarlas**. Para mover una
> instalación completa, copiar `dev.db` es el método bueno hoy por hoy.

---

## Usarlo desde el móvil

Igual que en el equipo original, con Tailscale o por la Wi-Fi local. El servidor imprime al
arrancar las direcciones de red disponibles:

```
API del CRM escuchando (development)
  Local:   http://localhost:4000
  Red:     http://192.168.x.x:4000
```

Si usas la red local puede que Windows pida permiso del firewall la primera vez: acéptalo.

---

## Problemas frecuentes

| Síntoma | Solución |
|---|---|
| «No se encuentra Node.js» | Instálalo desde nodejs.org y vuelve a ejecutar `INSTALAR.bat` |
| La instalación falla descargando paquetes | Comprueba la conexión a internet; `npm` descarga de la red |
| «El puerto 4000 está en uso» | Otro programa lo ocupa. Cambia `PORT=4000` en `server\.env` por otro número |
| Pantalla en blanco o con un error en texto | El mensaje indica la causa; mándamelo tal cual |
| Cambié algo de la interfaz y no lo veo | Ejecuta `npm run build` dentro de `web` |

---

Documentación técnica completa en `DOCUMENTACION.md`.
