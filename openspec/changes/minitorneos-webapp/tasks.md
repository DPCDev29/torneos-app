## 1. Setup

- [x] 1.1 Inicializar proyecto React con Vite en `c:\Users\RESTAURANT\source\repos\torneos-app`.
- [x] 1.2 Instalar dependencias: `react-router-dom`, `tailwindcss`, `dexie` (IndexedDB), `lucide-react`.
- [x] 1.3 Configurar Tailwind CSS y estructura de carpetas (`src/components`, `src/pages`, `src/hooks`, `src/db`, `src/utils`).

## 2. Domain models y persistencia

- [x] 2.1 Definir tipos TypeScript para `Tournament`, `Participant`, `Match`, `Group`, `Stage`.
- [x] 2.2 Implementar capa de almacenamiento con Dexie.js: tablas `tournaments`, `participants`, `matches`, `groups`.
- [x] 2.3 Agregar funciones de importación/exportación de torneo a JSON.

## 3. Gestión de torneos

- [x] 3.1 Crear página de lista de torneos con botón "Nuevo torneo".
- [x] 3.2 Implementar formulario de creación/edición de torneo (nombre, fecha, sede, formato).
- [x] 3.3 Implementar validación de campos obligatorios y mensajes de error.
- [x] 3.4 Implementar eliminación de torneo con confirmación.

## 4. Registro de jugadores/equipos

- [x] 4.1 Crear vista de participantes del torneo.
- [x] 4.2 Implementar formulario de registro con nombre, contacto, color y representante.
- [x] 4.3 Validar nombres duplicados dentro del mismo torneo.
- [x] 4.4 Permitir editar y eliminar participantes sin partidos jugados.

## 5. Programación de partidos

- [x] 5.1 Implementar generador de partidos de grupos (todos contra todos).
- [x] 5.2 Implementar asignación de horarios y canchas sin solapamientos.
- [x] 5.3 Implementar generación de fase eliminatoria (cuartos, semifinal, final) según número de participantes.
- [x] 5.4 Permitir re-generar horarios tras agregar/quitar participantes manteniendo resultados ya registrados.

## 6. Visualización de brackets

- [x] 6.1 Crear componente de visualización de grupos (tabla de posiciones + lista de partidos).
- [x] 6.2 Crear componente de bracket eliminatorio con conectores visuales.
- [x] 6.3 Aplicar colores de participantes y mostrar horarios/canchas en cada partido.
- [x] 6.4 Implementar scroll horizontal fluido en móvil para el bracket.

## 7. Registro de resultados

- [x] 7.1 Crear formulario de registro de marcador para cada partido.
- [x] 7.2 Calcular puntos, diferencia y goles/puntos a favor para tabla de grupos.
- [x] 7.3 Ordenar tabla de grupos con criterios de desempate.
- [x] 7.4 Avanzar automáticamente ganadores de grupos a la fase eliminatoria.
- [x] 7.5 Avanzar ganadores de llaves a la siguiente ronda del bracket.

## 8. Interfaz responsive y UX

- [x] 8.1 Aplicar clases mobile-first de Tailwind a todas las vistas.
- [x] 8.2 Verificar áreas de toque mínimas de 44x44 px en botones.
- [x] 8.3 Implementar menú de navegación adaptable (drawer/bottom sheet en móvil).
- [ ] 8.4 Probar visualización en resoluciones 375px, 768px y 1440px.

## 9. Build y despliegue

- [x] 9.1 Configurar `vite.config.ts` para build estática.
- [x] 9.2 Agregar scripts `build` y `preview`.
- [x] 9.3 Verificar que la aplicación compila sin errores.
- [x] 9.4 (Opcional) Desplegar demo con `npm run preview` o servicio estático local.
