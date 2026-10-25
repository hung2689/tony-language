Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile('D:\Pham Duy Hung\PROJECT\LanguageLearning\scratch\kiro_printwindow.png')
Write-Output "Image size: $($bmp.Width) x $($bmp.Height)"

# Search for the purple button (Yes, I trust the authors)
# In the screenshot, it's purple around color R ~ 120-150, G ~ 70-100, B ~ 200-255
$found = @()
for ($y = 600; $y -lt 750; $y += 5) {
    for ($x = 450; $x -lt 700; $x += 10) {
        $c = $bmp.GetPixel($x, $y)
        if ($c.R -gt 100 -and $c.B -gt 180 -and $c.G -lt 120) {
            $found += [PSCustomObject]@{ X = $x; Y = $y; Color = "$($c.R),$($c.G),$($c.B)" }
        }
    }
}
$bmp.Dispose()
Write-Output "Found $($found.Count) matching pixels"
if ($found.Count -gt 0) {
    $avgX = [int]($found | Measure-Object -Property X -Average).Average
    $avgY = [int]($found | Measure-Object -Property Y -Average).Average
    Write-Output "Button Center approx: X=$avgX, Y=$avgY"
}
