﻿using Microsoft.Toolkit.Uwp.Notifications;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;
using Windows.UI.Notifications;
using Windows.Foundation;
using NeptuneRunner.Notifications;
using System.Windows.Forms;

namespace NeptuneRunner {
    internal class Program {
        // Whether we'll process notifications activates via COM
        public static bool AllowCOMActivation = true;
        public static Dictionary<string, NeptuneNotification> ActiveNotifications = new Dictionary<string, NeptuneNotification>();

        public static InterprocessCommunication IPC;

        public static Queue<string> IPCDataQueue = new Queue<string>(0);

        public static ToastNotifierCompat ToastNotifier;


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



        private static void CheckCanSendNotifications() {
            bool allowed = false;
            string reason = "";
            string resolution = "";
            switch (Program.ToastNotifier.Setting) {
                case NotificationSetting.Enabled:
                    allowed = true;
                    break;

                case NotificationSetting.DisabledForApplication:
                    reason = "disabled for this application.";
                    resolution = "Enable notifications for " + TaskBar.ApplicationName + " inside the Settings app -> System -> Notifications & actions -> Get notifications from these senders";
                    break;

                case NotificationSetting.DisabledForUser:
                    reason = "disabled for your Windows account.";
                    resolution = "Enable them inside the Settings app -> System -> Notifications & actions -> Get notifications from apps and other senders.";
                    break;

                case NotificationSetting.DisabledByGroupPolicy:
                    reason = "disabled by your organization (via group policy).";
                    resolution = "View more information inside the Settings app -> System -> Notifications & actions";
                    // Can check registry here...
                    break;

                case NotificationSetting.DisabledByManifest:
                    reason = "DisabledByManifest";
                    break;
            }

            if (!allowed) {
                MessageBox.Show("Notifications blocked!",
                    "Neptune is not able to push notifications to your system, as notifications are " + reason + Environment.NewLine + resolution,
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }



        public static void Main(string[] args) {
            // Capture term signals
            if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) {
                ConsoleHelper.Setup();
                TaskBar.SetupLauncher(ConsoleHelper.GetConsoleWindow());
            }

            bool createdNew;
            Mutex mutex = new Mutex(true, "NeptuneRunner", out createdNew);
            if (!createdNew) {
                // Already running!
                Console.WriteLine("Application is already running!");
                Console.Write(args);
                Console.ReadKey();
                return;
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
                } else if (curArg == "-uninstall") {
                    ToastNotificationManagerCompat.Uninstall();
                    NotificationRegisty.UninstallShortcut();
                    return;
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
                    //StandardInputEncoding = System.Text.Encoding.UTF8,

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

            try {
                NotificationRegisty.RegisterAppForNotificationSupport(true); // Setup notification support
                                                                             //Notifications.NotificationActivator.Initialize(ToastActivated); // Initialize

                ToastNotificationManagerCompat.OnActivated += ToastNotificationManagerCompat_OnActivated;
                ToastNotifier = ToastNotificationManagerCompat.CreateToastNotifier();
            } catch (Exception) { }



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
                // Wait for IPC to connect
                while (!IPC.ClientAuthenticated) {
                    Thread.Sleep(500);
                }

                Console.WriteLine("[NeptuneRunner]: IPC connected, pushing queue.");

                // Push queue
                while (true) {
                    if (IPCDataQueue.Count > 0) {
                        if (IPC.WaitForClient()) {
                            // Send data out
                            Thread.BeginCriticalRegion();
                            lock (IPC) {
                                while (IPCDataQueue.Count > 0)
                                    IPC.SendData(IPCDataQueue.Dequeue());
                            }
                            Thread.EndCriticalRegion();
                        }
                    }

                    Thread.Sleep(500);
                }
            });
            IPCQueueThread.Start();


            try {
                Console.Title = "Neptune";
                CheckCanSendNotifications();
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
            try {
                if (!ShuttingDown) {
                    Console.WriteLine("[Pipe-Server]: " + e.Data);
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
                            bool updateOnly = false;
                            NeptuneNotification notification = null;
                            string activeNotificationsKey = dataKeyValues["clientId"] + "_" + dataKeyValues["id"];

                            if (!dataKeyValues.ContainsKey("createNew") && ActiveNotifications.ContainsKey(activeNotificationsKey)) {
                                notification = ActiveNotifications[activeNotificationsKey];
                                updateOnly = true;
                            }


                            if (notification == null || !updateOnly)
                                notification = new NeptuneNotification(dataKeyValues["id"], dataKeyValues["title"], dataKeyValues["text"]);
                            else {
                                if (dataKeyValues.ContainsKey("action")) {
                                    if (dataKeyValues["action"] == "delete") {
                                        notification.Delete();
                                        return;
                                    }
                                }
                                notification.Title = dataKeyValues["title"];
                                notification.Text = dataKeyValues["text"];
                            }

                            if (dataKeyValues.ContainsKey("attribution"))
                                notification.Attribution = dataKeyValues["attribution"];

                            if (dataKeyValues.ContainsKey("clientId"))
                                notification.ClientId = dataKeyValues["clientId"];
                            if (dataKeyValues.ContainsKey("clientName"))
                                notification.ClientName = dataKeyValues["clientName"];

                            if (dataKeyValues.ContainsKey("applicationName"))
                                notification.ApplicationName = dataKeyValues["applicationName"];
                            if (dataKeyValues.ContainsKey("timestamp"))
                                DateTime.TryParse(dataKeyValues["timestamp"], null, System.Globalization.DateTimeStyles.RoundtripKind, out notification.TimeStamp);
                            if (dataKeyValues.ContainsKey("silent"))
                                notification.Silent = dataKeyValues["silent"] == "true";

                            notification.Activated += Notification_Activated;
                            notification.Failed += Notification_Failed;
                            notification.Dismissed += Notification_Dismissed;


                            if (ActiveNotifications.ContainsKey(activeNotificationsKey))
                                ActiveNotifications.Remove(activeNotificationsKey);
                            ActiveNotifications.Add(dataKeyValues["clientId"] + "_" + dataKeyValues["id"], notification);

                            if (!updateOnly) {
                                notification.Push();
                            } else {
                                notification.Update();
                            }
                        }
                    } else if (dataKeyValues.ContainsKey("notify-delete")) {
                        if (dataKeyValues.ContainsKey("title") && dataKeyValues.ContainsKey("id")) {
                            if (ActiveNotifications.ContainsKey(dataKeyValues["clientId"] + "_" + dataKeyValues["id"])) {
                                ActiveNotifications[dataKeyValues["clientId"] + "_" + dataKeyValues["id"]].Delete();
                            }
                        }
                    }
                }
            } catch (Exception) { } //meh
        }

