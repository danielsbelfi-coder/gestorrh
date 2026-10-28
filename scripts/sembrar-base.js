// Carga los datos base del sistema (roles, AFP, Isapres, UF/UTM, impuestos, conceptos, planes, feriados...)
// SIN los usuarios de prueba: esos seeders traen contraseñas conocidas y no deben existir en la nube.
//   node scripts/sembrar-base.js
// Solo funciona sobre una base recién migrada y vacía (los seeders no son repetibles).
require("dotenv").config()
const fs = require("fs")
const path = require("path")
const { execFileSync } = require("child_process")

// Se llama a sequelize-cli con el mismo Node que corre este script. Así no depende de "npx", que en Windows se llama npx.cmd.
const CLI_SEQUELIZE = path.join(path.dirname(require.resolve("sequelize-cli/package.json")), "lib", "sequelize")
const { sequelize } = require("../src/shared/database.js")

const EXCLUIDOS = [
    "20261012171811-usuarios-prueba-por-rol.js",
    "20261015180429-usuario-comercial-prueba.js"
]

async function main() {
    const [filas] = await sequelize.query("SELECT COUNT(*)::int AS total FROM roles")
    if (filas[0].total > 0) {
        console.error("La base ya tiene datos (tabla roles con filas). Este script solo sirve para una base nueva y vacía.")
        process.exit(1)
    }
    await sequelize.close()

    const carpeta = path.join(__dirname, "../seeders")
    const seeders = fs.readdirSync(carpeta).filter((f) => f.endsWith(".js") && !EXCLUIDOS.includes(f)).sort()

    for (const seeder of seeders) {
        console.log(`Cargando ${seeder}`)
        execFileSync(process.execPath, [CLI_SEQUELIZE, "db:seed", "--seed", seeder], { stdio: "inherit", cwd: path.join(__dirname, "..") })
    }
    console.log(`Listo: ${seeders.length} seeders cargados (sin usuarios de prueba).`)
}

main().catch((error) => {
    console.error("Falló la carga de datos base:", error.message)
    process.exit(1)
})
