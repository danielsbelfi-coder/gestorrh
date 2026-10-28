// Copia al mes indicado los parámetros legales y tramos del mes anterior (o del indicado con --desde).
// Uso: npm run abrir-parametros -- AAAA-MM [--desde AAAA-MM] [--confirmar]
// La misma operación está en la pantalla de parámetros legales (usuarios de soporte).
const { sequelize } = require("../src/shared/database.js")
const { abrirMesParametros } = require("../src/remuneraciones/parametro_legal.service.js")

async function main() {
    const argumentos = process.argv.slice(2)
    const posicionDesde = argumentos.indexOf("--desde")
    const desde = posicionDesde === -1 ? undefined : argumentos[posicionDesde + 1]
    const simular = !argumentos.includes("--confirmar")

    try {
        const r = await abrirMesParametros(argumentos[0], desde, simular)
        console.log(`Origen ${r.origen} → destino ${r.destino}`)
        console.log(`  Ya existían: ${r.yaExistian.join(", ") || "ninguno"}`)
        console.log(`  Se copian: ${r.copiados.map((p) => `${p.codigo}=${p.valor}`).join(", ") || "ninguno"}`)
        console.log(`  Tramos copiados: ${r.tramosCopiados}`)
        if (r.faltantes.length > 0) {
            console.log(`  ATENCIÓN: seguirán faltando: ${r.faltantes.join(", ")}`)
        }
        console.log(r.simulado
            ? "SIMULACIÓN: no se guardó nada. Para guardar, agregue --confirmar"
            : "Apertura guardada. Revise la UF (último día del mes) y la UTM del mes nuevo.")
    } catch (error) {
        console.error(error.message)
        process.exitCode = 1
    }

    await sequelize.close()
}

main()
