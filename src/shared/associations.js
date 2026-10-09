const { Asistencia } = require("../asistencia/asistencia.model");
const { AsistenciaCorreccion } = require("../asistencia/asistencia_correccion.model");
const { ContratoTrabajo } = require("../contratos/contrato.model");
const { ContratoAnexo } = require("../contratos/contrato_anexo.model");
const { Cargo } = require("../empresas/cargo.model");
const { Empresa } = require("../empresas/empresa.model");
const { Persona } = require("../trabajadores/persona.model");
const { Trabajador } = require("../trabajadores/trabajador.model");
const { Usuario } = require("../usuarios/usuario.model");
const { ParametroLegal } = require("../remuneraciones/parametro_legal.model");
const { PeriodoRemuneracion } = require("../remuneraciones/periodo_remuneracion.model");
const { Liquidacion } = require("../remuneraciones/liquidacion.model");
const { UsuarioEmpresaRol } = require("../usuarios/usuario_empresa_rol.model")
const { Rol } = require("../usuarios/rol.model")
const { TramoImpuesto } = require("../remuneraciones/tramo_impuesto.model.js")
const { Afp } = require("../remuneraciones/afp.model.js")
const { Isapre } = require("../remuneraciones/isapre.model.js")


Trabajador.belongsTo(Persona, {
    foreignKey: "persona_id"
})

Persona.hasMany(Trabajador, {
    foreignKey: "persona_id"
})

Trabajador.belongsTo(Empresa, {
    foreignKey: "empresa_id"
})

Empresa.hasMany(Trabajador, {
    foreignKey: "empresa_id"
})

Cargo.belongsTo(Empresa, {
    foreignKey: "empresa_id"
})

Empresa.hasMany(Cargo, {
    foreignKey: "empresa_id"
})

ContratoTrabajo.belongsTo(Trabajador, {
    foreignKey: "trabajador_id"
})

Trabajador.hasMany(ContratoTrabajo, {
    foreignKey: "trabajador_id"
})

ContratoTrabajo.belongsTo(Cargo, {
    foreignKey: "cargo_id"
})

Cargo.hasMany(ContratoTrabajo, {
    foreignKey: "cargo_id"
})

ContratoAnexo.belongsTo(ContratoTrabajo, {
    foreignKey: "contrato_id"
})

ContratoTrabajo.hasMany(ContratoAnexo, {
    foreignKey: "contrato_id"
})

ContratoAnexo.belongsTo(Usuario, {
    foreignKey: "usuario_creo_id"
})
Usuario.hasMany(ContratoAnexo, {
    foreignKey: "usuario_creo_id"
})
AsistenciaCorreccion.belongsTo(Usuario, {
    foreignKey: "usuario_solicito_id", as: "solicitante"
})
AsistenciaCorreccion.belongsTo(Usuario, {
    foreignKey: "aprobado_por_id", as: "aprobador"
})
Usuario.hasMany(AsistenciaCorreccion, {
    foreignKey: "usuario_solicito_id", as: "correccionesSolicitadas"
})
Usuario.hasMany(AsistenciaCorreccion, {
    foreignKey: "aprobado_por_id", as: "correccionesAprobadas"
})
Asistencia.belongsTo(Trabajador, {
    foreignKey: "trabajador_id"
})
Trabajador.hasMany(Asistencia, {
    foreignKey: "trabajador_id"
})
Asistencia.belongsTo(Usuario, {
    foreignKey: "usuario_registro_id"
})
Usuario.hasMany(Asistencia, {
    foreignKey: "usuario_registro_id"
})
AsistenciaCorreccion.belongsTo(Asistencia, {
    foreignKey: "asistencia_id"
})
Asistencia.hasMany(AsistenciaCorreccion, {
    foreignKey: "asistencia_id"
})
PeriodoRemuneracion.belongsTo(Empresa, {
    foreignKey: "empresa_id"
})
Empresa.hasMany(PeriodoRemuneracion, {
    foreignKey: "empresa_id"
})
Liquidacion.belongsTo(PeriodoRemuneracion, {
    foreignKey: "periodo_id"
})
PeriodoRemuneracion.hasMany(Liquidacion, {
    foreignKey: "periodo_id"
})
Liquidacion.belongsTo(Trabajador, {
    foreignKey: "trabajador_id"
})
Trabajador.hasMany(Liquidacion, {
    foreignKey: "trabajador_id"
})
UsuarioEmpresaRol.belongsTo(Usuario, {
    foreignKey: "usuario_id"
})
Usuario.hasMany(UsuarioEmpresaRol, {
    foreignKey: "usuario_id"
})
UsuarioEmpresaRol.belongsTo(Empresa, {
    foreignKey: "empresa_id"
})
Empresa.hasMany(UsuarioEmpresaRol, {
    foreignKey: "empresa_id"
})
UsuarioEmpresaRol.belongsTo(Rol, {
    foreignKey: "rol_id"
})
Rol.hasMany(UsuarioEmpresaRol, {
    foreignKey: "rol_id"
})
Persona.belongsTo(Afp, {
    foreignKey: "afp_id"
})
Afp.hasMany(Persona, {
    foreignKey: "afp_id"
})
Persona.belongsTo(Isapre, {
    foreignKey: "isapre_id"
})
Isapre.hasMany(Persona, {
    foreignKey: "isapre_id"
})
Persona.belongsTo(Empresa, {
    foreignKey: "empresa_id"
})

Empresa.hasMany(Persona, {
    foreignKey: "empresa_id"
})

module.exports = {
    Empresa,
    Persona,
    Trabajador,
    Cargo,
    ContratoTrabajo,
    ContratoAnexo,
    Usuario,
    Asistencia,
    AsistenciaCorreccion,
    ParametroLegal,
    PeriodoRemuneracion,
    Liquidacion,
    UsuarioEmpresaRol,
    Rol,
    TramoImpuesto,
    Afp,
    Isapre
}