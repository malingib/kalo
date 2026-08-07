$out = 'C:\Users\malin\AppData\Local\Temp\kalo-dev2.log'
$err = 'C:\Users\malin\AppData\Local\Temp\kalo-dev2-err.log'
Remove-Item $out, $err -ErrorAction SilentlyContinue
$p = Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' `
  -ArgumentList 'D:\Projects\Kalo\node_modules\next\dist\bin\next','dev','-p','3000' `
  -WorkingDirectory 'D:\Projects\Kalo\apps\web' `
  -RedirectStandardOutput $out -RedirectStandardError $err `
  -WindowStyle Hidden -PassThru
Write-Host "STARTED PID $($p.Id) LOG $out"
