const { test } = require("node:test")
const assert = require("node:assert")
const { armarContrato } = require("../src/contratos/armar_contrato.js")

function contratoDe(funciones) {
    return armarContrato({
        contrato: {
            tipo_contrato: "indefinido", funciones, lugar_prestacion_servicios: "Av. Los Aromos 3300", tipo_jornada: "completa",
            horas_semanales: 42, dias_trabajados: 5, sistema_remuneracion: "mensual", sueldo_base: 560000, periodicidad_pago: "mensual"
        },
        persona: { nombres: "Constanza", apellido_paterno: "Vidal", rut: "30127775", dv: "K", direccion: "Calle 1", sexo_genero: "femenino", sistema_salud: "Fonasa" },
        empresa: { rut: "39502222", dv: "9", razon_social: "Panadería Los Aromos SpA", direccion: "Av. Los Aromos 3300" },
        cargo: "Vendedor(a) y cajero(a)",
        trabajador: { fecha_ingreso: "2022-02-01" },
        afp: { nombre: "AFP Modelo" },
        isapre: null,
        situacion: null
    })
}

function textoCompleto(documento) {
    return JSON.stringify(documento)
}

test("con funciones, el contrato las indica entre paréntesis después del cargo", () => {
    assert.match(textoCompleto(contratoDe("Atención de público y caja")), /funciones de VENDEDOR\(A\) Y CAJERO\(A\) \(Atención de público y caja\) y labores complementarias/)
})

test("sin funciones (vacías, nulas o en blanco), el contrato indica solo el cargo", () => {
    for (const vacio of [null, undefined, ""]) {
        const texto = textoCompleto(contratoDe(vacio))
        assert.match(texto, /funciones de VENDEDOR\(A\) Y CAJERO\(A\) y labores complementarias/)
        assert.doesNotMatch(texto, /\(null\)|\(undefined\)|\(\)/)
    }
})
