using System;
using System.IO;
using System.Text;
using System.Threading;
using System.Diagnostics;
using System.Windows.Forms;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using Windows.Data.Json;
using Windows.UI.Notifications;
using Microsoft.Toolkit.Uwp.Notifications;
using NeptuneRunner.Notifications;
using Windows.UI.Notifications.Management;
using System.Linq;

namespace NeptuneRunner {
    internal class Program {
        // We output the received pipe data to the console, this is the maximum number of characters to print.
        private const int MaximumCharactersOnPipeDataOutput = 350;

        // Whether we'll process notifications activates via COM
        public static bool AllowCOMActivation = true;
        public static Dictionary<string, NeptuneNotification> ActiveNotifications = new Dictionary<string, NeptuneNotification>();

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



        private static void CheckCanSendNotifications() {
            if (ToastNotifier == null)
                return;

            bool allowed = false;
            string reason = "";
            string resolution = "";
            switch (ToastNotifier.Setting) {
                case NotificationSetting.Enabled:
                    allowed = true;
                    break;

                case NotificationSetting.DisabledForApplication:
                    reason = "disabled for this application.";
                    resolution = "Enable notifications for " + TaskBar.ApplicationName + " inside the Settings app -> System -> Notifications & actions -> Get notifications from these senders -> Enable \"" + TaskBar.ApplicationName + ".\"";
                    break;

                case NotificationSetting.DisabledForUser:
                    reason = "disabled for your Windows account.";
                    resolution = "Enable them inside the Settings app -> System -> Notifications & actions -> Enable \"Get notifications from apps and other senders.\"";
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
                MessageBox.Show("Neptune is not able to push notifications to your system, as notifications are " + reason + Environment.NewLine + resolution,
                    "Notifications blocked!", MessageBoxButtons.OK, MessageBoxIcon.Error);
            } else {
                try {
                    // Delete temp images
                    string tempDirectory = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "temp", "notificationImages");
                    if (Directory.Exists(tempDirectory)) {
                        Directory.Delete(tempDirectory, true);
                    }

                    ToastNotificationManagerCompat.History.Clear(); // Clear notifications
                } catch (Exception) { }
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
                ConsoleHelper.SwitchToCurrent();
                return;
            }


            Console.Title = "Neptune";
            Console.WriteLine("Neptune Server");

            WorkingDirectory = Path.GetDirectoryName(Process.GetCurrentProcess().MainModule.FileName);
            //WorkingDirectory = @"C:\Storage\Neptune\Server\deploy\win32\build\NeptuneServer\";

