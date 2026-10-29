# Tutorial de GestorRH

Guía para recorrer el sistema de principio a fin, desde que el comercial entrega la cuenta al administrador de la empresa.
Está pensada para la **prueba cerrada**: usa solo datos ficticios (RUT de prueba, nombres inventados).

## 1. Cómo se organiza

- **Cuenta**: el cliente que contrata el servicio. Tiene un plan (límite de trabajadores y usuarios) y un administrador.
- **Empresa**: una cuenta puede tener varias empresas. Cada pantalla de trabajo tiene un selector de empresa arriba.
- **Roles dentro de la empresa**

| Rol | Puede |
|---|---|
| ADMIN | Todo en su empresa. Firma contratos y anexos; aprueba asistencia, variables y resúmenes |
| JEFE_RRHH | Lo de RRHH, más firmar y aprobar |
| RRHH | Ingresar y preparar información. No firma ni aprueba |

Los roles SUPERVISOR (ver solo a su equipo) y LECTURA (portal del trabajador) quedan para más adelante y hoy no se pueden asignar.

**Administrador principal:** es el que crea el comercial al entregar la cuenta. Los demás administradores pueden hacer lo mismo que él, salvo cambiar su contraseña o su correo, quitarle el permiso de administrador o desactivarlo; eso solo lo hace soporte.

**Contraseñas:** al menos 15 caracteres, sin exigir mayúsculas, números ni símbolos. Lo más fácil es una frase de tres o cuatro palabras. Se rechazan las secuencias, repeticiones, contraseñas conocidas y las que contienen el nombre o el correo de la persona.

Los botones se ven iguales para todos. Si tu rol no alcanza, aparece un aviso de permiso insuficiente: es un comportamiento esperado.

## 2. Entrega de la cuenta (Comercial)

1. El comercial inicia sesión con su correo y contraseña inicial. La primera vez el sistema obliga a **cambiar la contraseña** (mínimo 15 caracteres; sirve una frase de varias palabras).
2. En **Cuentas** → **Crear cuenta**: nombre, RUT del titular con su DV, razón social, correo de contacto, plan, y nombre y correo del administrador.
3. El sistema muestra **una sola vez** la contraseña inicial del administrador. El comercial se la entrega al cliente por un canal seguro.
4. Desde **Cuentas** también puede **Cambiar plan**, **Suspender**, **Cancelar** (con confirmación) y **Reactivar**, y **Ver consumo**.

## 3. Primeros pasos del administrador

1. Iniciar sesión con la contraseña recibida y cambiarla cuando el sistema lo pida.
2. **Administración → Empresas → Crear empresa**: RUT sin DV, DV, razón social, representante legal, RUT del representante y dirección.
3. Entrar a la empresa y completar la ficha: tipo de empleador, giro, código de actividad SII, comuna, **organismo administrador (mutual) y tasa adicional**, caja de compensación. Guardar cambios. Estos datos alimentan Previred y las liquidaciones.
4. **Administración → Usuarios → Crear usuario**: nombre y correo. El sistema genera la contraseña inicial. Luego **Asignar rol** (ADMIN, JEFE_RRHH, RRHH...) por empresa. Crea al menos un usuario RRHH y uno JEFE_RRHH para probar la separación de funciones.
5. **Consumo del plan** muestra cuántos trabajadores y usuarios quedan.

## 4. Preparar la empresa (RRHH)

1. **Cargos → Crear cargo** (nombre; departamento y descripción son opcionales).
2. **Jornadas**: define el horario de trabajo (días, entrada, salida, colación). Mientras editas, el sistema muestra en vivo los problemas legales: máximo de 10 horas diarias, entre 4 y 6 días a la semana, colación de al menos 30 minutos y tope semanal de horas (44 h hasta el 25-04-2026, 42 h desde el 26-04-2026, 40 h desde el 26-04-2028). El botón Guardar se bloquea mientras haya errores.
3. **Feriados** (solo lectura para la empresa; los mantiene soporte).

## 5. Personas, trabajadores y contratos

