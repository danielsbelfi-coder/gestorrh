const { ParametroLegal, TramoImpuesto, ParametroHistorial, Usuario } = require("../shared/associations.js")
const { Op } = require("sequelize")
const { ValidationError, NotFoundError, ConflictError } = require("../shared/errors.js")
const { sequelize } = require("../shared/database.js")
const { CODIGOS_DEL_MES, parametrosACopiar, codigosSinCopiar } = require("./apertura_mes.js")

async function corregirValorParametro(id, datos, usuarioId) {
    const parametro = await ParametroLegal.findByPk(id)

    if (parametro === null) {
        throw new NotFoundError("Parámetro no encontrado")
    }

    const valor = datos?.valor
    const esNumero = (typeof valor === "number" || typeof valor === "string") && valor !== "" && Number.isFinite(Number(valor))

    if (!esNumero || Number(valor) < 0) {
        throw new ValidationError("El valor debe ser un número mayor o igual a 0")
    }

    return await sequelize.transaction(async (transaction) => {
        const valorAnterior = parametro.valor
        const actualizado = await parametro.update(datos, {
            fields: ["valor", "descripcion", "fuente"],
            transaction
        })

        await ParametroHistorial.create({
            accion: "correccion",
            parametro_id: parametro.id,
            codigo: parametro.codigo,
            vigencia_desde: parametro.vigencia_desde,
            valor_anterior: valorAnterior,
            valor_nuevo: actualizado.valor,
            detalle: typeof datos.fuente === "string" && datos.fuente.trim() !== "" ? `Fuente: ${datos.fuente.trim()}` : null,
            usuario_id: usuarioId
        }, { transaction })

        return actualizado
    })
}

// Últimos cambios de parámetros (solo soporte). "tardio": se cargó o corrigió después de que empezó a regir.
async function historialParametros(limite = 200) {
    const filas = await ParametroHistorial.findAll({
        include: [{ model: Usuario, as: "usuario", attributes: ["id", "nombre", "email"] }],
        order: [["createdAt", "DESC"], ["id", "DESC"]],
        limit: limite
    })

    return filas.map((fila) => ({
        ...fila.toJSON(),
        tardio: fila.createdAt.toISOString().slice(0, 10) > fila.vigencia_desde
    }))
}

async function obtenerParametroVigente(codigo, fecha) {
    return await ParametroLegal.findOne({
        where: {
            codigo: codigo,
            vigencia_desde: { [Op.lte]: fecha },
            [Op.or]: [
                { vigencia_hasta: null },
                { vigencia_hasta: { [Op.gte]: fecha } }
            ]
        }
    })
}

async function listarVersionesPorCodigo(codigo) {
    return await ParametroLegal.findAll({
        where: {
            codigo: codigo
        },
        order: [["vigencia_desde", "ASC"]]
    })
}

function leerMes(texto) {
    if (!/^\d{4}-\d{2}$/.test(texto ?? "")) {
        return null
    }
    const [anio, mes] = texto.split("-").map(Number)
    return mes >= 1 && mes <= 12 ? { anio, mes } : null
}

function mesAnterior({ anio, mes }) {
    return mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 }
}

function rangoDelMes({ anio, mes }) {
    const mm = String(mes).padStart(2, "0")
    const ultimo = new Date(Date.UTC(anio, mes, 0)).getUTCDate()
    return { primerDia: `${anio}-${mm}-01`, ultimoDia: `${anio}-${mm}-${ultimo}` }
}

async function vigentesEn(Modelo, fecha, transaction) {
    return await Modelo.findAll({
        where: {
            vigencia_desde: { [Op.lte]: fecha },
            [Op.or]: [{ vigencia_hasta: null }, { vigencia_hasta: { [Op.gte]: fecha } }]
        },
        transaction
    })
}

