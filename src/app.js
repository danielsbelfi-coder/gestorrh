const express = require("express")
const helmet = require("helmet")
const path = require("path")
const app = express()
const empresaRoutes = require("./empresas/empresa.routes")
const personaRoutes = require("./trabajadores/persona.routes")
const trabajadorRoutes = require("./trabajadores/trabajador.routes")
const contratoRoutes = require("./contratos/contrato.routes")
const manejarErrores = require("./shared/middlewares/error.middleware")
const cargoRoutes = require("./empresas/cargo.routes.js")
const asistenciaRoutes = require('./asistencia/asistencia.routes.js')
const parametrosRoutes = require('./remuneraciones/parametro_legal.routes.js')
const periodoRemuneracionRoutes = require('./remuneraciones/periodo_remuneracion.routes.js')
const authRoutes = require("./auth/auth.routes.js")
const afpRoutes = require("./remuneraciones/afp.routes.js")
const isapreRoutes = require("./remuneraciones/isapre.routes.js")
const cuentaRoutes = require("./cuentas/cuenta.routes.js")
const verificarToken = require("./shared/middlewares/auth.middleware")
const requiereSoporte = require("./shared/middlewares/requiere-soporte.middleware.js")
const requiereComercial = require("./shared/middlewares/requiere-comercial.middleware.js")
const usuarioCuentaRoutes = require("./usuarios/usuario_cuenta.routes.js")
const requiereAdminCuenta = require("./shared/middlewares/requiere-admin-cuenta.middleware.js")
const empresaCuentaRouter = require("./empresas/empresa_cuenta.routes.js")
const consumoCuentaRoutes = require("./cuentas/consumo_cuenta.routes.js")
const planRoutes = require("./cuentas/plan.routes.js")
const conceptoRoutes = require("./remuneraciones/concepto_remuneracion.routes.js")
const variableRoutes = require("./remuneraciones/variable_periodo.routes.js")
const resumenAsistenciaRoutes = require("./asistencia/resumen_asistencia.routes.js")
const licenciaMedicaRoutes = require("./asistencia/licencia_medica.routes.js")
const finiquitoRoutes = require("./remuneraciones/finiquito.routes.js")
const mutualidadRoutes = require("./remuneraciones/mutualidad.routes.js")
const jornadaRoutes = require("./contratos/jornada.routes")
const feriadoRoutes = require("./calendario/feriado.routes")
const soporteRoutes = require("./soporte/soporte.routes")
const accesoCuentaRoutes = require("./soporte/acceso_cuenta.routes")

// Detrás de un proxy (Render, Railway, Nginx...) la IP real del cliente viene en X-Forwarded-For.
// TRUST_PROXY = cuántos proxies hay delante del servidor (normalmente 1). Sin definir, se ignora esa cabecera.
if (process.env.TRUST_PROXY) {
    app.set("trust proxy", Number(process.env.TRUST_PROXY))
}

app.use(helmet())
app.use(express.json({ limit: "1mb" }));

// Para que el hosting compruebe que el servidor está vivo. No requiere sesión ni toca la base de datos.
// "ip" es la IP con que el servidor ve a quien consulta (la suya propia): sirve para comprobar TRUST_PROXY al desplegar.
app.get("/api/salud", (req, res) => {
    res.status(200).json({ estado: "ok", ip: req.ip })
})

app.use("/api/empresas", verificarToken, empresaRoutes)
app.use("/api/personas", verificarToken, personaRoutes)
app.use("/api/trabajadores", verificarToken, trabajadorRoutes)
app.use("/api/contratos", verificarToken, contratoRoutes)
app.use("/api/cargos", verificarToken, cargoRoutes)
app.use("/api/asistencias", verificarToken, asistenciaRoutes)
app.use("/api/parametros-legales", verificarToken, parametrosRoutes)
app.use("/api/periodos-remuneracion", verificarToken, periodoRemuneracionRoutes)
app.use("/api/soporte", verificarToken, requiereSoporte, soporteRoutes)
app.use("/api/cuenta/accesos-soporte", verificarToken, requiereAdminCuenta, accesoCuentaRoutes)
app.use("/api/auth", authRoutes)
app.use("/api/afps", verificarToken, afpRoutes)
app.use("/api/isapres", verificarToken, isapreRoutes)
app.use("/api/cuentas", verificarToken, requiereComercial, cuentaRoutes)
app.use("/api/cuenta/usuarios", verificarToken, requiereAdminCuenta, usuarioCuentaRoutes)
app.use("/api/cuenta/empresas", verificarToken, requiereAdminCuenta, empresaCuentaRouter)
app.use("/api/cuenta/consumo", verificarToken, requiereAdminCuenta, consumoCuentaRoutes)
app.use("/api/planes", verificarToken, requiereComercial, planRoutes)
app.use("/api/conceptos", verificarToken, conceptoRoutes)
app.use("/api/variables", verificarToken, variableRoutes)
app.use("/api/resumenes-asistencia", verificarToken, resumenAsistenciaRoutes)
app.use("/api/licencias-medicas", verificarToken, licenciaMedicaRoutes)
app.use("/api/finiquitos", verificarToken, finiquitoRoutes)
app.use("/api/mutualidades", verificarToken, mutualidadRoutes)
app.use("/api/jornadas", verificarToken, jornadaRoutes)
app.use("/api/feriados", verificarToken, feriadoRoutes)

app.use(express.static(path.join(__dirname, "../public")))
app.use(manejarErrores)

module.exports = {
    app
}