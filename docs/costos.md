# Declaración y Desglose de Costos en AWS
**Proyecto:** Operación Cortafuegos Manta (SpookyThon 2026 · Track B)  
**Región:** `us-east-1` (N. Virginia)  
**Arquitectura:** 100% Serverless Event-Driven (*Scale-to-Zero*)  

> **Revisión del 27/10/2026.** Se corrigió el cálculo de Lambda (decía $0,40 y son $4,80 por los mismos números), se añadieron el orquestador y las escrituras en S3 de los lotes Monte Carlo, y Amazon Bedrock pasa a $0 porque está **apagado por defecto** (`UseBedrock=false`). Precios de Lambda y Step Functions comprobados en las páginas oficiales de AWS; los de S3, DynamoDB, API Gateway y Amplify son estimaciones sin verificar en esta revisión.

---

## 1. Costo Durante el Hackathon (3 Días de Evento)

### 1.1 Gasto real (de la cuenta de AWS)

**Pendiente de completar por el equipo:** el reto pide "cuánto se gastó realmente durante el evento" y que coincida con lo que muestra la cuenta. Tomar el valor de **AWS Billing → Cost Explorer** (filtro por fechas del evento, región `us-east-1`) y añadir aquí la cifra y la captura del AWS Budget (`docs/budget.png`).

| Fuente | Valor |
| :--- | :--- |
| Cost Explorer, gasto total del evento | _Pendiente_ |
| AWS Budget (límite y alertas) | _Pendiente: captura en `docs/budget.png`_ |

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

Supuesto: el **Comité de Operaciones de Emergencia (COE) de Manta** usa la plataforma de forma continua con **10,000 simulaciones al mes**, cada una con **100 réplicas** (el máximo de la interfaz), es decir **20 lotes** de 5 réplicas por simulación: **200,000 invocaciones de Lambda workers** y **10,000 del orquestador**. Primero sin descontar la capa gratuita:

1. **AWS Lambda (`arm64`, 1,5 GB; $0.0000133334 por GB-s y $0.20 por millón de peticiones):**
   - Workers: $200{,}000 \times 1{,}2\text{ s} \times 1{,}5\text{ GB} = 360{,}000\text{ GB-s} \times \$0{,}0000133334 = \$4{,}80$
   - Orquestador (espera a Step Functions ~3 s): $10{,}000 \times 3\text{ s} \times 1{,}5\text{ GB} = 45{,}000\text{ GB-s} \to \$0{,}60$
   - Peticiones: $210{,}000 \times \$0{,}20 / 1\text{M} = \$0{,}04$
   - **Subtotal: \$5,44 USD/mes**
2. **AWS Step Functions (Express; $1.00 por millón de ejecuciones y $0.00001667 por GB-s, mínimo 64 MB):**
   - Ejecuciones: $10{,}000 \times \$1 / 1\text{M} = \$0{,}01$
   - Duración: $10{,}000 \times 3\text{ s} \times 0{,}0625\text{ GB} = 1{,}875\text{ GB-s} \to \$0{,}03$
   - **Subtotal: \$0,04 USD/mes**
3. **Amazon API Gateway (HTTP API) + AWS Amplify Hosting** (estimación): $\$0{,}10 + \$0{,}15 = \$0{,}25$ USD/mes
4. **Amazon S3** (estimación, ~$0.005 por 1,000 PUT y ~$0.0004 por 1,000 GET): cada simulación escribe y lee 20 lotes más su resultado, unas $210{,}000$ escrituras y lecturas al mes $\to \$1{,}05 + \$0{,}08 \approx \$1{,}13$ USD/mes (el almacenamiento es mínimo: todo expira a los 14 días)
5. **Amazon DynamoDB (On-Demand)** (estimación): ~$0{,}20$ USD/mes
6. **Amazon Bedrock:** **\$0** con la configuración por defecto (apagado). Si se activa (`UseBedrock=true`), unos 2,000 informes al mes costarían del orden de \$0,85 USD con Nova Micro.

> **Costo total mensual estimado en producción:** **~\$7,1 USD/mes** sin capa gratuita, o **~\$1,7 USD/mes** con la capa gratuita permanente de Lambda (400,000 GB-s y 1M de peticiones gratis cubren casi todo el cómputo).
>
> Con la configuración por defecto (30 réplicas = 6 lotes por simulación) el uso de Lambda y S3 baja a menos de un tercio.
