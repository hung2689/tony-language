param(
    [string]$SearchName = "Công Tú"
)

Add-Type -ReferencedAssemblies "System.Windows.Forms" @"
using System;
using System.Text;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

public class ZaloHelper {
    [DllImport("user32.dll", SetLastError=true)] public static extern IntPtr OpenInputDesktop(uint dwFlags, bool fInherit, uint dwDesiredAccess);
    [DllImport("user32.dll", SetLastError=true)] public static extern bool SetThreadDesktop(IntPtr hDesktop);
    [DllImport("user32.dll", SetLastError=true)] public static extern bool CloseDesktop(IntPtr hDesktop);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    public static string FocusZaloAndSearch(string searchName) {
        string res = "";
        Thread t = new Thread(() => {
            IntPtr hDesk = OpenInputDesktop(0, false, 0x01FF);
            if (hDesk != IntPtr.Zero) {
                SetThreadDesktop(hDesk);
                IntPtr zaloHwnd = IntPtr.Zero;
                IntPtr oskHwnd = IntPtr.Zero;

                EnumWindows((hWnd, lParam) => {
                    if (IsWindowVisible(hWnd)) {
                        StringBuilder text = new StringBuilder(256);
                        GetWindowText(hWnd, text, 256);
                        string title = text.ToString();
                        if (title == "Zalo" || title.Contains("Zalo")) {
                            zaloHwnd = hWnd;
                        }
                        if (title.Contains("On-Screen Keyboard") || title.Contains("Bàn phím")) {
                            oskHwnd = hWnd;
                        }
                    }
                    return true;
                }, IntPtr.Zero);

                if (zaloHwnd != IntPtr.Zero) {
                    ShowWindow(zaloHwnd, 9); // SW_RESTORE
                    SetForegroundWindow(zaloHwnd);
                    Thread.Sleep(600);

                    Clipboard.SetText(searchName);
                    SendKeys.SendWait("^f");
                    Thread.Sleep(400);
                    SendKeys.SendWait("^a");
                    Thread.Sleep(200);
                    SendKeys.SendWait("^v");
                    Thread.Sleep(1000);
                    SendKeys.SendWait("{ENTER}");
                    Thread.Sleep(800);
                    res = "Searched for " + searchName;
                } else {
                    res = "Zalo window not found";
                }

                if (oskHwnd != IntPtr.Zero) {
                    ShowWindow(oskHwnd, 9);
                    SetForegroundWindow(oskHwnd);
                }

                CloseDesktop(hDesk);
            }
        });
        t.SetApartmentState(ApartmentState.STA);
        t.Start();
        t.Join();
        return res;
    }
}
"@

$status = [ZaloHelper]::FocusZaloAndSearch($SearchName)
Write-Output $status
