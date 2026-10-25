Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

public class WindowFocusHelper {
    [DllImport("user32.dll", SetLastError=true)]
    public static extern IntPtr OpenInputDesktop(uint dwFlags, bool fInherit, uint dwDesiredAccess);
    [DllImport("user32.dll", SetLastError=true)]
    public static extern bool SetThreadDesktop(IntPtr hDesktop);
    [DllImport("user32.dll", SetLastError=true)]
    public static extern bool CloseDesktop(IntPtr hDesktop);

    [DllImport("user32.dll")]
    public static extern bool EnumDesktopWindows(IntPtr hDesktop, EnumWindowsProc lpfn, IntPtr lParam);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern bool BringWindowToTop(IntPtr hWnd);

    public static void FocusKiro() {
        Thread t = new Thread(() => {
            IntPtr hDesk = OpenInputDesktop(0, false, 0x01FF);
            if (hDesk == IntPtr.Zero) {
                Console.WriteLine("Failed OpenInputDesktop: " + Marshal.GetLastWin32Error());
                return;
            }
            if (!SetThreadDesktop(hDesk)) {
                Console.WriteLine("Failed SetThreadDesktop: " + Marshal.GetLastWin32Error());
                CloseDesktop(hDesk);
                return;
            }

            EnumDesktopWindows(hDesk, (hWnd, lParam) => {
                uint procId = 0;
                GetWindowThreadProcessId(hWnd, out procId);
                StringBuilder sb = new StringBuilder(512);
                GetWindowText(hWnd, sb, 512);
                string title = sb.ToString();

                if (!string.IsNullOrEmpty(title)) {
                    Console.WriteLine("PID: " + procId + " | HWND: " + hWnd + " | Title: " + title);
                    if (title.ToLower().Contains("kiro") || title.ToLower().Contains("languagelearning")) {
                        Console.WriteLine("--> Found Kiro/Project window! Restoring & focusing: " + title);
                        ShowWindow(hWnd, 9); // SW_RESTORE
                        ShowWindow(hWnd, 3); // SW_MAXIMIZE
                        BringWindowToTop(hWnd);
                        SetForegroundWindow(hWnd);
                    }
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

[WindowFocusHelper]::FocusKiro()
