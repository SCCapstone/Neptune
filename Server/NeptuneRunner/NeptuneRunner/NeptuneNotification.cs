using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

using Microsoft.Toolkit.Uwp.Notifications;
using NeptuneRunner.Notifications;
using Windows.Data.Xml.Dom;
using Windows.Foundation;
using Windows.UI.Notifications;
using System.Drawing;
using System.Drawing.Imaging;

namespace NeptuneRunner {
    public class NeptuneNotification {
        /// <summary>
        /// Used to track images file paths.
        /// </summary>
        private static Dictionary<string, string> _imagePathsById = new Dictionary<string, string>();

        /// <summary>
        /// Whether or not the toast has been sent to Windows yet.
        /// </summary>
        private bool _hasBeenDisplayed = false;


        /// <summary>
        /// The toast's tag (id).
        /// </summary>
        public string Id; // Toast tag

        /// <summary>
        /// Client identification UUID, used as the toast group's id.
        /// </summary>
        public string ClientId;

        /// <summary>
        /// The client's friendly name, becomes the toast collection name.
        /// This is also used in the attribution text, which becomes
        /// <c>"<see cref="ClientName"/>: <see cref="ApplicationName"/>"</c>.
        /// </summary>
        public string ClientName;

        /// <summary>
        /// Used in the attribution tag for the toast notification.
        /// </summary>
        public string ApplicationName;

        /// <summary>
        /// The application package name of the application that sent the notification.
        /// </summary>
        public string ApplicationPackageName;



        // Contents
        /// <summary>
        /// Uri pointing to the application's icon.
        /// <para>Note this is read-only, use the <see cref="SetIconUri(string)"/> method to set the icon Uri using the data string.</para>
        /// </summary>
        public Uri IconUri {
            get => _iconUri;
        }
        private Uri _iconUri;



        public string Title;

        /// <summary>
        /// The type of notification (used in the data extraction process and building the notification).
        /// </summary>
        public NeptuneNotificationType Type = NeptuneNotificationType.Standard;


        // Contents

        /// <summary>
        /// Content of the notification
        /// </summary>
        public NeptuneNotificationContents Contents;



        /// <summary>
        /// Uri pointing to the saved icon for this notification.
        /// <para>Note this is read-only, use the <see cref="SetImageUri(string)"/> method to set the image Uri using the data string.</para>
        /// </summary>
        public Uri ImageUri {
            get => _imageUri;
        }
        private Uri _imageUri;


        /// <summary>
        /// If <see cref="Type"/> is a timer, this is the direction of the timer.
        /// </summary>
        public bool TimerCountingDown = true;

        public string ProgressValue;
        public string ProgressMax;
        public bool ProgressIsIndeterminate;

        public bool OnlyAlertOnce = false;
        public string Priority;
        public DateTime TimeStamp;
        public bool IsSilent = false; // Notification pushed to action center

        // Private holders
        public List<ToastButton> Buttons = new List<ToastButton>();
        private ToastTextBox TextBox;
        private ToastSelectionBox ComboBox;
        private List<ToastSelectionBoxItem> ComboBoxItems = new List<ToastSelectionBoxItem>();


        // Event handlers


        public event TypedEventHandler<ToastNotification, object> Activated;
        public event TypedEventHandler<ToastNotification, ToastDismissedEventArgs> Dismissed;
        public event TypedEventHandler<ToastNotification, ToastFailedEventArgs> Failed;



        public NeptuneNotification(string id, string title, string text) {
            Id = id;
            Title = title;
            Contents = new NeptuneNotificationContents(this) {
                Text = text
            };
        }

        /// <summary>
        /// Whether or not the <see cref="Activated"/> event has any listeners already.
        /// </summary>
        /// <returns><see langword="true"/> if <see cref="Activated"/> has one or more items in the invocation list.</returns>
        public bool ActivatedHasListeners() => Activated?.GetInvocationList().Length > 0;
        /// <summary>
        /// Whether or not the <see cref="Dismissed"/> event has any listeners already.
        /// </summary>
        /// <returns><see langword="true"/> if <see cref="Dismissed"/> has one or more items in the invocation list.</returns>
        public bool DismissedHasListeners() => Dismissed?.GetInvocationList().Length > 0;
        /// <summary>
        /// Whether or not the <see cref="Failed"/> event has any listeners already.
        /// </summary>
        /// <returns><see langword="true"/> if <see cref="Failed"/> has one or more items in the invocation list.</returns>
        public bool FailedHasListeners() => Failed?.GetInvocationList().Length > 0;