1. **Personas → Nueva persona**: identificación, contacto, previsión y salud (AFP, salud, Isapre), datos para el pago. Alternativa: **Inscripción masiva de personas**: Descargar plantilla, completar el CSV, **Subir y revisar** y luego **Cargar personas**.
2. En la ficha de la persona, **Relaciones con la empresa → Agregar** la deja como **postulante** o la crea como trabajador. También puedes hacerlo desde **Trabajadores** (persona + fecha de ingreso → Crear).
3. **Contratos → Crear contrato** (o **＋ Nuevo contrato** en la ficha del trabajador): tipo (indefinido, plazo fijo, obra o faena), fecha de inicio y término, cargo, funciones, lugar y comuna de prestación (la comuna define los feriados locales), jornada (completa, parcial, excluido de limitación, y el horario definido en Jornadas), sistema de remuneración, sueldo base y periodicidad de pago.
4. El contrato nace **vigente con firma pendiente**. Al crearlo, el postulante pasa a **trabajador activo**.
5. **Firma**: solo ADMIN o JEFE_RRHH pueden **Firmar contrato**. Si RRHH lo intenta, el sistema lo rechaza.
6. Si hay un error y el contrato aún no está firmado ni tiene anexos, se puede **Corregir** o **Anular** (con motivo). No se puede anular si el trabajador ya tiene asistencia, licencias, resúmenes, variables, liquidaciones o finiquitos.
7. Contrato firmado: los cambios posteriores se hacen con **Nuevo anexo** (campo a modificar, nuevo valor, rige desde, motivo), que también debe firmarse. Un anexo puede cambiar la jornada.

## 6. Cada mes

### Acceso de soporte (administradores de la cuenta)
Soporte **no ve** tus empresas por defecto. Si necesitas ayuda: menú **Empresa → Acceso de soporte**, elige la empresa, la duración (1, 4, 8 o 24 horas) y escribe el motivo. Soporte solo puede mirar (no edita nada) y no ve el número de cuenta bancaria completo. Puedes **Revocar** el acceso antes de que venza. Abajo, en **Lo que consultó soporte**, ves cada consulta (también las bloqueadas) y cualquier restablecimiento de contraseña del administrador principal; se guarda 2 años.

### 6.1 Parámetros (soporte, una vez por mes)
En **Parámetros legales**, soporte usa **Ver qué se copiaría** y luego **Abrir mes**. Después corrige con valores oficiales la **UF del último día del mes**, la **UTM** y cualquier valor que haya cambiado por ley (**Corregir**). Sin esto no se pueden calcular liquidaciones.

### 6.2 Periodo
**Periodos → Abrir periodo** (mes, año, fecha de apertura).

### 6.3 Asistencia
- **Libro de asistencia**: muestra, por trabajador y mes, lo que corresponde según su contrato y jornada. Solo se guardan las **desviaciones**: un día sin anotación se considera trabajado según el horario.
  - Atrasos: se descuentan desde el minuto 6 (hasta 5 minutos hay tolerancia; desde el minuto 6 se cuentan todos).
  - Salida anticipada: sin tolerancia. Un atraso solo se compensa el mismo día.
  - Horas extra: lo trabajado después de la salida, y todo lo trabajado en un día libre o feriado. Aparecen avisos (por ejemplo, más de 2 horas extra al día).
  - Solo suman las marcas **aprobadas**. **Aprobar todo el mes** requiere ADMIN o JEFE_RRHH.
- **Marcas de asistencia → Registrar**: trabajador, fecha, entrada, salida, tipo (normal, atraso, inasistencia, permiso con o sin goce, vacaciones, licencia médica), fuente y observaciones. **Aprobar** una a una o **Aprobar las pendientes de la lista**.
- **Licencias médicas → Registrar**: desde, hasta, tipo (común, maternal, accidente del trabajo), entidad pagadora del subsidio y folio.

### 6.4 Resumen de asistencia
**Resumen de asistencia → Generar desde la asistencia** propone días de inasistencia, permisos sin goce, vacaciones y minutos de atraso a partir del libro. Revisa, **Editar resumen** si hace falta y **Aprobar** (o **Aprobar todos los pendientes**). Las horas extra se muestran como información; se pagan cargándolas como variable.

### 6.5 Variables del mes
**Variables del mes → Agregar**: periodo, trabajador, concepto (bonos, comisiones, horas extra, descuentos), monto y glosa. Quedan pendientes hasta que ADMIN o JEFE_RRHH las apruebe (**Aprobar** o **Aprobar todas las pendientes**). Los conceptos disponibles se ven en **Conceptos**.

### 6.6 Liquidaciones
**Liquidaciones**: elige el periodo y **Calcular** (un trabajador) o **Calcular todas**. Revisa el detalle, después **Cerrar liquidación** o **Cerrar todas**. Descarga **PDF de todas** o **PDF con aportes** (incluye aportes del empleador). Una liquidación cerrada ya no cambia.

