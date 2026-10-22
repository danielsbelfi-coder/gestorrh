const { crearCuenta, listarCuentas, suspenderCuenta, cancelarCuenta, reactivarCuenta, cambiarPlanCuenta, listarPlanes } = require("./cuenta.service");


async function crear(req, res) {
    const nuevaCuenta = await crearCuenta(req.body ?? {});

    res.status(201).json(nuevaCuenta)
}

async function listar(req, res) {
    const listaCuenta = await listarCuentas()
    res.status(200).json(listaCuenta)
}

async function suspender(req, res) {
    const cuentaSuspendida = await suspenderCuenta(req.params.id)
    res.status(200).json(cuentaSuspendida)
}

async function cancelar(req, res) {
    const cuentaCancelada = await cancelarCuenta(req.params.id, req.body?.confirmar)
    res.status(200).json(cuentaCancelada)
}

async function reactivar(req, res) {
    const cuentaActivada = await reactivarCuenta(req.params.id)
    res.status(200).json(cuentaActivada)
}

async function cambiarPlan(req, res) {
    const cuenta = await cambiarPlanCuenta(req.params.id, req.body ?? {})
    res.json(cuenta)
}

async function planes(req, res) {
    const lista = await listarPlanes()
    res.status(200).json(lista)
}

module.exports = {
    crear,
    listar,
    suspender,
    cancelar,
    reactivar,
    cambiarPlan,
    planes
}