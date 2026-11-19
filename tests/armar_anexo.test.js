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
    assert.match(d.lugarFecha, /16 de octubre de 2026/)
    assert.match(d.clausulas[0].texto, /1 de agosto de 2026 un contrato de trabajo a plazo fijo/)
    assert.match(d.clausulas[1].texto, /a contar del 16 de octubre de 2026, el contrato de trabajo individual pasa a ser de duración indefinida/)
    assert.match(d.clausulas[2].texto, /no modificado por el presente anexo/)
    assert.equal(d.firmas.trabajador.rut, "12.345.678-5")
})

test("textoModificacion: renovación y sueldo", () => {
    assert.match(textoModificacion({ campo_modificado: "fecha_termino", valor_nuevo: "2026-12-31", fecha_vigencia: "2026-10-16" }), /a contar del 16 de octubre de 2026, continuará vigente hasta el 31 de diciembre de 2026/)
    assert.match(textoModificacion({ campo_modificado: "sueldo_base", valor_nuevo: "950000", fecha_vigencia: "2026-11-01" }), /\$950\.000/)
})

test("el anexo se fecha con su vigencia, pendiente o firmado, y no queda «undefined»", () => {
    const pendiente = armarAnexo({
        anexo: { id: 5, campo_modificado: "sueldo_base", valor_anterior: "800000", valor_nuevo: "850000", fecha_vigencia: "2026-12-01", fecha_firma: null, createdAt: new Date("2026-11-16T15:00:00Z"), estado_firma: "pendiente" },
        contrato: { fecha_inicio: "2026-08-01" },
        tipoOriginal: "indefinido",
        persona, empresa, cargo: "Bodeguero"
    })
    assert.match(pendiente.lugarFecha, /a 1 de diciembre de 2026$/)
    assert.doesNotMatch(JSON.stringify(pendiente), /undefined|NaN/)
    const firmado = armarAnexo({
        anexo: { id: 6, campo_modificado: "sueldo_base", valor_nuevo: "850000", fecha_vigencia: "2026-12-01", fecha_firma: new Date("2026-11-17T01:30:00Z"), estado_firma: "firmado" },
        contrato: { fecha_inicio: "2026-08-01" },
        tipoOriginal: "indefinido",
        persona, empresa, cargo: "Bodeguero"
    })
    assert.match(firmado.lugarFecha, /a 1 de diciembre de 2026$/)
})

test("textoModificacion: cambio de la obra, faena o hito de un contrato por obra", () => {
    const texto = textoModificacion({ campo_modificado: "obra_faena_descripcion", valor_nuevo: "el término de las terminaciones del piso 3", fecha_vigencia: "2027-02-15" })
    assert.match(texto, /a contar del 15 de febrero de 2027, el contrato por obra o faena durará hasta: el término de las terminaciones del piso 3\./)
})

test("renovación: nombra el término que se prorroga y rige desde él", () => {
    const texto = textoModificacion({ campo_modificado: "fecha_termino", valor_anterior: "2027-01-31", valor_nuevo: "2027-04-30", fecha_vigencia: "2027-01-31" })
    assert.match(texto, /cuyo término estaba pactado para el 31 de enero de 2027, de modo que, a contar de esa fecha, continuará vigente hasta el 30 de abril de 2027/)
    const otra = textoModificacion({ campo_modificado: "fecha_termino", valor_anterior: "2027-01-31", valor_nuevo: "2027-04-30", fecha_vigencia: "2027-01-20" })
    assert.match(otra, /a contar del 20 de enero de 2027, continuará vigente/)
})

test("renovación de Sofía: el documento sale fechado el 31 de enero de 2027, aunque se firmó en el sistema en 2026", () => {
    const d = armarAnexo({
        anexo: { id: 7, campo_modificado: "fecha_termino", valor_anterior: "2027-01-31", valor_nuevo: "2027-04-30", fecha_vigencia: "2027-01-31", fecha_firma: "2026-11-19", createdAt: new Date("2026-11-19T15:00:00Z"), estado_firma: "firmado" },
        contrato: { fecha_inicio: "2026-11-02" }, tipoOriginal: "plazo_fijo", persona, empresa, cargo: "Bodeguera"
    })
    assert.match(d.lugarFecha, /a 31 de enero de 2027$/)
})
