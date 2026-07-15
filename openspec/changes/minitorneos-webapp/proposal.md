## Why

La organización de minitorneos (fútbol, pádel, e-sports, etc.) requiere coordinar canchas/escenarios, horarios, jugadores y resultados de forma manual, lo que genera errores y dificulta visualizar el avance del campeonato. Se necesita una aplicación web centralizada que permita planificar torneos, registrar participantes, asignar fechas y canchas, y registrar resultados, con una interfaz que funcione correctamente en dispositivos móviles y de escritorio.

## What Changes

- Crear una aplicación web *single-page application* (SPA) para gestionar minitorneos.
- Implementar CRUD de torneos con fechas, sedes/canchas y formato de competición.
- Implementar registro y edición de jugadores/equipos.
- Generar automáticamente grupos, horarios y llaves (brackets) a partir de la cantidad de participantes.
- Permitir registrar resultados de cada enfrentamiento y actualizar tablas/llaves en tiempo real.
- Diseñar interfaz 100% responsive usando un enfoque mobile-first.
- Persistir datos localmente en el navegador (LocalStorage/IndexedDB) para que funcione sin backend en una primera versión.

## Capabilities

### New Capabilities

- `tournament-management`: Crear, editar, eliminar y listar torneos; configurar fechas, sedes/canchas y formato (grupos + eliminatorias o solo eliminatorias).
- `player-registration`: Registrar jugadores/equipos con nombre, contacto y datos básicos; asociarlos a un torneo.
- `match-scheduling`: Generar automáticamente el calendario de partidos (grupos, semifinales, final, etc.) con horarios y canchas asignadas, similar al diagrama de la imagen.
- `bracket-visualization`: Mostrar visualmente los grupos y la fase eliminatoria (brackets) con colores, horarios y canchas, replicando el estilo del diagrama adjunto.
- `results-tracking`: Registrar resultados de cada partido, calcular puntos/goles, ordenar tablas de grupos y avanzar ganadores a la siguiente ronda.
- `responsive-ui`: Interfaz adaptable a móviles, tablets y escritorio, con navegación clara y controles táctiles.

### Modified Capabilities

- Ninguna. Este es un proyecto nuevo y no modifica capacidades existentes.

## Impact

- Nuevo proyecto independiente en `c:\Users\RESTAURANT\source\repos\torneos-app`.
- Sin dependencias con QuipuNet ni QuipuNetX en esta primera versión.
- Stack propuesto: React + Vite + Tailwind CSS + react-router-dom + LocalStorage/IndexedDB.
- No requiere backend ni servicios de autenticación externos en la versión inicial.
