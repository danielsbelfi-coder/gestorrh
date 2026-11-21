const express = require("express")
const c = require("./turno_conduccion.controller.js")
const router = express.Router()

// Turnos de conducción del art. 25 (paquete V).
router.get("/", c.listar)
router.get("/trabajadores", c.trabajadores)
router.post("/", c.crear)
router.post("/aprobar-mes", c.aprobarMes)
router.patch("/:id", c.actualizar)
router.patch("/:id/aprobar", c.aprobar)
router.delete("/:id", c.eliminar)

const tipos = express.Router()
tipos.get("/", c.listarTipos)
tipos.post("/", c.crearTipo)
tipos.patch("/:id", c.actualizarTipo)

module.exports = { turnos: router, tipos }
