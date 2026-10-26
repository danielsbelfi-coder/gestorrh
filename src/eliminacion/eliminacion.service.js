const { QueryTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")
const { Eliminacion, Empresa } = require("../shared/associations.js")

const TRABAJADORES_DE_EMPRESA = "SELECT id FROM trabajadores WHERE empresa_id = :empresaId"

const PASOS_EMPRESA = [
    { tabla: "variables_periodo", filtro: `trabajador_id IN (${TRABAJADORES_DE_EMPRESA})` },
    { tabla: "resumenes_asistencia", filtro: `trabajador_id IN (${TRABAJADORES_DE_EMPRESA})` },
    { tabla: "licencias_medicas", filtro: `trabajador_id IN (${TRABAJADORES_DE_EMPRESA})` },
    { tabla: "asistencia_correcciones", filtro: `asistencia_id IN (SELECT id FROM asistencias WHERE trabajador_id IN (${TRABAJADORES_DE_EMPRESA}))` },
    { tabla: "asistencias", filtro: `trabajador_id IN (${TRABAJADORES_DE_EMPRESA})` },
    { tabla: "liquidacion_lineas", filtro: `liquidacion_id IN (SELECT id FROM liquidaciones WHERE trabajador_id IN (${TRABAJADORES_DE_EMPRESA}))` },
    { tabla: "liquidaciones", filtro: `trabajador_id IN (${TRABAJADORES_DE_EMPRESA})` },
    { tabla: "contratos_anexo", filtro: `contrato_id IN (SELECT id FROM contratos_trabajo WHERE trabajador_id IN (${TRABAJADORES_DE_EMPRESA}))` },
    { tabla: "contratos_trabajo", filtro: `trabajador_id IN (${TRABAJADORES_DE_EMPRESA})` },
    { tabla: "periodos_remuneracion", filtro: "empresa_id = :empresaId" },
    { tabla: "trabajadores", filtro: "empresa_id = :empresaId" },
    { tabla: "personas", filtro: "empresa_id = :empresaId" },
    { tabla: "cargos", filtro: "empresa_id = :empresaId" },
    { tabla: "conceptos_remuneracion", filtro: "empresa_id = :empresaId" },
    { tabla: "usuarios_empresas_roles", filtro: "empresa_id = :empresaId" },
    { tabla: "empresas", filtro: "id = :empresaId" }
]

async function borrarDatosEmpresa(empresaId, transaction) {
    const filas = {}

    for (const paso of PASOS_EMPRESA) {
        filas[paso.tabla] = await sequelize.query(
            `DELETE FROM "${paso.tabla}" WHERE ${paso.filtro}`,
            { replacements: { empresaId }, type: QueryTypes.BULKDELETE, transaction }
        )
    }

    return filas
}

async function borrarYRegistrarEmpresa(empresa, transaction) {
    const filas = await borrarDatosEmpresa(empresa.id, transaction)

    await Eliminacion.create({
        tipo: "empresa",
        registro_id: empresa.id,
        rut: empresa.rut,
        dv: empresa.dv,
        nombre: empresa.razon_social,
        filas_por_tabla: filas
    }, { transaction })

    return filas
}

async function eliminarEmpresa(empresa, simular = true) {
    const transaction = await sequelize.transaction()

    try {
        const filas = await borrarYRegistrarEmpresa(empresa, transaction)

        if (simular) {
            await transaction.rollback()
        } else {
            await transaction.commit()
        }

        return filas
    } catch (error) {
        await transaction.rollback()
        throw error
    }
}

async function eliminarCuenta(cuenta, simular = true) {
    const transaction = await sequelize.transaction()

    try {
        const empresas = await Empresa.findAll({
            where: {
                cuenta_id: cuenta.id
            }, transaction
        })

        const detalle = []

        for (const empresa of empresas) {
            const filas = await borrarYRegistrarEmpresa(empresa, transaction)
            detalle.push({ empresa: empresa.razon_social, filas })
        }

        const usuarios = await sequelize.query(
            `DELETE FROM "usuarios" WHERE cuenta_id = :cuentaId`,
            { replacements: { cuentaId: cuenta.id }, type: QueryTypes.BULKDELETE, transaction }
        )

        await cuenta.update({ fecha_eliminacion_datos: new Date().toISOString().slice(0, 10) }, { transaction })

        await Eliminacion.create({
            tipo: "cuenta",
            registro_id: cuenta.id,
            rut: cuenta.rut_titular,
            dv: cuenta.dv_titular,
            nombre: cuenta.nombre,
            filas_por_tabla: { empresas: empresas.length, usuarios }
        }, { transaction })

        if (simular) {
            await transaction.rollback()
        } else {
            await transaction.commit()
        }

        return { empresas: detalle, usuarios }
    } catch (error) {
        await transaction.rollback()
        throw error
    }
}

module.exports = {
    borrarDatosEmpresa,
    eliminarEmpresa,
    eliminarCuenta
}