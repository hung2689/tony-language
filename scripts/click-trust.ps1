Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Threading;

public class Clicker {
    [DllImport("user32.dll")]
    public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool SendNotifyMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    public static void Click(IntPtr hWnd, int x, int y) {
        IntPtr lParam = (IntPtr)((y << 16) | (x & 0xFFFF));
        // WM_LBUTTONDOWN = 0x0201, WM_LBUTTONUP = 0x0202
        PostMessage(hWnd, 0x0201, (IntPtr)1, lParam);
        Thread.Sleep(100);
        PostMessage(hWnd, 0x0202, IntPtr.Zero, lParam);
        Console.WriteLine("Sent click to " + hWnd + " at (" + x + "," + y + ")");
    }
}
"@

[Clicker]::Click([IntPtr]526078, 880, 670)
