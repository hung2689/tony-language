Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile('D:\Pham Duy Hung\PROJECT\LanguageLearning\scratch\wake_test.png')
Write-Output "Size: $($bmp.Width) x $($bmp.Height)"
$c0 = $bmp.GetPixel(0, 0)
$c1 = $bmp.GetPixel(500, 400)
$c2 = $bmp.GetPixel(10, 10)
Write-Output "Pixel 0,0: $($c0.R), $($c0.G), $($c0.B)"
Write-Output "Pixel 10,10: $($c2.R), $($c2.G), $($c2.B)"
Write-Output "Pixel 500,400: $($c1.R), $($c1.G), $($c1.B)"
$bmp.Dispose()
