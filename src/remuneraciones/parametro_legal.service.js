const { ParametroLegal, TramoImpuesto } = require("../shared/associations.js")
const { Op } = require("sequelize")
const { ValidationError, NotFoundError } = require("../shared/errors.js")
const { sequelize } = require("../shared/database.js")

async function corregirValorParametro(id, datos) {
    const parametro = await ParametroLegal.findByPk(id)

    if (parametro === null) {
        throw new NotFoundError("Parámetro no encontrado")
    }

    const valor = datos?.valor
    const esNumero = (typeof valor === "number" || typeof valor === "string") && valor !== "" && Number.isFinite(Number(valor))

    if (!esNumero || Number(valor) < 0) {
        throw new ValidationError("El valor debe ser un número mayor o igual a 0")
    }

    return await parametro.update(datos, {
        fields: ["valor", "descripcion", "fuente"]
    })
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
        parametros: parametros.sort((a, b) => a.codigo.localeCompare(b.codigo)),
        tramos: tramos.sort((a, b) => Number(a.desde_utm) - Number(b.desde_utm)),
        faltantes
    }
}

// Copia al mes de destino los parámetros y tramos vigentes en el mes de origen (por defecto, el anterior)
// que el destino todavía no tiene. Con simular = true hace todo y deshace al final (devuelve el mismo resumen).
async function abrirMesParametros(destinoTexto, origenTexto, simular = true) {
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
        const aCopiar = parametros.filter((p) => !codigosExistentes.has(p.codigo))
        const tramosDestino = (await vigentesEn(TramoImpuesto, primerDia, transaction)).length
        const copiarTramos = tramosDestino === 0 && tramos.length > 0

        await ParametroLegal.bulkCreate(aCopiar.map((p) => ({
            codigo: p.codigo,
            nombre: p.nombre,
            valor: p.valor,
            tipo: p.tipo,
            descripcion: p.descripcion,
            fuente: p.fuente,
            ...vigencia
        })), { transaction })

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
            tramosCopiados: copiarTramos ? tramos.length : 0,
            faltantes
        }
    } catch (error) {
        await transaction.rollback()
        throw error
    }
}

module.exports = {
    corregirValorParametro,
    obtenerParametroVigente,
    listarVersionesPorCodigo,
    parametrosDelMes,
    abrirMesParametros
}
