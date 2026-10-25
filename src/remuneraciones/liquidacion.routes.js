const express = require("express")
const { crear, listar, obtenerPorId, recalcular } = require("./liquidacion.controller")
const router = express.Router({mergeParams: true})



router.post("/", crear)
router.get("/", listar)
router.get("/:id", obtenerPorId)
router.post("/:id/recalcular", recalcular)

module.exports = router