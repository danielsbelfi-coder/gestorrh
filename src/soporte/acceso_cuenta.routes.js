const express = require("express")
const { listarAccesos, autorizar, revocar, registro } = require("./acceso_soporte.controller.js")
const router = express.Router()

router.get("/registro", registro)
router.get("/", listarAccesos)
router.post("/", autorizar)
router.patch("/:id/revocar", revocar)

module.exports = router
