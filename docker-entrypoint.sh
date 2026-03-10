#!/bin/sh
set -e

echo "🚀 Iniciando Oliacv..."
echo "ℹ️  As migrações do banco de dados são gerenciadas pelo K8s migration-job.yaml."
echo "    Certifique-se de executar 'kubectl apply -f k8s/migration-job.yaml' antes do deploy."
echo "✅ Iniciando servidor Next.js..."

exec "$@"
