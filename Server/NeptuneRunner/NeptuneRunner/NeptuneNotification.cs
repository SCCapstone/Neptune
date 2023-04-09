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
using Windows.Media.Core;
using System.Runtime.InteropServices;

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
        /// Used when updating progress bar data, do not touch.
        /// </summary>
        private uint _updateIncrementor = 1;
        /// <summary>
        /// Last time the <see cref="Update()"/> method was called. Enforces a 1 second rate limit.
        /// </summary>
        private DateTime _lastUpdateTime = DateTime.MinValue;

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
                id = string.IsNullOrEmpty(Id) ? id : Id + "_" + id;
                string sanitizedId = string.Join("_", id.Split(Path.GetInvalidFileNameChars()));
                string imagePath = Path.Combine(tempDirectory, $"{sanitizedId}.{fileType}");
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


        /// <summary>
        /// Saves the image of a person in a conversation and sets the <see cref="NeptuneNotificationConversationData.Icon"/> Uri to the saved image
        /// given the image data (<paramref name="dataString"/>) and conversation data (<paramref name="conversationData"/>).
        /// </summary>
        /// <param name="dataString">Encoded image data in the format of <c>data:image/*;base64, data...</c>.</param>
        /// <param name="conversationData"></param>
        public void SetConversationIcon(string dataString, NeptuneNotificationConversationData conversationData) {
            try {
                if (conversationData != null && !string.IsNullOrEmpty(conversationData.Name)) {
                    conversationData.Icon = SaveImageFromDataString(dataString, conversationData.Name);
                }
            } catch (Exception) { }
        }

        /// <summary>
        /// Saves the image of a message in a conversation and sets the <see cref="NeptuneNotificationConversationData.Icon"/> Uri to the saved image
        /// given the image data (<paramref name="dataString"/>) and conversation data (<paramref name="conversationData"/>).
        /// </summary>
        /// <param name="dataString">Encoded image data in the format of <c>data:image/*;base64, data...</c>.</param>
        /// <param name="conversationData"></param>
        public void SetConversationImage(string dataString, NeptuneNotificationConversationData conversationData) {
            try {
                if (conversationData != null && !string.IsNullOrEmpty(conversationData.Name)) {
                    conversationData.Icon = SaveImageFromDataString(dataString, conversationData.ImageGuid.ToString());
                }
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
            ToastButton button = new ToastButton(text, "action=" + text);
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

            /*if (!string.IsNullOrEmpty(ApplicationPackageName) && !string.IsNullOrEmpty(ApplicationName) && ApplicationName != ApplicationPackageName)
                builder.AddHeader(ApplicationPackageName, ApplicationName, ApplicationPackageName);*/
            builder.AddHeader(ClientId, ClientName, "");

            // Set the notification icon
            bool iconSet = false;
            bool addedImage = false; // Add only ONE image!

            if (!string.IsNullOrWhiteSpace(Title))
                builder.AddText(Title, hintMaxLines: 1);
            if (!string.IsNullOrWhiteSpace(Contents.Text)
                    && Contents.ConversationData == null
                    && (Type != NeptuneNotificationType.Progress || Contents.ProgressBarData.GetPrecentage() == 1))
                builder.AddText(Contents.Text, AdaptiveTextStyle.Caption);


            // Add message data to the toast
            if (Contents.ConversationData != null) {
                List<string> messages = new List<string>();
                bool setUserIcon = false; // Set the icon on the FIRST instance of an icon.

                foreach (var conversation in Contents.ConversationData) {
                    if (conversation == null || string.IsNullOrEmpty(conversation.Text))
                        continue; // No message to add ...

                    string message = conversation.Text;

                    if (conversation.Name != null) { // Add person's name?
                        if (conversation.Icon != null && conversation.Icon.IsFile && !setUserIcon) { // Profile picture set?
                            if (File.Exists(conversation.Icon.LocalPath)) { // Is actually saved to disk?
                                // Add profile picture (override icon)
                                builder.AddAppLogoOverride(conversation.Icon, ToastGenericAppLogoCrop.Circle, conversation.Name + "'s profile picture.");

                                setUserIcon = iconSet = true;
                            }
                        }

                        message = conversation.Name + ": " + message;

                        messages.Add(message);
                    }

                    if (conversation.Image != null && conversation.Image.IsFile && !addedImage) {
                        builder.AddInlineImage(conversation.Image);
                        addedImage = true;
                    }
                }

                int startIndex = 0;
                if (messages.Count > 3)
                    startIndex = messages.Count - 2;
                try {
                    for (int i = startIndex; i < messages.Count; i++) {
                        builder.AddText(messages[i]);
                    }
                } catch (Exception) { }
            }

            // Add actions
            if (Contents.Actions != null) {
                ProcessActions(Contents.Actions);
            }

            if (Buttons != null) {
                bool setReplyButton = false;
                for (int i = 0; i < Buttons.Count && i <= 5; i++) {
                    if (Buttons[i] != null) {
                        bool containsReplyWord = Regex.IsMatch(Buttons[i].Content, @"\b(reply|send|respond)\b", RegexOptions.IgnoreCase);
                        if (!setReplyButton && containsReplyWord && TextBox != null) {
                            Buttons[i].TextBoxId = TextBox.Id;
                            setReplyButton = true;
                        }
                        builder.AddButton(Buttons[i]);
                    }
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
            if (Type == NeptuneNotificationType.Progress && Contents.ProgressBarData.GetPrecentage() != 1) {
                AdaptiveProgressBar progressBar = Contents.ProgressBarData.BuildProgressBar();
                builder.AddVisualChild(progressBar);
            }

            if (!string.IsNullOrEmpty(ApplicationName)) {
                builder.AddAttributionText(ApplicationName + (!string.IsNullOrEmpty(Contents.Subtext)? ": " + Contents.Subtext : ""));
            }

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


            // Add the application icon
            if (!iconSet && IconUri != null && IconUri.IsFile) { // Profile picture set?
                if (File.Exists(IconUri.LocalPath)) { // Is actually saved to disk?
                                                      // Add profile picture (override icon)
                    builder.AddAppLogoOverride(IconUri, ToastGenericAppLogoCrop.Circle, "Icon for " + ApplicationName);
                }
            }

            // Add notification image
            if (_imageUri != null && !addedImage) {
                if (File.Exists(_imageUri.LocalPath))
                    builder.AddInlineImage(_imageUri);
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
                Program.Notification_Dismissed(sender, args);
                string aaaa = this.Id;
                //Dismissed.Invoke(sender, args);
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

            if (Type == NeptuneNotificationType.Progress) {
                // Set progress value
                toast.Data = new NotificationData();
                toast.Data.Values["progressValue"] = Contents.ProgressBarData.GetPrecentage().ToString();
            }

            toast.ExpiresOnReboot = true;
            return toast;
        }

        public bool Push() {
            try {
                if (Program.ToastNotifier == null) {
                    try {
                        Program.ToastNotifier = ToastNotificationManagerCompat.CreateToastNotifier(); //(TaskBar.ApplicationId);
                    } catch (Exception) {
                        // well
                        return false;
                    }
                }


                ToastNotification toast = null;
                try {
                    toast = GetToastNotification();


                    IReadOnlyList <ToastNotification> history = ToastNotificationManagerCompat.History.GetHistory();
                    // Check if the notification is already posted, is so update it
                    if (toast.Tag != null && history.Any(n => n.Tag == toast.Tag)) {
                        return Update() == NotificationUpdateResult.Succeeded;
                    }

                    Program.ToastNotifier.Show(toast);
                } catch (Exception e) {
                    if (e.Message.Contains("notification has already been posted")) {
                        if (Update() == NotificationUpdateResult.Succeeded) {
                            return true;
                        }

                        try {
                            // my LAST attempt I'm DYING
                            ToastNotificationManagerCompat.History.Clear(); // Clear notifications
                            Program.ToastNotifier.Show(toast);
                        } catch (Exception eee) {
                            // oh my why
                            string breakPointaaa = eee.Message;
                        }
                    } else {
                        // uh??
                        ToastNotificationManagerCompat.History.Remove(toast.Tag, toast.Group);
                        Program.ToastNotifier.Show(toast);
                    }
                    string breakPointa = e.Message;
                }
            } catch (Exception) {
                return false;
            }


            return true;
        }

        public NotificationUpdateResult Update() {
            try {
                if (Program.ToastNotifier == null) {
                    try {
                        Program.ToastNotifier = ToastNotificationManagerCompat.CreateToastNotifier(); //(TaskBar.ApplicationId);
                    } catch (Exception) {}
                }

                if (Type == NeptuneNotificationType.Progress) {
                    if (Contents.ProgressBarData.GetPrecentage() == 1) {
                        // Done!
                        ToastNotificationManagerCompat.History.Remove(Id, ClientId);
                        return NotificationUpdateResult.Succeeded;
                    } else {
                        var data = new NotificationData {
                            SequenceNumber = _updateIncrementor,
                        };
                        _updateIncrementor++;

                        data.Values["progressValue"] = Contents.ProgressBarData.GetPrecentage().ToString();
                        return Program.ToastNotifier.Update(data, Id, ClientId);
                    }
                } else {
                    return Program.ToastNotifier.Update(GetToastNotification().Data, Id, ClientId);
                }
            } catch (Exception) {
                return NotificationUpdateResult.Failed;
            }
        }

        /// <summary>
        /// Removes any images that were saved to be displayed on this notification.
        /// </summary>
        public void DeleteImages() {
            foreach (KeyValuePair<string, string> key in _imagePathsById) {
                try {
                    DeleteImageById(key.Key);
                } catch (Exception) { }
            }
        }

        public void Delete() {
            try {
                ToastNotificationManagerCompat.History.Remove(Id, ClientId);

                DeleteImages();
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