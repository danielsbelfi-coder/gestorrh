const test = require("node:test")
const assert = require("node:assert/strict")
const r = require("../src/auth/reglas_sesion.js")

const MIN = 60 * 1000
const ahora = new Date("2026-10-29T15:00:00Z")
const antes = (minutos) => new Date(ahora.getTime() - minutos * MIN)
const despues = (minutos) => new Date(ahora.getTime() + minutos * MIN)

const cliente = { rol_plataforma: null, es_admin_cuenta: false, totp_activo: false, debe_cambiar_password: false }
const admin = { ...cliente, es_admin_cuenta: true }
const soporte = { ...cliente, rol_plataforma: "soporte" }
const comercial = { ...cliente, rol_plataforma: "comercial" }

test("tokens: 256 bits al azar y hash SHA-256 en hexadecimal", () => {
    const token = r.generarToken()
    assert.match(token, /^[A-Za-z0-9_-]{43}$/)
    assert.notEqual(r.generarToken(), token)
    assert.match(r.hashToken(token), /^[0-9a-f]{64}$/)
    assert.equal(r.hashToken(token), r.hashToken(token))
})

test("cookie: __Host- y Secure solo en producción", () => {
    assert.equal(r.nombreCookie(true), "__Host-gestorrh")
    assert.equal(r.nombreCookie(false), "gestorrh")
    assert.deepEqual(r.opcionesCookie(true), { httpOnly: true, sameSite: "strict", path: "/", secure: true })
    assert.equal(r.opcionesCookie(false).secure, false)
})

test("2FA obligatorio para soporte, comercial y admins de cuenta; voluntario para el resto", () => {
    assert.equal(r.requiere2fa(soporte), true)
    assert.equal(r.requiere2fa(comercial), true)
    assert.equal(r.requiere2fa(admin), true)
    assert.equal(r.requiere2fa(cliente), false)
    assert.equal(r.debeActivar2fa(admin), true)
    assert.equal(r.debeActivar2fa({ ...admin, totp_activo: true }), false)
    assert.equal(r.debeActivar2fa(cliente), false)
})

test("inactividad: 60 minutos clientes, 30 minutos plataforma", () => {
    assert.equal(r.minutosInactividad(cliente), 60)
    assert.equal(r.minutosInactividad(admin), 60)
    assert.equal(r.minutosInactividad(soporte), 30)
    assert.equal(r.minutosInactividad(comercial), 30)
})

test("expiración: 8 horas la sesión normal, 5 minutos la pendiente de 2FA", () => {
    assert.equal(r.expiracionNueva("activa", ahora).getTime(), despues(8 * 60).getTime())
    assert.equal(r.expiracionNueva("pendiente_2fa", ahora).getTime(), despues(5).getTime())
})

test("motivoInvalidez: vencida, inactiva o vigente", () => {
    const sesion = (expira, ultimoUso) => ({ expira_en: expira, ultimo_uso_en: ultimoUso })

    assert.equal(r.motivoInvalidez(sesion(despues(60), antes(10)), cliente, ahora), null)
    assert.equal(r.motivoInvalidez(sesion(ahora, antes(1)), cliente, ahora), "vencida")
    assert.equal(r.motivoInvalidez(sesion(antes(1), antes(1)), cliente, ahora), "vencida")
    // Cliente: 59 minutos sin uso sigue; 60 se cierra.
    assert.equal(r.motivoInvalidez(sesion(despues(60), antes(59)), cliente, ahora), null)
    assert.equal(r.motivoInvalidez(sesion(despues(60), antes(60)), cliente, ahora), "inactiva")
    // Soporte: 30 minutos.
    assert.equal(r.motivoInvalidez(sesion(despues(60), antes(29)), soporte, ahora), null)
    assert.equal(r.motivoInvalidez(sesion(despues(60), antes(30)), soporte, ahora), "inactiva")
    // Las fechas pueden venir como texto.
    assert.equal(r.motivoInvalidez(sesion(despues(60).toISOString(), antes(1).toISOString()), cliente, ahora), null)
})

test("ultimo_uso_en se actualiza como mucho una vez por minuto", () => {
    assert.equal(r.debeActualizarUltimoUso({ ultimo_uso_en: antes(0.5) }, ahora), false)
    assert.equal(r.debeActualizarUltimoUso({ ultimo_uso_en: antes(1) }, ahora), true)
})

test("estadoDeAcceso: 2FA pendiente, luego cambiar contraseña, luego inscribir 2FA", () => {
    const pendiente = { estado: "pendiente_2fa" }
    const activa = { estado: "activa" }

    assert.equal(r.estadoDeAcceso(pendiente, { ...admin, totp_activo: true, debe_cambiar_password: true }), "pendiente_2fa")
    assert.equal(r.estadoDeAcceso(activa, { ...admin, debe_cambiar_password: true }), "cambiar_password")
    assert.equal(r.estadoDeAcceso(activa, admin), "activar_2fa")
    assert.equal(r.estadoDeAcceso(activa, { ...admin, totp_activo: true }), "normal")
    assert.equal(r.estadoDeAcceso(activa, cliente), "normal")
})

