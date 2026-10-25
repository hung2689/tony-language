Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class WinStationCheck {
    [DllImport("user32.dll")]
    public static extern IntPtr GetProcessWindowStation();

    [DllImport("user32.dll")]
    public static extern IntPtr GetThreadDesktop(uint dwThreadId);

    [DllImport("kernel32.dll")]
    public static extern uint GetCurrentThreadId();

    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr OpenInputDesktop(uint dwFlags, bool fInherit, uint dwDesiredAccess);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool CloseDesktop(IntPtr hDesktop);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool GetUserObjectInformation(IntPtr hObj, int nIndex, StringBuilder pvInfo, int nLength, out int lpnLengthNeeded);

    public static void Check() {
        IntPtr hWinsta = GetProcessWindowStation();
        StringBuilder sb = new StringBuilder(256);
        int needed;
        GetUserObjectInformation(hWinsta, 2, sb, 256, out needed);
        Console.WriteLine("Process WinStation: " + sb.ToString());

        IntPtr hDesk = GetThreadDesktop(GetCurrentThreadId());
        StringBuilder sbDesk = new StringBuilder(256);
        GetUserObjectInformation(hDesk, 2, sbDesk, 256, out needed);
        Console.WriteLine("Thread Desktop: " + sbDesk.ToString());

        IntPtr hInput = OpenInputDesktop(0, false, 0x01FF);
        if (hInput != IntPtr.Zero) {
            StringBuilder sbInput = new StringBuilder(256);
            GetUserObjectInformation(hInput, 2, sbInput, 256, out needed);
            Console.WriteLine("Input Desktop: " + sbInput.ToString());
            CloseDesktop(hInput);
        } else {
            Console.WriteLine("OpenInputDesktop error: " + Marshal.GetLastWin32Error());
        }
    }
}
"@
[WinStationCheck]::Check()
