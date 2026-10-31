const test = require("node:test")
const assert = require("node:assert/strict")
const { armarAnexo, textoModificacion } = require("../src/contratos/armar_anexo.js")

const persona = { nombres: "Carla", apellido_paterno: "Plazo", apellido_materno: null, rut: "12345678", dv: "5", sexo_genero: "femenino", direccion: "Calle 1" }
const empresa = { razon_social: "C8 SpA", rut: "77300000", dv: "1", representante_legal_nombre: "R", representante_legal_rut: "11.111.111-1", direccion: "Calle 2", comuna: "13101" }

test("anexo de paso a indefinido: el contrato original y la modificación desde la vigencia", () => {
    const d = armarAnexo({
        anexo: { id: 4, campo_modificado: "tipo_contrato", valor_anterior: "plazo_fijo", valor_nuevo: "indefinido", fecha_vigencia: "2026-10-16", fecha_firma: "2026-10-20T15:00:00Z", estado_firma: "firmado" },
        contrato: { fecha_inicio: "2026-08-01" },
        tipoOriginal: "plazo_fijo",
        persona, empresa, cargo: "Bodeguero"
    })
    assert.equal(d.titulo, "ANEXO DE CONTRATO DE TRABAJO")
    assert.match(d.lugarFecha, /20 de octubre de 2026/)
    assert.match(d.clausulas[0].texto, /1 de agosto de 2026 un contrato de trabajo a plazo fijo/)
    assert.match(d.clausulas[1].texto, /a contar del 16 de octubre de 2026, el contrato de trabajo individual pasa a ser de duración indefinida/)
    assert.match(d.clausulas[2].texto, /no modificado por el presente anexo/)
    assert.equal(d.firmas.trabajador.rut, "12.345.678-5")
})

test("textoModificacion: renovación y sueldo", () => {
    assert.match(textoModificacion({ campo_modificado: "fecha_termino", valor_nuevo: "2026-12-31", fecha_vigencia: "2026-10-16" }), /durará hasta el 31 de diciembre de 2026/)
    assert.match(textoModificacion({ campo_modificado: "sueldo_base", valor_nuevo: "950000", fecha_vigencia: "2026-11-01" }), /\$950\.000/)
})
