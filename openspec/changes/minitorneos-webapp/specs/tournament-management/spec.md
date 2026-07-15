## ADDED Requirements

### Requirement: Crear un nuevo torneo
El sistema SHALL permitir crear un torneo indicando nombre, fecha de inicio, sede/cancha por defecto y formato de competición.

#### Scenario: Creación exitosa de torneo
- **WHEN** el usuario completa el formulario de nuevo torneo y presiona guardar
- **THEN** el sistema crea el torneo y lo muestra en la lista de torneos

#### Scenario: Validación de campos obligatorios
- **WHEN** el usuario intenta guardar un torneo sin nombre
- **THEN** el sistema muestra un mensaje de error indicando que el nombre es obligatorio

### Requirement: Editar y eliminar torneos
El sistema SHALL permitir editar los datos de un torneo existente y eliminarlo si no tiene partidos registrados.

#### Scenario: Edición de datos del torneo
- **WHEN** el usuario modifica la fecha o sede de un torneo existente
- **THEN** el sistema actualiza la información y refleja el cambio en todas las vistas

#### Scenario: Eliminación con partidos asociados
- **WHEN** el usuario intenta eliminar un torneo que ya tiene partidos
- **THEN** el sistema solicita confirmación y advierte que se perderán todos los datos del torneo
