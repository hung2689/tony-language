param(
    [string]$Message = "hello tú đội"
)

Add-Type -ReferencedAssemblies "System.Windows.Forms" @"
using System;
using System.Text;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

public class ZaloSender {
    [DllImport("user32.dll", SetLastError=true)] public static extern IntPtr OpenInputDesktop(uint dwFlags, bool fInherit, uint dwDesiredAccess);
    [DllImport("user32.dll", SetLastError=true)] public static extern bool SetThreadDesktop(IntPtr hDesktop);
    [DllImport("user32.dll", SetLastError=true)] public static extern bool CloseDesktop(IntPtr hDesktop);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    public static string SendMessageToCurrentChat(string msg) {
        string res = "";
        Thread t = new Thread(() => {
            IntPtr hDesk = OpenInputDesktop(0, false, 0x01FF);
            if (hDesk != IntPtr.Zero) {
                SetThreadDesktop(hDesk);
                IntPtr zaloHwnd = IntPtr.Zero;

                EnumWindows((hWnd, lParam) => {
                    if (IsWindowVisible(hWnd)) {
                        StringBuilder text = new StringBuilder(256);
                        GetWindowText(hWnd, text, 256);
                        string title = text.ToString();
                        if (title == "Zalo" || title.Contains("Zalo")) {
                            zaloHwnd = hWnd;
                        }
                    }
                    return true;
                }, IntPtr.Zero);

                if (zaloHwnd != IntPtr.Zero) {
                    ShowWindow(zaloHwnd, 9); // SW_RESTORE
                    SetForegroundWindow(zaloHwnd);
                    Thread.Sleep(500);

                    // Paste message and hit enter
                    Clipboard.SetText(msg);
                    SendKeys.SendWait("^v");
                    Thread.Sleep(400);
                    SendKeys.SendWait("{ENTER}");
                    Thread.Sleep(1000);
                    res = "Message sent: " + msg;
                } else {
                    res = "Zalo window not found";
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

$status = [ZaloSender]::SendMessageToCurrentChat($Message)
Write-Output $status
