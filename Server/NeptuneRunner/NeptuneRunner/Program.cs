using Microsoft.Toolkit.Uwp.Notifications;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;
using Windows.UI.Notifications;

namespace NeptuneRunner {
    internal class Program {
        // Whether we'll process notifications activates via COM
        public static bool AllowCOMActivation = true;
        public static List<NeptuneNotification> Notifications = new List<NeptuneNotification>();

        public static InterprocessCommunication IPC;

        public static Queue<string> IPCDataQueue = new Queue<string>(0);

        public static ToastNotifier ToastNotifier;


        #region Properties
        /// <summary>
        /// Child process we're wrapping around
        /// </summary>
        public static Process NeptuneProcess;


        public static bool RevertToShellLaunch = false;

        /// <summary>
        /// This is what we write to the program's STDIN in order to ask it to politely close.
        /// </summary>
        public static string ExitCommand = "exit";

        /// <summary>
        /// This is the EXE that is being ran and having its STDOUT, STDERR and STDIN wrapped.
        /// </summary>
        public static string ExePath;
        /// <summary>
        /// These are the arguments passed to the application we're running.
        /// </summary>
        public static string ExeArguments = "./dist/index.js";
        /// <summary>
        /// This is what the application's working directory will be.
        /// </summary>
        public static string WorkingDirectory;


        /// <summary>
        /// This is the amount of time that will be allowed to pass after receiving a "close" or "exit" signal from the system.
        /// 
        /// After receiving the signal, and deeming it valid (i.e. not just closing the window, but rather a shutdown or CTRL+C event), we wait this many milliseconds until the application is killed.
        /// </summary>
        public static int AbsoluteShutdownTimeout = 60000; // The total allowed time from receiving the CTRL signal to closing.


        public static bool ShuttingDown = false;
        #endregion


        // =========================== //


        public static void SendToProcess(String msg) {
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine(msg);
            Console.ResetColor();
            NeptuneProcess.StandardInput.WriteLine(msg);
        }



        public static void Main(string[] args) {
            // Capture term signals
            if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) {
                ConsoleHelper.Setup();
                TaskBar.SetupLauncher(ConsoleHelper.GetConsoleWindow());
            }

            Console.Title = "Neptune";
            Console.WriteLine("Neptune Server");

            WorkingDirectory = Path.GetDirectoryName(Process.GetCurrentProcess().MainModule.FileName);
            //WorkingDirectory = @"C:\Storage\Neptune\Server\deploy\win32\build\NeptuneServer\";


            // Process args
            for (int i = 0; i < args.Length; i++) {
                string curArg = args[i].ToLower();
                if (curArg == "-qodepath") {
                    if (args.Length > i + 1) {
                        ExePath = args[i + 1];
                    }
                } else if (curArg == "-wd") {
                    if (args.Length > i + 1) {
                        WorkingDirectory = args[i + 1];
                    }
                } else if (curArg == "-neploc") {
                    if (args.Length > i + 1) {
                        ExeArguments = args[i + 1];
                    }
                }
            }


            // Find NeptuneServer
            Console.Write("\t>searching for qode");
            while (ExePath == null) {
                if (Directory.Exists(Path.Combine(WorkingDirectory, "dist"))) {
                    if (File.Exists(Path.Combine(WorkingDirectory, "qode.exe")) && RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) {
                        ExePath = Path.Combine(WorkingDirectory, "qode.exe");

                    } else if (File.Exists(Path.Combine(WorkingDirectory, "qode")) && !RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) {
                        ExePath = Path.Combine(WorkingDirectory, "qode");

                    } else if (File.Exists(Path.Combine(WorkingDirectory, "node_modules", ".bin", "qode.cmd")) && RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) {
                        ExePath = Path.Combine(WorkingDirectory, "node_modules", ".bin", "qode.cmd");
                        RevertToShellLaunch = true;
                    } else if (File.Exists(Path.Combine(WorkingDirectory, "node_modules", ".bin", "qode")) && !RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) {
                        ExePath = Path.Combine(WorkingDirectory, "node_modules", ".bin", "qode");
                        RevertToShellLaunch = true;
                    } else {
                        Console.Error.WriteLine("Unable to find Qode executable!");
                        string qodeName = "qode.exe";
                        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) {
                            qodeName = "qode executable";
                        }
                        
                        Console.WriteLine("Please place " + qodeName + " into the same folder as this application, or move this application to the root of NeptuneServer.");
                        Console.WriteLine();
                        Console.WriteLine("Search path: " + WorkingDirectory);
                        Console.WriteLine();
                        Console.WriteLine("Press any key to exit.");
                        Console.ReadKey();

                    }
                } else {
                    if (!Directory.Exists(Path.Combine(WorkingDirectory, "..\\"))) {
                        break;
                    }

                    WorkingDirectory = Directory.GetParent(WorkingDirectory).ToString();
                }
            }


