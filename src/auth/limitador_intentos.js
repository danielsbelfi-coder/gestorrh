// Limitador de intentos fallidos en memoria. Sirve para frenar la adivinación de contraseñas.
//
// Cuenta los fallos de una clave (un email o una IP) dentro de una ventana de tiempo. Al llegar al máximo,
// la clave queda bloqueada un rato. Un acierto borra el contador de esa clave.
// Es por proceso: al reiniciar el servidor los contadores parten de cero, y con varias instancias cada una
// cuenta por su lado. Para una sola instancia (la etapa actual) es suficiente.

class LimitadorIntentos {
    constructor({ maxIntentos, ventanaMs, bloqueoMs, ahora = () => Date.now(), maxClaves = 10000 }) {
        this.maxIntentos = maxIntentos
        this.ventanaMs = ventanaMs
        this.bloqueoMs = bloqueoMs
        this.ahora = ahora
        this.maxClaves = maxClaves
        this.registros = new Map()
    }

    // Milisegundos que faltan para que termine el bloqueo (0 si no está bloqueada).
    bloqueadoPorMs(clave) {
        const registro = this.registros.get(clave)
        if (!registro || registro.bloqueadoHasta === null) {
            return 0
        }
        const falta = registro.bloqueadoHasta - this.ahora()
        if (falta <= 0) {
            this.registros.delete(clave)
            return 0
        }
        return falta
    }

    registrarFallo(clave) {
        const ahora = this.ahora()
        let registro = this.registros.get(clave)

        if (!registro || ahora - registro.desde > this.ventanaMs) {
            registro = { desde: ahora, fallos: 0, bloqueadoHasta: null }
        }

        registro.fallos++
        if (registro.fallos >= this.maxIntentos) {
            registro.bloqueadoHasta = ahora + this.bloqueoMs
        }

        this.registros.set(clave, registro)
        this.#podar()
    }

    reiniciar(clave) {
        this.registros.delete(clave)
    }

    // Evita que el mapa crezca sin límite si alguien prueba millones de emails distintos.
    #podar() {
        if (this.registros.size <= this.maxClaves) {
            return
        }
        const ahora = this.ahora()
        for (const [clave, registro] of this.registros) {
            const vencido = registro.bloqueadoHasta !== null ? registro.bloqueadoHasta <= ahora : ahora - registro.desde > this.ventanaMs
            if (vencido) {
                this.registros.delete(clave)
            }
        }
        // Si aún así sigue lleno, se descartan los más antiguos (el orden del Map es el de inserción).
        while (this.registros.size > this.maxClaves) {
            this.registros.delete(this.registros.keys().next().value)
        }
    }
}

module.exports = { LimitadorIntentos }
