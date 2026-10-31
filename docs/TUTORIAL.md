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

**Verificación en dos pasos (2FA):** además de la contraseña, al ingresar se pide un código de 6 dígitos que muestra una app del celular (Google Authenticator, Microsoft Authenticator u otra). Es **obligatoria** para los administradores de la cuenta, soporte y comercial, porque pueden ver datos de muchas personas; para los demás usuarios es voluntaria. La primera vez, el sistema muestra un código QR para escanear con la app y entrega **10 códigos de recuperación**: cada uno sirve para entrar una vez si no tienes el celular. Guárdalos fuera del celular.

**Sesión:** dura 8 horas como máximo y se cierra sola tras 60 minutos sin uso (30 minutos para soporte y comercial). **Cerrar sesión** la termina de verdad: aunque alguien vuelva atrás en el navegador, tendrá que ingresar de nuevo.

Los botones se ven iguales para todos. Si tu rol no alcanza, aparece un aviso de permiso insuficiente: es un comportamiento esperado.

## 2. Entrega de la cuenta (Comercial)

1. El comercial inicia sesión con su correo y contraseña inicial. La primera vez el sistema obliga a **cambiar la contraseña** (mínimo 15 caracteres; sirve una frase de varias palabras) y luego a **activar la verificación en dos pasos** con la app del celular.
2. En **Cuentas** → **Crear cuenta**: nombre, RUT del titular con su DV, razón social, correo de contacto, plan, y nombre y correo del administrador.
3. El sistema muestra **una sola vez** la contraseña inicial del administrador. El comercial se la entrega al cliente por un canal seguro.
4. Desde **Cuentas** también puede **Cambiar plan**, **Suspender**, **Cancelar** (con confirmación) y **Reactivar**, y **Ver consumo**.

## 3. Primeros pasos del administrador

1. Iniciar sesión con la contraseña recibida, cambiarla cuando el sistema lo pida y **activar la verificación en dos pasos**: instala la app de autenticación, escanea el QR, escribe el código y guarda los códigos de recuperación (botón **Descargar .txt**).
2. **Administración → Empresas → Crear empresa**: RUT sin DV, DV, razón social, representante legal, RUT del representante y dirección.
3. Entrar a la empresa y completar la ficha: tipo de empleador, giro, código de actividad SII, comuna, **organismo administrador (mutual) y tasa adicional**, caja de compensación. Guardar cambios. Estos datos alimentan Previred y las liquidaciones.
4. **Administración → Usuarios → Crear usuario**: nombre y correo. El sistema genera la contraseña inicial. Luego **Asignar rol** (ADMIN, JEFE_RRHH, RRHH...) por empresa. Crea al menos un usuario RRHH y uno JEFE_RRHH para probar la separación de funciones.
5. **Consumo del plan** muestra cuántos trabajadores y usuarios quedan.
6. **Pendientes** (junto a Inicio, con un número en el menú) reúne todo lo que espera firma o aprobación en tus empresas: contratos y anexos por firmar, marcas y correcciones de asistencia, variables del mes y resúmenes de asistencia por aprobar, y las liquidaciones que hay que recalcular porque cambió el saldo de pago en exceso del mes anterior. ADMIN y JEFE_RRHH pueden firmar o aprobar ahí mismo, de a uno o seleccionando varios; RRHH ve la misma lista sin botones, para saber qué falta. **Ver** abre la pantalla de cada registro para revisarlo antes.

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
Soporte **no ve** tus empresas por defecto, y aunque tenga acceso trabaja con **una empresa a la vez** (la que elige en su barra superior). Si necesitas ayuda: menú **Empresa → Acceso de soporte**, elige la empresa, la duración (1, 4, 8 o 24 horas) y escribe el motivo. Soporte solo puede mirar (no edita nada) y no ve el número de cuenta bancaria completo. Puedes **Revocar** el acceso antes de que venza. Abajo, en **Lo que consultó soporte**, ves cada consulta (también las bloqueadas) también los intentos de entrar a una empresa que no autorizaste, y cualquier restablecimiento de acceso del administrador principal; se guarda 2 años.

### Historial de previsión (ficha de la persona)
La AFP, el sistema de salud y el plan de isapre se registran **por mes** en la ficha de la persona, sección **Historial de previsión**: «Registrar cambio» indicando desde qué mes rige. Cada liquidación se calcula con la previsión que regía en su mes, y el PDF, el LRE y Previred de meses anteriores siguen mostrando la de ese mes aunque la persona cambie después. Arriba, en «Previsión y salud», se ve la vigente hoy. No se aceptan cambios que alcancen meses ya cerrados: en ese caso se reabre el periodo o se regulariza en Previred o con la isapre.

