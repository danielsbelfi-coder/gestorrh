// Pendientes: todo lo que espera firma o aprobación en las empresas del usuario. Ver «Módulo Pendientes» en el SPEC.
const { Op } = require("sequelize")
const {
    ContratoTrabajo, ContratoAnexo, Asistencia, AsistenciaCorreccion, VariablePeriodo, ResumenAsistencia, Liquidacion, Finiquito,
    PeriodoRemuneracion, Trabajador, Persona, Empresa, ConceptoRemuneracion, UsuarioEmpresaRol, Rol
} = require("../shared/associations.js")
const { PERMISOS, ROLES_ASIGNABLES } = require("../shared/permisos.js")
const armar = require("./armar_pendientes.js")

const PERSONA = { model: Persona, attributes: ["nombres", "apellido_paterno", "apellido_materno"] }
const EMPRESA = { model: Empresa, attributes: ["razon_social", "nombre_fantasia"] }

// El trabajador (con su nombre y su empresa), filtrado por las empresas que el usuario puede ver.
function trabajadorDe(empresas) {
    return { model: Trabajador, attributes: ["id", "empresa_id"], where: { empresa_id: { [Op.in]: empresas } }, required: true, include: [PERSONA, EMPRESA] }
}

function periodoAbiertoDe(empresas) {
    return { model: PeriodoRemuneracion, attributes: ["id", "empresa_id", "mes", "anio"], where: { empresa_id: { [Op.in]: empresas }, estado: "abierto" }, required: true }
}

// Las marcas de un mes cuyo periodo ya está cerrado no se pueden aprobar: no se muestran.
async function mesesCerrados(empresas) {
    const periodos = await PeriodoRemuneracion.findAll({ where: { empresa_id: { [Op.in]: empresas }, estado: "cerrado" }, attributes: ["empresa_id", "mes", "anio"] })
    return new Set(periodos.map((p) => `${p.empresa_id}-${p.anio}-${String(p.mes).padStart(2, "0")}`))
}

// Liquidaciones de periodos abiertos cuyo saldo de pago en exceso cambió después del cálculo.
async function saldosDesactualizados(empresas) {
    const { saldoDesactualizado } = require("../remuneraciones/liquidacion.service.js")
    const liquidaciones = await Liquidacion.findAll({
        where: { vigente: true },
        attributes: ["id", "trabajador_id", "estado", "detalle_calculo"],
        include: [periodoAbiertoDe(empresas), trabajadorDe(empresas)]
    })
    const resultado = []
    for (const liquidacion of liquidaciones) {
        const saldo = await saldoDesactualizado(liquidacion, liquidacion.PeriodoRemuneracion)
        if (saldo.desactualizado) {
            resultado.push({ liquidacion, saldo })
        }
    }
    return resultado
}

// Finiquitos calculados o emitidos (mes del término abierto) cuyo saldo de pago en exceso ya no coincide con la liquidación.
async function finiquitosDesactualizados(empresas) {
    const { estadoSaldoFiniquito } = require("../remuneraciones/finiquito.service.js")
    const finiquitos = await Finiquito.findAll({
        where: { estado: { [Op.in]: ["calculado", "emitido"] } },
        include: [{ ...trabajadorDe(empresas), attributes: ["id", "empresa_id", "fecha_termino"] }]
    })
    const resultado = []
    for (const finiquito of finiquitos) {
        const saldo = await estadoSaldoFiniquito(finiquito, finiquito.Trabajador)
        if (saldo.desactualizado && saldo.periodoAbierto) {
            resultado.push({ finiquito, saldo })
        }
    }
    return resultado
}

async function rolesPorEmpresa(usuarioId) {
    const vinculos = await UsuarioEmpresaRol.findAll({
        where: { usuario_id: usuarioId, estado: "activo" },
        include: [{ model: Rol, attributes: ["codigo"], where: { codigo: ROLES_ASIGNABLES }, required: true }]
    })
    return Object.fromEntries(vinculos.map((vinculo) => [vinculo.empresa_id, vinculo.Rol.codigo]))
}

async function listarPendientes(usuario, empresasPermitidas) {
    const empresas = [...new Set(empresasPermitidas ?? [])]
    if (empresas.length === 0) {
        return { items: [], total: 0, accionables: 0 }
    }

    const [contratos, anexos, marcas, correcciones, variables, resumenes, cerrados, roles, saldos, finiquitos] = await Promise.all([
        ContratoTrabajo.findAll({ where: { estado_firma: "pendiente", estado: "vigente" }, include: [trabajadorDe(empresas)] }),
        ContratoAnexo.findAll({
            where: { estado_firma: "pendiente" },
            include: [{ model: ContratoTrabajo, attributes: ["id"], where: { estado: { [Op.ne]: "anulado" } }, required: true, include: [trabajadorDe(empresas)] }]
        }),
        Asistencia.findAll({ where: { estado_aprobacion: "pendiente" }, include: [trabajadorDe(empresas)] }),
        AsistenciaCorreccion.findAll({
            where: { estado_aprobacion: "pendiente" },
            include: [{ model: Asistencia, attributes: ["id", "fecha"], required: true, include: [trabajadorDe(empresas)] }]
        }),
        VariablePeriodo.findAll({
            where: { estado: "pendiente" },
            include: [periodoAbiertoDe(empresas), trabajadorDe(empresas), { model: ConceptoRemuneracion, attributes: ["nombre"] }]
        }),
        ResumenAsistencia.findAll({ where: { estado: "pendiente" }, include: [periodoAbiertoDe(empresas), trabajadorDe(empresas)] }),
        mesesCerrados(empresas),
        rolesPorEmpresa(usuario.id),
        saldosDesactualizados(empresas),
        finiquitosDesactualizados(empresas)
    ])

    const marcasAbiertas = marcas.filter((marca) => !cerrados.has(`${marca.Trabajador.empresa_id}-${String(marca.fecha).slice(0, 7)}`))

    const items = armar.ordenar([
        ...contratos.map(armar.deContrato),
        ...anexos.map(armar.deAnexo),
        ...marcasAbiertas.map(armar.deMarca),
        ...correcciones.map(armar.deCorreccion),
        ...variables.map(armar.deVariable),
        ...resumenes.map(armar.deResumen),
        ...saldos.map(({ liquidacion, saldo }) => armar.deSaldo(liquidacion, saldo)),
        ...finiquitos.map(({ finiquito, saldo }) => armar.deFiniquitoSaldo(finiquito, saldo))
    ]).map((item) => ({ ...item, puede_actuar: armar.puedeActuar(item, roles, PERMISOS) }))

    return { items, total: items.length, accionables: items.filter((item) => item.puede_actuar).length }
}

module.exports = { listarPendientes }
