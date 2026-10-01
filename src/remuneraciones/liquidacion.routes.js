const express = require("express")
const { crear, listar, obtenerPorId } = require("./liquidacion.controller")
const router = express.Router({mergeParams: true})



router.post("/", crear)
router.get("/", listar)
router.get("/:id", obtenerPorId)

module.exports = router