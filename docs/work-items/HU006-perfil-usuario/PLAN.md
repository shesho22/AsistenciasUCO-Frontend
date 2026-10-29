# HU006-perfil-usuario — Perfil propio con expediente y vínculos

## Objetivo

"Mi perfil" agrega la sección **"Expediente y vínculos institucionales"**, leída del servidor con `GET /api/v1/usuarios/perfil`. Muestra:
- el documento, el correo (indica si está sin confirmar), el nombre registrado y el estado de la cuenta;
- los vínculos del usuario: los programas como estudiante o docente, el programa que coordina, la facultad que dirige y la institución que administra, cada uno con su estado.

## Alcance y límites

- El contrato HTTP y la validación de las 3 capas están en el work item homónimo del backend (`docs/work-items/HU006-perfil-usuario/`).
- La pantalla es de solo lectura. La edición sigue deshabilitada, porque el PUT responde 501 (TD-049 parcial).
- `AuthService` y el flag `USER_PROFILE_ENDPOINT_ENABLED` (configuración de Infra) no cambian. La sección nueva consulta el endpoint directamente.

## Pantallas, servicios y simulación

| Elemento | Cambio |
|---|---|
| `ProfileLinksComponent` (`features/profile/components`) | Nuevo: expediente y lista de vínculos con etiqueta por rol; error visible |
| `ProfileComponent` | Incluye `<app-profile-links />` debajo del formulario |
| `PerfilService` (`core/services`) | Nuevo; sin toast global |
| `mock-backend.interceptor` | `GET .../usuarios/perfil` con un vínculo de docente |
