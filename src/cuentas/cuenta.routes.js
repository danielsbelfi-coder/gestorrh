const express = require("express")
const { crear, corregirAdmin, listar, suspender, cancelar, reactivar, cambiarPlan } = require("./cuenta.controller")
const { consumoDeCuenta } = require("./consumo.controller")
const router = express.Router()

router.post("/", crear)
router.get("/", listar)
router.patch("/:id/suspender", suspender)
router.patch("/:id/cancelar", cancelar)
router.patch("/:id/reactivar", reactivar)
router.get("/:id/consumo", consumoDeCuenta)
router.patch("/:id/plan", cambiarPlan)
router.patch("/:id/admin-inicial", corregirAdmin)

module.exports = router