        #region Image processing
        /// <summary>
        /// Saves image data found in the <paramref name="dataString"/>: <c>data:image/*;base64, data...</c>.
        /// </summary>
        /// <param name="dataString">String containing an image in the following format: <c>data:image/*;base64, data...</c>.</param>
        /// <param name="filename">The filename of the image.</param>
        /// <returns>File path as a Uri.</returns>
        /// <exception cref="ArgumentException"></exception>
        private Uri SaveImageFromDataString(string dataString, string id) {
            // Verify the data string contains image data
            Regex regex = new Regex(@"^data:image\/(jpeg|png|gif|tiff|ico|emf|wmf|exif);(base64|hex),");
            Match match = regex.Match(dataString);

            if (!match.Success) {
                throw new ArgumentException("Invalid data string format.");
            }

            // Extract information from the data string
            string fileType = match.Groups[1].Value;
            string encodingType = match.Groups[2].Value;
            string encodedData = dataString.Substring(match.Length).Trim();

            // Decode the image data
            byte[] imageData = null;

            if (encodingType == "base64") {
                imageData = Convert.FromBase64String(encodedData);
            } else if (encodingType == "hex") {
                int byteCount = encodedData.Length / 2;
                imageData = new byte[byteCount];

                for (int i = 0; i < byteCount; i++) {
                    imageData[i] = Convert.ToByte(encodedData.Substring(i * 2, 2), 16);
                }
            }

            // Load the image
            Image image;
            using (MemoryStream ms = new MemoryStream(imageData)) {
                image = Image.FromStream(ms);

                // Create the temporary directory (if it doesn't exist)
                string tempDirectory = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "temp", "notificationImages");
                Directory.CreateDirectory(tempDirectory);

                // Save the image
                string filename = string.IsNullOrEmpty(Id) ? id : Id + "_" + id;
                string imagePath = Path.Combine(tempDirectory, $"{filename}.{fileType}");
                ImageFormat imageFormat = ImageFormat.Bmp;
                switch (fileType.ToLower()) {
                    case "jpg":
                    case "jpeg":
                        imageFormat = ImageFormat.Jpeg;
                        break;
                    case "png":
                        imageFormat = ImageFormat.Png;
                        break;
                    case "gif":
                        imageFormat = ImageFormat.Gif;
                        break;
                    case "tiff":
                        imageFormat = ImageFormat.Tiff;
                        break;
                    case "ico":
                        imageFormat = ImageFormat.Icon;
                        break;
                    case "emf":
                        imageFormat = ImageFormat.Emf;
                        break;
                    case "wmf":
                        imageFormat = ImageFormat.Wmf;
                        break;
                    case "exif":
                        imageFormat = ImageFormat.Exif;
                        break;
                }

                // Update the image path for the given ID
                if (_imagePathsById.ContainsKey(id)) {
                    DeleteImageById(id);
                }

                image.Save(imagePath, imageFormat);

                _imagePathsById[id] = imagePath;

                // Return the absolute file path using the "file://" protocol
                return new Uri(imagePath);
            }
        }

        /// <summary>
        /// Deletes any image on disk given the id of the image. This is used to update notification images/delete them after the notification is done.
        /// </summary>
        /// <param name="id">Id of the image in question to delete (either icon or image).</param>
        public static void DeleteImageById(string id) {
            if (_imagePathsById.ContainsKey(id)) {
                string filePath = _imagePathsById[id];
                if (File.Exists(filePath)) {
                    File.Delete(filePath);
                }
                _imagePathsById.Remove(id);
            }
        }

        /// <summary>
        /// Saves the provided image (in the proper format) to the disk and sets <see cref="IconUri"/> to the path to that image file.
        /// </summary>
        /// <param name="dataString">Encoded image data in the format of <c>data:image/*;base64, data...</c>.</param>
        public void SetIconUri(string dataString) {
            try {
                _iconUri = SaveImageFromDataString(dataString, "icon");
            } catch (Exception) {

            }
        }
        /// <summary>
        /// Saves the provided image (in the proper format) to the disk and sets <see cref="ImageUri"/> to the path to that image file.
        /// </summary>
        /// <param name="dataString">Encoded image data in the format of <c>data:image/*;base64, data...</c>.</param>
        public void SetImageUri(string dataString) {
            try {
                _imageUri = SaveImageFromDataString(dataString, "image");
            } catch (Exception) { }
        }
        #endregion

