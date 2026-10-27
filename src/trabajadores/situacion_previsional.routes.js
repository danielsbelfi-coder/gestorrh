const express = require("express")
const { crear, listar, eliminar } = require("./situacion_previsional.controller.js")
const router = express.Router({ mergeParams: true })

router.get("/", listar)
router.post("/", crear)
router.delete("/:id", eliminar)

module.exports = router