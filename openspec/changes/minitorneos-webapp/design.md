## Context

El proyecto `torneos-app` es una aplicación web nueva para gestionar minitorneos. No depende de QuipuNet ni QuipuNetX. Debe funcionar enteramente en el navegador, ser responsive y permitir crear torneos, registrar jugadores/equipos, generar horarios y brackets, y registrar resultados.

## Goals / Non-Goals

**Goals:**
- Aplicación web progresiva (PWA-like) con funcionamiento offline básico.
- Interfaz responsive mobile-first con Tailwind CSS.
- Datos persistentes en el navegador (LocalStorage/IndexedDB).
- Generación automática de grupos, horarios y brackets.
- Actualización de brackets en vivo al registrar resultados.
- Exportación/impresión del cuadro del torneo.

**Non-Goals:**
- Backend remoto, autenticación de usuarios o sincronización en la nube en esta versión.
- Soporte para deportes con reglas complejas de puntuación (solo goles/puntos simples).
- Aplicaciones nativas iOS/Android.

## Decisions

- **React + Vite**: Stack moderno, rápido de levantar, HMR y build optimizada. Elegido sobre Next.js para evitar necesidad de servidor Node en producción (bundle estático).
- **Tailwind CSS**: Permite estilos responsive sin escribir media queries manuales. Elegido sobre CSS modules por velocidad de prototipado.
- **react-router-dom**: Navegación entre vistas (lista de torneos, detalle, registro de jugadores, bracket, resultados). Elegido sobre manejo manual de estado de ruta.
- **LocalStorage + IndexedDB (Dexie.js)**: Persistencia local simple. LocalStorage para configuración ligera; IndexedDB para torneos, jugadores y partidos. Elegido sobre backend porque no requiere infraestructura.
- **Generación de brackets**: Algoritmo local que, dado número de participantes, decide si usar grupos + eliminatorias o eliminatorias directas. Elegido por simplicidad y cero costo.
- **Cálculo de puntos**: 3 puntos por victoria, 1 por empate, 0 por derrota. Elegido por ser el estándar en la mayoría de deportes.

## Risks / Trade-offs

- **[Risk]** Datos solo en el navegador; si el usuario limpia cache pierde torneos.
  - **Mitigation**: Exportar/importar JSON de torneos; futura versión con backend/cloud.
- **[Risk]** Límite de almacenamiento del navegador.
  - **Mitigation**: Usar IndexedDB en lugar de LocalStorage para datos grandes; mostrar advertencia si se acerca el límite.
- **[Risk]** Sincronización entre pestañas.
  - **Mitigation**: Usar `storage` event + BroadcastChannel (con fallback a localStorage events) para refrescar vistas abiertas.

## Migration Plan

No aplica: proyecto nuevo.

## Open Questions

- ¿Se requiere soporte para dobles (parejas) en deportes como pádel? (Inicialmente se modela como "equipo" genérico.)
- ¿Se requiere impresión en formato PDF del bracket? (Se propone exportar a PNG/PDF en fase posterior.)
