$sh = New-Object -ComObject Shell.Application
$sh.ShellExecute("C:\Users\ASUS\AppData\Local\Programs\Kiro\Kiro.exe", "`"D:\Pham Duy Hung\PROJECT\LanguageLearning`"", "D:\Pham Duy Hung\PROJECT\LanguageLearning", "open", 1)
Write-Output "Launched Kiro via Shell.Application"