### 6.7 Archivos legales
**Previred y LRE**: **Descargar archivo Previred** (105 campos, separados por punto y coma) y **Descargar archivo LRE** (Libro de Remuneraciones Electrónico). Importante: todavía no informan pensionados, cargas familiares, CCAF ni APV, ni los aportes de la reforma previsional.

### 6.8 Cerrar el mes
**Periodos → Cerrar periodo**. Antes de cerrar, el sistema revisa cada trabajador (resumen aprobado, liquidación emitida, sin variables pendientes y finiquito emitido si terminó en el mes). Si falta algo, muestra la lista para resolverla.

Si todo está listo, aparece una advertencia: después de cerrar no se pueden registrar marcas, resúmenes ni variables, ni calcular o emitir liquidaciones y finiquitos de ese mes. Para confirmar hay que escribir el mes (por ejemplo `10/2026`).

**Reabrir un periodo (solo emergencias):** en Periodos, con el filtro de estado en "Cerrado", el botón **Reabrir** está disponible solo para ADMIN. Pide un motivo (mínimo 10 caracteres) que queda registrado con el usuario y la fecha, y se ve en la columna Reaperturas. Solo se puede reabrir el último periodo cerrado, y solo si los meses siguientes no tienen liquidaciones emitidas. Las liquidaciones ya emitidas siguen emitidas (para corregirlas se recalculan y se crea una versión nueva). Si el mes ya se declaró en Previred o en la Dirección del Trabajo, corregirlo exige rectificar esa declaración fuera del sistema.

## 7. Término de la relación laboral
El finiquito se calcula y emite mientras el periodo del mes de término esté abierto (o reabierto).
**Finiquitos → Registrar término**: trabajador, fecha de término, causal, fecha del finiquito, lugar de firma, aviso previo, días de feriado tomados, días inhábiles e imputación del seguro de cesantía. **Calcular finiquito** muestra el detalle (se pueden agregar descuentos), luego **Cerrar finiquito**.

## 8. Exportar datos
En **Empresas** hay una exportación de los datos de la empresa. Si una cuenta se cancela, sus administradores solo pueden exportar; los datos se conservan un tiempo antes de eliminarse.

---

# Guía para quien prueba

Gracias por ayudar. Esto es una versión en desarrollo: se espera encontrar errores, y eso es justamente lo que buscamos.

## Reglas de la prueba
- Usa **solo datos ficticios**. No ingreses personas, RUT ni sueldos reales.
- Los datos pueden borrarse entre rondas de prueba.
- Si recibes un acceso, cambia la contraseña de inmediato.

## Qué recorrer (en este orden)
1. Entrar como administrador, cambiar contraseña, crear empresa y completar su ficha.
2. Crear usuarios RRHH y JEFE_RRHH con sus roles.
3. Crear un cargo y una jornada. Intenta crear una jornada inválida (11 horas diarias, 7 días, colación de 10 minutos) y observa los avisos.
4. Crear personas (una a mano, varias con la planilla CSV) y contratos de distinto tipo.
5. Como RRHH intentar firmar un contrato (debe rechazarse) y como JEFE_RRHH firmarlo. Probar Corregir y Anular.
6. Registrar marcas de asistencia con atrasos, horas extra, un día libre y un feriado; revisar el libro.
7. Generar resumen, cargar variables, aprobar, calcular y cerrar liquidaciones; bajar los PDF.
8. Descargar los archivos de Previred y LRE.
9. Registrar el término de un trabajador y calcular su finiquito.

## Intenta romperlo
- Entrar con la contraseña mal 6 veces: debe bloquearte unos minutos.
- Usar un enlace o pantalla de otra empresa, o de otro rol, cambiando el contexto.
- Dejar campos vacíos, fechas absurdas (término antes del inicio), montos negativos, RUT inválidos.
- Cerrar el navegador y volver: la sesión dura 8 horas.
- Probar en el celular.

## Cómo reportar
Para cada observación anota: pantalla, qué hiciste, qué esperabas y qué pasó (con captura si puedes). Envíalo por el canal acordado con el responsable. Los problemas de seguridad, solo por mensaje directo.

## Lo que todavía no existe
Módulo de pendientes por firmar, carga masiva de marcas, informes y estadísticas, Declaración Jurada 1887, nómina bancaria, carga automática de UF y UTM, pensiones alimenticias y re-finiquito. No los reportes como errores.
