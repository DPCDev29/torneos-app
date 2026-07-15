## ADDED Requirements

### Requirement: Generar calendario de partidos de grupos
El sistema SHALL generar automáticamente los partidos de la fase de grupos en modo todos contra todos, asignando fecha, hora y cancha.

#### Scenario: Generación con horarios consecutivos
- **WHEN** el usuario define la duración de cada partido y la hora de inicio
- **THEN** el sistema crea todos los partidos de grupo con horarios y canchas asignados sin solapamientos

#### Scenario: Re-generación tras agregar participantes
- **WHEN** se agrega un nuevo participante a un grupo existente
- **THEN** el sistema recalcula los partidos del grupo manteniendo resultados ya registrados

### Requirement: Generar fase eliminatoria
El sistema SHALL crear semifinales y final (o llaves directas) a partir de la cantidad de participantes o de los clasificados de grupos.

#### Scenario: Bracket de 8 participantes
- **WHEN** el torneo tiene 8 participantes y se elige formato de eliminatorias directas
- **THEN** el sistema genera cuartos de final, semifinal y final con sus respectivos horarios

#### Scenario: Clasificación desde grupos
- **WHEN** finalizan todos los partidos de grupos
- **THEN** el sistema crea las llaves de eliminatoria con los primeros lugares de cada grupo
