Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class ThreadDesktopInspector {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr GetThreadDesktop(int dwThreadId);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool GetUserObjectInformation(IntPtr hObj, int nIndex, StringBuilder pvInfo, int nLength, out int lpnLengthNeeded);

    public static void Inspect() {
        var procs = System.Diagnostics.Process.GetProcessesByName("Kiro");
        Console.WriteLine("Inspecting " + procs.Length + " Kiro processes...");

        foreach (var p in procs) {
            foreach (System.Diagnostics.ProcessThread thread in p.Threads) {
                IntPtr hDesk = GetThreadDesktop(thread.Id);
                if (hDesk != IntPtr.Zero) {
                    StringBuilder sb = new StringBuilder(256);
                    int needed;
                    if (GetUserObjectInformation(hDesk, 2, sb, 256, out needed)) {
                        Console.WriteLine("PID " + p.Id + " Thread " + thread.Id + " Desktop: " + sb.ToString());
                        return;
                    }
                }
            }
        }
    }
}
"@

[ThreadDesktopInspector]::Inspect()
