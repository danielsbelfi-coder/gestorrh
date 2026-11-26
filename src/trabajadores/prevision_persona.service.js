// Historial de previsión (AFP y salud) por mes. Ver «Historial de previsión» en el SPEC.
const { Op } = require("sequelize")
const { sequelize } = require("../shared/database.js")
const { PrevisionPersona, Persona, Afp, Isapre, Liquidacion, PeriodoRemuneracion, Trabajador, ExCajaRegimen } = require("../shared/associations.js")
const { obtenerPersonaPorId, catalogosDeImportacion } = require("./persona.service.js")
const { exigirRol, PERMISOS } = require("../shared/permisos.js")
const { NotFoundError, ConflictError, ValidationError } = require("../shared/errors.js")
const { DESDE_SIEMPRE, previsionDelMes, validarPrevision, normalizarPrevision, mesesCerradosAlcanzados } = require("./prevision_del_mes.js")

const INCLUIR_INSTITUCIONES = [{ model: Afp, attributes: ["id", "nombre"] }, { model: Isapre, attributes: ["id", "nombre"] }, { model: ExCajaRegimen }]

async function listarPrevisiones(personaId, empresasPermitidas) {
    const persona = await obtenerPersonaPorId(personaId, empresasPermitidas)
    return PrevisionPersona.findAll({ where: { persona_id: persona.id }, include: INCLUIR_INSTITUCIONES, order: [["desde", "DESC"]] })
}

// Un cambio no puede alcanzar un mes cerrado en que la persona tuvo liquidación (para eso existe la reapertura).
async function exigirSinMesesCerrados(persona, desde, transaction) {
    const liquidaciones = await Liquidacion.findAll({
        where: { vigente: true },
        attributes: ["id"],
        include: [
            { model: PeriodoRemuneracion, attributes: ["anio", "mes"], where: { estado: "cerrado" }, required: true },
            { model: Trabajador, attributes: ["id"], where: { persona_id: persona.id }, required: true }
        ],
        transaction
    })
    const meses = mesesCerradosAlcanzados(desde, liquidaciones.map((l) => l.PeriodoRemuneracion))
    if (meses.length > 0) {
        const texto = meses.map((mes) => mes.split("-").reverse().join("-")).join(", ")
        throw new ConflictError(`El cambio alcanza meses ya cerrados (${texto}). Si es necesario, el administrador puede reabrir el periodo; si no, se regulariza directamente en Previred o con la isapre`)
    }
}

// Los campos de la persona guardan la previsión vigente hoy (la ficha, el contrato y la importación los leen).
async function sincronizarPersona(personaId, transaction, hoy = new Date()) {
    const filas = await PrevisionPersona.findAll({ where: { persona_id: personaId }, transaction })
    const vigente = previsionDelMes(filas, hoy.getFullYear(), hoy.getMonth() + 1)
    await Persona.update({
        afp_id: vigente?.afp_id ?? null,
        sistema_salud: vigente?.sistema_salud ?? null,
        isapre_id: vigente?.isapre_id ?? null,
        plan_isapre_uf: vigente?.plan_isapre_uf ?? null
    }, { where: { id: personaId }, transaction })
}

async function exigirInstituciones(datos) {
    if (datos.regimen === "IPS" && (await ExCajaRegimen.findByPk(datos.ex_caja_regimen_id)) === null) {
        throw new ValidationError("La ex-caja y el régimen indicados no existen")
    }
    const afp = datos.afp_id === null ? null : await Afp.findByPk(datos.afp_id)
    if (datos.afp_id !== null && (afp === null || afp.estado === "inactivo")) {
        throw new ValidationError("La AFP indicada no existe o no está activa")
    }
    if (datos.sistema_salud === "Isapre") {
        const isapre = await Isapre.findByPk(datos.isapre_id)
        if (isapre === null || isapre.estado === "inactivo") {
            throw new ValidationError("La isapre indicada no existe o no está activa")
        }
    }
}

