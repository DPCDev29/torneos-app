## ADDED Requirements

### Requirement: Registrar jugadores o equipos en un torneo
El sistema SHALL permitir registrar jugadores o equipos con nombre obligatorio y datos opcionales (contacto, color, representante).

#### Scenario: Registro exitoso
- **WHEN** el usuario ingresa el nombre de un jugador/equipo y lo guarda
- **THEN** el sistema lo agrega a la lista de participantes del torneo

#### Scenario: Evitar duplicados
- **WHEN** el usuario intenta registrar un participante con un nombre que ya existe en el torneo
- **THEN** el sistema muestra un error indicando que el nombre ya está registrado

### Requirement: Editar y eliminar participantes
El sistema SHALL permitir modificar los datos de un participante o eliminarlo si aún no tiene partidos jugados.

#### Scenario: Eliminación permitida antes del inicio
- **WHEN** el usuario elimina un participante sin partidos asignados
- **THEN** el sistema lo remueve del torneo y actualiza la lista

#### Scenario: Eliminación restringida durante el torneo
- **WHEN** el usuario intenta eliminar un participante que ya tiene partidos
- **THEN** el sistema impide la eliminación y explica que ya existen resultados asociados
