const test = require("node:test")
const assert = require("node:assert/strict")
const p = require("../src/pendientes/armar_pendientes.js")

// Copia de la parte de PERMISOS que se usa (la real está en src/shared/permisos.js, que necesita la base de datos).
const PERMISOS = { FIRMAR_CONTRATO: ["ADMIN", "JEFE_RRHH"] }

const trabajador = { id: 5, empresa_id: 2, Empresa: { razon_social: "Alfa SpA", nombre_fantasia: null }, Persona: { nombres: "Ana", apellido_paterno: "Rojas", apellido_materno: null } }
const periodo = { id: 12, empresa_id: 2, mes: 7, anio: 2027 }

test("contrato y anexo: detalle legible, enlace a la ficha con la empresa y ruta de firma", () => {
    const c = p.deContrato({ id: 9, tipo_contrato: "plazo_fijo", fecha_inicio: "2027-07-01", Trabajador: trabajador })
    assert.equal(c.clave, "contrato-9")
    assert.equal(c.trabajador, "Ana Rojas")
    assert.equal(c.empresa, "Alfa SpA")
    assert.equal(c.detalle, "Plazo fijo, desde el 01-07-2027")
    assert.equal(c.enlace, "trabajador.html?id=5&empresa=2")
    assert.deepEqual(c.accion, { texto: "Firmar", metodo: "PATCH", ruta: "/api/contratos/9/firmar", cuerpo: {} })
    assert.equal(c.permiso, "FIRMAR_CONTRATO")

    const a = p.deAnexo({ id: 3, contrato_id: 9, campo_modificado: "sueldo_base", valor_anterior: "820000", valor_nuevo: "920000", fecha_vigencia: "2027-08-01", ContratoTrabajo: { Trabajador: trabajador } })
    assert.equal(a.detalle, "sueldo_base: 820000 → 920000, rige desde el 01-08-2027")
    assert.equal(a.accion.ruta, "/api/contratos/9/anexos/3/firmar")
    assert.equal(a.permiso, "FIRMAR_ANEXO")
})

test("marca y corrección: horario, mes del libro y ruta de aprobación", () => {
    const m = p.deMarca({ id: 40, tipo: "atraso", fecha: "2027-07-14", hora_entrada: "08:12:00", hora_salida: "18:00:00", Trabajador: trabajador })
    assert.equal(m.detalle, "Atraso del 14-07-2027 08:12 a 18:00")
    assert.equal(m.enlace, "libro.html?trabajador=5&mes=2027-07&empresa=2")
    assert.deepEqual(m.accion.cuerpo, { estado: "aprobada" })
    assert.equal(m.accion.ruta, "/api/asistencias/40/aprobacion")
    const sinHora = p.deMarca({ id: 41, tipo: "inasistencia", fecha: "2027-07-15", Trabajador: trabajador })
    assert.equal(sinHora.detalle, "Inasistencia del 15-07-2027")

    const c = p.deCorreccion({ id: 7, campo_modificado: "hora_entrada", valor_anterior: null, valor_nuevo: "08:00", Asistencia: { id: 40, fecha: "2027-07-14", Trabajador: trabajador } })
    assert.equal(c.detalle, "Cambiar hora_entrada de la marca del 14-07-2027: (vacío) → 08:00")
    assert.equal(c.accion.ruta, "/api/asistencias/40/correcciones/7/aprobar")
    assert.equal(c.permiso, "APROBAR_CORRECCION")
})

test("variable y resumen: valores del mes y enlace al periodo", () => {
    const v = p.deVariable({ id: 6, monto: 60000, cantidad: null, glosa: "Meta julio", PeriodoRemuneracion: periodo, Trabajador: trabajador, ConceptoRemuneracion: { nombre: "Bono de producción" } })
    assert.equal(v.detalle, "Bono de producción: $60.000 (07-2027) · Meta julio")
    assert.equal(v.enlace, "variables.html?periodo=12&empresa=2")
    assert.equal(v.fecha, "2027-07-01")
    const h = p.deVariable({ id: 8, monto: null, cantidad: "4.70", PeriodoRemuneracion: periodo, Trabajador: trabajador, ConceptoRemuneracion: { nombre: "Horas extra 50%" } })
    assert.equal(h.detalle, "Horas extra 50%: 4,7 h (07-2027)")

    const r = p.deResumen({ id: 1, dias_inasistencia: 1, dias_licencia_medica: 2, dias_permiso_sin_goce: 0, dias_vacaciones: 0, minutos_atraso: 30, PeriodoRemuneracion: periodo, Trabajador: trabajador })
    assert.equal(r.detalle, "Mes 07-2027: 1 d inasistencia, 2 d licencia, 30 min de atraso")
    assert.equal(r.accion.ruta, "/api/resumenes-asistencia/1/aprobar")
    const limpio = p.deResumen({ id: 2, dias_inasistencia: 0, dias_licencia_medica: 0, dias_permiso_sin_goce: 0, dias_vacaciones: 0, minutos_atraso: 0, PeriodoRemuneracion: periodo, Trabajador: trabajador })
    assert.equal(limpio.detalle, "Mes 07-2027: sin ausencias ni atrasos")
})