// Registra la previsión desde un mes (AAAA-MM) o corrige la inicial (desde = "siempre").
async function registrarPrevision(personaId, datos, empresasPermitidas, usuarioId) {
    const persona = await obtenerPersonaPorId(personaId, empresasPermitidas)
    await exigirRol(usuarioId, persona.empresa_id, PERMISOS.GESTIONAR_FICHAS)

    const errores = validarPrevision(datos)
    if (errores.length > 0) {
        throw new ValidationError(errores.join(". "))
    }
    const prevision = normalizarPrevision(datos)
    await exigirInstituciones(prevision)

    return sequelize.transaction(async (transaction) => {
        await exigirSinMesesCerrados(persona, prevision.desde, transaction)

        const existente = await PrevisionPersona.findOne({ where: { persona_id: persona.id, desde: prevision.desde }, transaction })
        let fila
        if (existente !== null && prevision.desde === DESDE_SIEMPRE) {
            // La previsión inicial se corrige (no se elimina).
            fila = await existente.update({ ...prevision, usuario_registro_id: usuarioId }, { transaction })
        } else if (existente !== null) {
            throw new ConflictError(`Ya hay un cambio de previsión desde ${datos.desde}; elimínelo antes de registrar otro`)
        } else {
            fila = await PrevisionPersona.create({ ...prevision, persona_id: persona.id, usuario_registro_id: usuarioId }, { transaction })
        }

        await sincronizarPersona(persona.id, transaction)
        return fila
    })
}

async function eliminarPrevision(personaId, id, empresasPermitidas, usuarioId) {
    const persona = await obtenerPersonaPorId(personaId, empresasPermitidas)
    await exigirRol(usuarioId, persona.empresa_id, PERMISOS.GESTIONAR_FICHAS)

    const fila = await PrevisionPersona.findOne({ where: { id, persona_id: persona.id } })
    if (fila === null) {
        throw new NotFoundError("Cambio de previsión no encontrado")
    }
    if (fila.desde === DESDE_SIEMPRE) {
        throw new ConflictError("La previsión inicial no se elimina: se corrige registrándola de nuevo «desde siempre»")
    }

    await sequelize.transaction(async (transaction) => {
        await exigirSinMesesCerrados(persona, fila.desde, transaction)
        await fila.destroy({ transaction })
        await sincronizarPersona(persona.id, transaction)
    })
}

