# Despliegue para la prueba cerrada (Render + Neon, gratis)

Guía para dejar GestorRH en la nube **solo con datos ficticios**, para que una persona de confianza lo pruebe.

- **Neon**: la base PostgreSQL (gratis, no vence).
- **Render**: el servidor Node (gratis, se duerme tras 15 minutos sin visitas y tarda cerca de 1 minuto en despertar).

> Esta configuración **no sirve para datos reales**: no hay respaldos garantizados, el servidor se duerme y falta el segundo factor (2FA). Para clientes reales hay que pasar a planes pagados (ver SPEC).

Las pantallas de Neon y Render cambian de vez en cuando: si un botón tiene otro nombre, busca el equivalente.

---

## 0. Antes de empezar

- El código de la rama `main` debe estar en GitHub (repositorio público o privado, da igual).
- `npm test` en verde en tu PC.
- Ten a mano un bloc de notas **solo en tu PC** para ir guardando lo que se genere (contraseña de la base, `TOTP_CLAVE_CIFRADO`, contraseñas iniciales). No lo subas a ningún lado.

---

## 1. Base de datos en Neon

1. Entra a [neon.com](https://neon.com) y crea una cuenta (puedes usar tu GitHub).
2. **Create project**:
   - Nombre: `gestorrh-prueba`
   - Versión de Postgres: la que venga por defecto.
   - Región: **AWS US East 1 (N. Virginia)**. Importante: el servidor de Render irá en la misma zona; si quedan lejos, cada pantalla se siente lenta.
3. Al terminar, botón **Connect** (o *Connection details*):
   - Desactiva **Connection pooling** (usaremos la conexión directa: el host **no** debe tener `-pooler`).
   - Anota los cinco datos: **host** (algo como `ep-xxxx.us-east-1.aws.neon.tech`), **base** (normalmente `neondb`), **usuario** (normalmente `neondb_owner`), **contraseña** y puerto `5432`.

---

## 2. Preparar la base desde tu PC

La base se prepara una sola vez desde tu PC, apuntando a Neon. Render gratis no tiene consola para hacerlo allá.

### 2.1 Archivo `.env.nube`

En la raíz del proyecto crea el archivo **`.env.nube`** (ya está ignorado por git, igual que `.env`):

```
NODE_ENV=production
DB_DIALECT=postgres
DB_HOST=ep-xxxx.us-east-1.aws.neon.tech
DB_PORT=5432
DB_NAME=neondb
DB_USER=neondb_owner
DB_PASSWORD=la-contraseña-de-neon
DB_SSL=true
```

Revisa con `git status` que **no** aparezca `.env.nube`. Si aparece, detente: no hagas commit.

### 2.2 Crear tablas y datos base

En la terminal (PowerShell o la de VS Code), en la raíz del proyecto:

```
node --env-file=.env.nube node_modules/sequelize-cli/lib/sequelize db:migrate
node --env-file=.env.nube scripts/sembrar-base.js
```

`--env-file` hace que esos comandos usen Neon en vez de tu base local. El primero crea las tablas; el segundo carga AFP, Isapres, UF/UTM, impuestos, conceptos, planes, feriados, etc. **Sin** usuarios de prueba.

> Nunca uses `db:seed:all` contra Neon. Igual está bloqueado: con `NODE_ENV=production` los seeders de usuarios de prueba fallan a propósito.

### 2.3 Usuarios de la plataforma (solo tú)

```
node --env-file=.env.nube scripts/crear-usuario-plataforma.js soporte tu-correo-soporte@dominio.cl Daniel Soporte
node --env-file=.env.nube scripts/crear-usuario-plataforma.js comercial tu-correo-comercial@dominio.cl Daniel Comercial
```

Cada uno muestra una contraseña inicial **una sola vez**: anótala en tu bloc de notas. Usa correos distintos para cada uno (pueden ser alias, por ejemplo `tucorreo+soporte@gmail.com`).

**Estos dos usuarios son solo tuyos.** El tester nunca recibe soporte ni comercial: soporte ve los datos de todas las cuentas.

---

## 3. Clave del 2FA (`TOTP_CLAVE_CIFRADO`)

Cifra en la base los secretos de la verificación en dos pasos. Genera una nueva, distinta de la de tu PC:

```
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Cópiala a tu bloc de notas. Va solo en Render. **No la pierdas ni la cambies**: sin ella, hay que restablecer el acceso de todos los usuarios que tienen 2FA.

(Las sesiones ya no usan `JWT_SECRET` ni `JWT_EXPIRES_IN`: si estaban en Render, se pueden borrar.)

---

## 4. Servidor en Render

1. Entra a [render.com](https://render.com) y crea una cuenta con tu GitHub.
2. **New → Web Service** → conecta GitHub y elige el repositorio `gestorrh`.
3. Completa:

| Campo | Valor |
|---|---|
| Name | `gestorrh-prueba` (será parte de la URL) |
| Region | **Virginia (US East)**, la misma zona que Neon |
| Branch | `main` |
| Runtime | Node |
| Build Command | `npm ci` |
| Start Command | `node server.js` |
| Instance Type | **Free** |

4. **Environment Variables** (agrega una por una):

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `22` |
| `TRUST_PROXY` | `3` (se comprueba en el paso 5) |
| `DB_DIALECT` | `postgres` |
| `DB_HOST` | el host de Neon |
| `DB_PORT` | `5432` |
| `DB_NAME` | `neondb` |
| `DB_USER` | `neondb_owner` |
| `DB_PASSWORD` | la contraseña de Neon |
| `DB_SSL` | `true` (cifra la conexión y comprueba el certificado de Neon; no hace falta nada más) |
| `TOTP_CLAVE_CIFRADO` | la clave del paso 3 |
| `APP_ORIGEN` | la dirección del servicio, sin barra final, por ejemplo `https://gestorrh.onrender.com` (se ve arriba en el panel de Render) |

No agregues `PORT`: Render la pone sola.

5. Si aparece **Health Check Path** (en *Advanced*), escribe `/api/salud`.
6. **Create Web Service**. Mira la pestaña **Logs**: al final debe decir `Server running on ...`. Si dice "El servidor no puede iniciar por problemas de configuración", la lista que sigue indica qué variable falta o está mal.

La URL queda como `https://gestorrh-prueba.onrender.com`. Desde ahora, **cada push a `main` se despliega solo**.

---

## 5. Comprobaciones

### 5.1 Salud

Abre `https://gestorrh-prueba.onrender.com/api/salud`. La primera vez puede tardar un minuto (el servidor estaba dormido). Debe responder algo como:

```
{"estado":"ok","ip":"190.xx.xx.xx"}
```

### 5.2 `TRUST_PROXY` (para que el límite de intentos de login use la IP real)

1. Busca en Google "cuál es mi ip" y compárala con la `ip` de `/api/salud`.
   - **Coincide** → bien.
   - Sale una IP interna (`10.x.x.x`, `172.x.x.x`, `127.0.0.1`, `::ffff:10...`) → sube `TRUST_PROXY` en 1 (Environment → editar → se redespliega solo) y vuelve a mirar.
2. Prueba que nadie pueda inventar su IP. En PowerShell:
   ```
   curl.exe -H "X-Forwarded-For: 1.2.3.4" https://gestorrh-prueba.onrender.com/api/salud
   ```
   - Si responde `"ip":"1.2.3.4"` → `TRUST_PROXY` quedó **demasiado alto**: bájalo en 1 y repite ambas pruebas.
   - Si responde tu IP real → listo.

Anota el valor final en el SPEC.

### 5.3 Recorrido mínimo

1. `.../login.html` con el usuario **soporte** → te pide cambiar la contraseña (mínimo 15 caracteres; sirve una frase).
2. Parámetros legales: revisa el mes actual. Si faltan UF/UTM, ábrelo y corrígelos.
3. Cierra sesión y entra con **comercial** → cambia la contraseña → crea la cuenta del tester (ver paso 6).
4. Revisa los Logs de Render: no deberían aparecer errores 500.

---

## 6. Entregar el acceso al tester

1. Como **comercial**, crea una cuenta con datos ficticios (RUT de prueba válido) y como administrador el **nombre y correo real del tester**. Ese administrador queda como **principal** de la cuenta.
2. La ventana muestra la contraseña inicial una sola vez: cópiala.
3. Envíale al tester, **por un canal distinto** al de la contraseña (por ejemplo, la URL y el correo por email, y la contraseña por WhatsApp):
   - La URL `https://gestorrh-prueba.onrender.com/login.html`
   - Su correo y la contraseña inicial.
   - El tutorial (`docs/TUTORIAL.md`) desde la sección 3 en adelante.
   - Estas reglas:
     - **Solo datos inventados.** Nada de RUT, nombres, sueldos ni cuentas bancarias reales.
     - La primera carga del día tarda cerca de un minuto: es normal.
     - Al entrar pedirá cambiar la contraseña: mínimo 15 caracteres; lo más fácil es una frase.
     - Cómo reportar: qué hizo, qué esperaba y qué pasó, con captura de pantalla.

---

## 7. Respaldo antes de cada sesión de prueba importante

Neon gratis solo permite volver atrás 6 horas. Antes de una sesión importante, haz una **rama** (copia instantánea):

1. Neon → tu proyecto → **Branches → Create branch**.
2. Nombre: `respaldo-AAAA-MM-DD`, desde `main`, con los datos actuales (*Current data*).

Si algo se rompe, puedes revisar o recuperar datos desde esa rama. Borra las ramas viejas: el plan gratis tiene un límite.

---

## 8. Actualizar la aplicación

1. Haces los cambios en tu PC, `npm test` en verde, commit y push a `main`. Render despliega solo.
2. **Si el cambio trae migraciones nuevas**, córrelas contra Neon **antes** del push (o justo después, antes de que alguien entre):
   ```
   node --env-file=.env.nube node_modules/sequelize-cli/lib/sequelize db:migrate
   ```
3. Revisa los Logs de Render y `/api/salud`.

---

## 9. Problemas comunes

| Síntoma | Causa probable |
|---|---|
| La página tarda ~1 minuto en cargar | El servidor estaba dormido (plan gratis). Normal |
| Logs: "El servidor no puede iniciar por problemas de configuración" | Falta o está mal una variable; la lista dice cuál |
| Logs: `password authentication failed` | `DB_USER` o `DB_PASSWORD` mal copiados |
| Logs: `getaddrinfo ENOTFOUND` | `DB_HOST` mal copiado |
| Logs: error de SSL / `connection is insecure` | Falta `DB_SSL=true` |
| Logs: `unable to verify the first certificate`, `self-signed certificate` o `does not match certificate's altnames` | No se pudo comprobar el certificado de la base. Revisa que `DB_HOST` sea exactamente el host de Neon. Con Neon no hace falta `DB_SSL_CA`; si persiste, avisa: **no** desactives la comprobación |
| Logs: `relation "..." does not exist` | No corriste las migraciones contra Neon (paso 2.2 u 8) |
| "Demasiados intentos fallidos" para todos a la vez | `TRUST_PROXY` mal ajustado (paso 5.2) |
| A mitad de mes Render suspende el servicio | Se agotaron las horas gratis del mes (750): no debería pasar con un solo servicio |
