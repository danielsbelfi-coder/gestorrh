// Piezas compartidas de la verificación en dos pasos (activar-2fa.html y seguridad.html).
// Necesita api.js y modal.js.

// Muestra los códigos de recuperación una sola vez. La ventana no se cierra hasta confirmar que se guardaron.
function mostrarCodigosRecuperacion(codigos, alTerminar) {
    const texto = "GestorRH - códigos de recuperación de la verificación en dos pasos\n"
        + "Cada código sirve una sola vez, si no tienes tu celular.\n\n"
        + codigos.join("\n") + "\n"

    abrirModal({
        tipo: "info",
        titulo: "Códigos de recuperación",
        bloqueante: true,
        cuerpo: `<div class="modal-aviso"><strong>Se muestran una sola vez.</strong> Guárdalos en un lugar seguro, fuera del celular (por ejemplo, impresos o en tu gestor de contraseñas). Si pierdes el celular, cada código te deja entrar una vez.</div>
            <div class="credencial codigos-recuperacion">${codigos.map((codigo) => `<div class="credencial-valor">${escaparHtml(codigo)}</div>`).join("")}</div>
            <label class="credencial-confirma"><input type="checkbox" id="confirmaCodigos"> Ya guardé los códigos en un lugar seguro</label>`,
        botones: [
            {
                texto: "Copiar", clase: "secundario", mantener: true,
                accion: async (ventana, boton) => {
                    const copiado = await copiarAlPortapapeles(texto)
                    boton.textContent = copiado ? "¡Copiados!" : "No se pudo copiar"
                    setTimeout(() => { boton.textContent = "Copiar" }, 2000)
                }
            },
            {
                texto: "Descargar .txt", clase: "secundario", mantener: true,
                accion: () => {
                    const url = URL.createObjectURL(new Blob([texto], { type: "text/plain" }))
                    const enlace = document.createElement("a")
                    enlace.href = url
                    enlace.download = "gestorrh-codigos-recuperacion.txt"
                    enlace.click()
                    setTimeout(() => URL.revokeObjectURL(url), 1000)
                }
            },
            {
                texto: "Continuar",
                requiere: (ventana) => ventana.querySelector("#confirmaCodigos").checked,
                accion: () => alTerminar?.()
            }
        ]
    })
}

// Ventana que pide datos (código, contraseña) y llama a "enviar" con ellos. Si "enviar" devuelve un texto,
// es un error: se muestra y la ventana sigue abierta para corregir.
function pedirDatos({ titulo, explicacion, campos, textoBoton, clase = "info", enviar }) {
    const camposHtml = campos.map((campo) => `<label>${escaparHtml(campo.etiqueta)}
        <input id="${campo.id}" type="${campo.tipo ?? "text"}" autocomplete="${campo.autocompletar ?? "off"}"${campo.numerico ? ' inputmode="numeric"' : ""}></label>`).join("")

    abrirModal({
        tipo: clase,
        titulo,
        cuerpo: `<p>${escaparHtml(explicacion)}</p>${camposHtml}<p class="modal-ayuda" id="errorModal" role="alert"></p>`,
        botones: [
            { texto: "Cancelar", clase: "secundario" },
            {
                texto: textoBoton, mantener: true,
                requiere: (ventana) => campos.every((campo) => ventana.querySelector(`#${campo.id}`).value.trim() !== ""),
                accion: async (ventana, boton) => {
                    boton.disabled = true
                    const valores = Object.fromEntries(campos.map((campo) => [campo.id, ventana.querySelector(`#${campo.id}`).value]))
                    const error = await enviar(valores)
                    if (typeof error === "string") {
                        ventana.querySelector("#errorModal").textContent = error
                        boton.disabled = false
                        return
                    }
                    ventana.closest(".modal-fondo").remove()
                }
            }
        ]
    })
}
