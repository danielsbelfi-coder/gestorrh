const express = require("express")
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
const usuarioRoutes = require("./usuarios/usuario.routes.js")
const authRoutes = require("./auth/auth.routes.js")
const afpRoutes = require("./remuneraciones/afp.routes.js")
const isapreRoutes = require("./remuneraciones/isapre.routes.js")
const verificarToken = require("./shared/middlewares/auth.middleware")
app.use(express.json());

app.use("/api/empresas", verificarToken, empresaRoutes)
app.use("/api/personas", verificarToken, personaRoutes)
app.use("/api/trabajadores", verificarToken, trabajadorRoutes)
app.use("/api/contratos", verificarToken, contratoRoutes)
app.use("/api/cargos", verificarToken, cargoRoutes)
app.use("/api/asistencias", verificarToken, asistenciaRoutes)
app.use("/api/parametros-legales", verificarToken, parametrosRoutes)
app.use("/api/periodos-remuneracion", verificarToken, periodoRemuneracionRoutes)
app.use("/api/usuarios", verificarToken, usuarioRoutes)
app.use("/api/auth", authRoutes)
app.use("/api/afps", verificarToken, afpRoutes)
app.use("/api/isapres", verificarToken, isapreRoutes)
app.use(express.static(path.join(__dirname, "../public")))

app.use(manejarErrores)

module.exports = {
    app
}