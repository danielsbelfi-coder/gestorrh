"use strict"

// Los totales guardados pasan a seguir el criterio de la liquidación impresa y del LRE:
// los descuentos imponibles (atrasos, inasistencias) rebajan el total de haberes y salen del total de descuentos.
// El líquido no cambia.
const DESCUENTOS_IMPONIBLES = `
    SELECT COALESCE(SUM(ll.monto), 0)
    FROM liquidacion_lineas ll
    WHERE ll.liquidacion_id = liquidaciones.id AND ll.tipo = 'descuento' AND ll.imponible = true`

module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            UPDATE liquidaciones
            SET total_haberes = total_haberes - (${DESCUENTOS_IMPONIBLES}),
                total_descuentos = total_descuentos - (${DESCUENTOS_IMPONIBLES})`)
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(`
            UPDATE liquidaciones
            SET total_haberes = total_haberes + (${DESCUENTOS_IMPONIBLES}),
                total_descuentos = total_descuentos + (${DESCUENTOS_IMPONIBLES})`)
    }
}
