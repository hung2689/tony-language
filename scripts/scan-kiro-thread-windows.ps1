Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

public class ThreadWinScannerWithDesktop {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr OpenInputDesktop(uint dwFlags, bool fInherit, uint dwDesiredAccess);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SetThreadDesktop(IntPtr hDesktop);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool CloseDesktop(IntPtr hDesktop);

    public delegate bool EnumThreadDelegate(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")]
    public static extern bool EnumThreadWindows(int dwThreadId, EnumThreadDelegate lpfn, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool BringWindowToTop(IntPtr hWnd);

    public static void Scan() {
        Thread t = new Thread(() => {
            IntPtr hDesk = OpenInputDesktop(0, false, 0x01FF);
            if (hDesk == IntPtr.Zero) {
                Console.WriteLine("OpenInputDesktop failed: " + Marshal.GetLastWin32Error());
                return;
            }
            if (!SetThreadDesktop(hDesk)) {
                Console.WriteLine("SetThreadDesktop failed: " + Marshal.GetLastWin32Error());
                CloseDesktop(hDesk);
                return;
            }

            var procs = System.Diagnostics.Process.GetProcessesByName("Kiro");
            Console.WriteLine("Scanning " + procs.Length + " Kiro processes on Input Desktop...");

            int windowCount = 0;
            foreach (var p in procs) {
                foreach (System.Diagnostics.ProcessThread thread in p.Threads) {
                    EnumThreadWindows(thread.Id, (hWnd, lParam) => {
                        windowCount++;
                        StringBuilder sbTitle = new StringBuilder(256);
                        GetWindowText(hWnd, sbTitle, 256);
                        StringBuilder sbCls = new StringBuilder(256);
                        GetClassName(hWnd, sbCls, 256);
                        bool vis = IsWindowVisible(hWnd);
                        Console.WriteLine("Found window: HWND=" + hWnd + " PID=" + p.Id + " Vis=" + vis + " Cls=" + sbCls + " Title=" + sbTitle);

                        ShowWindow(hWnd, 9); // RESTORE
                        ShowWindow(hWnd, 3); // MAXIMIZE
                        BringWindowToTop(hWnd);
                        SetForegroundWindow(hWnd);
                        return true;
                    }, IntPtr.Zero);
                }
            }
            Console.WriteLine("Total windows found: " + windowCount);
            CloseDesktop(hDesk);
        });
        t.SetApartmentState(ApartmentState.STA);
        t.Start();
        t.Join();
    }
}
"@

[ThreadWinScannerWithDesktop]::Scan()
