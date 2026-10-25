Add-Type -AssemblyName System.Drawing
$b = [System.Drawing.Bitmap]::FromFile('D:\Pham Duy Hung\PROJECT\LanguageLearning\scratch\kiro_after_yes.png')
Write-Output "Width=$($b.Width) Height=$($b.Height)"
$b.Dispose()
