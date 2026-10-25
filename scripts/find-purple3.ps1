Add-Type -AssemblyName System.Drawing
$b = [System.Drawing.Bitmap]::FromFile('D:\Pham Duy Hung\PROJECT\LanguageLearning\scratch\kiro_after_yes.png')
for ($y = 600; $y -lt 820; $y += 5) {
    for ($x = 400; $x -lt 1200; $x += 10) {
        $c = $b.GetPixel($x, $y)
        # Look for purple: B > 150, R > 100, G < 150
        if ($c.B -gt 150 -and $c.R -gt 100 -and $c.G -lt 150) {
            Write-Output "Found Purple at ($x, $y) RGB=($($c.R), $($c.G), $($c.B))"
        }
    }
}
$b.Dispose()
