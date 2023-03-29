using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace NeptuneRunner {
    public class NeptuneNotificationAction {
        public string Id;
        public NeptuneNotificationActionType Type;

        // Button data

        /// <summary>
        /// If <see cref="Type"/> is <see cref="NeptuneNotificationActionType.Button"/>, this is the button's text.
        /// </summary>
        public string Contents;

        // TextBox data
        /// <summary>
        /// If <see cref="Type"/> is <see cref="NeptuneNotificationActionType.Textbox"/>, this indicates whether we will allow auto generated responses.
        /// </summary>
        public bool AllowGeneratedReplies;

        // ComboBox
        public string[] Choices;

        // ComboBox and textbox
        /// <summary>
        /// If <see cref="Type"/> is <see cref="NeptuneNotificationActionType.TextBox"/> or <see cref="NeptuneNotificationActionType.Combobox"/>, this is the input's hint text.
        /// </summary>
        public string HintText;
    }

    public enum NeptuneNotificationActionType {
        Button = 0,
        TextBox = 1,
        ComboBox = 2,
    }
}
