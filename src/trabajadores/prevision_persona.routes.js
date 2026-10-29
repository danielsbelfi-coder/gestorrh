const express = require("express")
const { listar, registrar, eliminar } = require("./prevision_persona.controller.js")
const router = express.Router({ mergeParams: true })

router.get("/", listar)
router.post("/", registrar)
router.delete("/:id", eliminar)

module.exports = router