### Cargas familiares (ficha de la persona)
En la ficha de la persona, sección **Cargas familiares**, se registra lo que dice el documento que presenta el trabajador (resolución de la CCAF o del IPS):
- **Tramo de asignación familiar** (A, B, C o D) desde un mes, con el número del documento. Sin tramo registrado se informa D (sin derecho). Si la persona tiene cargas vigentes y no tiene tramo, la liquidación avisa y no se calcula.
- **Cargas**: nombre, RUT (opcional), relación, tipo (simple, maternal o invalidez, que recibe el doble), fecha desde y, si el documento la indica, fecha hasta. Cuando el trabajador renueva el documento, se edita la carga (**Editar**) o se registra una nueva.

La asignación se paga por **mes completo**: cuenta toda carga vigente al menos un día del mes. Aparece en la liquidación como «Asignación familiar» (no imponible ni tributable), en Previred (campos 18 a 24) y en el LRE (1111 a 1114 y 2311). La **asignación retroactiva** (por ejemplo, desde la solicitud hasta la aprobación) y el **reintegro de cargas** se ingresan como variables del mes. Registrar una carga o un tramo que alcanza meses cerrados está permitido: esas liquidaciones no cambian y la pantalla avisa para pagar la diferencia como retroactiva.

### Ahorro previsional voluntario (ficha de la persona)
En la ficha de la persona, sección **Ahorro previsional voluntario**, se registran el **APV individual**, el **APV colectivo** y el **depósito convenido** que se descuentan por planilla: institución (una AFP de la lista u otra con su código Previred de 3 dígitos), número de contrato, forma de pago (directa o indirecta), régimen A o B, monto en pesos, UF o porcentaje de la renta imponible, aporte del empleador (solo APV colectivo) y mes desde y hasta. Solo puede haber uno de cada tipo vigente por mes.
- El APV **régimen B** rebaja la base del impuesto único del mes, hasta 50 UF.
- El **depósito convenido** aparece como haber y como descuento del mismo monto (no cambia el líquido).
- El aporte del empleador al APV colectivo va con los aportes del empleador.

### Caja de compensación (CCAF)
Si la empresa tiene caja (ficha de la empresa), Previred informa la caja, reparte el 7 % de Fonasa entre la caja (4,2 %) y Fonasa (2,8 %) e informa la asignación familiar pagada para que se compense. La liquidación no cambia. Los **descuentos de la caja** (crédito personal, dental, leasing, seguro de vida y otros) se ingresan cada mes como **variables**, según lo que informa la caja. Previred avisa si un descuento no lo recibe la caja de la empresa (por ejemplo, el dental solo lo recibe Los Héroes).

Si los descuentos dejan el líquido en negativo, la liquidación se calcula igual, avisa y el saldo se descuenta el mes siguiente.

### Mi seguridad (todos los usuarios)
En el pie del menú, **Mi seguridad** reúne:
- **Cambiar contraseña** (cierra tus sesiones en otros navegadores).
- **Verificación en dos pasos**: activarla (si es voluntaria para ti), **generar códigos de recuperación nuevos** (los anteriores dejan de servir) y **Cambiar de celular** o **Desactivar** (pide tu contraseña y un código).
- **Sesiones abiertas**: cada navegador donde iniciaste sesión, con **Cerrar las demás sesiones**.

### Si alguien olvida la contraseña o pierde el celular
- **Perdió el celular pero tiene sus códigos de recuperación:** entra con un código («No tengo el celular: usar un código de recuperación») y en **Mi seguridad → Cambiar de celular** inscribe la app en el celular nuevo.
- **Sin códigos, o olvidó la contraseña:** un administrador de la cuenta usa **Usuarios → Restablecer acceso**. Eso le da una contraseña inicial nueva, desactiva su verificación en dos pasos y cierra sus sesiones. Al entrar deberá cambiar la contraseña y, si su perfil lo requiere, inscribir de nuevo la app.
- **El administrador principal** solo lo restablece soporte, después de comprobar su identidad; queda en el registro que ve la cuenta.

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

**Nómina bancaria**: el botón **Nómina bancaria** descarga un archivo CSV (se abre en Excel) con los pagos del periodo para cargarlo o adaptarlo en el banco: RUT, nombre, código y nombre del banco, tipo y número de cuenta, monto, correo y glosa. Solo van las liquidaciones cerradas con líquido mayor que cero y con datos de transferencia completos; quien paga en efectivo o cheque, no tiene datos bancarios completos o tiene la liquidación en borrador aparece en una lista aparte con el motivo. En **Finiquitos** está la nómina de los finiquitos cerrados de un mes y el botón **Nómina** en cada finiquito. El banco de la persona se elige de una lista (ficha de la persona → Datos para el pago, junto con la forma de pago); si antes estaba escrito a mano y no se reconoció, la ficha lo indica. Excel puede mostrar el código del banco sin los ceros a la izquierda (12 en vez de 012).

