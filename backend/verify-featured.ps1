# Temp verification script — boot API on :4102 against the throwaway DB, check /reviews/featured, stop.
$env:MONGODB_URI = "mongodb://127.0.0.1:27017/quick-food-verify"
$env:PORT = "4102"
$env:CHECK_PORT = "4102"
$out = "C:\Users\munis\Downloads\Quick-food\backend\_srv-out.log"
$err = "C:\Users\munis\Downloads\Quick-food\backend\_srv-err.log"
$proc = Start-Process node -ArgumentList "src/server.js" -WorkingDirectory "C:\Users\munis\Downloads\Quick-food\backend" -RedirectStandardOutput $out -RedirectStandardError $err -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 6
$up = Test-NetConnection -ComputerName 127.0.0.1 -Port 4102 -InformationLevel Quiet -WarningAction SilentlyContinue
Write-Host "PORT_UP: $up"
if ($up) {
  node "C:\Users\munis\Downloads\Quick-food\backend\featured-check.mjs"
} else {
  Write-Host "---STDOUT---"
  Get-Content $out -ErrorAction SilentlyContinue
  Write-Host "---STDERR---"
  Get-Content $err -ErrorAction SilentlyContinue
}
if (Get-Process -Id $proc.Id -ErrorAction SilentlyContinue) { Stop-Process -Id $proc.Id -Force }
Write-Host "DONE"