        private static void Notification_Dismissed(ToastNotification sender, ToastDismissedEventArgs args) {
            if (args.Reason == ToastDismissalReason.UserCanceled) {
                Dictionary<string, string> data = new Dictionary<string, string>(3) {
                    { "id", sender.Tag },
                    { "clientId", sender.Group },
                    { "reason", "user" }
                };
                IPCDataQueue.Enqueue(IPC.KeyValuePairsToDataString("notify-dismissed", data));
            }
        }

        private static void Notification_Failed(ToastNotification sender, ToastFailedEventArgs args) {
            string reason = "";
            string moreDetails = "";
            switch (Program.ToastNotifier.Setting) {
                case NotificationSetting.Enabled:
                    Console.Error.WriteLine("Notification failed to send." + Environment.NewLine
                        + "Unknown error: " + args.ErrorCode.Message);
                    break;

                case NotificationSetting.DisabledForApplication:
                    reason = "DisabledForApplication";
                    moreDetails = "Enable notifications for " + TaskBar.ApplicationName + " inside the Settings app -> System -> Notifications & actions -> Get notifications from these senders";
                    break;

                case NotificationSetting.DisabledForUser:
                    reason = "DisabledForUser";
                    moreDetails = "Notifications are disabled system wide. Enable them inside the Settings app -> System -> Notifications & actions -> Get notifications from apps and other senders.";
                    break;

                case NotificationSetting.DisabledByGroupPolicy:
                    reason = "DisabledByGroupPolicy";
                    moreDetails = "Notifications are disabled by your organization (via group policy). View more information inside the Settings app -> System -> Notifications & actions";
                    // Can check registry here...
                    break;

                case NotificationSetting.DisabledByManifest:
                    reason = "DisabledByManifest";
                    break;
            }

            Dictionary<string, string> data = new Dictionary<string, string>(4) {
                { "id", sender.Tag },
                { "clientId", sender.Group },
                { "failureReason", reason },
                { "failureMoreDetails", moreDetails }
            };
            IPCDataQueue.Enqueue(IPC.KeyValuePairsToDataString("notify-failed", data));
        }

        private static void Notification_Activated(ToastNotification sender, object args) {
            Dictionary<string, string> data = new Dictionary<string, string>(2) {
                { "id", sender.Tag },
                { "clientId", sender.Group },
            };
            //IPCDataQueue.Enqueue(IPC.KeyValuePairsToDataString("notify-activated", data));
        }

        private static void ToastNotificationManagerCompat_OnActivated(ToastNotificationActivatedEventArgsCompat e) {
            ToastArguments args = ToastArguments.Parse(e.Argument);
            Dictionary<string, string> data = new Dictionary<string, string>(args.Count);
            foreach (KeyValuePair<string, string> valuePair in args) {
                data[valuePair.Key] = valuePair.Value;
            }

            foreach (string input in e.UserInput.Keys) {
                data.Add("userInput:" + input, e.UserInput[input].ToString());
            }

            IPCDataQueue.Enqueue(IPC.KeyValuePairsToDataString("notify-activated", data));

            Console.WriteLine("[NeptuneRunner]: Toast activated. Args: " + e.Argument);
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
