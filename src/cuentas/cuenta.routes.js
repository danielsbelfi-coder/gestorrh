const express = require("express")
const { crear, listar, suspender, cancelar, reactivar } = require("./cuenta.controller")
const { consumoDeCuenta } = require("./consumo.controller")
const router = express.Router()

router.post("/", crear)
router.get("/", listar)
router.patch("/:id/suspender", suspender)
router.patch("/:id/cancelar", cancelar)
router.patch("/:id/reactivar", reactivar)
router.get("/:id/consumo", consumoDeCuenta)

module.exports = router