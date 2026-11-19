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

test("anexo sin firmar: la fecha de suscripción sale de la creación (un Date) y no queda «undefined»", () => {
    const d = armarAnexo({
        anexo: { id: 5, campo_modificado: "sueldo_base", valor_anterior: "800000", valor_nuevo: "850000", fecha_vigencia: "2026-12-01", fecha_firma: null, createdAt: new Date("2026-11-16T15:00:00Z"), estado_firma: "pendiente" },
        contrato: { fecha_inicio: "2026-08-01" },
        tipoOriginal: "indefinido",
        persona, empresa, cargo: "Bodeguero"
    })
    assert.match(d.lugarFecha, /a 16 de noviembre de 2026$/)
    assert.doesNotMatch(JSON.stringify(d), /undefined|NaN/)
})

test("anexo firmado hoy: fecha_firma como Date en memoria (recién guardado) también sale bien", () => {
    const d = armarAnexo({
        anexo: { id: 6, campo_modificado: "sueldo_base", valor_nuevo: "850000", fecha_vigencia: "2026-12-01", fecha_firma: new Date("2026-11-17T01:30:00Z"), estado_firma: "firmado" },
        contrato: { fecha_inicio: "2026-08-01" },
        tipoOriginal: "indefinido",
        persona, empresa, cargo: "Bodeguero"
    })
    // 01:30 UTC del 17 son las 22:30 del 16 en Chile (UTC-3 en verano): la fecha es la chilena.
    assert.match(d.lugarFecha, /a 16 de noviembre de 2026$/)
})

test("textoModificacion: cambio de la obra, faena o hito de un contrato por obra", () => {
    const texto = textoModificacion({ campo_modificado: "obra_faena_descripcion", valor_nuevo: "el término de las terminaciones del piso 3", fecha_vigencia: "2027-02-15" })
    assert.match(texto, /a contar del 15 de febrero de 2027, el contrato por obra o faena durará hasta: el término de las terminaciones del piso 3\./)
})
