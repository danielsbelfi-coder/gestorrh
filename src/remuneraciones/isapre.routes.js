const express = require("express")
const { listar, obtenerPorId } = require("./isapre.controller.js")
const router = express.Router()


router.get("/", listar)
router.get("/:id", obtenerPorId)

module.exports = router