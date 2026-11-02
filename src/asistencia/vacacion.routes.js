const express = require("express")
const s = require("./vacacion.service.js")
const router = express.Router()

// Vacaciones (feriado anual). Ver «Módulo de vacaciones, parte 1» en el SPEC.
router.get("/", async (req, res) => {
    res.status(200).json(await s.listarVacaciones(req.empresasPermitidas))
})
router.post("/", async (req, res) => {
    res.status(201).json(await s.crearVacacion(req.body ?? {}, req.empresasPermitidas, req.usuario.id))
})
router.get("/saldo/:trabajadorId", async (req, res) => {
    res.status(200).json(await s.saldoTrabajador(req.params.trabajadorId, req.empresasPermitidas))
})
router.put("/saldo-inicial/:trabajadorId", async (req, res) => {
    res.status(200).json(await s.guardarSaldoInicial(req.params.trabajadorId, req.body ?? {}, req.empresasPermitidas, req.usuario.id))
})
router.put("/progresivo/:personaId", async (req, res) => {
    res.status(200).json(await s.guardarProgresivo(req.params.personaId, req.body ?? {}, req.empresasPermitidas, req.usuario.id))
})
router.patch("/:id/aprobar", async (req, res) => {
    res.status(200).json(await s.aprobarVacacion(req.params.id, req.empresasPermitidas, req.usuario.id))
})
router.patch("/:id/rechazar", async (req, res) => {
    res.status(200).json(await s.rechazarVacacion(req.params.id, req.body?.motivo, req.empresasPermitidas, req.usuario.id))
})
router.patch("/:id/anular", async (req, res) => {
    res.status(200).json(await s.anularVacacion(req.params.id, req.body?.motivo, req.empresasPermitidas, req.usuario.id))
})
router.delete("/:id", async (req, res) => {
    await s.eliminarVacacion(req.params.id, req.empresasPermitidas, req.usuario.id)
    res.status(204).end()
})

module.exports = router
