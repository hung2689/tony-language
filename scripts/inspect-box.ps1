Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile('D:\Pham Duy Hung\PROJECT\LanguageLearning\scratch\kiro_after_yes.png')
for ($y = 780; $y -lt 810; $y += 5) {
    for ($x = 500; $x -lt 550; $x += 10) {
        $c = $bmp.GetPixel($x, $y)
        Write-Output ("(" + $x + "," + $y + ") R=" + $c.R + " G=" + $c.G + " B=" + $c.B)
    }
}
$bmp.Dispose()
