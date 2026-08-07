$procs = Get-CimInstance Win32_Process -Filter "Name='node.exe'"
foreach ($p in $procs) {
  if ($p.CommandLine -like '*Kalo*next*' -or $p.CommandLine -like '*postcss*') {
    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
    Write-Host "KILLED $($p.ProcessId)"
  }
}
Start-Sleep -Seconds 2
Write-Host "KILL_DONE"
