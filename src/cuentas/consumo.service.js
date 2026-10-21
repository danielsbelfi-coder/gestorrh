const { QueryTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")
const { Usuario, Plan, Cuenta } = require("../shared/associations.js")
const { ValidationError, NotFoundError } = require("../shared/errors.js")

function limitesDelMes(anio, mes) {
    const mm = String(mes).padStart(2, "0")
    const ultimoDia = new Date(anio, mes, 0).getDate()

    return {
        primerDia: `${anio}-${mm}-01`,
        ultimoDia: `${anio}-${mm}-${String(ultimoDia).padStart(2, "0")}`
    }
}

async function contarTrabajadoresMes(cuentaId, anio, mes) {
    const { primerDia, ultimoDia } = limitesDelMes(anio, mes)

    const [fila] = await sequelize.query(`
        SELECT COUNT(DISTINCT (t.empresa_id, t.persona_id)) AS total
        FROM trabajadores t
        JOIN empresas e ON e.id = t.empresa_id
        WHERE e.cuenta_id = :cuentaId
            AND t.estado <> 'postulante'
            AND t.fecha_ingreso <= :ultimoDia
            AND (t.fecha_termino IS NULL OR t.fecha_termino >= :primerDia)
        `, {
        replacements: { cuentaId, primerDia, ultimoDia },
        type: QueryTypes.SELECT
    })

    return Number(fila.total)
}

async function contarUsuariosActivos(cuentaId) {
    return await Usuario.count({
        where: { cuenta_id: cuentaId, estado: "activo" }
    })
}

async function obtenerConsumo(cuentaId, anio, mes) {
    if (!Number.isInteger(anio) || !Number.isInteger(mes) || mes < 1 || mes > 12) {
        throw new ValidationError("Periodo inválido")
    }

    const cuenta = await Cuenta.findByPk(cuentaId, { include: Plan })
    if (!cuenta) {
        throw new NotFoundError("Cuenta no encontrada")
    }

    const plan = cuenta.Plan
    const trabajadores = await contarTrabajadoresMes(cuentaId, anio, mes)
    const usuarios = await contarUsuariosActivos(cuentaId)

    return {
        periodo: { anio, mes },
        plan: plan ? plan.nombre : null,
        trabajadores: {
            usados: trabajadores,
            limite: plan ? plan.max_trabajadores : null
        },
        usuarios: {
            usados: usuarios,
            limite: plan ? plan.usuarios_incluidos + cuenta.usuarios_adicionales : null
        }
    }
}

module.exports = {
    contarTrabajadoresMes,
    contarUsuariosActivos,
    obtenerConsumo
}