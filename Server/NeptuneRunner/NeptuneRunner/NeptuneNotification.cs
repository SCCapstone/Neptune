using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using Microsoft.Toolkit.Uwp.Notifications;
using Windows.Data.Xml.Dom;
using Windows.Foundation;
using Windows.UI.Notifications;

namespace NeptuneRunner {
    public class NeptuneNotification {
        public string Id;

        public NotificationAction Action;

        public string ClientId;
        public string ClientName;
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
                builder.AddAttributionText(Attribution);
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

            toast.Tag = Id;
            toast.Group = ClientId;

            toast.ExpiresOnReboot = true;
            return toast;
        }

        public void Push() {
            Program.ToastNotifier.Show(GetToastNotification());
        }

        public void Update() {
            //ToastNotificationManager.CreateToastNotifier().Update(GetToastNotification(), Id);
        }

        public void Delete() {
            ToastNotificationManager.GetDefault().History.Remove(Id);
        }
    }

    public enum NotificationAction {
        None = 0,
        Create = 1,
        Update = 2,
        Delete = 3,
    }
}