**Eliminar** una liquidación (borrador o cerrada, con el periodo abierto): la cerrada pide el motivo y se eliminan todas sus versiones; queda registrado. No se puede si el trabajador tiene su finiquito cerrado en ese mes (primero se elimina el finiquito). Solo se liquidan los meses en que existe la relación laboral (no antes del ingreso ni después del término). No se registra un término anterior a un mes que ya tiene liquidación, y el finiquito no se calcula ni se cierra si existe una liquidación posterior al término (aunque esté en borrador): hay que eliminarla primero.

**Pago en exceso**: si los descuentos superan los haberes, la liquidación queda en $0 y el saldo se descuenta en la siguiente liquidación del trabajador (aunque haya un mes sin liquidación entremedio). La columna **Pago en exceso** muestra cuánto descuenta cada liquidación del mes anterior y cuánto queda para el siguiente. Si después se recalcula el mes anterior y su saldo cambia, la liquidación siguiente aparece con **Recalcular** (también en Pendientes) y no se puede cerrar hasta recalcularla.

**Dos relaciones en el mismo mes** (la persona termina y se recontrata en la misma empresa dentro del mes): cada relación tiene su liquidación. Primero se calcula la de la relación anterior (**Calcular todas** las ordena por fecha de ingreso); la segunda usa lo que queda de los topes (imponible, cesantía y gratificación) y calcula el impuesto sobre la suma de ambas, descontando lo ya retenido. La asignación familiar se paga solo en la última relación. Si después cambia la primera, la segunda aparece con **«Recalcular: cambió la otra relación del mes»** (también en Pendientes). En Previred la segunda va como línea 02 (segundo contrato) y en el LRE como otra fila. El APV y el depósito convenido también se descuentan una sola vez, en la última relación.

**Recontratar**: la nueva relación (Trabajadores → nuevo postulante) debe empezar después del término de la anterior; el sistema no acepta relaciones que se crucen. Al crear el primer contrato del postulante, su fecha de ingreso pasa a ser el inicio del contrato. Si la ficha de un trabajador avisa que la fecha de ingreso no coincide con el inicio de su primer contrato, el botón **Usar … como ingreso** la corrige (solo si no tiene liquidaciones de meses cerrados); después hay que volver a generar el resumen de asistencia y recalcular la liquidación.

### 6.7 Archivos legales
**Previred y LRE**: **Descargar archivo Previred** (105 campos, separados por punto y coma) y **Descargar archivo LRE** (Libro de Remuneraciones Electrónico). Importante: todavía no informan los pensionados afiliados a una caja (1 %) ni controlan el tope anual del depósito convenido.

### 6.8 Cerrar el mes
**Periodos → Cerrar periodo**. Antes de cerrar, el sistema revisa cada trabajador (resumen aprobado, liquidación emitida, sin variables pendientes y finiquito emitido si terminó en el mes). Si falta algo, muestra la lista para resolverla.

Si todo está listo, aparece una advertencia: después de cerrar no se pueden registrar marcas, resúmenes ni variables, ni calcular o emitir liquidaciones y finiquitos de ese mes. Para confirmar hay que escribir el mes (por ejemplo `10/2026`).

**Reabrir un periodo (solo emergencias):** en Periodos, con el filtro de estado en "Cerrado", el botón **Reabrir** está disponible solo para ADMIN. Pide un motivo (mínimo 10 caracteres) que queda registrado con el usuario y la fecha, y se ve en la columna Reaperturas. Solo se puede reabrir el último periodo cerrado, y solo si los meses siguientes no tienen liquidaciones emitidas. Las liquidaciones ya emitidas siguen emitidas (para corregirlas se recalculan y se crea una versión nueva). Si el mes ya se declaró en Previred o en la Dirección del Trabajo, corregirlo exige rectificar esa declaración fuera del sistema.

