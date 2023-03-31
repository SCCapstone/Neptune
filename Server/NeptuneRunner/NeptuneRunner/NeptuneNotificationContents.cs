using Microsoft.Toolkit.Uwp.Notifications;
using System;
using System.Collections.Generic;
using System.Runtime.Remoting.Contexts;
using Windows.Data.Json;

namespace NeptuneRunner {
    public class NeptuneNotificationContents {
        private readonly NeptuneNotification _parent;

        /// <summary>
        /// Body of the notification
        /// </summary>
        public string Text;

        /// <summary>
        /// Subtext (attribution)
        /// </summary>
        public string Subtext;

        /// <summary>
        /// Buttons or textboxes, things the user can interact with
        /// </summary>
        public NeptuneNotificationAction[] Actions;

        public NeptuneNotificationConversationData[] ConversationData;

        /// <summary>
        /// Data related to timer
        /// </summary>
        public NeptuneNotificationTimerData TimerData = new NeptuneNotificationTimerData();

        /// <summary>
        /// ProgressBarData data
        /// </summary>
        public NeptuneNotificationProgressData ProgressBarData = new NeptuneNotificationProgressData();

        public NeptuneNotificationContents(NeptuneNotification parent) {
            _parent = parent ?? throw new ArgumentNullException(nameof(parent));
        }

        public void LoadFromJsonObject(JsonObject data) {
            try {
                if (data.ContainsKey("text")) {
                    Text = data["text"].GetString();
                }

                if (data.ContainsKey("subtext")) {
                    Subtext = data["subtext"].GetString();
                }

                if (data.ContainsKey("image")) {
                    _parent.SetImageUri(data["image"].GetString());
                }



                // Conversation data
                if (data.ContainsKey("conversationData") && data["conversationData"].ValueType == JsonValueType.Array) {
                    var conversationDataList = new List<NeptuneNotificationConversationData>();

                    JsonArray conversationDataArray = data["conversationData"].GetArray();

                    foreach (var conversationDataJsonValue in conversationDataArray) {
                        if (conversationDataJsonValue.ValueType != JsonValueType.Object) {
                            continue;
                        }

                        var conversationData = new NeptuneNotificationConversationData();

                        JsonObject conversationDataJsonObject = conversationDataJsonValue.GetObject();

                        // Set name and message fields
                        if (conversationDataJsonObject.ContainsKey("name") && conversationDataJsonObject["name"].ValueType == JsonValueType.String)
                            conversationData.Name = conversationDataJsonObject["name"].GetString();

                        if (conversationDataJsonObject.ContainsKey("text") && conversationDataJsonObject["text"].ValueType == JsonValueType.String)
                            conversationData.Text = conversationDataJsonObject["text"].GetString();

                        // Set icon field
                        if (conversationDataJsonObject.ContainsKey("icon") && conversationDataJsonObject["icon"].ValueType == JsonValueType.String) {
                            string iconData = conversationDataJsonObject["icon"].GetString();
                            _parent.SetConversationIcon(iconData, conversationData);
                        }

                        // Set image field
                        if (conversationDataJsonObject.ContainsKey("image") && conversationDataJsonObject["image"].ValueType == JsonValueType.String) {
                            string imageData = conversationDataJsonObject["image"].GetString();
                            _parent.SetConversationImage(imageData, conversationData);
                        }

                        conversationDataList.Add(conversationData);
                    }

                    ConversationData = conversationDataList.ToArray();
                }


                // Actions
                if (data.ContainsKey("actions") && data["actions"].ValueType == JsonValueType.Array) {
                    var actions = new List<NeptuneNotificationAction>();

                    JsonArray actionsArray = data["actions"].GetArray();

                    foreach (var actionJsonValue in actionsArray) {
                        if (actionJsonValue.ValueType != JsonValueType.Object) {
                            continue;
                        }

                        JsonObject actionJsonObject = actionJsonValue.GetObject();
                        // Does it have the id and type? If it's a button, does it have the button's text?
                        if (!actionJsonObject.ContainsKey("id") || !actionJsonObject.ContainsKey("type")
                            // If it's a button, does it contain the button's text?
                            || (actionJsonObject["type"].GetString() == "button" && !actionJsonObject.ContainsKey("contents"))
                            // If it's a combobox, does it contain choices?
                            || (actionJsonObject["type"].GetString() == "combobox" && !(actionJsonObject.ContainsKey("choices") && actionJsonObject["choices"].ValueType == JsonValueType.Array))
                        ) {
                            continue;
                        }

                        var action = new NeptuneNotificationAction {
                            Id = actionJsonObject["id"].GetString(),
                            Type = (NeptuneNotificationActionType)Enum.Parse(typeof(NeptuneNotificationActionType), actionJsonObject["type"].GetString(), true),
                        };

                        if (action.Type == NeptuneNotificationActionType.Button) {
                            action.Contents = actionJsonObject["contents"].GetString();
                        }

                        // TextBox
                        if (action.Type == NeptuneNotificationActionType.TextBox) {
                            if (actionJsonObject.ContainsKey("hintText") && actionJsonObject["hintText"].ValueType == JsonValueType.String)
                                action.HintText = actionJsonObject["hintText"].GetString();
    
                            if (actionJsonObject.ContainsKey("allowGeneratedReplies") && actionJsonObject["allowGeneratedReplies"].ValueType == JsonValueType.Boolean) {
                                action.AllowGeneratedReplies = actionJsonObject["allowGeneratedReplies"].GetBoolean();
                            }
                        }

                        // ComboBox
                        if (action.Type == NeptuneNotificationActionType.ComboBox && actionJsonObject.ContainsKey("choices") && actionJsonObject["choices"].ValueType == JsonValueType.Array) {
                            List<string> choices = new List<string>();

                            foreach (var choiceJsonValue in actionJsonObject["choices"].GetArray()) {
                                if (choiceJsonValue.ValueType == JsonValueType.String)
                                    choices.Add(choiceJsonValue.GetString());
                            }

                            action.Choices = choices.ToArray();
                        }

                        actions.Add(action);
                    }

                    Actions = actions.ToArray();
                }

                if (data.ContainsKey("timerData") && data["timerData"].ValueType == JsonValueType.Object) {
                    var timerDataJsonObject = data["timerData"].GetObject();
                    if (timerDataJsonObject.ContainsKey("countingDown")) {
                        TimerData.CountingDown = timerDataJsonObject["countingDown"].GetBoolean();
                    }
                }

                if (data.ContainsKey("progress") && data["progress"].ValueType == JsonValueType.Object) {
                    var progressJsonObject = data["progress"].GetObject();
                    if (progressJsonObject.ContainsKey("value")) {
                        ProgressBarData.Value = (int)progressJsonObject["value"].GetNumber();
                    }

                    if (progressJsonObject.ContainsKey("max")) {
                        ProgressBarData.Max = (int)progressJsonObject["max"].GetNumber();
                    }

                    if (progressJsonObject.ContainsKey("isIndeterminate")) {
                        ProgressBarData.IsIndeterminate = progressJsonObject["isIndeterminate"].GetBoolean();
                    }

                    if (ProgressBarData.Max == 0 && ProgressBarData.Value == 0) {
                        //_parent.Type = NeptuneNotificationType.Standard;
                    } else {
                        ProgressBarData.Status = Text;
                        _parent.Type = NeptuneNotificationType.Progress;
                    }
                }
            } catch (Exception e) {
                Console.WriteLine(e);
            }
        }
    }

