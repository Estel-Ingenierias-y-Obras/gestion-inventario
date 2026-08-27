# Migración futura a Microsoft Entra ID

Este documento describe las fases posteriores al modo de observación. No representa funcionalidad activa y no autoriza cambios automáticos.

## 1. Evolución funcional de Person y Department

Microsoft Entra ID será la fuente de verdad para la elegibilidad de personas, pero `Person` y `Department` se mantendrán. `Person` incorporará `entraId`, correo, licencias y estado. El departamento seguirá siendo un dato gestionado manualmente en la aplicación; `user.department` será únicamente información auxiliar y nunca provocará cambios automáticos ni alertas.

Cuando todas las referencias operativas utilicen una identidad Entra estable, se evaluará si las colecciones se renombran o sustituyen. No deben borrarse mientras `Entrega`, `PersonMaterialAssignment` o los créditos de traspaso mantengan referencias a sus `_id`.

## 2. Material asignado

La migración vinculará cada persona legacy con un usuario Entra mediante identificador, correo o revisión manual. Las coincidencias basadas solo en nombre nunca se aplicarán automáticamente. El material continuará apuntando al mismo `_id` local, evitando reescribir asignaciones.

Las personas sin correspondencia y con material activo quedarán en una cola de resolución. No se activarán bajas automáticas hasta resolverlas.

## 3. Entregas históricas

Las entregas existentes no se modificarán. Sus campos `receptor`, `departamento` y `personId` actuarán como snapshots históricos. Las nuevas entregas añadirán el identificador Entra del receptor, pero conservarán también nombre y departamento en el momento de la entrega.

## 4. Bajas

Una persona será candidata a baja al perder todas las licencias admitidas, deshabilitarse o desaparecer en una reconciliación completa correcta. Se mostrará como "Pendiente de baja", sin ocultarla y sin modificar material. La ausencia nunca se propondrá si la consulta Graph fue parcial o falló.

Solo un administrador podrá confirmar la baja. Esa acción explícita ejecutará de forma transaccional la devolución, los créditos de traspaso, la actualización de asignaciones y la auditoría. No habrá confirmación ni devolución automática.

## 5. Traspasos

La devolución confirmada manualmente generará `transferCredits` con la asignación y persona anteriores. Una entrega posterior que consuma esos créditos conservará `transferSources` y será presentada como traspaso. El nombre anterior se guardará como snapshot aunque el usuario ya no exista en Entra.

## 6. Gestión de Material Asignado

La pantalla distinguirá usuarios activos de usuarios históricos. Permitirá consultar asignaciones de una persona no visible, pero no crear nuevas. Mostrará fecha y motivo de devolución automática, usuario anterior y operación de sincronización que originó la baja.

## 7. Almacén

El material procedente de almacén regresará a sus pedidos originales usando `stockAllocations`. El material de origen manual generará una entrada trazable mediante `sourceAssignmentId`. Antes de activar efectos se validará que las cantidades asignadas coincidan con sus allocations y que no se supere el stock inicial.

## 8. Correos

Una entrega podrá contener líneas nuevas y transferidas. El correo mostrará secciones independientes: "Nuevas entregas" y "Traspasos". Cada traspaso incluirá usuario anterior, usuario nuevo, material, modelo, serie y fechas relevantes.

## 9. Auditoría

Se incorporarán eventos `AAD_USER_DEACTIVATED` y `AAD_USER_MATERIAL_RETURNED`, además de eventos de sincronización. La baja, devolución, créditos y auditoría se escribirán en la misma transacción MongoDB. Los eventos conservarán `entraId`, IDs locales, snapshots de nombre, causa, fecha y movimientos de stock.

## Secuencia de activación

1. Mantener simulaciones durante varios días.
2. Aprobar SKU y correspondencias.
3. Activar proyecciones Entra sin bajas.
4. Usar exclusivamente el catálogo Entra en nuevas entregas.
5. Bloquear el CRUD manual.
6. Mostrar candidatos como pendientes de baja.
7. Activar el flujo administrativo "Confirmar baja".
8. Validar devoluciones confirmadas, traspasos y correos.

Cada fase tendrá una bandera independiente y una condición de reversión documentada.
