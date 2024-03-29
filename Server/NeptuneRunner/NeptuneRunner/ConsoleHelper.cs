﻿using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;

namespace NeptuneRunner {
    internal class ConsoleHelper {
        [DllImport("shell32.dll", SetLastError = true)]
        private static extern void SetCurrentProcessExplicitAppUserModelID([MarshalAs(UnmanagedType.LPWStr)] string AppID);

        private const int MF_BYCOMMAND = 0x00000000;
        public const int SC_CLOSE = 0xF060;

        [DllImport("User32")]
        public static extern int DeleteMenu(IntPtr hMenu, int nPosition, int wFlags);

        [DllImport("User32")]
        public static extern IntPtr GetSystemMenu(IntPtr hWnd, bool bRevert);

        [DllImport("Kernel32", ExactSpelling = true)]
        public static extern IntPtr GetConsoleWindow();
        public const UInt32 StdOutputHandle = 0xFFFFFFF5;
        [DllImport("Kernel32")]
        public static extern IntPtr GetStdHandle(int nStdHandle);
        [DllImport("Kernel32")]
        public static extern bool SetConsoleMode(IntPtr hConsoleHandle, int dwMode);
        [DllImport("Kernel32", SetLastError = true)]
        public static extern bool GetConsoleMode(IntPtr hConsoleHandle, out uint lpMode);
        [DllImport("Kernel32")]
        public static extern bool SetConsoleCtrlHandler(EventHandler handler, bool add);
        public delegate bool EventHandler(CtrlType sig);
        static EventHandler _handler;
        [DllImport("Kernel32", SetLastError = true)]
        public static extern bool GenerateConsoleCtrlEvent(CtrlType sigevent, int dwProcessGroupId);

        [DllImport("User32")]
        public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        public enum CtrlType {
            CTRL_C_EVENT = 0,
            CTRL_BREAK_EVENT = 1, // A CTRL+Break signal
            CTRL_CLOSE_EVENT = 2, // Sent by the system when the user closes the console (via taskmgr or the X)
            CTRL_LOGOFF_EVENT = 5,
            CTRL_SHUTDOWN_EVENT = 6
        }

        public const int SW_HIDE = 0;
        public const int SW_SHOW = 5;

        public static void TryEnableAnsiCodesForHandle() {
            var consoleHandle = GetStdHandle(-11);
            GetConsoleMode(consoleHandle, out var consoleBufferModes);
            consoleBufferModes |= 0x0004;
            SetConsoleMode(consoleHandle, (int)consoleBufferModes);
        }


        /// <summary>
        /// This is called when the application has received a "close" or "exit" signal from the system
        /// </summary>
        /// <param name="sig">Type of exit signal received</param>
        /// <returns></returns>
        public static bool CloseHandler(CtrlType sig) {
            if (sig == CtrlType.CTRL_CLOSE_EVENT || sig == CtrlType.CTRL_C_EVENT) {
                return false;
            }

            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("SIG TERM: " + sig);
            Console.ResetColor();

            Task.Run(() => {
                Thread.Sleep(Program.AbsoluteShutdownTimeout); // We'll give this thing 60 seconds before force closing.
                if (Program.NeptuneProcess != null)
                    if (!Program.NeptuneProcess.HasExited)
                        Program.NeptuneProcess.Kill();
                Environment.Exit(-1);
            });

            if (!string.IsNullOrEmpty(Program.ExitCommand)) {
                Program.SendToProcess(Program.ExitCommand);
            } else {
                Program.NeptuneProcess.Close(); // Try to be nice :shrug:
            }

            Program.NeptuneProcess.WaitForExit(); // Wait for the program to exit.


            Console.WriteLine("Application exited.");
            Console.ReadKey();
            Environment.Exit(0);
            return false;
        }

        [DllImport("user32.dll")]
        public static extern bool ShowWindowAsync(HandleRef hWnd, int nCmdShow);
        public const int SW_RESTORE = 9;

        [DllImport("user32.dll")]
        static extern bool SetForegroundWindow(IntPtr hWnd);

        // SetFocus will just focus the keyboard on your application, but not bring your process to front.
        // You don't need it here, SetForegroundWindow does the same.
        // Just for documentation.
        [DllImport("user32.dll")]
        static extern IntPtr SetFocus(HandleRef hWnd);

        public static void SwitchToCurrent() {
            IntPtr hWnd = IntPtr.Zero;
            Process process = Process.GetCurrentProcess();
            Process[] processes = Process.GetProcessesByName("qode");
            foreach (Process _process in processes) {
                if (_process.Id != process.Id &&
                  _process.MainWindowHandle != IntPtr.Zero) {
                    hWnd = _process.MainWindowHandle;

                    ShowWindowAsync(new HandleRef(null, hWnd), SW_RESTORE);
                    ShowWindowAsync(new HandleRef(null, hWnd), SW_SHOW);
                    SetForegroundWindow(hWnd);
                    SetFocus(new HandleRef(null, hWnd));
                    break;
                }
            }
        }

        public static void HideConsole() {
            ShowWindow(GetConsoleWindow(), SW_HIDE);
        }
        public static void ShowConsole() {
            ShowWindow(GetConsoleWindow(), SW_SHOW);
        }

        public static void Setup() {
            // Capture term signals
            if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) {
                //DeleteMenu(GetSystemMenu(GetConsoleWindow(), false), SC_CLOSE, MF_BYCOMMAND); // Remove close button
                TryEnableAnsiCodesForHandle();
#if !DEBUG
                HideConsole();
#endif

                _handler += new EventHandler(CloseHandler);
                SetConsoleCtrlHandler(_handler, true);
            }
        }
    }
}
