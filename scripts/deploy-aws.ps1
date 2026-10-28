<#
.SYNOPSIS
  Despliega la infraestructura 100% Serverless (API Gateway HTTP API + Step Functions Express Map +
  Lambda Python NumPy + DynamoDB On-Demand + S3 + AWS Budget $5) en us-east-1.
#>
param(
    [string]$ProfileName = "spookython",
    [string]$EnvironmentName = "prod",
    [string]$AlertEmail = "",
    [string]$Region = "us-east-1"
)

$ErrorActionPreference = "Stop"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " 🚀 DESPLEGANDO INFRAESTRUCTURA AWS (OPERACION CORTAFUEGOS MANTA)" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

Push-Location "$PSScriptRoot\..\infra"

try {
    Write-Host "`n1. Empaquetando funciones AWS Lambda (Python 3.12 ARM64 + NumPy)..." -ForegroundColor Green
    sam build --template-file template.yaml --cached --parallel

    Write-Host "`n2. Desplegando Stack CloudFormation/SAM en $Region..." -ForegroundColor Green
    $paramOverrides = "EnvironmentName=$EnvironmentName"
    if ($AlertEmail -ne "") {
        $paramOverrides += " AlertEmail=$AlertEmail"
    }

    sam deploy `
        --stack-name "spookython-cortafuegos-manta-$EnvironmentName" `
        --region $Region `
        --profile $ProfileName `
        --capabilities CAPABILITY_IAM `
        --resolve-s3 `
        --no-confirm-changeset `
        --parameter-overrides $paramOverrides

    Write-Host "`n3. Obteniendo URL publica del Amazon API Gateway (HTTP API)..." -ForegroundColor Green
    $apiUrl = aws cloudformation describe-stacks `
        --stack-name "spookython-cortafuegos-manta-$EnvironmentName" `
        --region $Region `
        --profile $ProfileName `
        --query "Stacks[0].Outputs[?OutputKey=='HttpApiUrl'].OutputValue" `
        --output text

    if ($apiUrl) {
        Set-Content -Path "$PSScriptRoot\..\frontend\.env.production" -Value "VITE_API_URL=$apiUrl"
        Write-Host "✅ Archivo frontend/.env.production actualizado con VITE_API_URL=$apiUrl" -ForegroundColor Green
    }
}
finally {
    Pop-Location
}
