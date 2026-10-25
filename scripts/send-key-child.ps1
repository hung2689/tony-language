Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Threading;

public class DirectKey {
    [DllImport("user32.dll")]
    public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    public static void Press(IntPtr childHwnd) {
        Console.WriteLine("Sending Space and Enter to " + childHwnd);
        // Space
        PostMessage(childHwnd, 0x0100, (IntPtr)0x20, IntPtr.Zero);
        Thread.Sleep(50);
        PostMessage(childHwnd, 0x0101, (IntPtr)0x20, IntPtr.Zero);
        Thread.Sleep(200);
        // Enter
        PostMessage(childHwnd, 0x0100, (IntPtr)0x0D, IntPtr.Zero);
        Thread.Sleep(50);
        PostMessage(childHwnd, 0x0101, (IntPtr)0x0D, IntPtr.Zero);
    }
}
"@

[DirectKey]::Press([IntPtr]460818)
