# Paridad financiera con el Excel original

Fecha de revisión: 2026-10-10. Boundary: frontend. Estado: **fórmulas compartidas verificadas; F-DATA-04 y F-DATA-06 cerrados bajo el contrato aprobado por el propietario**. No se afirma identidad literal universal con el libro.

## Fuente y protección de datos

El propietario proporcionó el libro original desde su equipo. Se abrió en solo lectura mediante `zipfile` y XML de Python, sin instalar dependencias, modificar el archivo, copiarlo al repositorio ni usar una base de datos. SHA-256 del original: `6354cd527eea2896f08d4997757bf398c01da979a2ae8cd22967c1df3fac9dab`.

El informe y los tests no incluyen nombres, ingresos, saldos, deudas ni otros datos del propietario. `S1` a `S8` son alias según el orden físico de las pestañas: S1 es el resumen, S2–S6 son hojas mensuales, S7 es el plan de deudas y S8 es configuración. Las coordenadas conservan la trazabilidad sin publicar nombres de pestañas. Todos los ejemplos numéricos siguientes son inventados para las pruebas.

Se inspeccionaron 8 hojas y 240 fórmulas; las 240 tenían resultados cacheados y ninguna tenía un error cacheado. Estos resultados son evidencia del archivo guardado, **no una ejecución nueva de Excel**. No se recalculó el libro en Excel ni LibreOffice. Las reglas se contrastaron con funciones públicas de la app y fixtures sintéticos.

## Fórmulas compartidas comprobadas

| Fuente | Regla del libro | Interfaz pública comprobada |
| --- | --- | --- |
| S2–S6 C5 | Prestaciones = salario × tasa de configuración | `computeMonthSheet` |
| S2–S6 C11 | Si incapacidad > 0, sustituye el neto de nómina; agrega el sobrante solo si su destino es disponible | `computeMonthSheet` |
| S2–S6 H4:H8 | Suma de gastos, disponible = ingreso − gastos, colchón, excedente no negativo y comparación del colchón | `computeMonthSheet` |
| S2–S6 H11:H17 y H20:H27 | Sumas por cuenta/categoría y ahorro con sobrante destinado a ahorro | `computeMonthSheet` |
| S1 B:J | Enlaces a totales mensuales y acumulación cronológica de ahorro (`J4=I4`, `J5=J4+I5`) | `computeSummaryRows`, `summarizeYear` |
| S7 C7/C9/C10 | Excedente y bolsa extra; redirigir agrega pagos actuales menos mínimos personales | `computeDebtPlan` |
| S7 F/I/J/P13:P16 | Saldo personal, costo mensual incluyendo seguro, tasa efectiva anual y orden por costo con desempate por fila | `computeDebtPlan` |
| S7 Q:S/T/U/V13:V16 | Base, capacidad, capacidad de prioridades anteriores, asignación extra, pago recomendado y aporte de otra persona | `computeDebtPlan`, para topes positivos coherentes y saldos suficientes |
| S7 W13:W16 | `IFERROR(ROUNDUP(NPER(I,-V,D),0),…)` | `paymentPeriods` |
| S7 C23 | Disponible tras recomendar = disponible actual − (recomendado − pago actual) | `computeDebtPlan` |

### Evidencia permanente

`frontend/src/modules/finance/domain/excel-parity.test.ts` contiene ocho pruebas con resultados literales calculados a partir de estas fórmulas y datos sintéticos, más una prueba del contrato de precisión aprobado. Los tests no abren el archivo privado y no dependen de `.local/`.

- Nómina sintética: salario 10.000, tasa 8 %, deducciones 100, transporte 500 y sobrante 200 → prestaciones 800, neto 9.800. Seis gastos de categorías diferentes suman 2.100 → disponible 7.700 y excedente 2.700 con colchón 5.000.
- Destinar el sobrante a ahorro → neto 9.600, ahorro 600; no se duplica el sobrante.
- Incapacidad 1.000 → neto 1.200; incapacidad 0 conserva el neto de nómina.
- Resumen de dos meses → ahorro 400 y 600; acumulado 400 y 1.000, conservando orden cronológico.
- Avalancha sintética con dos deudas → bolsa 200, recomendaciones 350 y 250; con redirección → bolsa 350 y recomendaciones 450 y 150. En ambos casos queda el colchón de 500.
- `NPER` con los pagos sintéticos produce 4 y 8 meses; tasa cero funciona y un pago que no cubre intereses devuelve indisponible.

Comando inicial ejecutado: `pnpm exec vitest run src/modules/finance/domain/excel-parity.test.ts`. Resultado: **8/8 aprobado** antes de agregar la prueba de contrato. El primer intento en sandbox no pudo resolver el ejecutable y el siguiente encontró acceso denegado de esbuild al directorio padre; la misma comprobación fuera del sandbox pasó. Esos fallos fueron del entorno de ejecución, no de las fórmulas.

Después de registrar el contrato se ejecutó `pnpm exec vitest run src/modules/finance/domain/debt-plan.test.ts src/modules/finance/domain/excel-parity.test.ts src/modules/finance/domain/money.test.ts`: **44/44 aprobado**, incluyendo las nueve pruebas de paridad/precisión, dos nuevas regresiones de cuota base/bolsa y los casos anteriores de topes y redondeo. La corrida completa y su conteo final quedan a cargo de la validación global del cierre.

## F-DATA-04: topes y bases no son idénticos en los bordes

