// Roles que se asignan a usuarios que ya existen en la cuenta al crear una empresa (corrección tras la prueba 1, C4).
// Función pura: valida la lista y devuelve los vínculos por crear. No crea usuarios nuevos.
//
// asignaciones: [{ usuario_id, rol }] (rol vacío = sin acceso a la empresa; se ignora).
// usuariosDeLaCuenta: [{ id, nombre, estado }] — los de la cuenta de quien crea la empresa.
// El creador queda siempre como ADMIN de la empresa nueva: si viene en la lista, se ignora.

function validarRolesIniciales(asignaciones, usuariosDeLaCuenta, creadorId, rolesAsignables) {
    if (asignaciones === undefined || asignaciones === null) {
        return { roles: [], errores: [] }
    }
    if (!Array.isArray(asignaciones)) {
        return { roles: [], errores: ["Los roles de los usuarios deben ser una lista"] }
    }

    const errores = []
    const roles = []
    const vistos = new Set()

    for (const asignacion of asignaciones) {
        const usuarioId = Number(asignacion?.usuario_id)
        const rol = typeof asignacion?.rol === "string" ? asignacion.rol.trim() : asignacion?.rol

        if (rol === undefined || rol === null || rol === "") {
            continue
        }
        if (usuarioId === Number(creadorId)) {
            continue
        }

        const usuario = usuariosDeLaCuenta.find((u) => Number(u.id) === usuarioId)
        if (!Number.isInteger(usuarioId) || usuario === undefined) {
            errores.push(`El usuario ${asignacion?.usuario_id} no existe en la cuenta`)
            continue
        }
        if (usuario.estado !== "activo") {
            errores.push(`El usuario ${usuario.nombre} está inactivo: reactívalo antes de darle acceso`)
            continue
        }
        if (!rolesAsignables.includes(rol)) {
            errores.push(`El rol «${rol}» no se puede asignar (roles válidos: ${rolesAsignables.join(", ")})`)
            continue
        }
        if (vistos.has(usuarioId)) {
            errores.push(`El usuario ${usuario.nombre} viene más de una vez`)
            continue
        }

        vistos.add(usuarioId)
        roles.push({ usuario_id: usuarioId, rol })
    }

    return { roles, errores }
}

module.exports = { validarRolesIniciales }
