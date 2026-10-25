Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Threading;

public class Waker {
    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, int dx, int dy, uint dwData, int dwExtraInfo);

    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);

    public static void Wake() {
        keybd_event(0x10, 0, 0, 0); // Shift down
        Thread.Sleep(50);
        keybd_event(0x10, 0, 2, 0); // Shift up

        mouse_event(0x0001, 10, 10, 0, 0);
        Thread.Sleep(100);
        mouse_event(0x0001, -10, -10, 0, 0);
    }
}
"@

[Waker]::Wake()
