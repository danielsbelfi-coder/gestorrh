const { QueryTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")
const { Usuario, Plan, Cuenta } = require("../shared/associations.js")
const { ValidationError, NotFoundError, ConflictError } = require("../shared/errors.js")

function limitesDelMes(anio, mes) {
    const mm = String(mes).padStart(2, "0")
    const ultimoDia = new Date(anio, mes, 0).getDate()

    return {
        primerDia: `${anio}-${mm}-01`,
        ultimoDia: `${anio}-${mm}-${String(ultimoDia).padStart(2, "0")}`
    }
}

function cuentaEnMes(trabajador, anio, mes) {
    const { primerDia, ultimoDia } = limitesDelMes(anio, mes)

    return trabajador.estado !== "postulante"
        && trabajador.fecha_ingreso !== null
        && trabajador.fecha_ingreso <= ultimoDia
        && (trabajador.fecha_termino === null || trabajador.fecha_termino >= primerDia)
}

function mesesQueSuma(antes, despues) {
    if (despues.estado === "postulante" || despues.fecha_ingreso === null) {
        return []
    }

    let anio = Number(despues.fecha_ingreso.slice(0, 4))
    let mes = Number(despues.fecha_ingreso.slice(5, 7))

    const hoy = new Date()
    const fin = Math.max(hoy.getFullYear() * 12 + hoy.getMonth() + 1, anio * 12 + mes)

    const meses = []

    while (anio * 12 + mes <= fin) {
        if (cuentaEnMes(despues, anio, mes) && !cuentaEnMes(antes, anio, mes)) {
            meses.push({ anio, mes })
        }

        mes++
        if (mes > 12) {
            mes = 1
            anio++
        }
    }

    return meses
}


async function contarTrabajadoresMes(cuentaId, anio, mes, transaction) {
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
        type: QueryTypes.SELECT,
        transaction
    })

    return Number(fila.total)
}

async function conLimiteTrabajadores(cuentaId, meses, aplicarCambio) {
    return await sequelize.transaction(async (transaction) => {
        const cuenta = await Cuenta.findByPk(cuentaId, { include: Plan, transaction })

        if (!cuenta.Plan) {
            throw new ConflictError("La cuenta no tiene un plan asignado")
        }

        const conteosAntes = []
        for (const periodo of meses) {
            conteosAntes.push(await contarTrabajadoresMes(cuentaId, periodo.anio, periodo.mes, transaction))
        }

        const resultado = await aplicarCambio(transaction)

        for (let i = 0; i < meses.length; i++) {
            const { anio, mes } = meses[i]
            const conteoDespues = await contarTrabajadoresMes(cuentaId, anio, mes, transaction)

            if (conteoDespues > conteosAntes[i] && conteoDespues > cuenta.Plan.max_trabajadores) {
                throw new ConflictError(`Se alcanzó el límite de trabajadores del plan para ${mes}/${anio}`)
            }
        }

        return resultado
    })
}

async function contarUsuariosActivos(cuentaId) {
    return await Usuario.count({
        where: { cuenta_id: cuentaId, estado: "activo" }
    })
}

async function verificarCupoUsuarios(cuentaId) {
    const cuenta = await Cuenta.findByPk(cuentaId, { include: Plan })

    if (!cuenta.Plan) {
        throw new ConflictError("La cuenta no tiene un plan asignado")
    }

    const activos = await contarUsuariosActivos(cuentaId)
    const limite = cuenta.Plan.usuarios_incluidos + cuenta.usuarios_adicionales

    if (activos >= limite) {
        throw new ConflictError("Se alcanzó el límite de usuarios del plan")
    }
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
    obtenerConsumo,
    mesesQueSuma,
    conLimiteTrabajadores,
    verificarCupoUsuarios
}