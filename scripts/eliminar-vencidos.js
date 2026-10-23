const { Op } = require("sequelize")
const { sequelize } = require("../src/shared/database.js")
const { Empresa, Cuenta } = require("../src/shared/associations.js")
const { eliminarEmpresa, eliminarCuenta } = require("../src/eliminacion/eliminacion.service.js")
const { DIAS_CONSERVACION_DATOS } = require("../src/shared/constantes.js")

function fechaLimite() {
    const fecha = new Date()
    fecha.setDate(fecha.getDate() - DIAS_CONSERVACION_DATOS)
    return fecha.toISOString().slice(0, 10)
}

function totalFilas(filas) {
    return Object.values(filas).reduce((suma, cantidad) => suma + cantidad, 0)
}

async function main() {
    const simular = !process.argv.includes("--confirmar")
    const limite = fechaLimite()
    let errores = 0

    console.log(simular ? "MODO SIMULACIÓN: no se borrará nada." : "MODO BORRADO REAL.")
    console.log(`Vence lo desactivado o cancelado el ${limite} o antes.`)

    const cuentas = await Cuenta.findAll({
        where: {
            estado: "cancelada",
            fecha_cancelacion: { [Op.lte]: limite },
            fecha_eliminacion_datos: null
        }
    })

    for (const cuenta of cuentas) {
        try {
            const resultado = await eliminarCuenta(cuenta, simular)
            console.log(`Cuenta ${cuenta.id} "${cuenta.nombre}": ${resultado.empresas.length} empresas y ${resultado.usuarios} usuarios`)
        } catch (error) {
            errores++
            console.error(`Error en la cuenta ${cuenta.id}: ${error.message}`)
        }
    }

    const idsCuentas = new Set(cuentas.map((cuenta) => cuenta.id))

    const empresas = (await Empresa.findAll({
        where: {
            estado: "inactiva",
            fecha_desactivacion: { [Op.lte]: limite }
        }
    })).filter((empresa) => !idsCuentas.has(empresa.cuenta_id))

    for (const empresa of empresas) {
        try {
            const filas = await eliminarEmpresa(empresa, simular)
            console.log(`Empresa ${empresa.id} "${empresa.razon_social}": ${totalFilas(filas)} filas`)
        } catch (error) {
            errores++
            console.error(`Error en la empresa ${empresa.id}: ${error.message}`)
        }
    }

    if (cuentas.length === 0 && empresas.length === 0) {
        console.log("No hay datos vencidos.")
    }

    await sequelize.close()

    if (errores > 0) {
        process.exitCode = 1
    }

}

main()