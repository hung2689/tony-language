param(
    [int]$TargetPid = 20920
)

Add-Type -MemberDefinition @"
[DllImport("user32.dll")]
public static extern bool EnumThreadWindows(int dwThreadId, EnumThreadDelegate lpfn, IntPtr lParam);
public delegate bool EnumThreadDelegate(IntPtr hWnd, IntPtr lParam);

[DllImport("user32.dll")]
public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

[DllImport("user32.dll")]
public static extern bool SetForegroundWindow(IntPtr hWnd);

[DllImport("user32.dll")]
public static extern bool BringWindowToTop(IntPtr hWnd);

[DllImport("user32.dll")]
public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder lpString, int nMaxCount);

[DllImport("user32.dll")]
public static extern bool IsWindowVisible(IntPtr hWnd);
"@ -Name NativeFocus -Namespace Win32Utils

$proc = Get-Process -Id $TargetPid -ErrorAction SilentlyContinue
if (-not $proc) {
    Write-Output "Process $TargetPid not found"
    exit 0
}

Write-Output "Searching windows for process $TargetPid ($($proc.ProcessName))..."
foreach ($thread in $proc.Threads) {
    [Win32Utils.NativeFocus]::EnumThreadWindows($thread.Id, {
        param($hWnd, $lParam)
        $sb = New-Object System.Text.StringBuilder 512
        [Win32Utils.NativeFocus]::GetWindowText($hWnd, $sb, 512) | Out-Null
        $title = $sb.ToString()
        $vis = [Win32Utils.NativeFocus]::IsWindowVisible($hWnd)
        Write-Output "HWND: $hWnd | Visible: $vis | Title: $title"
        if ($title -ne "" -or $vis) {
            Write-Output "--> Bringing to front and maximizing: $hWnd"
            [Win32Utils.NativeFocus]::ShowWindow($hWnd, 9) # SW_RESTORE
            [Win32Utils.NativeFocus]::ShowWindow($hWnd, 3) # SW_MAXIMIZE
            [Win32Utils.NativeFocus]::BringWindowToTop($hWnd)
            [Win32Utils.NativeFocus]::SetForegroundWindow($hWnd)
        }
        return $true
    }, [IntPtr]::Zero)
}
