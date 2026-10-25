Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile('D:\Pham Duy Hung\PROJECT\LanguageLearning\scratch\kiro_after_yes.png')

for ($y = 0; $y -lt $bmp.Height; $y += 10) {
    for ($x = 0; $x -lt $bmp.Width; $x += 10) {
        $c = $bmp.GetPixel($x, $y)
        if ($c.R -gt 130 -and $c.R -lt 160 -and $c.G -gt 50 -and $c.G -lt 90 -and $c.B -gt 240) {
            Write-Output ("Purple at X=" + $x + " Y=" + $y + " R=" + $c.R + " G=" + $c.G + " B=" + $c.B)
        }
    }
}
$bmp.Dispose()
