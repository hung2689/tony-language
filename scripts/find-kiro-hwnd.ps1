Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

public class WinFind {
    [DllImport("user32.dll", SetLastError=true)]
    public static extern IntPtr OpenInputDesktop(uint dwFlags, bool fInherit, uint dwDesiredAccess);
    [DllImport("user32.dll", SetLastError=true)]
    public static extern bool SetThreadDesktop(IntPtr hDesktop);
    [DllImport("user32.dll", SetLastError=true)]
    public static extern bool CloseDesktop(IntPtr hDesktop);

    [DllImport("user32.dll")]
    public static extern bool EnumDesktopWindows(IntPtr hDesktop, EnumWindowsProc lpfn, IntPtr lParam);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool BringWindowToTop(IntPtr hWnd);

    public static void FindAndFocus() {
        Thread t = new Thread(() => {
            IntPtr hDesk = OpenInputDesktop(0, false, 0x01FF);
            if (hDesk == IntPtr.Zero) return;
            SetThreadDesktop(hDesk);

            EnumDesktopWindows(hDesk, (hWnd, lParam) => {
                uint pId = 0;
                GetWindowThreadProcessId(hWnd, out pId);
                StringBuilder sb = new StringBuilder(512);
                GetWindowText(hWnd, sb, 512);
                StringBuilder sbClass = new StringBuilder(512);
                GetClassName(hWnd, sbClass, 512);
                bool vis = IsWindowVisible(hWnd);
                string title = sb.ToString();
                string cls = sbClass.ToString();

                // Check if class or title matches Chrome/Electron or Kiro
                if (cls.Contains("Chrome_WidgetWin") || title.ToLower().Contains("kiro") || title.ToLower().Contains("language")) {
                    Console.WriteLine("HWND: " + hWnd + " | PID: " + pId + " | Vis: " + vis + " | Cls: " + cls + " | Title: " + title);
                    ShowWindow(hWnd, 9); // RESTORE
                    ShowWindow(hWnd, 3); // MAXIMIZE
                    BringWindowToTop(hWnd);
                    SetForegroundWindow(hWnd);
                }
                return true;
            }, IntPtr.Zero);

            CloseDesktop(hDesk);
        });
        t.SetApartmentState(ApartmentState.STA);
        t.Start();
        t.Join();
    }
}
"@

[WinFind]::FindAndFocus()