    /// <summary>
    /// Represents a message in a conversation.
    /// </summary>
    public class NeptuneNotificationConversationData {
        public Guid ImageGuid = Guid.NewGuid();

        /// <summary>
        /// Gets or sets the name of the message sender.
        /// </summary>
        public string Name;

        /// <summary>
        /// Gets or sets the icon of the message sender in base64-encoded JPEG format.
        /// </summary>
        public Uri Icon;

        /// <summary>
        /// Gets or sets the contents of the message.
        /// </summary>
        public string Text;

        /// <summary>
        /// Gets or sets the image attached to the message in base64-encoded format.
        /// </summary>
        public Uri Image;
    }

    public class NeptuneNotificationTimerData {
        /// <summary>
        /// Whether the chronometer is counting down (true) or up (false)
        /// </summary>
        public bool CountingDown;

        public NeptuneNotificationTimerData() { }
    }

    public class NeptuneNotificationProgressData {
        /// <summary>
        /// Current position
        /// </summary>
        public int Value;

        /// <summary>
        /// Maximum value
        /// </summary>
        public int Max;

        /// <summary>
        /// Indeterminate state of the progress bar
        /// </summary>
        public bool IsIndeterminate;


        public string Status;
        public string Title;
        public string ValueString;

        public NeptuneNotificationProgressData() { }


        /// <summary>
        /// Calculates the percentage of the given value relative to the maximum value.
        /// </summary>
        /// <returns>The percentage of the given value relative to the maximum value.</returns>
        public double GetPrecentage() {
            if (Value == Max) return 1;
            return (double)Math.Min(Max, Value) / Math.Max(Max, Value);
        }

        /// <summary>
        /// Builds an AdaptiveProgressBar from the given parameters.
        /// </summary>
        /// <param name="status">The status of the progress bar.</param>
        /// <param name="title">The title of the progress bar.</param>
        /// <param name="valueString">The value string of the progress bar.</param>
        /// <returns>An AdaptiveProgressBar object.</returns>
        public AdaptiveProgressBar BuildProgressBar(string status = "", string title = null, string valueString = null) {
            double progress = GetPrecentage();
            BindableProgressBarValue progressBarValue = new BindableProgressBarValue("progressValue");
            //progressBarValue.IsIndeterminate = IsIndeterminate;

            AdaptiveProgressBar progressBar = new AdaptiveProgressBar() {
                Value = progressBarValue,
                Status = !string.IsNullOrEmpty(Status) ? Status : status,
            };

            if (!string.IsNullOrEmpty(title))
                progressBar.Title = title;
            else if (!string.IsNullOrEmpty(Title))
                progressBar.Title = Title;

            if (!string.IsNullOrEmpty(valueString))
                progressBar.ValueStringOverride = valueString;
            else if (!string.IsNullOrEmpty(ValueString))
                progressBar.ValueStringOverride = ValueString;


            return progressBar;
        }
    }
}
