## ADDED Requirements

### Requirement: Visualizar fase de grupos
El sistema SHALL mostrar los grupos con sus participantes, horarios de partidos y resultados en una cuadrícula clara.

#### Scenario: Vista de grupos en móvil
- **WHEN** el usuario abre un torneo con fase de grupos desde un dispositivo móvil
- **THEN** el sistema muestra cada grupo apilado verticalmente y permite desplazarse sin pérdida de legibilidad

#### Scenario: Identificación por color
- **WHEN** el sistema muestra un partido de grupo
- **THEN** cada participante se visualiza con el color asignado durante el registro

### Requirement: Visualizar bracket eliminatorio
El sistema SHALL mostrar las llaves de eliminatoria conectadas visualmente, indicando horarios, canchas y ganadores.

#### Scenario: Bracket responsive
- **WHEN** el usuario abre la vista de bracket en una pantalla pequeña
- **THEN** el bracket permite desplazamiento horizontal y mantiene la relación entre llaves

#### Scenario: Actualización tras resultado
- **WHEN** se registra el ganador de una llave
- **THEN** el sistema avanza automáticamente al ganador a la siguiente ronda y actualiza la visualización
