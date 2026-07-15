## ADDED Requirements

### Requirement: Interfaz adaptable a cualquier pantalla
El sistema SHALL garantizar que todas las vistas sean legibles y usables en dispositivos móviles, tablets y escritorio.

#### Scenario: Uso en móvil
- **WHEN** el usuario accede a la app desde un teléfono con pantalla de 375px de ancho
- **THEN** los formularios, botones y tablas se adaptan al ancho disponible sin scroll horizontal innecesario

#### Scenario: Uso en tablet
- **WHEN** el usuario accede desde una tablet en orientación horizontal
- **THEN** el sistema aprovecha el espacio mostrando paneles laterales o columnas adicionales

### Requirement: Navegación táctil
El system SHALL usar controles grandes y navegación clara para facilitar el uso con dedos.

#### Scenario: Toque en botones
- **WHEN** el usuario toca un botón con el dedo
- **THEN** el botón tiene un área de toque mínimo de 44x44 puntos de CSS

#### Scenario: Menú de navegación
- **WHEN** el usuario abre el menú en pantalla pequeña
- **THEN** el sistema muestra un menú desplegable o bottom sheet accesible con una sola mano
