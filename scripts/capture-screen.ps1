param(
    [string]$OutputPath = "scratch/screenshot.png"
)

Add-Type -ReferencedAssemblies "System.Drawing" @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Threading;

public class ThreadDesktopCapture {
    [DllImport("user32.dll", SetLastError=true)]
    public static extern IntPtr OpenInputDesktop(uint dwFlags, bool fInherit, uint dwDesiredAccess);
    [DllImport("user32.dll", SetLastError=true)]
    public static extern bool SetThreadDesktop(IntPtr hDesktop);
    [DllImport("user32.dll", SetLastError=true)]
    public static extern bool CloseDesktop(IntPtr hDesktop);
    [DllImport("user32.dll", SetLastError=true)]
    public static extern IntPtr GetDC(IntPtr hWnd);
    [DllImport("user32.dll", SetLastError=true)]
    public static extern int ReleaseDC(IntPtr hWnd, IntPtr hDC);
    [DllImport("gdi32.dll", SetLastError=true)]
    public static extern IntPtr CreateCompatibleDC(IntPtr hdc);
    [DllImport("gdi32.dll", SetLastError=true)]
    public static extern IntPtr CreateCompatibleBitmap(IntPtr hdc, int nWidth, int nHeight);
    [DllImport("gdi32.dll", SetLastError=true)]
    public static extern IntPtr SelectObject(IntPtr hdc, IntPtr hgdiobj);
    [DllImport("gdi32.dll", SetLastError=true)]
    public static extern bool BitBlt(IntPtr hdcDest, int nXDest, int nYDest, int nWidth, int nHeight, IntPtr hdcSrc, int nXSrc, int nYSrc, int dwRop);
    [DllImport("gdi32.dll", SetLastError=true)]
    public static extern bool DeleteDC(IntPtr hdc);
    [DllImport("gdi32.dll", SetLastError=true)]
    public static extern bool DeleteObject(IntPtr hObject);
    [DllImport("user32.dll")]
    public static extern int GetSystemMetrics(int nIndex);

    public static string Capture(string path) {
        string result = "";
        Thread t = new Thread(() => {
            IntPtr hDesk = OpenInputDesktop(0, false, 0x01FF);
            if (hDesk == IntPtr.Zero) {
                result = "Failed OpenInputDesktop: " + Marshal.GetLastWin32Error();
                return;
            }
            if (!SetThreadDesktop(hDesk)) {
                result = "Failed SetThreadDesktop: " + Marshal.GetLastWin32Error();
                CloseDesktop(hDesk);
                return;
            }

            int w = GetSystemMetrics(0);
            int h = GetSystemMetrics(1);

            IntPtr hdcSrc = GetDC(IntPtr.Zero);
            IntPtr hdcDest = CreateCompatibleDC(hdcSrc);
            IntPtr hBitmap = CreateCompatibleBitmap(hdcSrc, w, h);
            IntPtr hOld = SelectObject(hdcDest, hBitmap);
            bool res = BitBlt(hdcDest, 0, 0, w, h, hdcSrc, 0, 0, 0x00CC0020);
            int bitBltErr = Marshal.GetLastWin32Error();

            SelectObject(hdcDest, hOld);
            DeleteDC(hdcDest);
            ReleaseDC(IntPtr.Zero, hdcSrc);
            CloseDesktop(hDesk);

            if (res) {
                using (Bitmap bmp = Image.FromHbitmap(hBitmap)) {
                    bmp.Save(path, ImageFormat.Png);
                }
                DeleteObject(hBitmap);
                result = "Captured " + w + "x" + h;
            } else {
                DeleteObject(hBitmap);
                result = "BitBlt failed: " + bitBltErr;
            }
        });

        t.SetApartmentState(ApartmentState.STA);
        t.Start();
        t.Join();
        return result;
    }
}
"@

$resolvedPath = [System.IO.Path]::GetFullPath($OutputPath)
$dir = [System.IO.Path]::GetDirectoryName($resolvedPath)
if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
}

$status = [ThreadDesktopCapture]::Capture($resolvedPath)
Write-Output $status
