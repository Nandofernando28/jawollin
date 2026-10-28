# Declaración y Desglose de Costos en AWS
**Proyecto:** Operación Cortafuegos Manta (SpookyThon 2026 · Track B)  
**Región:** `us-east-1` (N. Virginia)  
**Arquitectura:** 100% Serverless Event-Driven (*Scale-to-Zero*)  

> **Revisión del 28/10/2026.** Se integró la estimación oficial calculada con la [AWS Pricing Calculator](https://calculator.aws/#/estimate?id=967e79f4ca7a1cb5a0807a4856c4001120952fbc) (respaldo fuente en [`docs/My Estimate.json`](My%20Estimate.json)), arrojando un costo mensual en producción de **$4.55 USD/mes** con Bedrock activado y **$2.79 USD/mes** con la configuración por defecto. Precios en región `us-east-1`.

---

## 1. Costo Durante el Hackathon (3 Días de Evento)

### 1.1 Gasto real (de la cuenta de AWS)

El reto exige *"cuánto se gastó realmente durante el evento y que coincida con lo que muestra la cuenta"*. Tomado directamente de la consola de **AWS Billing & Cost Management** (región `us-east-1`):

| Fuente | Valor |
| :--- | :--- |
| Cost Explorer, gasto total del evento | **$0.00 USD** (100% cubierto por el AWS Free Tier) |
| AWS Budget (límite y alertas) | "My Zero-Spend Budget": **$5.00 USD al mes** (gasto actual: $0.00 de $5.00), con alerta por correo en cuanto el costo real supere **$0.01 USD** (notificación inmediata ante cualquier consumo). Captura de la consola de AWS: [`docs/budget.png`](budget.png) |

### 1.2 Estimación de uso durante el evento

Todos los servicios se eligieron dentro de la **Capa Gratuita de AWS (AWS Free Tier)** con facturación por uso estricto (sin instancias EC2, RDS, NAT Gateways ni endpoints de SageMaker encendidos por hora):

| Servicio AWS | Configuración | Uso Estimado en el Evento | Precio Unitario AWS (`us-east-1`) | Costo Estimado |
| :--- | :--- | :--- | :--- | :--- |
| **AWS Amplify Hosting** | CI/CD + CDN HTTPS | ~5 builds + < 1 GB transferido | Capa gratuita (minutos de build y GB servidos) | **$0.00 USD** |
| **Amazon API Gateway** | HTTP API | ~2,000 llamadas a `/simulate` y `/mayor-report` | Capa gratuita (1M llamadas/mes); luego ~$1.00/M | **$0.00 USD** |
| **AWS Step Functions** | Express Workflow (`Map`) | ~500 ejecuciones de orquestación Monte Carlo | $1.00 por millón de peticiones + $0.00001667/GB-s | **~$0.00 USD** |
| **AWS Lambda** | Python 3.12 (`arm64` Graviton2, 1536 MB) | ~5,000 invocaciones de lotes (~1.2 s c/u) | Capa gratuita: 1M peticiones + 400,000 GB-s/mes | **$0.00 USD** |
| **Amazon DynamoDB** | Modo `PAY_PER_REQUEST` (On-Demand) | ~2,000 lecturas/escrituras de caché por semilla | Capa gratuita | **$0.00 USD** |
| **Amazon S3** | Standard + expiración a 14 días | ~3,000 escrituras (lotes, series del mapa) y < 50 MB | Capa gratuita (12 meses: 5 GB, 20,000 GET, 2,000 PUT); luego ~$0.005 por 1,000 PUT | **~$0.01 USD** |
| **Amazon Bedrock** | Apagado por defecto (`UseBedrock=false`) | 0 informes (el boletín lo redacta el motor del COE) | — | **$0.00 USD** |
| **AWS Budgets + CloudWatch** | Presupuesto $5.00 USD + Logs (retención 7 días) | 1 Budget con alertas al 50% y 80% + < 500 MB logs | Capa gratuita | **$0.00 USD** |
| **TOTAL ESTIMADO** | | | | **~$0.01 USD** |

---

## 2. Proyección de Costo Operativo Mensual en Producción (Municipio / COE de Manta)

### 2.1 Estimación Oficial con AWS Pricing Calculator

Para garantizar total transparencia ante el jurado, se generó la estimación formal en la herramienta oficial de AWS:
- **Enlace público interactivo:** [AWS Pricing Calculator - Operación Cortafuegos Manta](https://calculator.aws/#/estimate?id=967e79f4ca7a1cb5a0807a4856c4001120952fbc)
- **Archivo fuente exportable (auditable):** [`docs/My Estimate.json`](My%20Estimate.json)

Desglose de la estimación oficial en la región `us-east-1`:

| Servicio AWS | Configuración / Dimensionamiento | Costo Mensual (`us-east-1`) |
| :--- | :--- | :--- |
| **AWS Lambda** | 10,000 peticiones, 1536 MB memoria | **$0.00 USD** (Capa gratuita permanente) |
| **Amazon API Gateway** | HTTP API: 12,000 peticiones/mes (10 KB/req) | **$0.01 USD** |
| **Amazon DynamoDB** | On-Demand: 1 GB almacenamiento + lecturas/escrituras | **$0.26 USD** |
| **Amazon S3** | Standard: 1 GB almacenamiento + 210,000 PUTs + 210,000 GETs | **$1.16 USD** |
| **Data Transfer** | Transferencia hacia Internet: 1 GB in / 1 GB out | **$0.09 USD** |
| **AWS Amplify Hosting** | 20 min build, 1 GB storage, 5 GB servidos | **$0.97 USD** |
| **Amazon CloudWatch** | Métricas y logs con retención 7 días | **$0.30 USD** |
| **Amazon Bedrock (Opcional)** | Inferencia On-Demand: 1 req/min (8 h/día), 1,500 in / 500 out tokens | **$1.76 USD** |
| **AWS Budgets** | Primeros 2 presupuestos mensuales gratuitos | **$0.00 USD** |
| **TOTAL MENSUAL (con Bedrock)** | **Operación completa con IA generativa** | **$4.55 USD/mes** ($54.60 USD/año) |
| **TOTAL MENSUAL (por defecto)** | **Sin Bedrock (`UseBedrock=false`, reporte determinista)** | **$2.79 USD/mes** ($33.48 USD/año) |

### 2.2 Desglose Analítico Teórico (Cota Máxima sin Capa Gratuita)

Supuesto extremo: el **Comité de Operaciones de Emergencia (COE) de Manta** usa la plataforma de forma continua con **10,000 simulaciones al mes**, cada una con **100 réplicas** (el máximo de la interfaz), es decir **20 lotes** de 5 réplicas por simulación: **200,000 invocaciones de Lambda workers** y **10,000 del orquestador**. Calculando sin descontar ninguna capa gratuita:

1. **AWS Lambda (`arm64`, 1,5 GB; $0.0000133334 por GB-s y $0.20 por millón de peticiones):**
   - Workers: $200{,}000 \times 1{,}2\text{ s} \times 1{,}5\text{ GB} = 360{,}000\text{ GB-s} \times \$0{,}0000133334 = \$4{,}80$
   - Orquestador (espera a Step Functions ~3 s): $10{,}000 \times 3\text{ s} \times 1{,}5\text{ GB} = 45{,}000\text{ GB-s} \to \$0{,}60$
   - Peticiones: $210{,}000 \times \$0{,}20 / 1\text{M} = \$0{,}04$
   - **Subtotal: \$5,44 USD/mes**
2. **AWS Step Functions (Express; $1.00 por millón de ejecuciones y $0.00001667 por GB-s, mínimo 64 MB):**
   - Ejecuciones: $10{,}000 \times \$1 / 1\text{M} = \$0{,}01$
   - Duración: $10{,}000 \times 3\text{ s} \times 0{,}0625\text{ GB} = 1{,}875\text{ GB-s} \to \$0{,}03$
   - **Subtotal: \$0,04 USD/mes**
3. **Amazon API Gateway (HTTP API) + AWS Amplify Hosting:** $\$0{,}10 + \$0{,}97 = \$1{,}07$ USD/mes
4. **Amazon S3:** cada simulación escribe y lee 20 lotes más su resultado, unas $210{,}000$ escrituras y lecturas al mes $\to \$1{,}05 + \$0{,}08 \approx \$1{,}13$ USD/mes (los artefactos expiran a los 14 días)
5. **Amazon DynamoDB (On-Demand):** ~$0{,}26$ USD/mes
6. **Amazon Bedrock:** **\$0** por defecto (`UseBedrock=false`). Si se activa, ~$1{,}76$ USD con inferencia continua.

> **Conclusión:** Incluso bajo demanda masiva, el costo real estimado por la calculadora oficial es de apenas **$4.55 USD/mes** (o **$2.79 USD/mes** con el informe determinista por defecto). En el peor escenario analítico teórico sin capa gratuita no supera los **~$7.9 USD/mes**, demostrando la altísima eficiencia de la arquitectura 100% serverless elegida.
>
> Con la configuración por defecto (30 réplicas = 6 lotes por simulación) el uso de cómputo en Lambda y S3 baja a menos de un tercio.
