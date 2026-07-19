# Ariztía · Gestión de Proyectos

Aplicación web tipo Jira con jerarquía **Historia → Épica → Tarea → Subtarea**, inicio de sesión, gestión de usuarios, tablero Kanban, cronograma Gantt y alertas de vencimiento por correo.

A diferencia de la versión de prueba, esta versión tiene **servidor y base de datos**: todos los usuarios ven la misma información, los cambios se guardan de forma permanente y las contraseñas se almacenan encriptadas.

---

## 1. Requisitos (Windows y Mac)

Solo necesitas **Node.js** (versión 18 o superior):

1. Entra a https://nodejs.org
2. Descarga la versión **LTS** e instálala (siguiente, siguiente, finalizar).
3. Para comprobar: abre una terminal (**Windows**: busca "cmd" o "PowerShell" · **Mac**: busca "Terminal") y escribe `node -v`. Debe mostrar un número de versión.

## 2. Instalar y arrancar

1. Copia la carpeta `ariztia-app` a tu equipo (por ejemplo al Escritorio).
2. Abre la terminal **dentro de esa carpeta**:
   - **Windows**: abre la carpeta en el Explorador, haz clic en la barra de dirección, escribe `cmd` y presiona Enter.
   - **Mac**: clic derecho sobre la carpeta → Servicios → "Nueva terminal en la carpeta" (o `cd` hasta ella).
3. Ejecuta (solo la primera vez):
   ```
   npm install
   ```
4. Arranca el servidor:
   ```
   npm start
   ```
5. Abre el navegador en **http://localhost:3000**

**Primer ingreso:** `fveas@ariztia.com` / `Holywars91`
Después de entrar, usa "Cambiar contraseña" (abajo a la izquierda) para poner una nueva. Luego crea las cuentas del resto del equipo en el módulo **Usuarios**.

## 3. Que entren otras personas

### En la misma red (oficina)

Mientras el servidor esté corriendo en tu equipo, cualquier persona conectada a la misma red puede entrar desde su navegador usando tu dirección IP:

1. Averigua tu IP local:
   - **Windows**: en la terminal escribe `ipconfig` y busca "Dirección IPv4" (ej: 192.168.1.34).
   - **Mac**: Preferencias del Sistema → Red, o escribe `ipconfig getifaddr en0` en la terminal.
2. Comparte la dirección: `http://TU-IP:3000` (ej: `http://192.168.1.34:3000`).
3. Cada persona inicia sesión con la cuenta que le creaste.

Nota: el equipo donde corre el servidor debe estar encendido y puede que Windows pregunte si permites el acceso por red la primera vez (acepta "redes privadas").

### Desde internet (recomendado para uso permanente)

Para que funcione siempre y desde cualquier lugar, conviene instalarla en un servidor:

- **Servidor interno de Ariztía**: el área de TI puede correr `npm install && npm start` en cualquier servidor con Node.js (o usar `pm2` para mantenerla siempre activa) y asignarle una dirección como `proyectos.ariztia.com`.
- **Servicio en la nube**: plataformas como Railway, Render o un VPS permiten desplegar este proyecto tal cual. Los datos se guardan en el archivo `data.json`, así que el servicio debe tener disco persistente.

## 4. Activar los correos automáticos

Sin configurar nada, la app funciona pero **no** envía correos (lo indica en la consola). Para activarlos:

1. Copia el archivo `.env.example` y renómbralo como `.env`
2. Complétalo con los datos SMTP del correo de la empresa (pídelos a TI) o de un servicio como Gmail/SendGrid/Brevo.
3. Reinicia el servidor (`Ctrl+C` y `npm start` de nuevo).

Con eso, **todos los días a las 8:00** el servidor revisa las tareas vencidas o que vencen en 3 días o menos, y envía **un correo por responsable** con su lista. El administrador también puede forzar el envío inmediato con el botón "Enviar recordatorios ahora" de la sección Alertas. La hora y el horizonte de días se ajustan en el `.env`.

## 5. Dónde quedan los datos

Todo se guarda en el archivo **`data.json`** dentro de la carpeta. Para respaldar, basta copiar ese archivo. Para partir de cero, bórralo y reinicia (se recreará con el admin inicial).

## 6. Estructura del proyecto

```
ariztia-app/
├── server.js        Servidor: login, sesiones, API, validación de jerarquía
├── mailer.js        Correos: alerta diaria automática y envío manual
├── data.json        Base de datos (se crea sola al arrancar)
├── .env.example     Plantilla de configuración de correo
├── public/
│   ├── index.html   Página base
│   └── app.js       Frontend compilado
└── src/
    └── app.jsx      Código fuente del frontend (React)
```

Si modificas `src/app.jsx`, recompila el frontend con:
```
npm run build
```

## 7. Dejarla en internet sin depender de tu PC (Railway)

1. Crea una cuenta gratis en https://github.com y otra en https://railway.com (entrando con GitHub).
2. En GitHub: botón **New repository** → nómbralo `ariztia-app` → márcalo **Private** → Create. Luego usa el enlace "uploading an existing file" y arrastra TODO el contenido de la carpeta ariztia-app EXCEPTO node_modules. Presiona **Commit changes**.
3. En Railway: **New Project → Deploy from GitHub repo** → elige `ariztia-app`. Se instalará y arrancará solo.
4. En el servicio → pestaña **Variables**, agrega:
   - `DATA_DIR` = `/data`
   - `SESSION_SECRET` = un texto largo y aleatorio cualquiera
   - (después, las variables SMTP_* del correo si quieres alertas por email)
5. Clic derecho sobre el servicio → **Attach Volume** → Mount path: `/data` (esto hace que los datos sobrevivan a reinicios y actualizaciones).
6. En **Settings → Networking → Generate Domain** obtendrás tu dirección pública, tipo `https://ariztia-app.up.railway.app`, accesible desde cualquier lugar con internet.

Los datos quedan en el volumen `/data`. Respáldalos periódicamente descargando el archivo data.json.
