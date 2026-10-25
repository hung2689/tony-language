Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class ExeboxWinFinder {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpfn, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    public static void Find() {
        EnumWindows((hWnd, lParam) => {
            StringBuilder sbTitle = new StringBuilder(256);
            GetWindowText(hWnd, sbTitle, 256);
            StringBuilder sbCls = new StringBuilder(256);
            GetClassName(hWnd, sbCls, 256);
            uint pid = 0;
            GetWindowThreadProcessId(hWnd, out pid);

            Console.WriteLine("HWND: " + hWnd + " | PID: " + pid + " | Class: " + sbCls + " | Title: " + sbTitle);
            return true;
        }, IntPtr.Zero);
    }
}
"@

[ExeboxWinFinder]::Find()