        /// <summary>
        /// Given an array of <see cref="NeptuneNotificationAction"/> actions, this runs
        /// <see cref="AddButton(string, string, bool)"/>,
        /// <see cref="AddTextBox(string, string, string, string)"/>, and
        /// <see cref="AddComboBox(string, string[], string)"/> for each action.
        /// </summary>
        /// <param name="actions"></param>
        public void ProcessActions(NeptuneNotificationAction[] actions) {
            Buttons = new List<ToastButton>();
            TextBox = null;
            ComboBox = null;
            ComboBoxItems = new List<ToastSelectionBoxItem>();

            foreach (NeptuneNotificationAction action in actions) {
                switch (action.Type) {
                    case NeptuneNotificationActionType.Button:
                        AddButton(action.Id, action.Contents, false);
                        break;

                    case NeptuneNotificationActionType.TextBox:
                        AddTextBox(action.Id, action.HintText);
                        break;

                    case NeptuneNotificationActionType.ComboBox:
                        AddComboBox(action.Id, action.Choices, action.HintText);
                        break;
                }
            }
        }

        #region Toast methods
        public void AddButton(string id, string text, bool forTextbox) {
            ToastButton button = new ToastButton(text, "action=" + id);
            if (forTextbox && TextBox != null) {
                button.TextBoxId = TextBox.Id;
            }
            Buttons.Add(button);
        }

        public void AddTextBox(string id, string hintText, string currentText = "", string title = "") {
            TextBox = new ToastTextBox(id);

            if (!string.IsNullOrEmpty(currentText))
                TextBox.DefaultInput = currentText;
            if (!string.IsNullOrEmpty(hintText))
                TextBox.PlaceholderContent = hintText;
            if (!string.IsNullOrEmpty(title))
                TextBox.Title = title;
        }

        public void AddComboBox(string id, string[] options, string hintText) {
            if (string.IsNullOrEmpty(id) || options == null) {
                return;
            }

            ComboBox = new ToastSelectionBox(id) {
                Title = hintText,
            };

            List<ToastSelectionBoxItem> items = new List<ToastSelectionBoxItem>(options.Length);
            foreach (string option in options) {
                if (ComboBoxItems.FindIndex(x => x.Id == option) == -1) {
                    ToastSelectionBoxItem item = new ToastSelectionBoxItem(option, option);
                    ComboBox.Items.Add(item);
                    items.Add(item);
                }
            }
            ComboBoxItems = items;
        }