La fórmula real de capacidad del libro, en S7 R13:R16, es:

```text
MAX(0, IF(tope > 0, tope, saldoPersonal) - pagoBase)
```

El libro interpreta un tope vacío o cero como ausencia de tope positivo. Además, no reduce `pagoBase` si excede el tope o saldo; solo vuelve cero la capacidad extra. La versión de la app corregida previamente interpreta `null` como sin tope y `0` como tope explícito, acota al saldo liquidable y conserva la cuota mínima acotada al saldo cuando el tope es inviable, señalándolo en la interfaz.

El propietario confirmó el 2026-10-10: **vacío/null = sin tope; 0 = sin abono extra**, conservando la mínima personal acotada al saldo y el aviso de incompatibilidad. F-DATA-04 queda cerrado con ese contrato, documentado en `PRODUCT.md`; se conserva explícita su diferencia frente al libro.

La comprobación encontró un borde no cubierto: sin redirección, un tope incompatible podía tratar la mínima pendiente como extra y dejarla en cero si no había bolsa. Se observó un test fallido antes de corregir. Ahora la mínima acotada pasa a la base y su diferencia frente al pago actual se reserva antes de asignar extras a otras deudas. No se duplica el excedente ni se simula dinero disponible.

Regresiones sintéticas en `debt-plan.test.ts`: con disponible 1.500 y colchón 1.000, mínima 200 y tope 0, la base es 200 y el extra 0; una segunda deuda sin tope recibe 300 y quedan 1.000. Con disponible 1.100, pago actual 50 y mínima 200, la base adicional consume 150: la bolsa extra queda en cero y el disponible final es 950. La interfaz advierte que las mínimas reducen el colchón. Este segundo caso fue verificado después del fix como caracterización de presupuesto insuficiente; no se presenta como un fallo observado antes.

## F-DATA-06: el libro no establece ROUND a centavos

No se encontró `ROUND(...,2)` en las 240 fórmulas. El único redondeo explícito es `ROUNDUP` para los periodos de deuda. Tampoco hay una opción `fullPrecision=false` que convierta el formato de moneda en precisión de cálculo. El formato visual de una celda no equivale a redondear su valor.

La app y la API normalizan dinero a dos decimales con mitad alejándose de cero. Esa regla tiene la semántica de la función `ROUND` de Excel, pero **no procede de una fórmula del libro original**. Su adopción es un contrato monetario de la app.

Ejemplo sintético: salario 101 y tasa 0,5 % producen prestaciones 0,505 y neto 100,495 en la fórmula sin redondear. La app calcula prestaciones 0,51 y neto 100,49. Otro ejemplo sintético: 33,33 % de saldo 101 produce 33,6633 en el libro y 33,66 en la app. Son diferencias de precisión e intermediarios, aunque el formato de pantalla o el redondeo final puedan ocultarlas.

Como diagnóstico limitado al archivo, los 127 campos monetarios numéricos inspeccionados de las hojas mensuales eran enteros; sus resultados mensuales clave no contenían fracciones significativas inferiores a centavos. Diez resultados monetarios cacheados del plan de deudas sí contenían más de dos decimales. No se publican sus valores. Esto confirma que no debe afirmarse identidad literal universal basada solo en los casos mensuales enteros.

El bloqueo de archivo faltante está resuelto. El propietario aprobó el 2026-10-10 el contrato actual de **centavos con mitad alejándose de cero para dinero e intermediarios monetarios**, consistente en frontend/API, y que tasas y porcentajes conserven sus escalas propias. F-DATA-06 queda cerrado por esta decisión documentada en `PRODUCT.md`, sin atribuir al original una fórmula que no contiene. No se modificó el algoritmo de precisión: la nueva regresión comprueba prestaciones 0,51/neto 100,49 y parte compartida 33,66 con los datos sintéticos anteriores, además de tasas de seis y cuatro decimales.

## Mínimos de deuda: entradas manuales y una excepción del libro

El libro usa una fórmula de principal fijo más intereses en S7 K13 y `PMT(G16,22,-D16)` en K16. La app recibe `minimumPayment` como entrada del periodo: no dispone de un modelo de principal fijo/plazo para recalcular automáticamente esas dos cuotas al editar saldo o tasa. El usuario debe ingresar la cuota mínima vigente. Los tests de avalancha comparan la asignación después de proporcionar esa entrada; no certifican un cálculo de `PMT` que la app no implementa.

Para el mínimo personal, S7 M13 usa `MAX(0,K13-L13)` y M14 usa específicamente `K14/2`. La app usa la regla general de restar aporte, con `myMinimumOverride` para representar otras condiciones pactadas. Un test demuestra que un mínimo total sintético de 200 y aporte 50 da 150 por la regla general; el override de 100 reproduce la fila que divide por dos. No debe presumirse que cuota compartida al 50 % siempre equivale a restar el aporte mensual.

## Límite de la conclusión

Las fórmulas compartidas arriba y el contrato aprobado cuentan con regresiones independientes y se aprobaron localmente. El original fue encontrado y permanece en solo lectura. Las decisiones están registradas en `PRODUCT.md`, las instrucciones de agentes y el informe de cierre. F-DATA-04/06 quedan cerrados en el alcance local comprobado; no se certifica identidad matemática universal con un libro que maneja topes, cuotas específicas y precisión de manera distinta. Este cierre tampoco sustituye las comprobaciones externas de staging, Neon, proveedores y operación documentadas en el cierre general.
