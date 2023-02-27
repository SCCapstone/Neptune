using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using Microsoft.Toolkit.Uwp.Notifications;
using NeptuneRunner.Notifications;
using Windows.Data.Xml.Dom;
using Windows.Foundation;
using Windows.UI.Notifications;

namespace NeptuneRunner {
    public class NeptuneNotification {
        public string Id; // Toast tag

        public bool Silent; // Notification pushed to action center

        public string ClientId; // Toast group
        public string ClientName; // Collection name
        public string ApplicationName;
        public string ApplicationPackageName;

        // Contents
        public string IconUri;
        public string Title;
        public string Text;

        public string ProgressTitle;
        public string ProgressValue;
        public string ProgressValueString;
        public string ProgressStatus;

        public List<ToastButton> Buttons;
        public ToastTextBox TextBox;
        public AdaptiveProgressBar ProgressBar;
        public AdaptiveProgressBarValue ProgressBarValue;

        public string Attribution;
        public DateTime TimeStamp;


        public event TypedEventHandler<ToastNotification, object> Activated;
        public event TypedEventHandler<ToastNotification, ToastDismissedEventArgs> Dismissed;
        public event TypedEventHandler<ToastNotification, ToastFailedEventArgs> Failed;



        public NeptuneNotification(string id, string title, string text) {
            Id = id;
            Title = title;
            Text = text;
        }


        public void AddButton(string id, string text, bool forTextbox) {
            ToastButton button = new ToastButton(text, "action=" + id);
            if (forTextbox && TextBox != null) {
                button.TextBoxId = TextBox.Id;
            }
            Buttons.Add(button);
        }

        public void AddTextBox(string id, string hintText, string currentText = "", string title = "") {
            TextBox = new ToastTextBox(id) {
                DefaultInput = currentText,
                PlaceholderContent = hintText,
                Title = title
            };
        }

        public void AddProgressBar(double value, string status, string title = "", string valueString = "") {
            ProgressBarValue = AdaptiveProgressBarValue.FromValue(value);
            ProgressBar = new AdaptiveProgressBar() {
                Value = ProgressBarValue,
                Status = status
            };
            if (title != "")
                ProgressBar.Title = title;
            if (valueString != "")
                ProgressBar.ValueStringOverride = valueString;

        }


        public XmlDocument GetXml() {
            ToastContentBuilder builder = new ToastContentBuilder();
            builder.AddArgument("clientId", ClientId);
            builder.AddArgument("id", Id);

            builder.AddText(Title, AdaptiveTextStyle.Title);
            builder.AddText(Text, AdaptiveTextStyle.Caption);

            if (Buttons != null) {
                foreach (ToastButton button in Buttons) {
                    builder.AddButton(button);
                }
            }
            if (TextBox != null) {
                builder.AddInputTextBox(TextBox.Id, TextBox.PlaceholderContent, TextBox.Title);
                // set current text
            }
            if (ProgressBar != null) {
                builder.AddProgressBar(ProgressBar.Title, ProgressBarValue.Value, ProgressBarValue.IsIndeterminate, ProgressBar.ValueStringOverride, ProgressBar.Status);
            }

            if (Attribution != "")
                builder.AddAttributionText(ClientName + ": " + ApplicationName + " - " + Attribution);
            else
                builder.AddAttributionText(ClientName + ": " + ApplicationName);
            //builder.AddCustomTimeStamp(TimeStamp);

            return builder.GetXml();
        }

        public ToastNotification GetToastNotification() {
            XmlDocument xml = GetXml();
            string a = xml.GetXml();
            ToastNotification toast = new ToastNotification(xml);
            
            toast.Activated += (ToastNotification sender, object args) => {
                Activated.Invoke(sender, args);
            };
            
            toast.Dismissed += (ToastNotification sender, ToastDismissedEventArgs args) => {
                Dismissed.Invoke(sender, args);
            };

            toast.Failed += (ToastNotification sender, ToastFailedEventArgs args) => {
                Failed.Invoke(sender, args);
            };

            toast.Tag = Id != ""? Id : ClientId;
            toast.Group = ClientId;
            toast.SuppressPopup = Silent;

            toast.ExpiresOnReboot = true;
            return toast;
        }

        public async void CreateCollection() {
            try {
                if (ClientName != null && ClientName != "") {
                    System.Uri icon = new System.Uri("ms-appx:///Assets/KingNeptune.ico");


                    ToastCollection toastCollection;
                    toastCollection = new ToastCollection(ClientId, "Neptune - " + ClientName, ClientId, icon);
                    ToastNotificationManagerForUser toastNotificationManager = ToastNotificationManager.GetDefault();
                    if (toastNotificationManager != null) {
                        ToastCollectionManager collectionManager = toastNotificationManager.GetToastCollectionManager();
                        await collectionManager.SaveToastCollectionAsync(toastCollection);
                    }
                }
            } catch (Exception) { }
        }

        public async static void DeleteCollection(string name) {
            var collectionManager = ToastNotificationManager.GetDefault().GetToastCollectionManager();
            await collectionManager.RemoveToastCollectionAsync("Name");
        }

        public async void Push() {
            try {
                ToastNotification toast = GetToastNotification();
                var notifier = Program.ToastNotifier;
                if (ClientName != null && ClientName != "") {
                    try {
                        var collection = await ToastNotificationManager.GetDefault().GetToastNotifierForToastCollectionIdAsync(ClientName);
                        if (collection != null)
                            collection.Show(toast);
                        else {
                            CreateCollection();
                            collection = await ToastNotificationManager.GetDefault().GetToastNotifierForToastCollectionIdAsync(ClientName);
                            if (collection != null)
                                collection.Show(toast);
                            else
                                notifier.Show(toast);
                        }
                    } catch (Exception) {
                        Program.ToastNotifier.Show(toast);
                    }
                } else
                    Program.ToastNotifier.Show(toast);
            } catch (Exception) { }
        }

        public NotificationUpdateResult Update() {
            try {
                return Program.ToastNotifier.Update(GetToastNotification().Data, Id, ClientId);
            } catch (Exception) {
                return NotificationUpdateResult.Failed;
            }
        }

        public void Delete() {
            try {
                ToastNotificationManager.GetDefault().History.Remove(Id, ClientId, TaskBar.ApplicationId);
            } catch (Exception) { }
        }
    }
}
