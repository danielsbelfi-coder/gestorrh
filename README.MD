# GestorRH

Sistema de gestión de RRHH y remuneraciones para empresas en Chile, pensado como servicio (SaaS) para varias cuentas y empresas.
Cubre personas y trabajadores, contratos y anexos, jornadas, feriados, libro de asistencia, licencias médicas,
variables de remuneración, liquidaciones de sueldo, archivos Previred y LRE, y finiquitos.

> Estado: **prueba cerrada**. Usar solo con datos ficticios.

## Tecnología

- Backend: Node.js 22, Express 5, Sequelize 6, PostgreSQL
- Frontend: HTML, CSS y JavaScript sin framework (carpeta `public/`)
- Autenticación: JWT. Seguridad HTTP con helmet. Contraseñas con bcrypt.

## Requisitos

- Node.js 22 o superior
- PostgreSQL 14 o superior

## Instalación local

```bash
git clone https://github.com/danielsbelfi-coder/gestorrh.git
cd gestorrh
npm install
cp .env.example .env      # completar valores (ver más abajo)
```

Crear la base de datos vacía en PostgreSQL (por ejemplo `gestorrh`) y luego:

```bash
npx sequelize-cli db:migrate     # crea las tablas
npm run sembrar-base             # carga datos base (roles, AFP, Isapres, UF/UTM, impuestos, conceptos, planes, feriados)
npm run crear-usuario-plataforma -- soporte soporte@tudominio.cl "Nombre Soporte"
npm run crear-usuario-plataforma -- comercial comercial@tudominio.cl "Nombre Comercial"
node server.js                   # http://localhost:3000
```

Cada usuario de plataforma recibe una contraseña inicial aleatoria que se muestra **una sola vez**; el sistema obliga a cambiarla en el primer ingreso.

### Variables de entorno

| Variable | Descripción |
|---|---|
| `PORT` | Puerto del servidor (3000 por defecto) |
| `NODE_ENV` | `production` en la nube |
| `TRUST_PROXY` | Cantidad de proxies delante del servidor (1 en Render, Railway, Fly o Heroku). Necesaria para que el límite de intentos use la IP real |
| `DB_DIALECT` | `postgres` |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Conexión a PostgreSQL |
| `DB_SSL` | `true` si la base administrada exige conexión cifrada |
| `JWT_SECRET` | Mínimo 32 caracteres aleatorios. `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `JWT_EXPIRES_IN` | Duración de la sesión, por ejemplo `8h` |

Al iniciar, el servidor revisa la configuración y **no arranca** si falta algo grave (clave débil, sin vencimiento de sesión, sin contraseña de BD en producción).

> **Nunca ejecutes `npx sequelize-cli db:seed:all`.** Incluye usuarios de prueba con contraseñas conocidas. Para cargar los datos base usa siempre `npm run sembrar-base`. Para un seeder puntual: `npx sequelize-cli db:seed --seed archivo.js`.

## Roles

| Rol | Qué hace |
|---|---|
| Comercial (plataforma) | Crea cuentas de clientes con su administrador y gestiona planes |
| Soporte (plataforma) | Mantiene parámetros globales (UF, UTM, topes, feriados) y asiste a los clientes |
| ADMIN de empresa | Control total de su empresa. Firma contratos y anexos, aprueba asistencia, variables y resúmenes |
| JEFE_RRHH | Igual que RRHH, y además firma y aprueba |
| RRHH | Ingresa y prepara la información; no firma ni aprueba |

Los botones se ven igual para todos los roles; si falta permiso, el sistema responde con un aviso (403).

## Despliegue en la nube (resumen)

1. Base PostgreSQL administrada, con respaldos automáticos activados.
2. Servicio web Node con `npm install` como build y `node server.js` como arranque. Variables según la tabla anterior, con `NODE_ENV=production` y `TRUST_PROXY=1`.
3. HTTPS lo entrega el proveedor. Comprobación de salud: `GET /api/salud`.
4. Primera vez: `npx sequelize-cli db:migrate`, `npm run sembrar-base` y crear los usuarios de plataforma.
5. Cada mes, soporte abre el período de parámetros (UF del último día del mes, UTM) y mantiene los feriados.

## Pruebas

```bash
npm test
```

Las pruebas cubren las reglas de cálculo (remuneraciones, jornadas, libro de asistencia, feriados, configuración y límite de intentos).

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run sembrar-base` | Datos base en una base nueva y vacía |
| `npm run crear-usuario-plataforma -- <soporte\|comercial> <correo> "<nombre>"` | Crea usuarios de plataforma |
| `npm run abrir-parametros` | Abre los parámetros del mes siguiente |
| `npm run eliminar-vencidos` | Simula la eliminación de datos vencidos (con `--confirmar` borra de verdad) |

## Estructura

```
server.js        arranque (revisa configuración)
src/             backend por módulo: auth, cuentas, empresas, trabajadores, contratos,
                 asistencia, calendario, remuneraciones, eliminacion, exportacion, shared
public/          frontend (HTML, css, js)
migrations/      esquema de la base de datos
seeders/         datos base
scripts/         utilidades de línea de comandos
tests/           pruebas automáticas (node --test)
docs/            tutorial de uso
```

## Seguridad y datos personales

- Límite de intentos de login: 5 fallos por correo en 15 minutos bloquean 15 minutos; además hay un límite por IP.
- Los datos de trabajadores son datos personales (Ley 21.719, vigente desde el 01-12-2026). Soporte puede leer los datos de todas las empresas; el registro de accesos de soporte está pendiente antes de operar con datos reales.
- Reporte de problemas de seguridad: por mensaje directo al responsable, no en issues públicos.

## Limitaciones conocidas

Módulo de pendientes por rol, carga masiva de marcas, informes, DJ 1887, nómina bancaria, carga automática de UF/UTM y documentación de la API (OpenAPI).