test("rutaPermitida según el paso pendiente", () => {
    // Normal: todo.
    assert.equal(r.rutaPermitida("normal", "GET", "/api/empresas"), true)

    // Pendiente de 2FA: solo verificar o salir, ni siquiera los datos del usuario.
    assert.equal(r.rutaPermitida("pendiente_2fa", "POST", "/api/auth/2fa/verificar"), true)
    assert.equal(r.rutaPermitida("pendiente_2fa", "post", "/api/auth/logout"), true)
    assert.equal(r.rutaPermitida("pendiente_2fa", "GET", "/api/auth/usuario"), false)
    assert.equal(r.rutaPermitida("pendiente_2fa", "GET", "/api/empresas"), false)

    // Cambiar contraseña.
    assert.equal(r.rutaPermitida("cambiar_password", "PATCH", "/api/auth/cambiar-password"), true)
    assert.equal(r.rutaPermitida("cambiar_password", "GET", "/api/auth/usuario?x=1"), true)
    assert.equal(r.rutaPermitida("cambiar_password", "POST", "/api/auth/2fa/inscripcion/iniciar"), false)
    assert.equal(r.rutaPermitida("cambiar_password", "GET", "/api/empresas"), false)

    // Inscribir 2FA.
    assert.equal(r.rutaPermitida("activar_2fa", "POST", "/api/auth/2fa/inscripcion/iniciar"), true)
    assert.equal(r.rutaPermitida("activar_2fa", "POST", "/api/auth/2fa/inscripcion/confirmar"), true)
    assert.equal(r.rutaPermitida("activar_2fa", "GET", "/api/empresas"), false)
    assert.equal(r.rutaPermitida("activar_2fa", "PATCH", "/api/auth/cambiar-password"), false)
    // Un método distinto en la misma ruta no pasa.
    assert.equal(r.rutaPermitida("activar_2fa", "GET", "/api/auth/2fa/inscripcion/iniciar"), false)
    // Estado desconocido: nada.
    assert.equal(r.rutaPermitida("otro", "GET", "/api/auth/usuario"), false)

    assert.match(r.mensajeDeEstado("activar_2fa"), /dos pasos/)
    assert.equal(r.mensajeDeEstado("normal"), null)
})

test("métodos que escriben", () => {
    for (const m of ["POST", "PUT", "PATCH", "DELETE", "post"]) assert.equal(r.metodoQueEscribe(m), true, m)
    for (const m of ["GET", "HEAD", "OPTIONS", "get"]) assert.equal(r.metodoQueEscribe(m), false, m)
})

test("origenPermitido: Origin igual al de la app, o Sec-Fetch-Site same-origin si no viene Origin", () => {
    const app = "https://gestorrh.onrender.com"
    assert.equal(r.origenPermitido({ origin: "https://gestorrh.onrender.com" }, app), true)
    assert.equal(r.origenPermitido({ origin: "https://GestorRH.onrender.com/" }, app), true)
    assert.equal(r.origenPermitido({ origin: "https://otro-sitio.com" }, app), false)
    assert.equal(r.origenPermitido({ origin: "https://gestorrh.onrender.com.malo.com" }, app), false)
    assert.equal(r.origenPermitido({ origin: "http://gestorrh.onrender.com" }, app), false)
    assert.equal(r.origenPermitido({ origin: "null" }, app), false)
    // Origin presente gana, aunque Sec-Fetch-Site diga same-origin.
    assert.equal(r.origenPermitido({ origin: "https://otro-sitio.com", secFetchSite: "same-origin" }, app), false)
    assert.equal(r.origenPermitido({ secFetchSite: "same-origin" }, app), true)
    assert.equal(r.origenPermitido({ secFetchSite: "cross-site" }, app), false)
    assert.equal(r.origenPermitido({}, app), false)
    // Sin APP_ORIGEN configurado, ningún Origin calza.
    assert.equal(r.origenPermitido({ origin: "https://gestorrh.onrender.com" }, ""), false)
})

test("csrfValido compara en tiempo constante y rechaza vacíos", () => {
    const token = r.generarToken()
    assert.equal(r.csrfValido(token, token), true)
    assert.equal(r.csrfValido(r.generarToken(), token), false)
    assert.equal(r.csrfValido(token.slice(1), token), false)
    assert.equal(r.csrfValido("", ""), false)
    assert.equal(r.csrfValido(undefined, token), false)
    assert.equal(r.csrfValido(token, null), false)
    assert.equal(r.csrfValido(["x"], "x"), false)
})
