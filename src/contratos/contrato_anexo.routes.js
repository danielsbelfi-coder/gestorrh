const express = require("express")
const { crear, firmar } = require("./contrato_anexo.controller")
const router = express.Router({ mergeParams: true })

router.post("/", crear)
router.patch("/:id/firmar", firmar)

module.exports = router