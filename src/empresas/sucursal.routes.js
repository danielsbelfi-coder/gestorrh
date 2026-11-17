// /api/empresas/:empresaId/sucursales. Va bajo /api/empresas (ruta de varias empresas): la ficha de una empresa
// puede abrirse aunque la empresa elegida en el menú sea otra.
const express = require("express")
const { listarSucursales, crearSucursal, actualizarSucursal } = require("./sucursal.service.js")

const router = express.Router({ mergeParams: true })

router.get("/", async (req, res) => {
    res.status(200).json(await listarSucursales(req.params.empresaId, req.empresasPermitidas))
})

router.post("/", async (req, res) => {
    res.status(201).json(await crearSucursal(req.params.empresaId, req.body, req.empresasPermitidas, req.usuario.id))
})

router.patch("/:id", async (req, res) => {
    res.status(200).json(await actualizarSucursal(req.params.empresaId, req.params.id, req.body, req.empresasPermitidas, req.usuario.id))
})

module.exports = router