        public XmlDocument BuildToastXml() {
            ToastContentBuilder builder = new ToastContentBuilder();
            builder.AddArgument("clientId", ClientId);
            builder.AddArgument("id", Id);

            builder.AddText(Title, AdaptiveTextStyle.Title);

            if (_imageUri != null) {
                if (File.Exists(_imageUri.LocalPath))
                    builder.AddInlineImage(_imageUri);
            }

            if (!string.IsNullOrWhiteSpace(Contents.Text))
                builder.AddText(Contents.Text, AdaptiveTextStyle.Caption);


            // Add actions
            if (Contents.Actions != null) {
                ProcessActions(Contents.Actions);
            }

            if (Buttons != null) {
                for (int i = 0; i < Buttons.Count && i <= 5; i++) {
                    builder.AddButton(Buttons[i]);
                }
            }
            if (TextBox != null) {
                builder.AddInputTextBox(TextBox.Id, TextBox.PlaceholderContent, TextBox.Title);
                // set current text
            }
            if (ComboBox != null && ComboBoxItems != null && ComboBoxItems.Count > 0) {
                string[] choices = ComboBoxItems.Select(x => x.Id).ToArray();
                ValueTuple<string, string>[] choicesTuple = new ValueTuple<string, string>[choices.Length];

                for (int i = 0; i < choices.Length; i++) {
                    choicesTuple[i] = new ValueTuple<string, string>(choices[i], choices[i]);
                }

                if (!string.IsNullOrEmpty(ComboBox.DefaultSelectionBoxItemId) || !string.IsNullOrEmpty(ComboBox.Title)) {
                    builder.AddComboBox(ComboBox.Id, ComboBox.Title, ComboBox.DefaultSelectionBoxItemId, choicesTuple);
                } else if (!string.IsNullOrEmpty(ComboBox.DefaultSelectionBoxItemId)) {
                    builder.AddComboBox(ComboBox.Id, ComboBox.DefaultSelectionBoxItemId, choicesTuple);
                } else {
                    builder.AddComboBox(ComboBox.Id, choicesTuple);
                }
            }

            // Progress bar?
            if (Type == NeptuneNotificationType.Progress) {
                AdaptiveProgressBar progressBar = Contents.ProgressBarData.BuildProgressBar();
                builder.AddProgressBar(progressBar.Title, Contents.ProgressBarData.GetPrecentage(), Contents.ProgressBarData.IsIndeterminate, progressBar.ValueStringOverride, progressBar.Status);
            }

            if (string.IsNullOrEmpty(ApplicationName))
                builder.AddAttributionText(ClientName);
            else
                builder.AddAttributionText(ClientName + ": " + ApplicationName);

            if (TimeStamp != DateTime.MinValue)
                builder.AddCustomTimeStamp(TimeStamp);


            switch (Type) {
                case NeptuneNotificationType.Call:
                    builder.SetToastScenario(ToastScenario.IncomingCall);
                    break;

                case NeptuneNotificationType.Timer:
                    //builder.SetToastScenario(ToastScenario.Alarm);
                    break;
            }


            return builder.GetXml();
        }

        public ToastNotification GetToastNotification() {
            XmlDocument xml = BuildToastXml();
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

            toast.Tag = !string.IsNullOrEmpty(Id) ? Id : ClientId;
            toast.Group = ClientId;
            toast.SuppressPopup = IsSilent;

            if (Priority != null) {
                switch (Priority.ToLower()) {
                    case "max":
                    case "high":
                        toast.Priority = ToastNotificationPriority.High;
                        break;

                    case "low":
                    case "min":
                        toast.Priority = ToastNotificationPriority.Default;
                        toast.SuppressPopup = true;
                        break;

                    case "default":
                    default:
                        toast.Priority = ToastNotificationPriority.Default;
                        break;
                }
            }

            if (_hasBeenDisplayed) {
                if (OnlyAlertOnce)
                    toast.SuppressPopup = true; // Already displayed, only do that once
            }

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
                        // You can't do this outside of WinUI/UWP!!!
                        ToastCollectionManager collectionManager = toastNotificationManager.GetToastCollectionManager(TaskBar.ApplicationId);
                        await collectionManager.SaveToastCollectionAsync(toastCollection);
                    }
                }
            } catch (Exception) { }
        }

        public async static void DeleteCollection(string name) {
            var collectionManager = ToastNotificationManager.GetDefault().GetToastCollectionManager();
            await collectionManager.RemoveToastCollectionAsync(name);
        }

        public async void Push() {
            try {
                ToastNotification toast = GetToastNotification();
                var notifier = Program.ToastNotifier;
                if (ClientName != null && ClientName != "") {
                    try {
                        var collection = await ToastNotificationManager.GetDefault().GetToastNotifierForToastCollectionIdAsync(ClientName);
                        if (collection != null) {
                            collection.Show(toast);
                        } else {
                            CreateCollection();
                            collection = await ToastNotificationManager.GetDefault().GetToastNotifierForToastCollectionIdAsync(ClientName);
                            if (collection != null) {
                                collection.Show(toast);
                            } else {
                                notifier.Show(toast);
                            }
                        }
                        _hasBeenDisplayed = true;
                    } catch (Exception) {
                        Program.ToastNotifier.Show(toast);
                    }
                } else
                    Program.ToastNotifier.Show(toast);
            } catch (Exception) { }
        }

        public NotificationUpdateResult Update() {
            try {
                return Program.ToastNotifier.Update(GetToastNotification().Data, Id);
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
    #endregion


    public enum NeptuneNotificationType {
        Standard = 1,
        Image = 2,
        Timer = 3,
        Progress = 4,
        Media = 5,
        Call = 6,
        Conversation = 7,
    };
}