            if (Directory.Exists(Path.Combine(WorkingDirectory, "Neptune"))) {
                WorkingDirectory = Path.Combine(WorkingDirectory, "Neptune");
            }


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
            Console.WriteLine("\t>searching for qode");
            try {
                while (ExePath == null) {
                    if (Directory.Exists(Path.Combine(WorkingDirectory, "dist")) || Directory.Exists(Path.Combine(WorkingDirectory, "src"))) {
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
            } catch (Exception) {
                Console.WriteLine("Unable to find Neptune's \"dist\" or \"src\" folder.");
                Console.WriteLine("Please make sure that .\\src\\ is in the same folder as this application, or move this application to the root of NeptuneServer.");
                Console.WriteLine();
                if (!string.IsNullOrEmpty(WorkingDirectory))
                    Console.WriteLine("Search path: " + WorkingDirectory);
                Console.WriteLine();
                Console.WriteLine("Press any key to exit.");
                Console.ReadKey();
                return;
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
                return;
            }


            Console.Clear();
            Console.WriteLine("Founding qode: " + ExePath);
            Console.WriteLine("Working directory: " + WorkingDirectory);
            Console.WriteLine("Starting Neptune...");

            // Clear all notifications + icons/images
            try {
                NotificationRegisty.RegisterAppForNotificationSupport(true); // Setup notification support
                                                                             //Notifications.NotificationActivator.Initialize(ToastActivated); // Initialize

                //ToastNotificationManagerCompat.OnActivated += ToastNotificationManagerCompat_OnActivated;
                Notifications.NotificationActivator.Initialize(ToastActivated);
                ToastNotifier = ToastNotificationManager.CreateToastNotifier(TaskBar.ApplicationId);
            } catch (Exception) {
                try {
                    ToastNotificationManagerCompat.Uninstall();
                    NotificationRegisty.UninstallShortcut();

                    NotificationRegisty.RegisterAppForNotificationSupport(true);
                    ToastNotifier = ToastNotificationManager.CreateToastNotifier(TaskBar.ApplicationId);
                } catch (Exception e) {
                    MessageBox.Show("Neptune was unable to register the ToastNotifier into Windows. Because of this, notifications quality will be degraded. "
                        + Environment.NewLine + "Restarting Neptune may help, but do make sure notifications are enabled for your system in the Settings app."
                        + Environment.NewLine + "Error: " + e.Message, "Error registering toast notifier!", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            }

            try {
                // Delete temp images
                string tempDirectory = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "temp", "notificationImages");
                if (Directory.Exists(tempDirectory)) {
                    Directory.Delete(tempDirectory, true);
                }

                ToastNotificationManagerCompat.History.Clear(); // Clear notifications
            } catch (Exception e) {
                string a = e.Message;
            }


            NeptuneProcess = new Process {
                StartInfo = new ProcessStartInfo() {
                    StandardErrorEncoding = Encoding.UTF8,
                    StandardOutputEncoding = Encoding.UTF8,
                    //StandardInputEncoding = Encoding.UTF8,

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
            IAsyncResult ipcAsyncResult = IPC.Listen();

            // Start
            NeptuneProcess.Start();
            NeptuneProcess.BeginOutputReadLine();
            NeptuneProcess.BeginErrorReadLine();

            // Handle shutdown
            AppDomain.CurrentDomain.ProcessExit += CurrentDomain_ProcessExit;
            Console.TreatControlCAsInput = false;
            Console.CancelKeyPress += Console_CancelKeyPress;





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
                try { CheckCanSendNotifications(); } catch (Exception) { }
                NeptuneProcess.WaitForExit();
            } catch (Exception e) {
                Console.WriteLine(e);
                Console.WriteLine("Press any key to exit...");
                Console.ReadKey();
                //Environment.Exit(0);
            } finally {
                NeptuneProcess.CancelOutputRead();
                NeptuneProcess.CancelErrorRead();

                if (NeptuneProcess.ExitCode != 0) {
                    Console.WriteLine("Press any key to exit...");
                    Console.ReadKey();
                }

                if (NeptuneProcess.HasExited)
                    Environment.Exit(NeptuneProcess.ExitCode);
                else
                    Environment.Exit(-1);
            }
        }

        private static void IPC_DataReceived(object sender, PipeDataReceivedEventArgs e) {
            if (ShuttingDown)
                return;

            try {
                // Outputs the first X characters.
                string output = e.Data;
                if (output.Length > MaximumCharactersOnPipeDataOutput) {
                    output = output.Substring(0, MaximumCharactersOnPipeDataOutput - 3) + " ...";
                }
                Console.WriteLine("[Pipe-Server]: " + output);
                Dictionary<string, string> dataKeyValues = e.ToDictionary();

                if (dataKeyValues.ContainsKey("fixwin")) {
                    if (!dataKeyValues.ContainsKey("hwnd"))
                        return;

                    // new window command
                    string value = dataKeyValues["hwnd"];
                    UInt32 hwndInt;
                    UInt32.TryParse(value, out hwndInt);
                    IntPtr hwnd = new IntPtr(hwndInt);
                    if (hwnd != IntPtr.Zero)
                        TaskBar.SetupLaunchee(hwnd);
                } else if (dataKeyValues.ContainsKey("hideconsolewindow")) {
                    ConsoleHelper.HideConsole();

                } else if (dataKeyValues.ContainsKey("showconsolewindow")) {
                    ConsoleHelper.ShowConsole();

                } else if (dataKeyValues.ContainsKey("notify-push")) {
                    if (!dataKeyValues.ContainsKey("title") || !dataKeyValues.ContainsKey("id") || !dataKeyValues.ContainsKey("text")) {
                        return;
                    }

                    try {
                        // Needs updating to support new API specs

                        bool updateOnly = false;
                        NeptuneNotification notification = null;
                        string activeNotificationsKey = dataKeyValues["clientId"] + "_" + dataKeyValues["id"];

                        if (!dataKeyValues.ContainsKey("createNew") && ActiveNotifications.ContainsKey(activeNotificationsKey)) {
                            notification = ActiveNotifications[activeNotificationsKey];
                            updateOnly = true;
                        }


                        if (notification == null || !updateOnly)
                            notification = new NeptuneNotification(dataKeyValues["id"], dataKeyValues["title"], dataKeyValues["text"]);

                        if (dataKeyValues.ContainsKey("action")) {
                            if (dataKeyValues["action"] == "delete") {
                                ActiveNotifications.Remove(activeNotificationsKey);
                                notification.Delete();
                                return;
                            }
                        }
                        notification.Title = dataKeyValues["title"];
                        notification.Contents.Text = dataKeyValues["text"];


                        if (dataKeyValues.ContainsKey("clientId"))
                            notification.ClientId = dataKeyValues["clientId"];
                        if (dataKeyValues.ContainsKey("clientName"))
                            notification.ClientName = dataKeyValues["clientName"];

                        if (dataKeyValues.ContainsKey("applicationName"))
                            notification.ApplicationName = dataKeyValues["applicationName"];
                        if (dataKeyValues.ContainsKey("applicationPackage"))
                            notification.ApplicationPackageName = dataKeyValues["applicationPackage"];
                        if (dataKeyValues.ContainsKey("timestamp"))
                            DateTime.TryParse(dataKeyValues["timestamp"], null, System.Globalization.DateTimeStyles.RoundtripKind, out notification.TimeStamp);
                        if (dataKeyValues.ContainsKey("silent"))
                            notification.IsSilent = dataKeyValues["silent"] == "true";

                        if (dataKeyValues.ContainsKey("type")) {
                            try {
                                notification.Type = (NeptuneNotificationType)Enum.Parse(typeof(NeptuneNotificationActionType), dataKeyValues["type"], true);
                            } catch (Exception) {
                                notification.Type = NeptuneNotificationType.Standard;
                            }
                        }

                        if (dataKeyValues.ContainsKey("contents")) {
                            JsonObject contents = e.DecodeBase64String(dataKeyValues["contents"]);
                            notification.Contents.LoadFromJsonObject(contents);
                        }

                        if (dataKeyValues.ContainsKey("notificationIcon")) {
                            notification.SetIconUri(dataKeyValues["notificationIcon"]);
                        }

                        if (notification.ActivatedHasListeners())
                            notification.Activated -= Notification_Activated;
                        notification.Activated += Notification_Activated;
                        if (notification.DismissedHasListeners())
                            notification.Dismissed -= Notification_Dismissed;
                        notification.Dismissed += Notification_Dismissed;
                        if (notification.FailedHasListeners())
                            notification.Failed -= Notification_Failed;
                        notification.Failed += Notification_Failed;


                        if (ActiveNotifications.ContainsKey(activeNotificationsKey))
                            ActiveNotifications.Remove(activeNotificationsKey);
                        ActiveNotifications.Add(dataKeyValues["clientId"] + "_" + dataKeyValues["id"], notification);


                        if (!updateOnly) {
                            if (!notification.Push()) {
                                throw new Exception();
                            }
                        } else {
                            NotificationUpdateResult result = notification.Update();
                            if (result == NotificationUpdateResult.Failed || result == NotificationUpdateResult.NotificationNotFound) {
                                notification.Delete(false);
                                notification.IsSilent = true;
                                if (!notification.Push()) {
                                    throw new Exception();
                                }
                            }
                        }
                    } catch (Exception) {
                        Dictionary<string, string> data = new Dictionary<string, string>(3) {
                            { "id", dataKeyValues["id"] },
                            { "failureReason", "GenericError" },
                            { "failureMoreDetails", "Generic error encountered." }
                        };
                        IPCDataQueue.Enqueue(IPC.KeyValuePairsToDataString("notify-failed", data));
                    }

                } else if (dataKeyValues.ContainsKey("notify-delete")) {
                    if (!dataKeyValues.ContainsKey("title") || !dataKeyValues.ContainsKey("id")) {
                        return;
                    }

                    string activeNotificationsKey = dataKeyValues["clientId"] + "_" + dataKeyValues["id"];
                    if (ActiveNotifications.ContainsKey(activeNotificationsKey)) {
                        ActiveNotifications[activeNotificationsKey].Delete();
                        ActiveNotifications.Remove(activeNotificationsKey);
                    }

                }
            } catch (Exception exception) {
                Console.Error.WriteLine("[IPC-Server] Unable to process request!");
                Console.Error.WriteLine(exception.Message);
            }
        }

        public static void Notification_Dismissed(ToastNotification sender, ToastDismissedEventArgs args) {
            if (args.Reason != ToastDismissalReason.TimedOut) {
                try {
                    if (ActiveNotifications.ContainsKey(sender.Group + "_" + sender.Tag) && ActiveNotifications[sender.Group + "_" + sender.Tag] != null) {
                        ActiveNotifications[sender.Group + "_" + sender.Tag].Delete();
                    }
                } catch (Exception) { }
                ActiveNotifications.Remove(sender.Group + "_" + sender.Tag);
            }

            string tag = sender.Tag;
            try {
                tag = Encoding.UTF8.GetString(Convert.FromBase64String(tag));
            } catch { }
            if (args.Reason == ToastDismissalReason.UserCanceled) {
                Dictionary<string, string> data = new Dictionary<string, string>(3) {
                    { "id", tag },
                    { "clientId", sender.Group },
                    { "reason", "user" }
                };
                IPCDataQueue.Enqueue(IPC.KeyValuePairsToDataString("notify-dismissed", data));

                try {
                    ActiveNotifications.Remove(sender.Group + "_" + sender.Tag);
                } catch (Exception) { }
            }
        }

        private static void Notification_Failed(ToastNotification sender, ToastFailedEventArgs args) {
            string reason = "";
            string moreDetails = "";
            switch (ToastNotifier.Setting) {
                case NotificationSetting.Enabled:
                    Console.Error.WriteLine("Notification failed to send." + Environment.NewLine
                        + "Unknown error: " + args.ErrorCode.Message);
                    break;

                case NotificationSetting.DisabledForApplication:
                    reason = "DisabledForApplication";
                    moreDetails = "Enable notifications for " + TaskBar.ApplicationName + " inside the Settings app -> System -> Notifications & actions -> Get notifications from these senders -> Enable \"Neptune.\"";
                    break;

                case NotificationSetting.DisabledForUser:
                    reason = "DisabledForUser";
                    moreDetails = "Notifications are disabled for your user account. Enable them inside the Settings app -> System -> Notifications & actions -> Enable \"Get notifications from apps and other senders.\"";
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

            string tag = sender.Tag;
            try {
                tag = Encoding.UTF8.GetString(Convert.FromBase64String(tag));
            } catch { }
            Dictionary<string, string> data = new Dictionary<string, string>(4) {
                { "id", tag },
                { "clientId", sender.Group },
                { "failureReason", reason },
                { "failureMoreDetails", moreDetails }
            };

            try {
                if (ActiveNotifications.ContainsKey(sender.Group + "_" + sender.Tag) && ActiveNotifications[sender.Group + "_" + sender.Tag] != null) {
                    ActiveNotifications[sender.Group + "_" + sender.Tag].DeleteImages();
                }
            } catch (Exception) { }

            ActiveNotifications.Remove(sender.Group + "_" + sender.Tag);
            IPCDataQueue.Enqueue(IPC.KeyValuePairsToDataString("notify-failed", data));
        }

        private static void Notification_Activated(ToastNotification sender, object args) {
            ToastActivatedEventArgs toastArgs = (ToastActivatedEventArgs)args;
            string buttonId = toastArgs.Arguments;
            string userInputText = "";
            string comboBoxSelectedItem = "";

            var userInput = toastArgs.UserInput;

            if (userInput.ContainsKey("TextInput")) {
                var plainTextBytes = Encoding.UTF8.GetBytes(userInput["TextInput"] as string);
                userInputText = Convert.ToBase64String(plainTextBytes);
            } else if (userInput.ContainsKey("TextReply")) {
                var plainTextBytes = Encoding.UTF8.GetBytes(userInput["TextReply"] as string);
                userInputText = Convert.ToBase64String(plainTextBytes);
            }

            if (userInput.ContainsKey("combobox")) {
                var plainTextBytes = Encoding.UTF8.GetBytes(userInput["combobox"] as string);
                comboBoxSelectedItem = Convert.ToBase64String(plainTextBytes);
            }

            string tag = sender.Tag;
            try {
                tag = Encoding.UTF8.GetString(Convert.FromBase64String(tag));
            } catch { }
            // Add data for actions
            Dictionary<string, string> data = new Dictionary<string, string>(5)
            {
                { "id", tag },
                { "clientId", sender.Group },
            };

            if (!string.IsNullOrEmpty(buttonId) && buttonId.Split('=').Length == 2) {
                var plainTextBytes = Encoding.UTF8.GetBytes(buttonId.Split('=')[1]);
                data.Add("buttonId", Convert.ToBase64String(plainTextBytes));
            }
            if (!string.IsNullOrEmpty(userInputText))
                data.Add("textboxText", userInputText);
            if (!string.IsNullOrEmpty(comboBoxSelectedItem))
                data.Add("comboBoxSelectedItem", comboBoxSelectedItem);

            try {
                if (ActiveNotifications.ContainsKey(sender.Group + "_" + sender.Tag) && ActiveNotifications[sender.Group + "_" + sender.Tag] != null) {
                    ActiveNotifications[sender.Group + "_" + sender.Tag].Delete();
                }
            } catch (Exception) { }


            ActiveNotifications.Remove(sender.Group + "_" + sender.Tag);
            IPCDataQueue.Enqueue(IPC.KeyValuePairsToDataString("notify-activated", data));
        }

        private static void ToastNotificationManagerCompat_OnActivated(ToastNotificationActivatedEventArgsCompat e) {
            // Why is this being called when the app is open!!??
            ToastArguments args = ToastArguments.Parse(e.Argument);
            Dictionary<string, string> data = new Dictionary<string, string>(args.Count);
            foreach (KeyValuePair<string, string> valuePair in args) {
                data[valuePair.Key] = valuePair.Value;
            }

            if (args.Contains("action") && args["action"].Split('=').Length == 2) {
                string buttonId = args["action"].Split('=')[1];
                data.Add("buttonId", buttonId);
            }
            if (e.UserInput.ContainsKey("textInput"))
                data.Add("textboxText", e.UserInput["textInput"] as string);
            if (e.UserInput.ContainsKey("combobox"))
                data.Add("comboBoxSelectedItem", e.UserInput["combobox"] as string);

            IPCDataQueue.Enqueue(IPC.KeyValuePairsToDataString("notify-activated", data));
            Console.WriteLine("[NeptuneRunner]: Toast activated. Args: " + e.Argument);
        }

        public static void ToastActivated(string appUserModelId, NotificationEventArgs eventArgs) {
                Console.WriteLine("Notification activated... details as follows");
                Console.WriteLine("appUserModeId: " + appUserModelId);

            // Why is this being called when the app is open!!??
            ToastArguments args = ToastArguments.Parse(eventArgs.LaunchArguments);
            Dictionary<string, string> data = new Dictionary<string, string>(args.Count);
            foreach (KeyValuePair<string, string> valuePair in args) {
                data[valuePair.Key] = valuePair.Value;
            }

            if (args.Contains("action") && args["action"].Split('=').Length == 2) {
                string buttonId = args["action"].Split('=')[1];
                data.Add("buttonId", buttonId);
            }
            if (eventArgs.UserInput.ContainsKey("textInput"))
                data.Add("textboxText", eventArgs.UserInput["textInput"] as string);
            if (eventArgs.UserInput.ContainsKey("combobox"))
                data.Add("comboBoxSelectedItem", eventArgs.UserInput["combobox"] as string);

            try {
                string tag = Encoding.UTF8.GetString(Convert.FromBase64String(eventArgs.Tag));
                data.Add("id", tag);
            } catch { }

            IPCDataQueue.Enqueue(IPC.KeyValuePairsToDataString("notify-activated", data));
            Console.WriteLine("[NeptuneRunner]: Toast activated. Args: " + eventArgs.LaunchArguments);

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
