# Gestió Asistencia UCO - Frontend

Aplicativo web institucional desarrollado en **Angular 18+ (Standalone Components, Signals & Reactive Architecture)** para la gestión y control de asistencias, oferta académica, gobernanza curricular y auditoría de la **Universidad Católica de Oriente (UCO)**.

Diseñado para cumplir con la totalidad de las **174 Historias de Usuario (HU001 a HU174)** descritas en el plan de requerimientos oficial.

---

## 🚀 Características Principales

1. **Arquitectura 100% Reactiva basada en Signals**:
   - Actualizaciones de estado en tiempo real sin temporizadores cíclicos (`setInterval`) ni polling destructivo.
   - Derivación precisa de métricas visuales mediante `computed()`.
   - Simulación desacoplada en memoria (`useMocks: true`) para pruebas integrales sin requerir backend ni base de datos encendida.

2. **Gobernanza Multirrol con Guards Estrictos**:
   - `ADMINISTRADOR`: Gestión de decanos, sedes, espacios físicos, facultades, áreas de conocimiento, parámetros globales, auditoría y simulador de cierre semestral masivo.
   - `DECANO`: Supervisión de coordinadores, consulta y detalle de grupos de la facultad, cronograma de sesiones, estructura física/académica y períodos lectivos.
   - `COORDINADOR`: Gestión de docentes adscritos, planes de estudio (mallas curriculares por semestres y asignaturas), períodos académicos, directorio institucional de estudiantes, matrícula por grupo y aprobación de solicitudes de cupo. *(Excluido estrictamente de la toma de asistencia)*.
   - `DOCENTE`: Horarios semanales, gestión de grupos y cupos máximos, cronograma de sesiones (regulares, reposición, extraordinarias), tablero de control de asistencia con atajos de teclado y resolución de reclamos justificados con soportes.
   - `ESTUDIANTE`: Consulta de horarios, seguimiento de materias inscritas con porcentaje acumulado de fallas, radicación de reclamos categorizados (`SALUD`, `CALAMIDAD`, `ACADEMICA`, `LABORAL`, `OTRA`) con adjuntos y solicitud de inscripción a cupos extemporáneos.

3. **Experiencia de Usuario Institucional y Alta Densidad**:
   - **Navegación a Pantalla Completa**: Eliminación de modales invasivos; las vistas secundarias, formularios y detalles se cargan en vistas completas con botones explícitos de retorno (`← Volver`).
   - **Avatares Deterministas**: Generación automática de avatares con la letra inicial del nombre y paleta cromática armónica de la UCO (sin URLs externas ni fotos de prueba).
   - **Búsqueda y Paginación Modular (`app-pagination`)**: Búsqueda predictiva instantánea con selector de registros por página (5, 10, 20, 50) y elipsis numérica.
   - **Estandarización de Ancho**: Diseño fluido y responsivo en todas las pantallas (`space-y-6 animate-fade-in`), adaptado tanto a monitores de escritorio como a dispositivos móviles.

---

## 📂 Estructura del Proyecto

```text
src/app/
├── core/
│   ├── guards/              # RoleGuard, AuthGuard
│   ├── interceptors/        # AuthInterceptor, ErrorInterceptor
│   ├── mocks/               # Datos simulados para demostración completa (role-management, users, courses)
│   ├── models/              # Interfaces tipadas (Zero 'any')
│   │   ├── api-response.model.ts
│   │   ├── attendance.model.ts
│   │   ├── course.model.ts
│   │   ├── role-management.model.ts  # Sedes, Espacios, Facultades, Planes, Solicitudes, Parámetros
│   │   └── user.model.ts
│   └── services/            # Servicios reactivos con Signals
│       ├── admin-management.service.ts
│       ├── attendance-claim.service.ts
│       ├── attendance.service.ts
│       ├── auth.service.ts
│       ├── coordinator-management.service.ts
│       ├── course.service.ts
│       ├── dean-management.service.ts
│       ├── session.service.ts
│       └── student-management.service.ts
├── features/
│   ├── admin/
│   │   ├── admin-catalogs/  # HU147-155, HU161-167 (Sedes, Aulas, Facultades, Áreas)
│   │   ├── admin-decanos/   # HU105-112 (Gestión y Asignación de Decanos)
│   │   └── admin-system/    # HU168-174 (Parámetros, Auditoría, Cierre Masivo)
│   ├── attendance/          # Tablero de Toma de Asistencia (AN, SJC, EX, QR, Atajos)
│   ├── auth/                # Login institucional y selector de simulador
│   ├── coordinator/
│   │   ├── coordinator-docentes/     # HU067-073 (Docentes adscritos)
│   │   ├── coordinator-students/     # HU050-054, HU156-160 (Directorio, Matrícula, Cupos)
│   │   └── coordinator-study-plans/  # HU074-083, HU096-098 (Planes de estudio, Mallas, Períodos)
│   ├── dashboard/           # Overview / Panel Principal adaptativo por rol
│   ├── dean/
│   │   ├── dean-coordinadores/       # HU099-104 (Coordinadores de Programa)
│   │   └── dean-faculty/             # Supervisión de Grupos, Estructura de Facultad y Calendario
│   ├── profile/             # Expediente del usuario (Modo Consulta / Modo Edición)
│   ├── student/
│   │   ├── student-courses/          # Mis Materias, Detalle Sesiones, Reclamos y Cupos
│   │   └── student-schedule/         # Grilla Horaria Semanal del Estudiante
│   └── teacher/
│       ├── teacher-claims/           # Bandeja de Resolución de Novedades y Justificaciones
│       ├── teacher-grupos/           # HU043-049, HU055-058 (Grupos, Aforo, Sesiones Extraordinarias)
│       └── teacher-schedule/         # Horario Semanal del Docente
├── layouts/                 # DashboardLayout con Sidebar colapsable y selector de roles Mock
└── shared/
    ├── components/          # Botones, Cards, Badges, Avatares, Formularios y Paginación
    └── ui/                  # Toast notification service y componentes reutilizables
```