// Parámetros y tramos vigentes en un mes, y los códigos que el cálculo necesita y no están.
async function parametrosDelMes(mesTexto) {
    const mes = leerMes(mesTexto)
    if (mes === null) {
        throw new ValidationError("El mes debe tener el formato AAAA-MM")
    }


    const { parametrosFaltantes } = require("./periodo_remuneracion.service.js")

    const { primerDia } = rangoDelMes(mes)
    const [parametros, tramos, faltantes] = await Promise.all([
        vigentesEn(ParametroLegal, primerDia),
        vigentesEn(TramoImpuesto, primerDia),
        parametrosFaltantes(mes.anio, mes.mes)
    ])

    return {
        mes: mesTexto,
        // La UF que usa la remuneración del mes es la del último día de ese mes.
        fecha_uf: rangoDelMes(mes).ultimoDia,
        parametros: parametros.sort((a, b) => a.codigo.localeCompare(b.codigo)),
        tramos: tramos.sort((a, b) => Number(a.desde_utm) - Number(b.desde_utm)),
        faltantes
    }
}

// Copia al mes de destino los parámetros y tramos vigentes en el mes de origen (por defecto, el anterior)
// que el destino todavía no tiene. Con simular = true hace todo y deshace al final (devuelve el mismo resumen).
async function abrirMesParametros(destinoTexto, origenTexto, simular = true, usuarioId = null) {
    const destino = leerMes(destinoTexto)
    const origen = origenTexto ? leerMes(origenTexto) : destino && mesAnterior(destino)

    if (destino === null || origen === null) {
        throw new ValidationError("Los meses deben tener el formato AAAA-MM")
    }

    const desdeOrigen = rangoDelMes(origen).primerDia
    const { primerDia, ultimoDia } = rangoDelMes(destino)
    const vigencia = { vigencia_desde: primerDia, vigencia_hasta: ultimoDia }

    const transaction = await sequelize.transaction()

    try {
        const parametros = await vigentesEn(ParametroLegal, desdeOrigen, transaction)
        const tramos = await vigentesEn(TramoImpuesto, desdeOrigen, transaction)
        const codigosExistentes = new Set((await vigentesEn(ParametroLegal, primerDia, transaction)).map((p) => p.codigo))
        const aCopiar = parametrosACopiar(parametros, codigosExistentes)
        const tramosDestino = (await vigentesEn(TramoImpuesto, primerDia, transaction)).length
        const copiarTramos = tramosDestino === 0 && tramos.length > 0

        const creados = await ParametroLegal.bulkCreate(aCopiar.map((p) => ({
            codigo: p.codigo,
            nombre: p.nombre,
            valor: p.valor,
            tipo: p.tipo,
            descripcion: p.descripcion,
            fuente: p.fuente,
            ...vigencia
        })), { transaction, returning: true })

        const detalleOrigen = `Copiado desde ${desdeOrigen.slice(0, 7)}`
        await ParametroHistorial.bulkCreate([
            ...creados.map((p) => ({
                accion: "apertura_mes", parametro_id: p.id, codigo: p.codigo, vigencia_desde: primerDia,
                valor_anterior: null, valor_nuevo: p.valor, detalle: detalleOrigen, usuario_id: usuarioId
            })),
            ...(copiarTramos ? [{
                accion: "apertura_mes", parametro_id: null, codigo: "TRAMOS_IMPUESTO_UNICO", vigencia_desde: primerDia,
                valor_anterior: null, valor_nuevo: null, detalle: `${detalleOrigen} (${tramos.length} tramos)`, usuario_id: usuarioId
            }] : [])
        ], { transaction })

        if (copiarTramos) {
            await TramoImpuesto.bulkCreate(tramos.map((t) => ({
                desde_utm: t.desde_utm,
                hasta_utm: t.hasta_utm,
                tasa: t.tasa,
                rebaja_utm: t.rebaja_utm,
                ...vigencia
            })), { transaction })
        }

        // Lo que el cálculo necesita y seguirá faltando después de la copia (se cargan aquí por el require circular).
        const { CODIGOS_PARAMETROS } = require("./liquidacion.service.js")
        const { CODIGOS_TRAMOS } = require("./previred.service.js")
        const disponibles = new Set([...codigosExistentes, ...aCopiar.map((p) => p.codigo)])
        const faltantes = [...Object.values(CODIGOS_PARAMETROS), ...Object.values(CODIGOS_TRAMOS)]
            .filter((codigo) => !disponibles.has(codigo))
        if (tramosDestino === 0 && !copiarTramos) {
            faltantes.push("TRAMOS_IMPUESTO_UNICO")
        }

        if (simular) {
            await transaction.rollback()
        } else {
            await transaction.commit()
        }

        return {
            simulado: simular,
            origen: desdeOrigen.slice(0, 7),
            destino: primerDia.slice(0, 7),
            copiados: aCopiar.map((p) => ({ codigo: p.codigo, valor: p.valor })),
            yaExistian: [...codigosExistentes],
            // UF y UTM no se copian: hay que cargarlas con el valor oficial del mes (si aún no existen).
            sinCopiar: codigosSinCopiar(codigosExistentes),
            tramosCopiados: copiarTramos ? tramos.length : 0,
            faltantes
        }
    } catch (error) {
        await transaction.rollback()
        throw error
    }
}

