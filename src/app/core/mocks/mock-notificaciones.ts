import {
  TipoPlantillaAdminDto,
  VersionPlantillaDto,
} from '../services/admin-email-notification.service';

/** Plantillas de correo simuladas (NOTIF-002B): reflejan las plantillas por defecto del backend. */
interface PlantillaSemilla {
  tipo: string;
  asunto: string;
  cuerpo: string;
  obligatorios: string[];
  opcionales: string[];
}

const SEMILLAS: PlantillaSemilla[] = [
  {
    tipo: 'VERIFICACION_CORREO',
    asunto: 'Verifique su correo institucional',
    cuerpo: 'Hola {nombre}, se registró una cuenta a su nombre en la plataforma de asistencia. Para verificar su correo institucional abra el siguiente enlace: {enlace} . El enlace es de un solo uso y vence pronto. Si usted no esperaba este mensaje, ignórelo.',
    obligatorios: [
      'nombre',
      'enlace'
    ],
    opcionales: [
      'grupo'
    ]
  },
  {
    tipo: 'RETIRO_ESTUDIANTE_GRUPO',
    asunto: 'Retiro del grupo {grupo}',
    cuerpo: 'Se registró el retiro de {estudiante} del grupo {grupo}.',
    obligatorios: [
      'grupo',
      'estudiante'
    ],
    opcionales: [
      'motivo'
    ]
  },
  {
    tipo: 'RECLAMO_ASISTENCIA_RADICADO',
    asunto: 'Nueva solicitud de revisión de asistencia en {grupo}',
    cuerpo: 'El estudiante {estudiante} radicó una solicitud de revisión de asistencia para la sesión del {fecha} en el grupo {grupo}. Motivo: {motivo}.',
    obligatorios: [
      'grupo',
      'estudiante',
      'fecha'
    ],
    opcionales: [
      'motivo'
    ]
  },
  {
    tipo: 'RECLAMO_ASISTENCIA_RESUELTO',
    asunto: 'Respuesta a tu solicitud de revisión de asistencia en {grupo}',
    cuerpo: 'Tu solicitud de revisión de asistencia para la sesión del {fecha} en el grupo {grupo} fue resuelta como {estado}. Observaciones del docente: {observacion}.',
    obligatorios: [
      'grupo',
      'fecha',
      'estado'
    ],
    opcionales: [
      'observacion'
    ]
  },
  {
    tipo: 'ALERTA_RIESGO_INASISTENCIA',
    asunto: 'Alerta de riesgo de inasistencia en {grupo}',
    cuerpo: 'Estimado(a) {estudiante}, se informa que acumula un {porcentaje}% de inasistencias en la asignatura {grupo}. Le recordamos que el límite institucional de inasistencia no justificada es del 20%.',
    obligatorios: [
      'estudiante',
      'grupo',
      'porcentaje'
    ],
    opcionales: []
  },
  {
    tipo: 'ALERTA_PERDIDA_INASISTENCIA',
    asunto: 'Alerta de pérdida por inasistencia en {grupo}',
    cuerpo: 'Estimado(a) {estudiante}, se informa que ha alcanzado el {porcentaje}% de inasistencias en la asignatura {grupo}, superando el límite institucional permitido. Por favor contacte a su docente o coordinación académica.',
    obligatorios: [
      'estudiante',
      'grupo',
      'porcentaje'
    ],
    opcionales: []
  },
  {
    tipo: 'CIERRE_MASIVO_PERIODO_EJECUTADO',
    asunto: 'Cierre masivo de periodo académico ejecutado',
    cuerpo: 'El cierre masivo del periodo académico {periodo} fue ejecutado exitosamente por el administrador institucional.',
    obligatorios: [
      'periodo'
    ],
    opcionales: []
  }
];

const FECHA_BASE = '2026-11-01T10:00:00Z';

function construirVersion(semilla: PlantillaSemilla, indice: number): VersionPlantillaDto {
  return {
    id: `ver-${indice + 1}01`,
    tipo: semilla.tipo,
    idioma: 'es',
    version: 1,
    asunto: semilla.asunto,
    cuerpo: semilla.cuerpo,
    activa: true,
    creadoEn: FECHA_BASE,
  };
}

/** Catálogo simulado de plantillas con marcadores y su versión activa. */
export function plantillasNotificacionMock(): TipoPlantillaAdminDto[] {
  return SEMILLAS.map((semilla, indice) => ({
    tipo: semilla.tipo,
    idioma: 'es',
    versionActiva: 1,
    asuntoActivo: semilla.asunto,
    cuerpoActivo: semilla.cuerpo,
    actualizadoEn: FECHA_BASE,
    marcadores: [
      ...semilla.obligatorios.map((marcador) => ({ marcador, descripcion: `Marcador ${marcador}`, ejemplo: `ejemplo_${marcador}`, obligatorio: true })),
      ...semilla.opcionales.map((marcador) => ({ marcador, descripcion: `Marcador ${marcador}`, ejemplo: `ejemplo_${marcador}`, obligatorio: false })),
    ],
    versiones: [construirVersion(semilla, indice)],
  }));
}
