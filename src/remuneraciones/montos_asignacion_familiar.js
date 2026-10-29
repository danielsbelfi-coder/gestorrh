// Montos de la asignación familiar (valor unitario por carga; la carga por invalidez recibe el doble).
// Fuente: Superintendencia de Seguridad Social, https://www.suseso.gob.cl/606/w3-article-498133.html (consultada el 29-10-2026).
// Los usan la migración de cargas familiares (bases que ya existen) y su seeder (bases nuevas).
const FUENTE = "https://www.suseso.gob.cl/606/w3-article-498133.html"

// Ordenados de más antiguo a más nuevo. Cada uno rige desde su fecha hasta la siguiente.
const VALORES = [
    { desde: "2025-01-01", ley: "Ley 21.578", A: 21243, B: 13036, C: 4119 },
    { desde: "2025-05-01", ley: "Ley 21.751", A: 22007, B: 13505, C: 4267 },
    { desde: "2026-05-01", ley: "Ley 21.830", A: 22601, B: 13870, C: 4382 }
]

const CODIGOS_MONTOS = { A: "ASIG_FAMILIAR_MONTO_A", B: "ASIG_FAMILIAR_MONTO_B", C: "ASIG_FAMILIAR_MONTO_C" }

function valoresEn(fecha) {
    const aplicables = VALORES.filter((v) => v.desde <= fecha)
    return aplicables.length > 0 ? aplicables[aplicables.length - 1] : VALORES[0]
}

// Crea los montos para cada mes que ya tiene los límites de tramo (parámetros mensuales) y todavía no tiene montos.
async function insertarMontosFaltantes(queryInterface) {
    const [meses] = await queryInterface.sequelize.query(`
        SELECT DISTINCT t.vigencia_desde::text AS desde, t.vigencia_hasta::text AS hasta
        FROM parametros_legales t
        WHERE t.codigo = 'ASIG_FAMILIAR_TRAMO_A_HASTA'
          AND NOT EXISTS (
            SELECT 1 FROM parametros_legales m
            WHERE m.codigo = 'ASIG_FAMILIAR_MONTO_A' AND m.vigencia_desde = t.vigencia_desde
          )
        ORDER BY 1
    `)

    const ahora = new Date()
    const filas = []
    for (const mes of meses) {
        const valores = valoresEn(mes.desde)
        for (const [tramo, codigo] of Object.entries(CODIGOS_MONTOS)) {
            filas.push({
                codigo,
                nombre: `Asignación familiar, monto por carga del tramo ${tramo}`,
                valor: valores[tramo],
                tipo: "monto",
                descripcion: `Valor unitario por carga simple o maternal (${valores.ley}); la carga por invalidez recibe el doble. El tramo D no tiene derecho`,
                fuente: FUENTE,
                vigencia_desde: mes.desde,
                vigencia_hasta: mes.hasta,
                createdAt: ahora,
                updatedAt: ahora
            })
        }
    }

    if (filas.length > 0) {
        await queryInterface.bulkInsert("parametros_legales", filas)
    }
    return filas.length
}

module.exports = { VALORES, CODIGOS_MONTOS, valoresEn, insertarMontosFaltantes }
