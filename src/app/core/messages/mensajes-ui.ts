/**
 * VAL-oleada3 MSG-06: catálogo único de los textos que el frontend muestra por su cuenta (avisos, toasts y respaldos).
 *
 * Los errores del backend ya llegan resueltos por su catálogo de mensajes en `ApiErrorResponse.message` y se muestran tal
 * cual (`getApiErrorMessage`); este catálogo cubre solo los textos locales y los respaldos cuando el backend no envía texto.
 * Ningún toast escribe su texto: usa `mensajeUi('CODIGO', parametros)`. Los marcadores `{nombre}` se llenan con los
 * parámetros. `scripts/check-mensajes-ui.mjs` (en `npm run verify`) rechaza toasts con texto literal y códigos que no
 * estén aquí.
 */
export const MENSAJES_UI = {
  // Autenticación institucional (antes AUTH_MESSAGES_FALLBACK en auth.service.ts).
  AUTH_ERROR_DESCONOCIDO: 'Error en la autenticación institucional.',
  AUTH_FIELDS_REQUIRED: 'Por favor ingresa tu usuario y contraseña.',
  AUTH_FORBIDDEN: 'La sesión fue autenticada, pero no tiene permiso para acceder (403). Contacta al administrador.',
  AUTH_GENERIC_ERROR: 'Usuario o contraseña incorrectos.',
  AUTH_INVALID_CREDENTIALS: 'Credenciales inválidas. Verifica tu usuario y contraseña institucional.',
  AUTH_INVALID_RESPONSE: 'Respuesta de autenticación inválida.',
  AUTH_NETWORK_ERROR: 'No se pudo establecer conexión con el servidor de autenticación institucional.',
  AUTH_NO_ROLE_ASSIGNED: 'Tu cuenta institucional no tiene un rol o identidad válidos asignados. Contacta al administrador del sistema.',
  AUTH_UNAUTHENTICATED: 'El servidor no aceptó la sesión institucional (401). Inicia sesión nuevamente.',
  // Respaldo por código semántico del contrato de errores (api-error.util.ts).
  API_ERROR_CAMPOS_FORMULARIO: 'Error en datos del formulario: {detalles}.',
  API_ERROR_CONFLICT: 'Existe un conflicto con el estado actual de los datos. Actualice e intente nuevamente.',
  API_ERROR_DEFAULT: 'No fue posible completar la operación. Intente nuevamente.',
  API_ERROR_FEATURE_UNAVAILABLE: 'Esta funcionalidad no está disponible por el momento.',
  API_ERROR_FORBIDDEN: 'No tiene los permisos institucionales requeridos para realizar esta acción.',
  API_ERROR_INTERNAL_ERROR: 'Ocurrió un error en el servidor al procesar la solicitud. Por favor intente más tarde.',
  API_ERROR_INVALID_REQUEST: 'La solicitud no pudo ser interpretada. Verifique los datos e intente nuevamente.',
  API_ERROR_NETWORK_ERROR: 'No fue posible conectar con el servidor. Verifique su conexión de red.',
  API_ERROR_RESOURCE_NOT_FOUND: 'El recurso solicitado no fue encontrado en el sistema.',
  API_ERROR_UNAUTHORIZED: 'Su sesión institucional ha caducado. Por favor inicie sesión nuevamente.',
  API_ERROR_VALIDATION_ERROR: 'Los datos enviados no son válidos. Verifique los campos del formulario.',
  // Avisos de las pantallas (toasts).
  UI_ADMIN_AUDITORIA_001: 'ID de correlación copiado al portapapeles.',
  UI_ADMIN_DECANOS_001: 'Los datos se corrigieron; la cuenta de acceso queda pendiente de sincronizar.',
  UI_ADMIN_DECANOS_002: 'Los datos del decano fueron corregidos.',
  UI_ADMIN_DECANOS_003: 'Estado actualizado.',
  UI_ADMIN_DECANOS_004: 'El campo Tipo de Documento es obligatorio.',
  UI_ADMIN_DECANOS_005: 'El campo Primer Nombre es obligatorio.',
  UI_ADMIN_DECANOS_006: 'El campo Primer Apellido es obligatorio.',
  UI_ADMIN_DECANOS_007: 'Correo institucional inválido.',
  UI_ADMIN_DECANOS_008: 'La contraseña inicial de acceso es obligatoria.',
  UI_ADMIN_DECANOS_009: 'Decano registrado exitosamente.',
  UI_ADMIN_DECANOS_010: 'El profesional {nombres} {apellidos} ya está nombrado como Decano.',
  UI_ADMIN_DECANOS_011: 'Datos de {nombres} {apellidos} precargados. Defina la contraseña y guarde para confirmar.',
  UI_ADMIN_DECANOS_012: 'El nombre de la facultad debe tener entre 3 y 50 caracteres.',
  UI_ADMIN_DECANOS_013: 'El nombre de la facultad es obligatorio y debe tener entre 3 y 50 caracteres.',
  UI_ADMIN_DECANOS_014: 'Seleccione la institución de la facultad.',
  UI_ADMIN_DECANOS_015: 'Seleccione la facultad existente.',
  UI_ADMIN_EMAIL_MANAGEMENT_001: 'No fue posible cargar el catálogo de plantillas.',
  UI_ADMIN_EMAIL_MANAGEMENT_002: 'Texto restaurado a la versión activa.',
  UI_ADMIN_EMAIL_MANAGEMENT_003: 'No fue posible generar la vista previa institucional.',
  UI_ADMIN_EMAIL_MANAGEMENT_004: 'Error al guardar la nueva versión de la plantilla.',
  UI_ADMIN_EMAIL_MANAGEMENT_005: 'No fue posible consultar la cola outbox.',
  UI_ADMIN_EMAIL_MANAGEMENT_006: 'Notificación reprogramada para reintento inmediato.',
  UI_ADMIN_EMAIL_MANAGEMENT_007: 'Error al solicitar el reintento de la notificación.',
  UI_ADMIN_EMAIL_MANAGEMENT_008: 'No se pudo obtener el diagnóstico del canal SMTP.',
  UI_ADMIN_EMAIL_MANAGEMENT_009: 'Correo de prueba enviado con éxito.',
  UI_ADMIN_EMAIL_MANAGEMENT_010: 'Versión v{version} guardada y activada con éxito.',
  UI_ADMIN_EMAIL_MANAGEMENT_011: 'Versión v{version} guardada pero pendiente de activación.',
  UI_ADMIN_EMAIL_MANAGEMENT_012: 'Versión v{version} activada como la plantilla oficial.',
  UI_ADMIN_EMAIL_MANAGEMENT_013: 'Error al activar la versión v{version}.',
  UI_ADMIN_ESTUDIANTES_001: 'Los datos del estudiante fueron corregidos.',
  UI_ADMIN_FACULTADES_001: 'Facultad actualizada correctamente.',
  UI_ADMIN_FACULTADES_002: 'Facultad registrada exitosamente.',
  UI_ADMIN_FACULTADES_003: 'No fue posible cambiar el estado de la facultad.',
  UI_ADMIN_FACULTADES_004: 'No se pudo asignar el decano.',
  UI_ADMIN_FACULTADES_005: 'No se pudo asignar el decano en este momento.',
  UI_ADMIN_FACULTADES_006: 'Facultad activada correctamente.',
  UI_ADMIN_FACULTADES_007: 'Facultad desactivada correctamente.',
  UI_ADMIN_FACULTADES_008: 'Decano(a) {decano} asignado(a) exitosamente a {facultad}.',
  UI_ADMIN_PERIODOS_001: 'Período académico guardado.',
  UI_ADMIN_PERIODOS_002: 'Período {codigo} eliminado.',
  UI_ADMIN_PERIODOS_003: 'No se pudo guardar el período académico.',
  UI_ADMIN_SYSTEM_001: 'Debe seleccionar un período válido para ejecutar el cierre.',
  UI_ADMISION_ESTUDIANTE_MODAL_001: 'Estudiante admitido exitosamente. {aviso}',
  UI_ADMISION_ESTUDIANTE_MODAL_002: 'Estudiante admitido. La cuenta de acceso quedó en estado {estado}. {aviso}',
  UI_COORDINATOR_DOCENTES_001: 'Estado del docente actualizado.',
  UI_COORDINATOR_DOCENTES_002: 'Docente actualizado.',
  UI_COORDINATOR_DOCENTES_003: 'Docente vinculado al programa.',
  UI_COORDINATOR_GROUPS_001: 'No fue posible cargar los grupos.',
  UI_COORDINATOR_GROUPS_002: 'Grupo guardado.',
  UI_COORDINATOR_GROUPS_003: 'No fue posible guardar el grupo.',
  UI_COORDINATOR_GROUPS_004: 'El cupo máximo debe ser un número entero mayor o igual a 1, o dejarse vacío para no cambiarlo.',
  UI_COORDINATOR_SESIONES_GRUPO_001: 'Sesión cancelada.',
  UI_COORDINATOR_SESIONES_GRUPO_002: 'La fecha desde no puede ser posterior a la fecha hasta.',
  UI_COORDINATOR_SOLICITUDES_SESION_001: 'Sesión aprobada.',
  UI_COORDINATOR_SOLICITUDES_SESION_002: 'Solicitud rechazada.',
  UI_COORDINATOR_STUDY_PLANS_001: 'Estado del plan de estudio actualizado.',
  UI_DEAN_COORDINADORES_001: 'El cambio se guardó. La cuenta de acceso se sincronizará pronto.',
  UI_DEAN_COORDINADORES_002: 'Cambio guardado.',
  UI_DEAN_COORDINADORES_004: 'El campo Contraseña Inicial IAM es obligatorio.',
  UI_DEAN_COORDINADORES_005: 'Coordinador registrado exitosamente.',
  UI_DEAN_COORDINADORES_006: 'El profesional {nombres} {apellidos} ya coordina un programa académico.',
  UI_DEAN_COORDINADORES_007: 'Datos de {nombres} {apellidos} precargados. Defina el programa y guarde.',
  UI_DEAN_COORDINADORES_008: 'Seleccione el programa existente.',
  UI_DEAN_COORDINADORES_009: 'Seleccione el tipo de programa.',
  UI_DEAN_COORDINADORES_010: 'El nombre del programa es obligatorio.',
  UI_DEAN_COORDINADORES_011: 'El nombre del programa no puede superar {maximo} caracteres.',
  UI_DEAN_PROGRAMAS_GESTION_001: 'Programa actualizado.',
  UI_DEAN_PROGRAMAS_GESTION_002: 'Programa creado.',
  UI_DEAN_PROGRAMAS_GESTION_003: 'Estado del programa actualizado.',
  UI_ERROR_INTERCEPTOR_001: 'Acceso denegado: No cuenta con los permisos necesarios para realizar esta acción.',
  UI_PARAMETRO_EDICION_MODAL_001: 'Parámetro actualizado exitosamente.',
  UI_ROLE_GUARD_001: 'Acceso denegado: No cuenta con los permisos necesarios para acceder a esta sección.',
  // DEC-072: una sesión empieza y termina el mismo día (no cruza la medianoche).
  UI_SESION_HORARIO_MISMO_DIA: 'La hora de fin debe ser posterior a la hora de inicio el mismo día; una sesión no puede pasar de la medianoche.',
  // DEC-065 (2): solicitudes de sesión extraordinaria (antes en core/models/sesion-manual.util.ts).
  UI_SESION_SOLICITUD_APROBADA: 'La coordinación aprobó la sesión extraordinaria {nombre}.',
  UI_SESION_SOLICITUD_APROBADA_SIN_NOMBRE: 'La coordinación aprobó la sesión extraordinaria.',
  UI_SESION_SOLICITUD_NUEVA: 'Nueva solicitud de sesión extraordinaria de {docente}.',
  UI_SESION_SOLICITUD_NUEVA_SIN_DOCENTE: 'Nueva solicitud de sesión extraordinaria.',
  UI_SESION_SOLICITUD_RECHAZADA_O_CANCELADA: 'La coordinación rechazó o canceló la sesión {nombre}.',
  UI_SESION_SOLICITUD_RECHAZADA_O_CANCELADA_SIN_NOMBRE: 'La coordinación rechazó o canceló una sesión del grupo.',
  UI_SESION_SOLICITUD_REGISTRADA: 'La sesión queda pendiente hasta que el coordinador del programa la apruebe.',
  UI_SOPORTE_DESCARGADO: 'Soporte "{nombre}" descargado.',
  UI_STUDENT_CLAIMS_001: 'Esta solicitud no tiene un soporte descargable.',
  UI_STUDENT_CLAIMS_002: 'Solicitud retirada.',
  UI_STUDENT_COURSES_001: 'El archivo no es válido.',
  UI_STUDENT_COURSES_002: 'Reclamo enviado.',
  UI_STUDENT_COURSES_003: 'El soporte adjunto ya no está disponible. Adjúntalo nuevamente.',
  UI_STUDENT_COURSES_004: 'Ingresa el PIN de 6 dígitos que proyecta tu docente.',
  UI_STUDENT_COURSES_005: '¡Matrícula confirmada exitosamente en el grupo!',
  UI_STUDENT_COURSES_006: 'Archivo "{nombre}" cargado y analizado correctamente.',
  UI_STUDY_PLAN_FORM_001: 'El INP del plan debe ser un número entero positivo (por ejemplo, el año de vigencia: 2027).',
  UI_STUDY_PLAN_FORM_PAGE_001: 'Plan de estudio registrado.',
  UI_STUDY_PLAN_FORM_PAGE_002: 'Plan de estudio modificado.',
  UI_STUDY_PLAN_MESH_PAGE_001: 'Asignatura asociada al plan.',
  UI_STUDY_PLAN_MESH_PAGE_002: 'Asignatura quitada del plan.',
  UI_STUDY_PLAN_MESH_PAGE_003: 'Semestre {semestre} agregado al plan.',
  UI_STUDY_PLAN_MESH_PAGE_004: 'Semestre {semestre} vacío eliminado.',
  UI_SUBJECT_FORM_PAGE_001: 'Asignatura registrada en el plan.',
  UI_SUBJECT_FORM_PAGE_002: 'Asignatura modificada.',
  UI_TEACHER_CLAIMS_001: 'Reclamo procesado.',
  UI_TEACHER_CLAIMS_002: 'Este soporte no contiene un fileId descargable en el contrato actual.',
  UI_TEACHER_GRUPO_DECISIONES_001: 'Un estudiante cruzó el umbral de cancelación: revisa Decisiones pendientes',
  UI_TEACHER_GRUPOS_001: 'Error al cargar grupos.',
  UI_TEACHER_GRUPOS_005: 'El campo Fecha de la Sesión es obligatorio.',
  UI_TEACHER_GRUPOS_006: 'Los campos Hora Inicio y Hora Fin de la sesión son obligatorios.',
  UI_TEACHER_GRUPOS_007: 'La zona horaria activa cambió mientras editabas. Se recargó el horario original; revisa los datos antes de guardar.',
  UI_TEACHER_GRUPOS_008: 'Sesión actualizada.',
  UI_TEACHER_GRUPOS_009: 'No se pudo identificar al estudiante a retirar.',
  UI_TEACHER_GRUPOS_011: 'Sesión cancelada. Estudiantes notificados: {notificados}.',
  UI_TEACHER_MATRICULA_MODAL_001: 'La matrícula por código quedó cerrada.',
  UI_TEACHER_MATRICULA_MODAL_002: 'PIN de matrícula copiado al portapapeles.',
  UI_TEACHER_MATRICULA_MODAL_003: 'Enlace de matrícula copiado al portapapeles.',
  UI_TEACHER_RETIRO_ESTUDIANTE_MODAL_001: '{nombre} fue retirado del grupo.',
  UI_TEACHER_RETIRO_ESTUDIANTE_MODAL_002: 'El estudiante fue retirado del grupo.',
} as const;

export type CodigoMensajeUi = keyof typeof MENSAJES_UI;

export type ParametrosMensajeUi = Readonly<Record<string, string | number | null | undefined>>;

/** Texto del catálogo con sus marcadores `{nombre}` llenos; un marcador sin parámetro queda tal cual. */
export function mensajeUi(codigo: CodigoMensajeUi, parametros: ParametrosMensajeUi = {}): string {
  return MENSAJES_UI[codigo].replace(/\{(\w+)\}/g, (marcador, nombre: string) => {
    const valor = parametros[nombre];
    return valor === null || valor === undefined ? marcador : String(valor);
  });
}

/** Indica si un código que llega como texto (por ejemplo de otra capa) existe en el catálogo. */
export function esCodigoMensajeUi(codigo: string): codigo is CodigoMensajeUi {
  return Object.prototype.hasOwnProperty.call(MENSAJES_UI, codigo);
}
