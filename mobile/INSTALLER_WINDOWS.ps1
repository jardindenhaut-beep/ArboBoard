$ErrorActionPreference = "Stop"

Write-Host "=== Arboboard Mobile V1 ===" -ForegroundColor Green
Write-Host "Installation des dependances..."
npm install

if (!(Test-Path ".env.local")) {
  Copy-Item ".env.example" ".env.local"
  Write-Host ""
  Write-Host "ATTENTION : renseignez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env.local" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Build..."
npm run build

Write-Host ""
Write-Host "Projet web mobile prêt." -ForegroundColor Green
Write-Host "Pour Android existant : npx cap sync android"
Write-Host "Pour iOS sur Mac : npx cap add ios puis npx cap sync ios"
