const express = require("express")
const { crear, firmar, listar, documento } = require("./contrato_anexo.controller")
const router = express.Router({ mergeParams: true })

router.post("/", crear)
router.patch("/:id/firmar", firmar)
router.get("/:id/documento", documento)
router.get("/", listar)


module.exports = router