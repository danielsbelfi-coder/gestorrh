const { ZipArchive } = require("archiver")
const { generarArchivosEmpresa } = require("./exportacion.service.js")
const { obtenerEmpresaDeCuenta } = require("../empresas/empresa.service.js")

async function exportarEmpresa(req, res) {
    const empresa = await obtenerEmpresaDeCuenta(req.params.id, req.usuario)
    const archivos = await generarArchivosEmpresa(empresa.id)

    const zip = new ZipArchive()

    const fecha = new Date().toISOString().slice(0, 10)
    res.attachment(`gestorrh-${empresa.rut}-${empresa.dv}-${fecha}.zip`)

    zip.pipe(res)

    for (const archivo of archivos) {
        zip.append(archivo.contenido, { name: archivo.nombre })
    }

    await zip.finalize()
}

module.exports = { exportarEmpresa }