Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Threading;

public class KeySender {
    [DllImport("user32.dll")]
    public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    public static void PressEnter(IntPtr hWnd) {
        // WM_KEYDOWN = 0x0100, WM_KEYUP = 0x0101, VK_RETURN = 0x0D
        PostMessage(hWnd, 0x0100, (IntPtr)0x0D, IntPtr.Zero);
        Thread.Sleep(100);
        PostMessage(hWnd, 0x0101, (IntPtr)0x0D, IntPtr.Zero);
        Console.WriteLine("Sent Enter to " + hWnd);
    }
}
"@

[KeySender]::PressEnter([IntPtr]526078)