// Paquete AH: carga masiva de cambios de previsión de personas de una empresa. Revisa todas las filas (incluido que
// ningún cambio alcance meses cerrados) y solo con confirmar = true y sin errores los registra, todos o ninguno.
async function importarPrevisiones(datos, empresasPermitidas, usuarioId) {
    const { validarCambiosPrevision } = require("./importacion_previsiones.js")
    const empresaId = Number(datos?.empresa_id)
    if (!empresasPermitidas.includes(empresaId)) {
        throw new NotFoundError("Empresa no encontrada")
    }
    await exigirRol(usuarioId, empresaId, PERMISOS.GESTIONAR_FICHAS)

    const filas = datos.filas
    if (!Array.isArray(filas) || filas.length === 0) {
        throw new ValidationError("La planilla no tiene filas")
    }

    const [catalogos, personas] = await Promise.all([
        catalogosDeImportacion(),
        Persona.findAll({ where: { empresa_id: empresaId }, attributes: ["id", "rut", "dv", "nombres", "apellido_paterno", "apellido_materno"], include: [{ model: PrevisionPersona }] })
    ])
    const porRut = new Map(personas.map((p) => [p.rut, {
        id: p.id,
        dv: p.dv,
        nombre: [p.nombres, p.apellido_paterno, p.apellido_materno].filter(Boolean).join(" "),
        previsiones: (p.PrevisionesPersona ?? []).map((f) => f.toJSON())
    }]))

    const { cambios, errores } = validarCambiosPrevision(filas, { ...catalogos, personas: porRut })

    // Meses cerrados: la misma regla que un cambio desde la ficha.
    for (const cambio of cambios) {
        try {
            await exigirSinMesesCerrados({ id: cambio.persona_id }, cambio.datos.desde)
        } catch (error) {
            if (!(error instanceof ConflictError)) {
                throw error
            }
            errores.push({ fila: cambio.fila, rut: cambio.rut, motivos: [error.message] })
        }
    }
    errores.sort((a, b) => a.fila - b.fila)

    // Para la revisión en pantalla: los nombres de las instituciones.
    const { nombreExCaja } = require("./ex_caja_texto.js")
    const nombreDe = (lista, id, fn = (x) => x.nombre) => { const item = lista.find((x) => x.id === id); return item ? fn(item) : null }
    const resumen = cambios.map((c) => ({
        fila: c.fila,
        rut: c.rut,
        nombre: c.nombre,
        ...c.datos,
        afp: nombreDe(catalogos.afps, c.datos.afp_id),
        ex_caja: nombreDe(catalogos.exCajas, c.datos.ex_caja_regimen_id, nombreExCaja),
        isapre: nombreDe(catalogos.isapres, c.datos.isapre_id)
    }))
    if (errores.length > 0 || datos.confirmar !== true) {
        return { confirmado: false, total: filas.length, cambios: errores.length > 0 ? [] : resumen, errores }
    }

    await sequelize.transaction(async (transaction) => {
        for (const cambio of cambios) {
            const existente = await PrevisionPersona.findOne({ where: { persona_id: cambio.persona_id, desde: cambio.datos.desde }, transaction })
            if (existente !== null && cambio.datos.desde === DESDE_SIEMPRE) {
                await existente.update({ ...cambio.datos, usuario_registro_id: usuarioId }, { transaction })
            } else if (existente !== null) {
                throw new ConflictError(`Fila ${cambio.fila}: ya hay un cambio de previsión desde ese mes`)
            } else {
                await PrevisionPersona.create({ ...cambio.datos, persona_id: cambio.persona_id, usuario_registro_id: usuarioId }, { transaction })
            }
        }
        for (const personaId of new Set(cambios.map((c) => c.persona_id))) {
            await sincronizarPersona(personaId, transaction)
        }
    })

    return { confirmado: true, registrados: cambios.length, personas: new Set(cambios.map((c) => c.persona_id)).size, cambios: resumen, errores: [] }
}

async function guiaPrevisiones() {
    const { valoresValidos, AYUDA_COLUMNAS } = require("./importacion_previsiones.js")
    return {
        valores: valoresValidos(await catalogosDeImportacion()),
        columnas: AYUDA_COLUMNAS.map(([columna, obligatoria, ayuda]) => ({ columna, obligatoria, ayuda }))
    }
}

async function plantillaPrevisiones() {
    const { generarPlantillaPrevisiones } = require("./plantilla_personas.js")
    return generarPlantillaPrevisiones(await catalogosDeImportacion())
}

// Para el cálculo de un mes: { afp, sistema_salud, isapre, plan_isapre_uf } con las instituciones completas.
// Si la persona no tiene historial (no debería pasar después de la migración), se usan sus campos actuales.
async function previsionEnMes(persona, anio, mes) {
    const filas = await PrevisionPersona.findAll({
        where: { persona_id: persona.id, desde: { [Op.lte]: `${anio}-${String(mes).padStart(2, "0")}-01` } },
        include: [Afp, Isapre, ExCajaRegimen]
    })
    const fila = previsionDelMes(filas, anio, mes)
    if (fila === null) {
        return { regimen: "AFP", exCaja: null, cotizaDesahucio: false, afp: persona.Afp ?? null, sistema_salud: persona.sistema_salud, isapre: persona.Isapre ?? null, plan_isapre_uf: persona.plan_isapre_uf }
    }
    // Paquete AG: imponente del IPS (ex INP): su ex-caja y régimen, y si cotiza desahucio.
    return {
        regimen: fila.regimen ?? "AFP",
        exCaja: fila.ExCajaRegimen ?? null,
        cotizaDesahucio: fila.cotiza_desahucio !== false,
        afp: fila.Afp,
        sistema_salud: fila.sistema_salud,
        isapre: fila.Isapre,
        plan_isapre_uf: fila.plan_isapre_uf
    }
}

module.exports = { listarPrevisiones, registrarPrevision, eliminarPrevision, sincronizarPersona, previsionEnMes, importarPrevisiones, guiaPrevisiones, plantillaPrevisiones }
