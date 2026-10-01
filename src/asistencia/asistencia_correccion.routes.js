const express = require("express")
const { crear, aprobar } = require("./asistencia_correccion.controller")
const router = express.Router({ mergeParams: true })

router.post("/", crear)
router.patch("/:id/aprobar", aprobar)

module.exports = router