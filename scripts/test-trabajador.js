const { Empresa, Trabajador, Persona } = require("../src/shared/associations.js")




async function testTrabajador() {
    try {
        const nuevaPersona = await Persona.create({
            rut: "33333333",
            dv: "3",
            nombres: "Lalo",
            apellido_paterno: "Lalona",
            nacionalidad: "chilena",
            fecha_nacimiento: "2000-01-01",
            direccion: "mi casa 02",
            sexo_genero: "masculino",
            tipo_cuenta: "cuenta corriente"
        })
        const nuevaEmpresa = await Empresa.create({
            rut: "44444444-4",
            razon_social: "Empresa Prueba",
            representante_legal_nombre: "El Gerente",
            representante_legal_rut: "99999999-9",
            direccion: "mi casa 01",
            nombre_fantasia: "Mi nueva Empresa",
        })

        await Trabajador.create({
            persona_id: nuevaPersona.id,
            empresa_id: nuevaEmpresa.id,
            fecha_ingreso: "2026-01-01",
            fecha_termino: "2026-12-31",
            estado: "activo"
        })
        console.log("trabajador creado con exito")
    } catch (error) {
        console.log(error.message)
    }
}

testTrabajador()