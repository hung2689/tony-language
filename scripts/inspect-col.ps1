Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile('D:\Pham Duy Hung\PROJECT\LanguageLearning\scratch\kiro_printwindow.png')
for ($y = 750; $y -lt 815; $y += 5) {
    $c = $bmp.GetPixel(570, $y)
    Write-Output ("Y=" + $y + " R=" + $c.R + " G=" + $c.G + " B=" + $c.B)
}
$bmp.Dispose()
