$w = New-Object -ComObject WScript.Shell
$sc = $w.CreateShortcut("$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Kiro\Kiro.lnk")
Write-Output "Target: $($sc.TargetPath)"
Write-Output "Args: $($sc.Arguments)"
Write-Output "Working: $($sc.WorkingDirectory)"
