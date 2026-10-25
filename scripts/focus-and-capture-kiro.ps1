param(
    [string]$OutputPath = "D:\Pham Duy Hung\PROJECT\LanguageLearning\scratch\kiro_open_project.png"
)

Add-Type -ReferencedAssemblies "System.Drawing" @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Threading;
using System.Text;

public class KiroScreenCapture {
    [DllImport("user32.dll")]
    public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);

    [DllImport("user32.dll")]
    public static extern IntPtr OpenInputDesktop(uint dwFlags, bool fInherit, uint dwDesiredAccess);

    [DllImport("user32.dll")]
    public static extern bool SetThreadDesktop(IntPtr hDesktop);

    [DllImport("user32.dll")]
    public static extern bool CloseDesktop(IntPtr hDesktop);

    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumDesktopWindows(IntPtr hDesktop, EnumWindowsProc lpfn, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

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

    [DllImport("user32.dll")]
    public static extern IntPtr GetDC(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern int ReleaseDC(IntPtr hWnd, IntPtr hDC);

    [DllImport("gdi32.dll")]
    public static extern IntPtr CreateCompatibleDC(IntPtr hdc);

    [DllImport("gdi32.dll")]
    public static extern IntPtr CreateCompatibleBitmap(IntPtr hdc, int nWidth, int nHeight);

    [DllImport("gdi32.dll")]
    public static extern IntPtr SelectObject(IntPtr hdc, IntPtr hgdiobj);

    [DllImport("gdi32.dll")]
    public static extern bool DeleteDC(IntPtr hdc);

    [DllImport("gdi32.dll")]
    public static extern bool DeleteObject(IntPtr hObject);

    [DllImport("gdi32.dll")]
    public static extern bool BitBlt(IntPtr hdcDest, int nXDest, int nYDest, int nWidth, int nHeight, IntPtr hdcSrc, int nXSrc, int nYSrc, uint dwRop);

    [DllImport("user32.dll")]
    public static extern int GetSystemMetrics(int nIndex);

    public static string Execute(string outputPath) {
        // 1. Wake screen
        SendMessage((IntPtr)0xFFFF, 0x0112, (IntPtr)0xF170, (IntPtr)(-1));
        mouse_event(0x0001, 1, 1, 0, 0);
        mouse_event(0x0001, 0, 0, 0, 0);

        Thread.Sleep(300);

        // 2. Attach to input desktop
        IntPtr hDesk = OpenInputDesktop(0, false, 0x01FF);
        if (hDesk == IntPtr.Zero) return "Failed OpenInputDesktop";
        SetThreadDesktop(hDesk);

        IntPtr targetHwnd = IntPtr.Zero;

        // 3. Find Kiro window
        EnumDesktopWindows(hDesk, (hWnd, lParam) => {
            StringBuilder sbTitle = new StringBuilder(256);
            GetWindowText(hWnd, sbTitle, 256);
            string title = sbTitle.ToString();

            StringBuilder sbClass = new StringBuilder(256);
            GetClassName(hWnd, sbClass, 256);
            string cls = sbClass.ToString();

            if (cls.Contains("Chrome_WidgetWin_1") && (title.Contains("LanguageLearning") || title.Contains("Kiro") || title.Contains("TravelWithMe"))) {
                targetHwnd = hWnd;
                Console.WriteLine("Found Kiro window: " + title + " (HWND: " + hWnd + ")");
            }
            return true;
        }, IntPtr.Zero);

        if (targetHwnd != IntPtr.Zero) {
            ShowWindow(targetHwnd, 9); // SW_RESTORE
            ShowWindow(targetHwnd, 3); // SW_MAXIMIZE
            BringWindowToTop(targetHwnd);
            SetForegroundWindow(targetHwnd);
        } else {
            Console.WriteLine("Target Kiro window not found among visible windows yet.");
        }

        Thread.Sleep(1000);

        // 4. Capture screen
        int w = GetSystemMetrics(0);
        int h = GetSystemMetrics(1);

        IntPtr hdcSrc = GetDC(IntPtr.Zero);
        IntPtr hdcDest = CreateCompatibleDC(hdcSrc);
        IntPtr hBitmap = CreateCompatibleBitmap(hdcSrc, w, h);
        IntPtr hOld = SelectObject(hdcDest, hBitmap);

        BitBlt(hdcDest, 0, 0, w, h, hdcSrc, 0, 0, 0x00CC0020);

        using (Bitmap bmp = Image.FromHbitmap(hBitmap)) {
            bmp.Save(outputPath, ImageFormat.Png);
        }

        SelectObject(hdcDest, hOld);
        DeleteObject(hBitmap);
        DeleteDC(hdcDest);
        ReleaseDC(IntPtr.Zero, hdcSrc);
        CloseDesktop(hDesk);

        return "OK " + w + "x" + h;
    }
}
'@

[KiroScreenCapture]::Execute($OutputPath)
