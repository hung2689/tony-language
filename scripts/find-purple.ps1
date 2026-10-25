Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile('D:\Pham Duy Hung\PROJECT\LanguageLearning\scratch\kiro_printwindow.png')
for ($y = 0; $y -lt $bmp.Height; $y += 10) {
    for ($x = 0; $x -lt $bmp.Width; $x += 10) {
        $c = $bmp.GetPixel($x, $y)
        # Check purple button (e.g. R=130-160, G=70-110, B=230-255 or similar)
        if ($c.B -gt 180 -and $c.R -gt 100) {
            Write-Output ("Found at X=" + $x + " Y=" + $y + " R=" + $c.R + " G=" + $c.G + " B=" + $c.B)
        }
    }
}
$bmp.Dispose()
