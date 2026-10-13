const { UsuarioEmpresaRol, Rol } = require("./associations");
const { ForbiddenError } = require("./errors");

const PERMISOS = {
    REGISTRAR_ASISTENCIA: ["ADMIN", "JEFE_RRHH", "RRHH"],
    SOLICITAR_CORRECCION: ["ADMIN", "JEFE_RRHH", "RRHH", "SUPERVISOR"],
    APROBAR_CORRECCION: ["ADMIN", "JEFE_RRHH"],
    GESTIONAR_FICHAS: ["ADMIN", "JEFE_RRHH", "RRHH"],
    CREAR_ANEXO: ["ADMIN", "JEFE_RRHH", "RRHH"],
    FIRMAR_ANEXO: ["ADMIN", "JEFE_RRHH"],
    GESTIONAR_PERIODO: ["ADMIN", "JEFE_RRHH"],
    CALCULAR_LIQUIDACION: ["ADMIN", "JEFE_RRHH", "RRHH"],
    EDITAR_EMPRESA: ["ADMIN"]
}

async function exigirRol(usuarioId, empresaId, rolesPermitidos) {
    const vinculo = await UsuarioEmpresaRol.findOne({
        where: { usuario_id: usuarioId, empresa_id: empresaId, estado: "activo" },
        include: [Rol]
    })

    if (vinculo === null || !rolesPermitidos.includes(vinculo.Rol.codigo)) {
        throw new ForbiddenError("No tienes permisos para realizar esta acción")
    }
}

module.exports = {
    PERMISOS,
    exigirRol
}