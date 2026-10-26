<#
.SYNOPSIS
  Configura las credenciales de una nueva cuenta de AWS (sin quemar llaves en el codigo)
  y verifica la conexion en la region obligatoria us-east-1 para SpookyThon 2026.
#>
param(
    [string]$ProfileName = "spookython",
    [string]$Region = "us-east-1"
)

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " 🧟‍♂️ OPERACION CORTAFUEGOS MANTA - Configuracion de Cuenta AWS" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️ AWS CLI v2 no detectado en el PATH. Instalando con winget..." -ForegroundColor Yellow
    winget install -e --id Amazon.AWSCLI --accept-source-agreements --accept-package-agreements
}

if (-not (Get-Command sam -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️ AWS SAM CLI no detectado en el PATH. Instalando con winget..." -ForegroundColor Yellow
    winget install -e --id Amazon.SAM-CLI --accept-source-agreements --accept-package-agreements
}

Write-Host "`n1. Configurando perfil AWS '$ProfileName' en la region '$Region'..." -ForegroundColor Green
Write-Host "   (Ingresa tu AWS Access Key ID y Secret Access Key o usa 'aws configure sso' si es AWS Sandbox SSO)" -ForegroundColor Gray
aws configure --profile $ProfileName
aws configure set region $Region --profile $ProfileName
aws configure set output json --profile $ProfileName

Write-Host "`n2. Verificando identidad de la cuenta AWS..." -ForegroundColor Green
aws sts get-caller-identity --profile $ProfileName

Write-Host "`n✅ Cuenta lista. Para desplegar toda la infraestructura Serverless ejecuta:" -ForegroundColor Green
Write-Host "   .\scripts\deploy-aws.ps1 -ProfileName $ProfileName -AlertEmail tu_correo@ejemplo.com" -ForegroundColor Yellow
