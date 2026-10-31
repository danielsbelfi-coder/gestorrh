const express = require("express")
const { calcular, recalcular, eliminar, quitarTermino, obtener, emitir, pagar, documento } = require("./finiquito.controller.js")
const router = express.Router()

router.get("/", obtener)
router.post("/", calcular)
router.post("/quitar-termino", quitarTermino)
router.post("/:id/recalcular", recalcular)
router.post("/:id/eliminar", eliminar)
router.post("/:id/no-cobrar", async (req, res) => {
    const { noCobrarSaldo } = require("./saldo_relaciones.service.js")
    res.status(200).json(await noCobrarSaldo(req.params.id, req.body?.motivo, req.empresasPermitidas, req.usuario.id))
})
router.patch("/:id/emitir", emitir)
router.patch("/:id/pagar", pagar)
router.get("/:id/documento", documento)

module.exports = router