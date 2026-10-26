const { Op } = require("sequelize")
const { sequelize } = require("../src/shared/database.js")
const { ParametroLegal, TramoImpuesto } = require("../src/shared/associations.js")
const { CODIGOS_PARAMETROS } = require("../src/remuneraciones/liquidacion.service.js")

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

function leerArgumentos() {
    const argumentos = process.argv.slice(2)

    const destino = leerMes(argumentos[0])

    const posicionDesde = argumentos.indexOf("--desde")
    const origen = posicionDesde === -1
        ? (destino && mesAnterior(destino))
        : leerMes(argumentos[posicionDesde + 1])

    const simular = !argumentos.includes("--confirmar")

    return { destino, origen, simular }
}

async function vigentesEn(Modelo, fecha) {
    return await Modelo.findAll({
        where: {
            vigencia_desde: { [Op.lte]: fecha },
            [Op.or]: [{ vigencia_hasta: null }, { vigencia_hasta: { [Op.gte]: fecha } }]
        }
    })
}

async function main() {
    const { destino, origen, simular } = leerArgumentos()

    if (destino === null || origen === null) {
        console.error("Uso: node scripts/abrir-parametros.js AAAA-MM [--desde AAAA-MM] [--confirmar]")
        process.exitCode = 1
        return
    }

    const desdeOrigen = rangoDelMes(origen).primerDia

    const parametros = await vigentesEn(ParametroLegal, desdeOrigen)
    const tramos = await vigentesEn(TramoImpuesto, desdeOrigen)

    console.log(`Origen ${desdeOrigen}: ${parametros.length} parámetros y ${tramos.length} tramos`)
    const { primerDia, ultimoDia } = rangoDelMes(destino)

    const existentes = await vigentesEn(ParametroLegal, primerDia)
    const codigosExistentes = new Set(existentes.map((p) => p.codigo))
    const aCopiar = parametros.filter((p) => !codigosExistentes.has(p.codigo))

    const tramosExistentes = await vigentesEn(TramoImpuesto, primerDia)
    const copiarTramos = tramosExistentes.length === 0

    console.log(`Destino ${primerDia} al ${ultimoDia}`)
    console.log(`  Ya existen: ${[...codigosExistentes].join(", ") || "ninguno"}`)
    console.log(`  Se copian: ${aCopiar.map((p) => `${p.codigo}=${p.valor}`).join(", ") || "ninguno"}`)
    console.log(`  Tramos: ${copiarTramos ? `se copian ${tramos.length}` : "ya existen, no se copian"}`)

    const requeridos = Object.values(CODIGOS_PARAMETROS)
    const disponibles = new Set([...aCopiar.map((p) => p.codigo), ...codigosExistentes])
    const faltantes = requeridos.filter((codigo) => !disponibles.has(codigo))

    if (faltantes.length > 0) {
        console.log(`  ATENCIÓN: después de esta apertura faltarán estos parámetros, y hay que cargarlos a mano: ${faltantes.join(", ")}`)
    }
    if (tramos.length === 0 && tramosExistentes.length === 0) {
        console.log("  ATENCIÓN: no hay tramos de impuesto ni en el origen ni en el destino")
    }

    const vigencia = { vigencia_desde: primerDia, vigencia_hasta: ultimoDia }
    const transaction = await sequelize.transaction()

    try {
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

        if (simular) {
            await transaction.rollback()
            console.log("SIMULACIÓN: no se guardó nada. Para guardar, agregue --confirmar")
        } else {
            await transaction.commit()
            console.log("Apertura guardada.")
            console.log("Revise y actualice en el mes nuevo los valores que cambian cada mes (UF, UTM) y los que cambie una ley.")
        }
    } catch (error) {
        await transaction.rollback()
        throw error
    }

    await sequelize.close()
}

main()
