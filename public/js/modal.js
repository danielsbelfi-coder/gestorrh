// Ventanas de confirmación compartidas (cierre y reapertura de periodos, entrega de contraseñas, corrección de accesos).
// Necesita api.js (escaparHtml) y css/modal.css.

// Muestra una ventana. Cada botón es { texto, clase, accion, requiere, mantener }:
//  - requiere: función que dice si el botón ya se puede pulsar;
//  - mantener: true para que la ventana siga abierta después de pulsarlo (por ejemplo "Copiar").
// bloqueante: true → no se cierra con Escape ni se puede abandonar la página sin avisar (para datos que no se vuelven a mostrar).
function abrirModal({ tipo, titulo, cuerpo, botones, bloqueante = false }) {
    const fondo = document.createElement("div")
    fondo.className = "modal-fondo"
    fondo.setAttribute("role", "dialog")
    fondo.setAttribute("aria-modal", "true")

    const ventana = document.createElement("div")
    ventana.className = `modal ${tipo}`
    ventana.innerHTML = `<h2>${escaparHtml(titulo)}</h2>${cuerpo}<div class="modal-botones"></div>`
    fondo.appendChild(ventana)

    const avisarAlSalir = (evento) => {
        evento.preventDefault()
        evento.returnValue = ""
    }
    const alTeclear = (evento) => {
        if (evento.key === "Escape" && !bloqueante) {
            cerrar()
        }
    }
    const cerrar = () => {
        fondo.remove()
        document.removeEventListener("keydown", alTeclear)
        window.removeEventListener("beforeunload", avisarAlSalir)
    }
    document.addEventListener("keydown", alTeclear)
    if (bloqueante) {
        window.addEventListener("beforeunload", avisarAlSalir)
    }

    const contenedor = ventana.querySelector(".modal-botones")
    const habilitables = []

    for (const definicion of botones) {
        const boton = document.createElement("button")
        boton.type = "button"
        boton.textContent = definicion.texto
        if (definicion.clase) {
            boton.className = definicion.clase
        }
        boton.addEventListener("click", async () => {
            if (!definicion.mantener) {
                cerrar()
            }
            if (definicion.accion) {
                await definicion.accion(ventana, boton)
            }
        })
        contenedor.appendChild(boton)
        if (definicion.requiere) {
            habilitables.push({ boton, requiere: definicion.requiere })
        }
    }

    const actualizar = () => {
        for (const { boton, requiere } of habilitables) {
            boton.disabled = !requiere(ventana)
        }
    }
    ventana.addEventListener("input", actualizar)
    actualizar()

    document.body.appendChild(fondo)
    ventana.querySelector("input, textarea, button")?.focus()
}

async function copiarAlPortapapeles(texto) {
    try {
        await navigator.clipboard.writeText(texto)
        return true
    } catch {
        // Navegador sin acceso directo al portapapeles: se usa un campo temporal.
        const campo = document.createElement("textarea")
        campo.value = texto
        campo.style.position = "fixed"
        campo.style.opacity = "0"
        document.body.appendChild(campo)
        campo.select()
        let copiado = false
        try {
            copiado = document.execCommand("copy")
        } catch {
            copiado = false
        }
        campo.remove()
        return copiado
    }
}

// Entrega de una contraseña inicial: se muestra grande, se puede copiar con un botón y la ventana
// no se cierra hasta que la persona confirma que la copió. Luego no se vuelve a mostrar.
function mostrarCredencial({ titulo, email, password, destinatario, nota }) {
    const avisarCopiado = (boton, textoOriginal, copiado) => {
        boton.textContent = copiado ? "¡Copiada!" : "No se pudo copiar: selecciónala"
        setTimeout(() => { boton.textContent = textoOriginal }, 2000)
    }

    abrirModal({
        tipo: "info",
        titulo,
        bloqueante: true,
        cuerpo: `<div class="modal-aviso"><strong>Se muestra una sola vez.</strong> Cópiala ahora y entrégala ${escaparHtml(destinatario ?? "a la persona")} por un canal seguro. Al entrar, el sistema le pedirá cambiarla.${nota ? ` ${escaparHtml(nota)}` : ""}</div>
            <div class="credencial">
                <div class="credencial-etiqueta">Correo</div>
                <div class="credencial-valor">${escaparHtml(email)}</div>
                <div class="credencial-etiqueta">Contraseña inicial</div>
                <div class="credencial-valor credencial-clave">${escaparHtml(password)}</div>
            </div>
            <label class="credencial-confirma"><input type="checkbox" id="confirmaCopia"> Ya copié la contraseña y la guardé en un lugar seguro</label>`,
        botones: [
            {
                texto: "Copiar contraseña", clase: "secundario", mantener: true,
                accion: async (ventana, boton) => avisarCopiado(boton, "Copiar contraseña", await copiarAlPortapapeles(password))
            },
            {
                texto: "Copiar correo y contraseña", clase: "secundario", mantener: true,
                accion: async (ventana, boton) => avisarCopiado(boton, "Copiar correo y contraseña", await copiarAlPortapapeles(`Correo: ${email}\nContraseña inicial: ${password}`))
            },
            { texto: "Listo", requiere: (ventana) => ventana.querySelector("#confirmaCopia").checked }
        ]
    })
}
