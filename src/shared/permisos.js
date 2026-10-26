const { UsuarioEmpresaRol, Rol, Empresa, Cuenta } = require("./associations");
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
    EMITIR_LIQUIDACION: ["ADMIN", "JEFE_RRHH"],
    CONFIGURAR_CONCEPTOS: ["ADMIN", "JEFE_RRHH"],
    EDITAR_EMPRESA: ["ADMIN"],
    REGISTRAR_VARIABLES: ["ADMIN", "JEFE_RRHH", "RRHH"],
    APROBAR_VARIABLES: ["ADMIN", "JEFE_RRHH"],
}

async function exigirRol(usuarioId, empresaId, rolesPermitidos) {
    const vinculo = await UsuarioEmpresaRol.findOne({
        where: { usuario_id: usuarioId, empresa_id: empresaId, estado: "activo" },
        include: [Rol]
    })

    if (vinculo === null || !rolesPermitidos.includes(vinculo.Rol.codigo)) {
        throw new ForbiddenError("No tienes permisos para realizar esta acción")
    }

    const empresa = await Empresa.findByPk(empresaId, {
        include: [Cuenta]
    })

    if (empresa.Cuenta.estado !== "activa") {
        throw new ForbiddenError("La cuenta no está activa: solo se permite consultar información")
    }

    if (empresa.estado !== "activa") {
        throw new ForbiddenError("La empresa está inactiva: solo se permite consultar información")
    }
}

async function exigirCuentaActiva(cuentaId) {
    const cuenta = await Cuenta.findByPk(cuentaId)

    if (cuenta.estado !== "activa") {
        throw new ForbiddenError("La cuenta no está activa: solo se permite consultar información")
    }
}

module.exports = {
    PERMISOS,
    exigirRol,
    exigirCuentaActiva
}