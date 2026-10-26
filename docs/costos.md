# Declaración y Desglose de Costos en AWS
**Proyecto:** Operación Cortafuegos Manta (SpookyThon 2026 · Track B)  
**Región:** `us-east-1` (N. Virginia)  
**Arquitectura:** 100% Serverless Event-Driven (*Scale-to-Zero*)  

---

## 1. Costo Real Durante el Hackathon (3 Días de Evento)

Todos los servicios principales fueron seleccionados dentro de la **Capa Gratuita de AWS (AWS Free Tier)** con facturación por uso estricto (sin instancias EC2, RDS, NAT Gateways ni endpoints de SageMaker encendidos por hora):

| Servicio AWS | Configuración | Uso Estimado en el Evento | Precio Unitario AWS (`us-east-1`) | Costo en el Evento |
| :--- | :--- | :--- | :--- | :--- |
| **AWS Amplify Hosting** | CI/CD + CDN HTTPS | ~5 builds + < 1 GB transferido | Gratis (1,000 build min + 15 GB/mes en Free Tier) | **$0.00 USD** |
| **Amazon API Gateway** | HTTP API REST | ~2,000 llamadas a `/simulate` y `/mayor-report` | Gratis (1M llamadas/mes en Free Tier; luego $1.00/M) | **$0.00 USD** |
| **AWS Step Functions** | Express Workflow (`Map`) | ~500 ejecuciones de orquestación Monte Carlo | $1.00 por millón de peticiones + $0.00001667/GB-s | **$0.00 USD** |
| **AWS Lambda** | Python 3.12 (`arm64` Graviton2, 1536 MB) | ~5,000 invocaciones de lotes (~1.2s c/u) | Gratis (1M invocaciones + 400,000 GB-s/mes gratis) | **$0.00 USD** |
| **Amazon DynamoDB** | Modo `PAY_PER_REQUEST` (On-Demand) | ~2,000 lecturas/escrituras de caché por semilla | Gratis (25 GB + 200M peticiones/mes en Free Tier) | **$0.00 USD** |
| **Amazon S3** | Standard Storage + Lifecycle 14 días | < 50 MB de archivos JSON para el mapa animado | Gratis (5 GB + 20,000 GET / 2,000 PUT en Free Tier) | **$0.00 USD** |
| **Amazon Bedrock** | `amazon.nova-micro-v1:0` / Claude 3 Haiku | ~80 informes ejecutivos para el Alcalde | ~$0.000035 / 1K input tokens · ~$0.00014 / 1K output | **~$0.02 USD** |
| **AWS Budgets + CloudWatch** | Presupuesto $5.00 USD + Logs (retención 7 días) | 1 Budget con alertas al 50% y 80% + < 500 MB logs | Gratis (Primer Budget y 5 GB de logs gratis) | **$0.00 USD** |
| **TOTAL EVENTO** | | | | **~$0.02 USD** |

---

## 2. Proyección de Costo Operativo Mensual en Producción (Municipio / COE de Manta)

Suponiendo que el **Comité de Operaciones de Emergencia (COE) de Manta** opere la plataforma de forma continua realizando **10,000 simulaciones de Monte Carlo al mes** (con 200,000 invocaciones de Lambda Workers y 2,000 informes ejecutivos generados con Amazon Bedrock), **incluso sin descontar la Capa Gratuita**:

1. **AWS Lambda (`arm64` Graviton2):**
   $$\text{Cómputo} = 200,000 \text{ ejecuciones} \times 1.2\text{ s} \times 1.5\text{ GB} = 360,000\text{ GB-s} \times \$0.0000133334 = \$0.40\text{ USD/mes}$$
2. **AWS Step Functions (Express Workflows):**
   $$10,000 \text{ ejecuciones de estado Map} \approx \$0.25\text{ USD/mes}$$
3. **Amazon API Gateway (HTTP API) + AWS Amplify Hosting:**
   $$\$0.10\text{ USD (API)} + \$0.15\text{ USD (Hosting/CDN)} = \$0.25\text{ USD/mes}$$
4. **Amazon DynamoDB (On-Demand) + Amazon S3 (con expiración a 14 días):**
   $$\$0.20\text{ USD (DynamoDB)} + \$0.05\text{ USD (S3)} = \$0.25\text{ USD/mes}$$
5. **Amazon Bedrock (`amazon.nova-micro-v1:0` / Claude 3 Haiku):**
   $$2,000 \text{ informes ejecutivos al mes} \approx \$0.85\text{ USD/mes}$$

> **Costo Total Mensual Estimado en Producción:** **~$2.00 USD / mes** (y **~$0.85 USD / mes** aplicando el AWS Free Tier permanente de Lambda y DynamoDB).
