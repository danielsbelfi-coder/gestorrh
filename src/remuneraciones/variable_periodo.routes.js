const express = require("express")
const { listar, crear, editar, eliminar, aprobar, devolver, importar, plantillaImportacion } = require("./variable_periodo.controller.js")

const router = express.Router()

router.get("/", listar)
router.get("/importar/plantilla.csv", plantillaImportacion)
router.post("/importar", importar)
router.post("/", crear)
router.patch("/:id", editar)
router.delete("/:id", eliminar)
router.patch("/:id/aprobar", aprobar)
router.patch("/:id/devolver", devolver)

module.exports = router