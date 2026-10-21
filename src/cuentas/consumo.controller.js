const { obtenerConsumo } = require("./consumo.service.js")

function periodoDesdeQuery(query) {
    const hoy = new Date()

    return {
        anio: query.anio === undefined ? hoy.getFullYear() : Number(query.anio),
        mes: query.mes === undefined ? hoy.getMonth() + 1 : Number(query.mes)
    }
}

async function consumoDeCuenta(req, res) {
    const { anio, mes } = periodoDesdeQuery(req.query)
    const consumo = await obtenerConsumo(req.params.id, anio, mes)
    res.json(consumo)
}

async function consumoPropio(req, res) {
    const { anio, mes } = periodoDesdeQuery(req.query)
    const consumo = await obtenerConsumo(req.usuario.cuenta_id, anio, mes)
    res.json(consumo)
}

module.exports = {
    consumoDeCuenta,
    consumoPropio
}