            if (!File.Exists(ExePath)) {
                Console.Error.WriteLine("Unable to find Qode executable!");
                string qodeName = "qode.exe";
                if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) {
                    qodeName = "qode executable";
                }

                Console.WriteLine("Please place " + qodeName + " into the same folder as this application, or move this application to the root of NeptuneServer.");
                Console.WriteLine();
                Console.WriteLine("Search path: " + WorkingDirectory);
                Console.WriteLine();
                Console.WriteLine("Press any key to exit.");
                Console.ReadKey();
            }


            Console.Clear();
            Console.WriteLine("Founding qode: " + ExePath);
            Console.WriteLine("Working directory: " + WorkingDirectory);
            Console.WriteLine("Starting Neptune...");

            NeptuneProcess = new Process {
                StartInfo = new ProcessStartInfo() {
                    StandardErrorEncoding = System.Text.Encoding.UTF8,
                    StandardOutputEncoding = System.Text.Encoding.UTF8,
                    StandardInputEncoding = System.Text.Encoding.UTF8,

                    RedirectStandardError = true,
                    RedirectStandardOutput = true,
                    RedirectStandardInput = true,

                    FileName = ExePath,
                    Arguments = ExeArguments,
                    WorkingDirectory = WorkingDirectory,

                    UseShellExecute = false,
                    CreateNoWindow = false,
                }
            };
            NeptuneProcess.OutputDataReceived += P_OutputDataReceived;
            NeptuneProcess.ErrorDataReceived += P_ErrorDataReceived;

            // Pipe
            IPC = new InterprocessCommunication("NeptuneRunnerIPC", "BigweLQytERRx243O5otGgm8UsBhrdVE", "kBoWq2BtM2yqfCntSnLUe6I7lZVjwyEl");
            IPC.DataReceived += IPC_DataReceived;
            IPC.CreateNamedPipe();

            // Start
            NeptuneProcess.Start();
            NeptuneProcess.BeginOutputReadLine();
            NeptuneProcess.BeginErrorReadLine();

            // Handle shutdown
            AppDomain.CurrentDomain.ProcessExit += CurrentDomain_ProcessExit;
            Console.TreatControlCAsInput = false;
            Console.CancelKeyPress += Console_CancelKeyPress;

            IAsyncResult ipcAsyncResult = IPC.Listen();

            Notifier.Notification.RegisterAppForNotificationSupport(true); // Setup notification support
            ToastNotificationManagerCompat.OnActivated += ToastNotificationManagerCompat_OnActivated;
            ToastNotifier = ToastNotificationManager.CreateToastNotifier("NeptuneRunner");
            

            Task.Run(() => {
                NeptuneProcess.StandardInput.AutoFlush = true;
                while (!NeptuneProcess.HasExited) {
                    string line = Console.ReadLine();
                    if (NeptuneProcess.HasExited)
                        break;
                    else
                        NeptuneProcess.StandardInput.WriteLine(line);
                }
            });

            Thread IPCQueueThread = new Thread(() => {
                while (true) {
                    if (IPCDataQueue.Count > 0) {
                        if (IPC.WaitForClient()) {
                            // Send data out
                            Thread.BeginCriticalRegion();
                            lock (IPC) {
                                IPC.SendData(IPCDataQueue.Dequeue());
                            }
                            Thread.EndCriticalRegion();
                        }
                    }

                    Thread.Sleep(500);
                }
            });


            try {
                NeptuneProcess.WaitForExit();
            } catch (Exception) {
                //Environment.Exit(0);
            } finally {
                NeptuneProcess.CancelOutputRead();
                NeptuneProcess.CancelErrorRead();
                if (NeptuneProcess.HasExited)
                    Environment.Exit(NeptuneProcess.ExitCode);
                else
                    Environment.Exit(-1);
            }
        }

        private static void IPC_DataReceived(object sender, PipeDataReceivedEventArgs e) {
            if (!ShuttingDown) {
                Console.WriteLine("[Pipe: Server]: " + e.Data);
                Dictionary<string, string> dataKeyValues = e.ToDictionary();

                if (dataKeyValues.ContainsKey("fixwin")) {
                    // new window command
                    dataKeyValues.TryGetValue("hwnd", out string value);
                    UInt32 hwndInt;
                    UInt32.TryParse(value, out hwndInt);
                    IntPtr hwnd = new IntPtr(hwndInt);
                    if (hwnd != IntPtr.Zero)
                        TaskBar.SetupLaunchee(hwnd);
                } else if (dataKeyValues.ContainsKey("notify-push")) {
                    if (dataKeyValues.ContainsKey("title") && dataKeyValues.ContainsKey("id") && dataKeyValues.ContainsKey("text")) {
                        NeptuneNotification notification = new NeptuneNotification(dataKeyValues["id"], dataKeyValues["title"], dataKeyValues["text"]);
                        if (dataKeyValues.ContainsKey("attribution"))
                            notification.Attribution = dataKeyValues["attribution"];

                        if (dataKeyValues.ContainsKey("clientId"))
                            notification.ClientId = dataKeyValues["clientId"];
                        if (dataKeyValues.ContainsKey("clientName"))
                            notification.ClientName = dataKeyValues["clientName"];

                        if (dataKeyValues.ContainsKey("applicationName"))
                            notification.ApplicationName = dataKeyValues["applicationName"];
                        if (dataKeyValues.ContainsKey("timestamp"))
                            notification.TimeStamp = DateTime.Parse(dataKeyValues["timestamp"], null, System.Globalization.DateTimeStyles.RoundtripKind);

                        notification.Activated += Notification_Activated;
                        notification.Failed += Notification_Failed;
                        notification.Dismissed += Notification_Dismissed;

                        Notifications.Add(notification);
                        notification.Push();
                    }
                }
            }
        }

        private static void Notification_Dismissed(ToastNotification sender, ToastDismissedEventArgs args) {
            if (args.Reason == ToastDismissalReason.UserCanceled) {
                Dictionary<string, string> data = new Dictionary<string, string>(2) {
                    { "id", sender.Tag.Split(":")[1] },
                    { "clientId", sender.Tag.Split(":")[0] },
                    { "reason", "user" }
                };
                IPCDataQueue.Enqueue(IPC.KeyValuePairsToDataString("notify-dismissed", data));
            }
        }

        private static void Notification_Failed(ToastNotification sender, ToastFailedEventArgs args) {
            throw new NotImplementedException();
        }

        private static void Notification_Activated(ToastNotification sender, object args) {
            Dictionary<string, string> data = new Dictionary<string, string>(2) {
                { "id", sender.Tag.Split(":")[1] },
                { "clientId", sender.Tag.Split(":")[0] },
            };
            IPCDataQueue.Enqueue(IPC.KeyValuePairsToDataString("notify-activated", data));
        }

        private static void ToastNotificationManagerCompat_OnActivated(ToastNotificationActivatedEventArgsCompat e) {
            ToastArguments args = ToastArguments.Parse(e.Argument);
            Dictionary<string, string> data = new Dictionary<string, string>(args);
            
            foreach (string input in e.UserInput.Keys) {
                data.Add("userInput:" + input, e.UserInput[input].ToString());
            }

            IPCDataQueue.Enqueue(IPC.KeyValuePairsToDataString("notify-activated", data));

            Console.WriteLine("Toast activated. Args: " + e.Argument);
        }


        private static void CurrentDomain_ProcessExit(object sender, EventArgs e) {
            if (!NeptuneProcess.HasExited)
                SendToProcess(ExitCommand);
            ShuttingDown = true;
            NeptuneProcess.WaitForExit();
        }

        private static void Console_CancelKeyPress(object sender, ConsoleCancelEventArgs e) {
            e.Cancel = true;
            ShuttingDown = true;
            SendToProcess(ExitCommand);
        }

        private static void P_ErrorDataReceived(object sender, DataReceivedEventArgs e) {
            Console.WriteLine(e.Data);
        }

        public static void P_OutputDataReceived(object sender, DataReceivedEventArgs e) {
            Console.WriteLine(e.Data);
        }

    }
}
