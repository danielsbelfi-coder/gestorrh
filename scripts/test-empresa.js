const { Empresa } = require("../src/empresas/empresa.model");


async function testEmpresa() {
    try {
        await Empresa.create({
            rut: "11111111-1",
            razon_social: "Empresa Prueba",
            representante_legal_nombre: "El Gerente",
            representante_legal_rut: "99999999-9",
            direccion: "mi casa 01",
            nombre_fantasia: "Mi nueva Empresa",
        })

        console.log("empresa creada con exito")
    } catch (error) {
        console.log(error.message)
    }
}

testEmpresa()