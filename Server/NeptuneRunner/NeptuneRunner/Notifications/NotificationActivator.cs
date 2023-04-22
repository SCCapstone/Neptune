using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Windows.UI.Notifications;

namespace NeptuneRunner.Notifications {
    [ClassInterface(ClassInterfaceType.None)]
    [ComSourceInterfaces(typeof(INotificationActivationCallback))]
    [Guid("BB2560CC-4D03-4988-89D5-8715F0DA2FF2"), ComVisible(true)] // Set to your application (assembly)'s GUID
    public class NotificationActivator : INotificationActivationCallback {
        private static Action<string, NotificationEventArgs> ActivatedFunction;

        /// <summary>
        /// This is called when a notification is activated
        /// </summary>
        public void Activate(string appUserModelId, string invokedArgs, NOTIFICATION_USER_INPUT_DATA[] data, uint dataCount) {
            if (ActivatedFunction != null) {
                ActivatedFunction(appUserModelId, new NotificationEventArgs(invokedArgs) {
                    Action = NotificationEventArgs.NotificationAction.Activated,
                    COMActivated = true,
                });
            }
        }

        /// <summary>
        /// Calls the initialized activator method
        /// </summary>
        public static void Activate(string appUserModelId, NotificationEventArgs args) {
            if (ActivatedFunction != null) {
                ActivatedFunction(appUserModelId, args);
            }
        }

        /// <summary>
        /// Run this once on application first start
        /// </summary>
        public static void Initialize(Action<string, NotificationEventArgs> action) {
            ActivatedFunction = action;

            regService = new RegistrationServices();

            cookie = regService.RegisterTypeForComClients(
                typeof(NotificationActivator),
                RegistrationClassContext.LocalServer,
                RegistrationConnectionType.MultipleUse);
        }
        public static void Uninitialize() {
            if (cookie != -1 && regService != null)
                regService.UnregisterTypeForComClients(cookie);
        }

        private static int cookie = -1;
        private static RegistrationServices regService = null;
    }


    /// <summary>
    /// Notification activation arguments
    /// </summary>
    public class NotificationEventArgs {
        // This is inside the activated args
        public Windows.Foundation.Collections.ValueSet UserInput;

        public NotificationAction Action = NotificationAction.Unknown;
        public ToastDismissalReason DismissalReason;
        public string ErrorDetails;

        public bool COMActivated = false;

        public string Tag;
        public string Group;
        public string LaunchArguments;


        public NotificationEventArgs() { }

        public NotificationEventArgs(ToastNotification sender, string arguments) {
            GetId(arguments.ToString());
            Tag = sender.Tag;
            Group = sender.Group;

            Action = NotificationAction.Activated;
            LaunchArguments = arguments;
        }
        public NotificationEventArgs(ToastNotification sender, ToastActivatedEventArgs arguments) {
            GetId(arguments.Arguments.ToString());
            Tag = sender.Tag;
            Group = sender.Group;

            Action = NotificationAction.Activated;
            UserInput = arguments.UserInput;
        }

        public NotificationEventArgs(ToastNotification sender, ToastDismissedEventArgs args) {
            if (sender.Content.ChildNodes.Count <= 1) {
                Tag = sender.Tag;
                Action = NotificationAction.Dismissed;
                DismissalReason = args.Reason;
                return;
            }
            string arguments = sender.Content.ChildNodes[1].Attributes.GetNamedItem("launch").InnerText;
            GetId(arguments);
            Tag = sender.Tag;
            Group = sender.Group;

            Action = NotificationAction.Dismissed;
            DismissalReason = args.Reason;
        }

        public NotificationEventArgs(ToastNotification sender, string reason = "", string moreDetails = "") {
            string arguments = sender.Content.GetElementsByTagName("toast")[0].Attributes.GetNamedItem("launch").ToString();
            GetId(arguments);
            Tag = sender.Tag;
            Group = sender.Group;

            if (reason != "") {
                ErrorDetails = reason;
                Console.Error.WriteLine("Notifications are disabled (" + reason + ").");
                if (moreDetails != "") {
                    Console.Error.WriteLine(moreDetails);
                    ErrorDetails += Environment.NewLine + moreDetails;
                }
            }
            Action = NotificationAction.Error;
        }

        public NotificationEventArgs(string arguments) {
            GetId(arguments);
        }


        private void GetId(string arguments) {
            try {
                string[] split = arguments.Split(':');
                if (split.Length >= 2) {
                    LaunchArguments = arguments.Split(':')[1];
                    Tag = arguments.Split(':')[0];
                } else {
                    LaunchArguments = arguments;
                    Tag = "";
                }
            } catch (FormatException) {
                Tag = "";
            } catch (Exception) { }
        }


        /// <summary>
        /// How the notification was activated
        /// </summary>
        public enum NotificationAction {
            Unknown = 0,
            Activated = 1,
            Dismissed = 2,
            Error = 3,
        }
    }
}
