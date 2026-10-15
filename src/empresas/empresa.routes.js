const requiereAdminCuenta = require("../shared/middlewares/requiere-admin-cuenta.middleware")
const { crear, listar, obtenerPorId, actualizar, desactivar, reactivar } = require("./empresa.controller")
const express = require("express")
const router = express.Router()


router.get("/", listar)
router.post("/", requiereAdminCuenta, crear)
router.get("/:id", obtenerPorId)
router.patch("/:id", actualizar)
router.patch("/:id/desactivar", requiereAdminCuenta, desactivar)
router.patch("/:id/reactivar", requiereAdminCuenta, reactivar)

module.exports = router