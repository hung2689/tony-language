Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile('D:\Pham Duy Hung\PROJECT\LanguageLearning\scratch\kiro_after_yes.png')

$found = @()
for ($y = 700; $y -lt 820; $y += 5) {
    for ($x = 450; $x -lt 700; $x += 10) {
        $c = $bmp.GetPixel($x, $y)
        if ($c.R -gt 120 -and $c.B -gt 200 -and $c.G -lt 100) {
            $found += [PSCustomObject]@{ X = $x; Y = $y }
        }
    }
}
$bmp.Dispose()
Write-Output "Found $($found.Count) matching pixels"
if ($found.Count -gt 0) {
    $avgX = [int]($found | Measure-Object -Property X -Average).Average
    $avgY = [int]($found | Measure-Object -Property Y -Average).Average
    Write-Output "NEW Button Center: X=$avgX, Y=$avgY"
}
