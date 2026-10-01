const { Persona } = require("../src/trabajadores/persona.model");


async function testPersona() {
    try {
        await Persona.create({
            rut: "22222222",
            dv: "2",
            nombres: "Lalo",
            apellido_paterno: "Lalona",
            nacionalidad: "chilena",
            fecha_nacimiento: "2000-01-01",
            direccion: "mi casa 02",
            sexo_genero: "masculino",
            tipo_cuenta: "cuenta corriente"
        })

        console.log("persona creada con exito")
    } catch (error) {
        console.log(error.message)
    }
}

testPersona()