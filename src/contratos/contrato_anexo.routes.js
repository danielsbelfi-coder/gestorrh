const express = require("express")
const { crear, corregir, descartar, fechaFirma, firmar, listar, documento } = require("./contrato_anexo.controller")
const router = express.Router({ mergeParams: true })

router.post("/", crear)
router.patch("/:id/firmar", firmar)
router.patch("/:id/descartar", descartar)
router.patch("/:id/fecha-firma", fechaFirma)
router.patch("/:id", corregir)
router.get("/:id/documento", documento)
router.get("/", listar)


module.exports = router