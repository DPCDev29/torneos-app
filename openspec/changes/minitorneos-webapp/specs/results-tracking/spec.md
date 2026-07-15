## ADDED Requirements

### Requirement: Registrar resultado de un partido
El sistema SHALL permitir registrar el marcador final de un partido y determinar el ganador.

#### Scenario: Registro de victoria simple
- **WHEN** el usuario ingresa el marcador de un partido y guarda
- **THEN** el sistema asigna 3 puntos al ganador, 0 al perdedor y actualiza la tabla del grupo

#### Scenario: Registro de empate
- **WHEN** el usuario ingresa un marcador igual para ambos participantes
- **THEN** el sistema asigna 1 punto a cada uno y actualiza la clasificación

### Requirement: Calcular clasificación de grupos
El system SHALL ordenar los participantes de cada grupo por puntos, diferencia de goles/puntos y goles/puntos a favor.

#### Scenario: Ordenamiento por puntos
- **WHEN** finalizan varios partidos de un grupo
- **THEN** la tabla de posiciones muestra primero al participante con más puntos

#### Scenario: Desempate por diferencia
- **WHEN** dos participantes tienen la misma cantidad de puntos
- **THEN** el sistema coloca primero al que tenga mayor diferencia de goles/puntos

### Requirement: Avanzar ganadores a eliminatoria
El system SHALL usar los clasificados de cada grupo para completar automáticamente las llaves de la fase final.

#### Scenario: Dos grupos de cuatro
- **WHEN** un torneo tiene dos grupos de 4 participantes y se necesitan 4 clasificados
- **THEN** el sistema avanza a los dos primeros de cada grupo a las semifinales
