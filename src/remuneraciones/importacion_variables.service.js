// Carga masiva de variables del mes desde una planilla CSV. Revisa todo antes de cargar: si hay un error, no se carga
// nada. Las variables quedan pendientes (fuente «importacion») para que alguien las apruebe. Ver «Paquete Q» en el SPEC.
const { Op } = require("sequelize")
const { sequelize } = require("../shared/database.js")
const { VariablePeriodo, Trabajador, Persona, ConceptoRemuneracion } = require("../shared/associations.js")
const { ConflictError, ValidationError } = require("../shared/errors.js")
const { exigirRol, PERMISOS } = require("../shared/permisos.js")
const { obtenerPeriodoPorId } = require("./periodo_remuneracion.service.js")
const { relacionEnMes } = require("./variable_recurrente.service.js")
const { revisarPlanilla } = require("./importacion_variables.js")
const { generarCsv } = require("../exportacion/csv.js")

const MAXIMO_COLUMNAS = 200

// Conceptos que se cargan por planilla: haberes y descuentos que se ingresan a mano (sin horas extra ni los que calcula
// el sistema), comunes o de la empresa, activos.
async function conceptosImportables(empresaId) {
    return (await ConceptoRemuneracion.findAll({
        where: {
            [Op.or]: [{ empresa_id: null }, { empresa_id: empresaId }],
            activo: true,
            tipo: { [Op.in]: ["haber", "descuento"] },
            calculado_por_sistema: false,
            recargo_hora_extra: null
        },
        order: [["tipo", "ASC"], ["nombre", "ASC"]]
    })).map((c) => ({ id: c.id, codigo: c.codigo, nombre: c.nombre, tipo: c.tipo }))
}

// Relaciones con liquidación en el mes, por RUT; la más reciente primero (dos relaciones en el mes: la nueva).
async function relacionesDelMes(periodo) {
    const trabajadores = await Trabajador.findAll({ where: { empresa_id: periodo.empresa_id }, include: [Persona] })
    const porRut = new Map()
    for (const t of trabajadores.filter((x) => relacionEnMes(x, periodo))) {
        const p = t.Persona
        const nombre = [p.nombres, p.apellido_paterno, p.apellido_materno].filter(Boolean).join(" ")
        const lista = porRut.get(p.rut) ?? []
        lista.push({ id: t.id, nombre, rut: p.rut, dv: p.dv, fecha_ingreso: t.fecha_ingreso })
        porRut.set(p.rut, lista)
    }
    for (const lista of porRut.values()) {
        lista.sort((a, b) => b.fecha_ingreso.localeCompare(a.fecha_ingreso))
    }
    return porRut
}

function exigirMatriz(matriz) {
    if (!Array.isArray(matriz) || matriz.some((fila) => !Array.isArray(fila))) {
        throw new ValidationError("La planilla no se pudo leer: se esperaba una lista de filas")
    }
    if (matriz.some((fila) => fila.length > MAXIMO_COLUMNAS)) {
        throw new ValidationError(`La planilla no puede tener más de ${MAXIMO_COLUMNAS} columnas`)
    }
    return matriz.map((fila) => fila.map((celda) => (celda === null || celda === undefined ? "" : String(celda))))
}

async function importarVariables(datos, empresasPermitidas, usuarioId) {
    const periodo = await obtenerPeriodoPorId(datos?.periodo_id, empresasPermitidas)
    await exigirRol(usuarioId, periodo.empresa_id, PERMISOS.REGISTRAR_VARIABLES)
    if (periodo.estado !== "abierto") {
        throw new ConflictError("El periodo de remuneraciones está cerrado")
    }
    const matriz = exigirMatriz(datos.matriz)

    const [conceptos, relacionesPorRut, existentes] = await Promise.all([
        conceptosImportables(periodo.empresa_id),
        relacionesDelMes(periodo),
        VariablePeriodo.findAll({ where: { periodo_id: periodo.id }, attributes: ["trabajador_id", "concepto_id"] })
    ])
    const revision = revisarPlanilla({
        matriz,
        conceptos,
        relacionesPorRut,
        existentes: new Set(existentes.map((v) => `${v.trabajador_id}-${v.concepto_id}`))
    })
    const respuesta = {
        confirmado: false,
        filas: revision.filas,
        columnas: revision.columnas && {
            conceptos: revision.columnas.conceptos.map((c) => ({ titulo: c.titulo, concepto: c.concepto.nombre, tipo: c.concepto.tipo })),
            ignoradas: revision.columnas.ignoradas,
            glosa: revision.columnas.glosa !== null
        },
        erroresEncabezado: revision.erroresEncabezado,
        errores: revision.errores,
        avisos: revision.avisos,
        variables: revision.variables
    }
    const hayErrores = revision.erroresEncabezado.length > 0 || revision.errores.length > 0
    if (hayErrores || revision.variables.length === 0 || datos.confirmar !== true) {
        return respuesta
    }

    await sequelize.transaction(async (transaction) => {
        for (const v of revision.variables) {
            await VariablePeriodo.create({
                periodo_id: periodo.id,
                trabajador_id: v.trabajador_id,
                concepto_id: v.concepto_id,
                cantidad: null,
                monto: v.monto,
                glosa: v.glosa,
                estado: "pendiente",
                fuente: "importacion",
                usuario_registro_id: usuarioId
            }, { transaction })
        }
    })
    return { ...respuesta, confirmado: true }
}

// Plantilla CSV: RUT, Nombre y una columna por concepto pedido (por defecto «Anticipo»), con los trabajadores del mes.
async function plantillaDeImportacion(periodoId, codigos, empresasPermitidas) {
    const periodo = await obtenerPeriodoPorId(periodoId, empresasPermitidas)
    const conceptos = await conceptosImportables(periodo.empresa_id)
    const pedidos = String(codigos ?? "").split(",").map((c) => c.trim()).filter(Boolean)
    const elegidos = (pedidos.length > 0 ? pedidos : ["ANTICIPO"])
        .map((codigo) => conceptos.find((c) => c.codigo === codigo))
        .filter(Boolean)
    const columnas = ["RUT", "Nombre", ...elegidos.map((c) => c.nombre), "Glosa"]
    const relaciones = [...(await relacionesDelMes(periodo)).values()].map((lista) => lista[0])
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
    const filas = relaciones.map((r) => ({ RUT: `${r.rut}-${r.dv}`, Nombre: r.nombre }))
    return {
        nombre: `variables_${periodo.anio}_${String(periodo.mes).padStart(2, "0")}.csv`,
        contenido: generarCsv(columnas, filas)
    }
}

module.exports = { importarVariables, plantillaDeImportacion, conceptosImportables }
