# Brief
Neptune Server utilizes "Neptune Runner," which sets up and hooks into Windows' Toast API.\
To do this, Neptune Runner creates a startmenu shortcut on run and calls `ToastNotificationManagerCompat.CreateToastNotifier`, which, presumably (it's not documented what it actually does),creates a registery key (`\HKCU\SOFTWARE\Classes\CLSID\<Application GUID>\`) and registers a new COM Object.\
This is a requirement for receiving activation data from toast notifications on Windows. Without this, after a notification times out into the action center (or otherwise is in the action center) the application (us) is not activated and does not receive any updates for that toast.\
(We'll only get updates for notifications in the action center IF we register a startmenu shortcut and create the registery key).

Learn more about toast notifications on Windows here: https://learn.microsoft.com/en-us/windows/apps/design/shell/tiles-and-notifications/toast-notifications-overview \
Toast content: https://learn.microsoft.com/en-us/windows/apps/design/shell/tiles-and-notifications/adaptive-interactive-toasts?tabs=xml \
COM activation (relating to toast notifications): https://learn.microsoft.com/en-us/windows/apps/design/shell/tiles-and-notifications/send-local-toast-other-apps


# Notifications disabled

Toast notifications on Windows can be disabled via (at least) 4 different ways: by group policy (all notifications on this computer), for the user (all applications), for a specific application, or by the application manifest.\
Neptune Runner will never have toast notifications disabled by manifest, but we cannot control the other 3 reasons.\
For the first reason, group policy, there is little the user can do to change this. Group policy settings are pushed out by the system administrator and can only be changed by the system administrator. If that _is_ the user, they should be able to figure it out.\
Notifications can also be enabled/disabled by the user either by blocking all notifications or notifications from specific applications.\
See https://learn.microsoft.com/en-us/uwp/api/windows.ui.notifications.notificationsetting for more info.


## Unblocking Notifications
### DisabledForApplication
If Neptune Runner sees that notifications are allowed for the user but blocked for Neptune, the DisabledForApplication code is thrown. The error message reads as:\
`Neptune is not able to push notifications to your system, as notifications are **disabled for this application**. Enable notifications for Neptune inside the Settings app -> System -> Notifications & actions -> Get notifications from these senders -> Enable "Neptune."`

<img src="https://user-images.githubusercontent.com/55852895/225190296-77842b09-d284-43f5-8bd2-fbaaca973b5d.png" height="150"/>

To resolve this:
1. Open the settings app
2. Click "System" (on Windows 11, this is selected by default) <img src="https://user-images.githubusercontent.com/55852895/225190747-352b6fde-11b9-41a8-b34b-ea07fd5b8263.png" height="300"/>
3. Click "Notifications & actions" (or "Notifications" on Windows 11)
4. Scroll down to "Get notifications from these senders," find and enable Neptune <img src="https://user-images.githubusercontent.com/55852895/225191005-1dbc849d-b0be-466e-b41a-4b9377c54132.png" height="550"/>

---

### DisabledForUser
If notifications are blocked for your user account, the DisabledForUser code is thrown. The error message reads as:\
`Neptune is not able to push notifications to your system, as notifications are **disabled for your Windows account**. Enable them inside the Settings app -> System -> Notifications & actions -> Enable "Get notifications from apps and other senders."`

<img src="https://user-images.githubusercontent.com/55852895/225191526-b8d02257-d1cc-446b-b7c6-d3e32e1f994d.png" height="150"/>

To resolve this:
1. Open the settings app
2. Click "System" (on Windows 11, this is selected by default) <img src="https://user-images.githubusercontent.com/55852895/225190747-352b6fde-11b9-41a8-b34b-ea07fd5b8263.png" height="300"/>
3. Click "Notifications & actions" (or "Notifications" on Windows 11)
4. Enable "Get notifications from apps and other senders" <img src="https://user-images.githubusercontent.com/55852895/225191658-ae109a71-92e9-47eb-8981-b83bca7a273a.png" height="550"/>
5. Then scroll under "Get notifications from these senders" and make sure Neptune is set to "On: Banners, Sound" or "On: Banners"
