param(
    [string]$OutputPath = "D:\Pham Duy Hung\PROJECT\LanguageLearning\scratch\kiro_after_yes2.png"
)

Add-Type -ReferencedAssemblies "System.Drawing" @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

public class PreciseClicker {
    [DllImport("user32.dll", SetLastError=true)]
    public static extern IntPtr OpenInputDesktop(uint dwFlags, bool fInherit, uint dwDesiredAccess);

    [DllImport("user32.dll", SetLastError=true)]
    public static extern bool SetThreadDesktop(IntPtr hDesktop);

    [DllImport("user32.dll", SetLastError=true)]
    public static extern bool CloseDesktop(IntPtr hDesktop);

    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int X, int Y);

    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, int dx, int dy, uint dwData, int dwExtraInfo);

    [StructLayout(LayoutKind.Sequential)]
    public struct POINT {
        public int X;
        public int Y;
    }

    [DllImport("user32.dll")]
    public static extern IntPtr WindowFromPoint(POINT Point);

    [DllImport("user32.dll")]
    public static extern bool ScreenToClient(IntPtr hWnd, ref POINT lpPoint);

    [DllImport("user32.dll")]
    public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool BringWindowToTop(IntPtr hWnd);

    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")]
    public static extern bool EnumDesktopWindows(IntPtr hDesktop, EnumWindowsProc lpfn, IntPtr lParam);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdcBlt, uint nFlags);

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

    public static string Click(string outputPath) {
        string res = "";
        Thread t = new Thread(() => {
            IntPtr hDesk = OpenInputDesktop(0, false, 0x01FF);
            if (hDesk == IntPtr.Zero) {
                res = "OpenInputDesktop failed: " + Marshal.GetLastWin32Error();
                return;
            }
            SetThreadDesktop(hDesk);

            IntPtr targetHwnd = IntPtr.Zero;
            EnumDesktopWindows(hDesk, (hWnd, lParam) => {
                StringBuilder sb = new StringBuilder(256);
                GetWindowText(hWnd, sb, 256);
                string title = sb.ToString();
                if (title.Contains("LanguageLearning") && title.Contains("Kiro")) {
                    targetHwnd = hWnd;
                }
                return true;
            }, IntPtr.Zero);

            if (targetHwnd == IntPtr.Zero) {
                res = "Kiro window not found";
                CloseDesktop(hDesk);
                return;
            }

            RECT r;
            GetWindowRect(targetHwnd, out r);
            int screenX = r.Left + 815;
            int screenY = r.Top + 662;

            Console.WriteLine("Clicking target at (" + screenX + ", " + screenY + ")...");

            ShowWindow(targetHwnd, 9);
            BringWindowToTop(targetHwnd);
            SetForegroundWindow(targetHwnd);
            Thread.Sleep(200);

            // 1. Physical mouse click
            SetCursorPos(screenX, screenY);
            mouse_event(0x0001, 1, 1, 0, 0);
            Thread.Sleep(100);
            mouse_event(0x0002, 0, 0, 0, 0);
            Thread.Sleep(100);
            mouse_event(0x0004, 0, 0, 0, 0);
            Thread.Sleep(100);

            // 2. Child window message click
            POINT pt;
            pt.X = screenX;
            pt.Y = screenY;
            IntPtr childHwnd = WindowFromPoint(pt);
            Console.WriteLine("Window at point: " + childHwnd);

            if (childHwnd != IntPtr.Zero) {
                POINT clientPt = pt;
                ScreenToClient(childHwnd, ref clientPt);
                IntPtr lParam = (IntPtr)((clientPt.Y << 16) | (clientPt.X & 0xFFFF));
                PostMessage(childHwnd, 0x0201, (IntPtr)1, lParam); // WM_LBUTTONDOWN
                Thread.Sleep(100);
                PostMessage(childHwnd, 0x0202, IntPtr.Zero, lParam); // WM_LBUTTONUP
            }

            Thread.Sleep(1500);

            int w = r.Right - r.Left;
            int h = r.Bottom - r.Top;
            if (w <= 0 || h <= 0) { w = 1550; h = 830; }

            IntPtr hdcScreen = GetDC(IntPtr.Zero);
            IntPtr hdcMem = CreateCompatibleDC(hdcScreen);
            IntPtr hBmp = CreateCompatibleBitmap(hdcScreen, w, h);
            IntPtr hOld = SelectObject(hdcMem, hBmp);

            PrintWindow(targetHwnd, hdcMem, 2);

            using (Bitmap bmp = Image.FromHbitmap(hBmp)) {
                bmp.Save(outputPath, ImageFormat.Png);
            }

            SelectObject(hdcMem, hOld);
            DeleteObject(hBmp);
            DeleteDC(hdcMem);
            ReleaseDC(IntPtr.Zero, hdcScreen);
            CloseDesktop(hDesk);

            res = "Done precise click and capture";
        });
        t.SetApartmentState(ApartmentState.STA);
        t.Start();
        t.Join();
        return res;
    }
}
"@

[PreciseClicker]::Click($OutputPath)
