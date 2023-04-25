using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using Windows.UI.Notifications;
using Microsoft.Win32;

namespace NeptuneRunner.Notifications {
    public class NotificationRegisty {
        #region Notification Registration
        /// <summary>
        /// Registers the current running application with the COM server and creates a shortcut in the start menu to authorize notifications
        /// </summary>
        /// <param name="force">Register the application regardless if the Start Menu shortcut exists or not</param>
        public static void RegisterAppForNotificationSupport(bool force = false) {
            if (!File.Exists(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData) + "\\Microsoft\\Windows\\Start Menu\\Programs\\" + TaskBar.ApplicationName + ".lnk") || force) {
                string exePath = Process.GetCurrentProcess().MainModule.FileName;
                InstallShortcut(exePath);
                //RegisterComServer(exePath);
            }
        }

        /// <summary>
        /// Registers the COM server for the running program
        /// </summary>
        /// <param name="exePath">The current path of the running program</param>
        private static void RegisterComServer(string exePath) {
            // We register the app process itself to start up when the notification is activated, but
            // other options like launching a background process instead that then decides to launch
            // the UI as needed.
            string guid = "{" + typeof(NotificationActivator).GUID + "}";

            using (RegistryKey key = RegistryKey.OpenBaseKey(Microsoft.Win32.RegistryHive.CurrentUser, RegistryView.Registry64)) {
                using (RegistryKey subkey = key.OpenSubKey(@"SOFTWARE\Classes\CLSID", true)) {
                    using (RegistryKey subkeyClsGuid = subkey.CreateSubKey(guid, true)) {
                        // Below breaks something
                        //subkeyClsGuid.SetValue(null, typeof(NotificationActivator).GUID);
                        //subkeyClsGuid.SetValue("AppID", APP_ID);
                        //subkeyClsGuid.SetValue("DisplayName", "Neptune Notification Handler");

                        using (RegistryKey subkeyLocalServer32 = subkeyClsGuid.CreateSubKey("LocalServer32")) {
                            subkeyLocalServer32.SetValue(null, exePath);
                        }
                    }
                }
            }
        }

        /// <summary>
        /// Install the applications shortcut into the start menu for notification support
        /// </summary>
        /// <param name="shortcutPath">Were the shortcut is being saved</param>
        /// <param name="exePath">The current path of the running program</param>
        private static void InstallShortcut(string exePath) {
            IShellLinkW newShortcut = (IShellLinkW)new CShellLink();

            // Create a shortcut to the exe
            newShortcut.SetPath(exePath);

            // Open the shortcut property store, set the AppUserModelId property
            IPropertyStore newShortcutProperties = (IPropertyStore)newShortcut;

            PropVariantHelper varAppId = new PropVariantHelper();
            varAppId.SetValue(TaskBar.ApplicationId);
            newShortcutProperties.SetValue(PROPERTYKEY.AppUserModel_ID, varAppId.Propvariant);

            PropVariantHelper varToastId = new PropVariantHelper {
                VarType = VarEnum.VT_CLSID
            };
            varToastId.SetValue(typeof(NotificationActivator).GUID);

            newShortcutProperties.SetValue(PROPERTYKEY.AppUserModel_ToastActivatorCLSID, varToastId.Propvariant);

            // Commit the shortcut to disk
            IPersistFile newShortcutSave = (IPersistFile)newShortcut;

            newShortcutSave.Save(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData) + "\\Microsoft\\Windows\\Start Menu\\Programs\\" + TaskBar.ApplicationName + ".lnk", true);
        }


        public static void UninstallShortcut() {
            File.Delete(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData) + "\\Microsoft\\Windows\\Start Menu\\Programs\\" + TaskBar.ApplicationName);
        }
        #endregion
    }
}