test("puedeActuar según el rol en la empresa del pendiente", () => {
    const item = { empresa_id: 2, permiso: "FIRMAR_CONTRATO" }
    assert.equal(p.puedeActuar(item, { 2: "ADMIN" }, PERMISOS), true)
    assert.equal(p.puedeActuar(item, { 2: "JEFE_RRHH" }, PERMISOS), true)
    assert.equal(p.puedeActuar(item, { 2: "RRHH" }, PERMISOS), false)
    // Admin en otra empresa no cuenta; soporte no tiene roles.
    assert.equal(p.puedeActuar(item, { 3: "ADMIN" }, PERMISOS), false)
    assert.equal(p.puedeActuar(item, {}, PERMISOS), false)
    assert.equal(p.puedeActuar({ empresa_id: 2, permiso: "INEXISTENTE" }, { 2: "ADMIN" }, PERMISOS), false)
})

test("ordenar: más antiguos primero", () => {
    const lista = [{ fecha: "2027-08-01", clave: "a-1" }, { fecha: "2027-07-01", clave: "b-2" }, { fecha: "2027-07-01", clave: "a-3" }]
    assert.deepEqual(p.ordenar(lista).map((i) => i.clave), ["a-3", "b-2", "a-1"])
})

test("deSaldo: borrador se vuelve a calcular; emitida se recalcula con motivo fijo", () => {
    const armarP = require("../src/pendientes/armar_pendientes.js")
    const trabajador = { id: 7, empresa_id: 3, Persona: { nombres: "Ana", apellido_paterno: "Soto" }, Empresa: { razon_social: "Emp" } }
    const periodo = { id: 12, empresa_id: 3, mes: 10, anio: 2026 }
    const borrador = armarP.deSaldo({ id: 50, trabajador_id: 7, estado: "calculada", Trabajador: trabajador, PeriodoRemuneracion: periodo }, { guardado: 0, actual: 120000 })
    assert.equal(borrador.tipo, "saldo")
    assert.equal(borrador.permiso, "CALCULAR_LIQUIDACION")
    assert.deepEqual(borrador.accion, { texto: "Recalcular", metodo: "POST", ruta: "/api/periodos-remuneracion/12/liquidaciones", cuerpo: { trabajador_id: 7 } })
    assert.match(borrador.detalle, /\$0 y ahora es \$120\.000/)
    const emitida = armarP.deSaldo({ id: 50, trabajador_id: 7, estado: "emitida", Trabajador: trabajador, PeriodoRemuneracion: periodo }, { guardado: 0, actual: 1 })
    assert.equal(emitida.accion.ruta, "/api/periodos-remuneracion/12/liquidaciones/50/recalcular")
    assert.equal(emitida.accion.cuerpo.motivo, armarP.MOTIVO_SALDO)
})

test("deFiniquitoSaldo: recalcula el finiquito con los datos guardados", () => {
    const armarP = require("../src/pendientes/armar_pendientes.js")
    const trabajador = { id: 7, empresa_id: 3, fecha_termino: "2026-11-30", Persona: { nombres: "Ana", apellido_paterno: "Soto" }, Empresa: { razon_social: "Emp" } }
    const item = armarP.deFiniquitoSaldo({ id: 9, Trabajador: trabajador }, { guardado: 50000, actual: 0 })
    assert.equal(item.tipo, "finiquito_saldo")
    assert.equal(item.permiso, "GESTIONAR_FINIQUITOS")
    assert.deepEqual(item.accion, { texto: "Recalcular", metodo: "POST", ruta: "/api/finiquitos/9/recalcular", cuerpo: {} })
    assert.match(item.detalle, /30-11-2026.*\$50\.000.*\$0/)
})
