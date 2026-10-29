const express = require("express")
const c = require("./carga_familiar.controller.js")

// /api/personas/:personaId/tramos-asignacion
const tramosRouter = express.Router({ mergeParams: true })
tramosRouter.get("/", c.listarTramos)
tramosRouter.post("/", c.registrarTramo)
tramosRouter.delete("/:id", c.eliminarTramo)

// /api/personas/:personaId/cargas
const cargasRouter = express.Router({ mergeParams: true })
cargasRouter.get("/", c.listarCargas)
cargasRouter.post("/", c.registrarCarga)
cargasRouter.put("/:id", c.actualizarCarga)
cargasRouter.delete("/:id", c.eliminarCarga)

module.exports = { tramosRouter, cargasRouter }
