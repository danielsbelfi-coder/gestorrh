const { QueryTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")
const {
    Empresa, Cargo, Persona, Trabajador, ContratoTrabajo, ContratoAnexo,
    Asistencia, AsistenciaCorreccion, PeriodoRemuneracion, Liquidacion,
    ConceptoRemuneracion, VariablePeriodo,
    ResumenAsistencia, LiquidacionLinea, LicenciaMedica, SituacionPrevisional, PrevisionPersona, CargaFamiliar, TramoAsignacionPersona, AhorroVoluntario,
    Finiquito, Jornada, PeriodoReapertura, AccesoSoporte, RegistroSoporte
} = require("../shared/associations.js")
const { generarCsv } = require("./csv.js")

const TRABAJADORES_DE_EMPRESA = "SELECT id FROM trabajadores WHERE empresa_id = :empresaId"

const TABLAS = [
    { archivo: "empresa.csv", modelo: Empresa, filtro: "id = :empresaId" },
    { archivo: "cargos.csv", modelo: Cargo, filtro: "empresa_id = :empresaId" },
    { archivo: "jornadas.csv", modelo: Jornada, filtro: "empresa_id = :empresaId" },
    { archivo: "conceptos_propios.csv", modelo: ConceptoRemuneracion, filtro: "empresa_id = :empresaId" },
    { archivo: "personas.csv", modelo: Persona, filtro: "empresa_id = :empresaId" },
    { archivo: "situaciones_previsionales.csv", modelo: SituacionPrevisional, filtro: "persona_id IN (SELECT id FROM personas WHERE empresa_id = :empresaId)" },
    { archivo: "previsiones_persona.csv", modelo: PrevisionPersona, filtro: "persona_id IN (SELECT id FROM personas WHERE empresa_id = :empresaId)" },
    { archivo: "tramos_asignacion.csv", modelo: TramoAsignacionPersona, filtro: "persona_id IN (SELECT id FROM personas WHERE empresa_id = :empresaId)" },
    { archivo: "cargas_familiares.csv", modelo: CargaFamiliar, filtro: "persona_id IN (SELECT id FROM personas WHERE empresa_id = :empresaId)" },
    { archivo: "ahorros_voluntarios.csv", modelo: AhorroVoluntario, filtro: "persona_id IN (SELECT id FROM personas WHERE empresa_id = :empresaId)" },
    { archivo: "trabajadores.csv", modelo: Trabajador, filtro: "empresa_id = :empresaId" },
    { archivo: "contratos.csv", modelo: ContratoTrabajo, filtro: `trabajador_id IN (${TRABAJADORES_DE_EMPRESA})` },
    { archivo: "anexos.csv", modelo: ContratoAnexo, filtro: `contrato_id IN (SELECT id FROM contratos_trabajo WHERE trabajador_id IN (${TRABAJADORES_DE_EMPRESA}))` },
    { archivo: "asistencias.csv", modelo: Asistencia, filtro: `trabajador_id IN (${TRABAJADORES_DE_EMPRESA})` },
    { archivo: "correcciones_asistencia.csv", modelo: AsistenciaCorreccion, filtro: `asistencia_id IN (SELECT id FROM asistencias WHERE trabajador_id IN (${TRABAJADORES_DE_EMPRESA}))` },
    { archivo: "licencias_medicas.csv", modelo: LicenciaMedica, filtro: `trabajador_id IN (${TRABAJADORES_DE_EMPRESA})` },
    { archivo: "periodos_remuneracion.csv", modelo: PeriodoRemuneracion, filtro: "empresa_id = :empresaId" },
    { archivo: "reaperturas_periodo.csv", modelo: PeriodoReapertura, filtro: "periodo_id IN (SELECT id FROM periodos_remuneracion WHERE empresa_id = :empresaId)" },
    { archivo: "variables_periodo.csv", modelo: VariablePeriodo, filtro: `trabajador_id IN (${TRABAJADORES_DE_EMPRESA})` },
    { archivo: "resumenes_asistencia.csv", modelo: ResumenAsistencia, filtro: `trabajador_id IN (${TRABAJADORES_DE_EMPRESA})` },
    { archivo: "liquidaciones.csv", modelo: Liquidacion, filtro: `trabajador_id IN (${TRABAJADORES_DE_EMPRESA})` },
    { archivo: "liquidacion_lineas.csv", modelo: LiquidacionLinea, filtro: `liquidacion_id IN (SELECT id FROM liquidaciones WHERE trabajador_id IN (${TRABAJADORES_DE_EMPRESA}))` },
    { archivo: "finiquitos.csv", modelo: Finiquito, filtro: `trabajador_id IN (${TRABAJADORES_DE_EMPRESA})` },
    { archivo: "accesos_soporte.csv", modelo: AccesoSoporte, filtro: "empresa_id = :empresaId" },
    // Incluye los restablecimientos de contraseña o de acceso (van asociados a la cuenta, no a una empresa). Sin la IP del personal de soporte.
    { archivo: "registro_soporte.csv", modelo: RegistroSoporte, excluir: ["ip"], filtro: "(empresa_id = :empresaId OR (tipo IN ('restablecer_password', 'restablecer_acceso') AND cuenta_id = (SELECT cuenta_id FROM empresas WHERE id = :empresaId)))" },
]

async function generarArchivosEmpresa(empresaId) {
    const archivos = []

    for (const tabla of TABLAS) {
        const columnas = Object.keys(tabla.modelo.getAttributes()).filter((columna) => !(tabla.excluir ?? []).includes(columna))

        const filas = await sequelize.query(
            `SELECT * FROM "${tabla.modelo.getTableName()}" WHERE ${tabla.filtro} ORDER BY id`,
            { replacements: { empresaId }, type: QueryTypes.SELECT }
        )

        archivos.push({ nombre: tabla.archivo, contenido: generarCsv(columnas, filas) })
    }

    return archivos
}

module.exports = { generarArchivosEmpresa }