## 7. Término de la relación laboral
El finiquito se calcula y emite mientras el periodo del mes de término esté abierto (o reabierto).
**Finiquitos → Registrar término**: trabajador, fecha de término, causal, fecha del finiquito, lugar de firma, aviso previo, días de feriado tomados, días inhábiles e imputación del seguro de cesantía. **Calcular finiquito** muestra el detalle (se pueden agregar descuentos), luego **Cerrar finiquito**. Antes hay que calcular la liquidación del mes de término: si deja saldo de pago en exceso, el finiquito lo descuenta solo («Saldo de pago en exceso»), hasta dejarlo en $0, y avisa lo que no alcanzó a recuperarse. Ese saldo no recuperado queda en la ficha de la persona («Saldo pendiente de relaciones anteriores») y, si se recontrata, su liquidación lo avisa; no se descuenta solo porque es otra relación laboral: con la autorización firmada del trabajador se ingresa en Variables del mes con «Descuento por pago en exceso» (hasta el saldo pendiente). Si no se cobrará, se marca en la ficha con el motivo. Si después se recalcula esa liquidación y su saldo cambia, el finiquito aparece con **«Recalcular: cambió el saldo de la liquidación»** (también en Pendientes, y el cálculo de la liquidación lo avisa); **Recalcular** lo vuelve a calcular con los mismos datos y **Editar datos** abre el formulario. Mientras el saldo no coincida, el finiquito no se puede cerrar ni el periodo tampoco.

**Eliminar** un finiquito: se puede si no está pagado y el periodo del término está abierto; si ya estaba cerrado, pide el motivo. Toda eliminación queda registrada. Al eliminar se puede elegir **quitar también el término** (fecha y causal; el trabajador vuelve a activo). Un término registrado sin finiquito se quita con **Quitar término**. Si la liquidación del mes ya estaba calculada, hay que recalcularla.

## 8. Exportar datos
En **Empresas** hay una exportación de los datos de la empresa. Si una cuenta se cancela, sus administradores solo pueden exportar; los datos se conservan un tiempo antes de eliminarse.

---

# Guía para quien prueba

Gracias por ayudar. Esto es una versión en desarrollo: se espera encontrar errores, y eso es justamente lo que buscamos.

## Reglas de la prueba
- Usa **solo datos ficticios**. No ingreses personas, RUT ni sueldos reales.
- Los datos pueden borrarse entre rondas de prueba.
- Si recibes un acceso, cambia la contraseña de inmediato.
- Necesitas una **app de autenticación** en el celular (Google Authenticator o Microsoft Authenticator, gratis): el administrador debe activar la verificación en dos pasos al primer ingreso. Guarda los códigos de recuperación.

## Qué recorrer (en este orden)
1. Entrar como administrador, cambiar contraseña, activar la verificación en dos pasos, crear empresa y completar su ficha.
2. Crear usuarios RRHH y JEFE_RRHH con sus roles.
3. Crear un cargo y una jornada. Intenta crear una jornada inválida (11 horas diarias, 7 días, colación de 10 minutos) y observa los avisos.
4. Crear personas (una a mano, varias con la planilla CSV) y contratos de distinto tipo.
5. Como RRHH intentar firmar un contrato (debe rechazarse) y como JEFE_RRHH firmarlo. Probar Corregir y Anular. Revisar **Pendientes** con ambos usuarios: el número del menú, los filtros y aprobar varios a la vez.
6. Registrar marcas de asistencia con atrasos, horas extra, un día libre y un feriado; revisar el libro.
7. Generar resumen, cargar variables, aprobar, calcular y cerrar liquidaciones; bajar los PDF.
8. Descargar los archivos de Previred y LRE.
9. Registrar el término de un trabajador y calcular su finiquito.

## Intenta romperlo
- Entrar con la contraseña mal 6 veces: debe bloquearte unos minutos. Lo mismo con 5 códigos de verificación incorrectos.
- Usar el mismo código de la app dos veces seguidas, o un código de recuperación ya usado: deben rechazarse.
- Cerrar sesión y presionar **Atrás** en el navegador: no debe mostrar datos.
- Iniciar sesión en dos navegadores y usar **Mi seguridad → Cerrar las demás sesiones**: el otro debe quedar fuera.
- Dejar la sesión sin usar más de una hora: debe pedir ingresar de nuevo.
- Usar un enlace o pantalla de otra empresa, o de otro rol, cambiando el contexto.
- Dejar campos vacíos, fechas absurdas (término antes del inicio), montos negativos, RUT inválidos.
- Cerrar el navegador y volver: normalmente tendrás que ingresar de nuevo (la sesión vive mientras el navegador esté abierto, con un máximo de 8 horas).
- Probar en el celular.

## Cómo reportar
Para cada observación anota: pantalla, qué hiciste, qué esperabas y qué pasó (con captura si puedes). Envíalo por el canal acordado con el responsable. Los problemas de seguridad, solo por mensaje directo.

## Lo que todavía no existe
Carga masiva de marcas, informes y estadísticas, Declaración Jurada 1887, nómina bancaria, carga automática de UF y UTM, pensiones alimenticias y re-finiquito. No los reportes como errores.
