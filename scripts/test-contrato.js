const { Persona, Empresa, Cargo, Usuario, Trabajador, ContratoTrabajo, ContratoAnexo } = require("../src/shared/associations.js")

async function TestContrato() {
    try {
        const nuevaPersona = await Persona.create({
            rut: "55555555",
            dv: "5",
            nombres: "Lalo",
            apellido_paterno: "Lalona",
            nacionalidad: "chilena",
            fecha_nacimiento: "2000-01-01",
            direccion: "mi casa 02",
            sexo_genero: "masculino",
            tipo_cuenta: "cuenta corriente"
        })
        const nuevaEmpresa = await Empresa.create({
            rut: "66666666-6",
            razon_social: "Empresa Prueba",
            representante_legal_nombre: "El Gerente",
            representante_legal_rut: "99999999-9",
            direccion: "mi casa 01",
            nombre_fantasia: "Mi nueva Empresa",
        })
        const nuevoCargo = await Cargo.create({
            empresa_id: nuevaEmpresa.id,
            nombre: "Jefe de RRHH",
            descripcion: "Encargador de contratos y remuneraciones",
            estado: "activo"
        })

        const nuevoUsuario = await Usuario.create({
            nombre: "Corta Cola",
            email: "cortacola@email.com",
            password_hash: "contrasenasegura",
            estado: "activo"
        })

        const nuevoTrabajador = await Trabajador.create({
            persona_id: nuevaPersona.id,
            empresa_id: nuevaEmpresa.id,
            fecha_ingreso: "2026-01-01",
            fecha_termino: "2026-12-31",
            estado: "activo"
        })

        const nuevoContratoTrabajo = await ContratoTrabajo.create({
            trabajador_id: nuevoTrabajador.id,
            tipo_contrato: "plazo_fijo",
            fecha_inicio: "2026-01-09",
            cargo_id: nuevoCargo.id,
            funciones: "tarjetero",
            lugar_prestacion_servicios: "mi casa 02",
            tipo_jornada: "completa",
            horas_semanales: "44",
            dias_trabajados: "30",
            sistema_remuneracion: "mensual",
            sueldo_base: "800000",
            periodicidad_pago: "mensual",
        })
        const nuevoContratoAnexo = await ContratoAnexo.create({
            contrato_id: nuevoContratoTrabajo.id,
            fecha_vigencia: "2026-09-09",
            campo_modificado: "cargo",
            valor_anterior: "tarjetero",
            valor_nuevo: "relojero",
            motivo: "ascenso",
            usuario_creo_id: nuevoUsuario.id
        })

        console.log ("proceso de contratacion exitoso")
    } catch (error) {
        console.log(error.message)
    }
}

TestContrato()