// Carga la UF o la UTM de un mes que todavía no la tiene (después de «Abrir mes»). Para cambiar una ya cargada
// se usa «Corregir». El nombre y el tipo se toman de la versión más reciente del mismo código.
async function cargarValorDelMes(mesTexto, codigo, datos, usuarioId) {
    const mes = leerMes(mesTexto)
    if (mes === null) {
        throw new ValidationError("El mes debe tener el formato AAAA-MM")
    }
    if (!CODIGOS_DEL_MES.includes(codigo)) {
        throw new ValidationError(`Solo se cargan así: ${CODIGOS_DEL_MES.join(" y ")}`)
    }

    // Acepta la coma decimal (41.500,55 no: sin separador de miles).
    const valor = typeof datos?.valor === "string" ? datos.valor.trim().replace(",", ".") : datos?.valor
    const esNumero = (typeof valor === "number" || typeof valor === "string") && String(valor) !== "" && Number.isFinite(Number(valor))
    if (!esNumero || Number(valor) <= 0) {
        throw new ValidationError("El valor debe ser un número mayor a 0, con punto o coma decimal y sin separador de miles")
    }

    const { primerDia, ultimoDia } = rangoDelMes(mes)

    return await sequelize.transaction(async (transaction) => {
        if (await obtenerParametroVigente(codigo, primerDia) !== null) {
            throw new ConflictError(`${codigo} de ${mesTexto} ya está cargada: usa «Corregir» para cambiar su valor`)
        }

        const modelo = await ParametroLegal.findOne({
            where: { codigo, vigencia_desde: { [Op.lt]: primerDia } },
            order: [["vigencia_desde", "DESC"]],
            transaction
        })
        const fuente = typeof datos.fuente === "string" && datos.fuente.trim() !== "" ? datos.fuente.trim() : null

        const creado = await ParametroLegal.create({
            codigo,
            nombre: modelo?.nombre ?? (codigo === "UF" ? "Unidad de fomento" : "Unidad tributaria mensual"),
            valor: String(valor),
            tipo: "monto",
            descripcion: codigo === "UF" ? `valor UF al ${ultimoDia}` : `valor UTM ${mesTexto}`,
            fuente,
            vigencia_desde: primerDia,
            vigencia_hasta: ultimoDia
        }, { transaction })

        await ParametroHistorial.create({
            // Es parte de abrir el mes (el valor oficial que «Abrir mes» no copia): sin acción nueva, no hace falta migración.
            accion: "apertura_mes",
            parametro_id: creado.id,
            codigo,
            vigencia_desde: primerDia,
            valor_anterior: null,
            valor_nuevo: creado.valor,
            detalle: `Carga de ${codigo}${fuente ? ` · Fuente: ${fuente}` : ""}`,
            usuario_id: usuarioId
        }, { transaction })

        return creado
    })
}

module.exports = {
    CODIGOS_DEL_MES,
    cargarValorDelMes,
    corregirValorParametro,
    obtenerParametroVigente,
    listarVersionesPorCodigo,
    parametrosDelMes,
    abrirMesParametros,
    historialParametros
}