---

## 🗺️ Mapa de Rutas del Sistema

| Ruta | Roles Autorizados | Descripción |
| :--- | :--- | :--- |
| `/login` | Público | Autenticación institucional con credenciales UCO. |
| `/app/dashboard` | Todos | Panel principal bento personalizado según el rol del usuario. |
| `/app/perfil` | Todos | Consulta y edición de datos personales (nombre, teléfono, correo alternativo). |
| `/app/asistencia` | Docente, Decano, Admin | Control de asistencia en aula física con atajos de teclado y estados. |
| `/app/admin/decanos` | Administrador | Asignación y activación de decanos por facultad. |
| `/app/admin/catalogos`| Administrador | Gestión de sedes (Rionegro, Medellín, La Ceja), aulas, laboratorios y áreas temáticas. |
| `/app/admin/sistema` | Administrador | Parámetros de fallas, logs de auditoría por IP y simulador de cierre semestral. |
| `/app/decano/facultad`| Decano | Supervisión de grupos de la facultad, sesiones, aforo y vigencias lectivas. |
| `/app/decano/coordinadores`| Decano | Designación de coordinadores de programa académico. |
| `/app/coordinador/docentes`| Coordinador | Gestión del cuerpo docente adscrito al programa. |
| `/app/coordinador/planes-estudio`| Coordinador | Creación de planes curriculares, asignaturas, créditos y períodos académicos. |
| `/app/coordinador/estudiantes`| Coordinador | Directorio de alumnos, matrícula manual por grupo y aprobación de solicitudes. |
| `/app/docente/grupos`| Docente | Apertura y edición de grupos, cupo máximo y sesiones extraordinarias. |
| `/app/docente/horarios`| Docente | Distribución semanal de horas de clase presenciales. |
| `/app/docente/reclamos`| Docente | Resolución de inasistencias con revisión de soportes documentales. |
| `/app/estudiante/materias`| Estudiante | Historial de asistencias por sesión, radicación de reclamos y solicitud de cupos. |
| `/app/estudiante/horarios`| Estudiante | Calendario semanal de asignaturas matriculadas. |

---

## 🛠️ Tecnologías Utilizadas

- **Framework**: Angular 18.1 (TypeScript 5.4, Standalone Components).
- **Gestión de Estado**: Signals (`signal`, `computed`, `effect`) nativas de Angular.
- **Estilos y Maquetación**: TailwindCSS + Paleta Institucional UCO (tonos verdes `primary`, acentos dorados `accent` y neutros cálidos `warm`).
- **Iconografía**: SVG puro embebido sin dependencias pesadas de terceros.
- **Pruebas Unitarias**: Karma + Jasmine (Chrome Headless).

---

## ⚙️ Configuración y Ejecución

### Prerrequisitos
- **Node.js**: v18.19.0 o superior.
- **npm**: v10.0.0 o superior.

### 1. Instalación de dependencias
```bash
npm install
```

### 2. Ejecución en Modo Desarrollo (Simulador Mock)
Por defecto, la aplicación corre con `useMocks: true` en [`src/environments/environment.ts`](file:///c:/Proyectos/GestioAsistencia/GestioAsistenciaFrontend/src/environments/environment.ts), lo que permite navegar, crear materias, matricular alumnos, registrar inasistencias y simular cierres semestrales sin necesidad de encender el backend ni la base de datos:
```bash
npm start
# O alternativamente:
ng serve
```
Abre tu navegador en `http://localhost:4200/`. Puedes cambiar entre roles en cualquier momento usando el **Simulador de Rol** ubicado en la barra lateral izquierda.

### 3. Compilación para Producción
```bash
npm run build
```
Genera los bundles optimizados en la carpeta `dist/gestio-asistencia-frontend/`.

### 4. Ejecución de Pruebas Automatizadas
```bash
npm test -- --watch=false --browsers=ChromeHeadless
```
