# RefApp
RefApp is an application that allows test engineers to test online video streaming on HbbTV platforms. RefApp is being continuously maintained and developed, therefore there might be differing results on some platforms between different RefApp versions.
## Walkthrough
### General information
RefApp will open on the *NoDRM* category on startup.

![Start](1_Start.png?raw=true)

While navigating within the app, information about each video should be displayed on the bottom of the screen.

![Navigation](navigation_info.gif?raw=true)
<!--- ![Video info](2_VideoInfo.png?raw=true) --->

Immediately after opening a video stream, the player (progress bar with controls) should be visible for a few seconds. Throughout the video, there should be a top bar visible with relevant information about the currently streamed video.

![Playing](open_test.gif)
<!--- ![Video play](3_VideoPlay.png?raw=true) --->

### Subtitled streams
RefApp offers a wide range of streams to test hardware capabilities, including support for out-of-band- and in-band subtitles.

![Subtitle info](4.0_SubtitlesInfo.png?raw=true)

Switching between subtitle languages is supported and can be performed via pressing the *yellow* button.

![Subtitles](subtitles.gif)
<!--- ![Subtitles while playing](4_SubtitlesPlay.png?raw=true) --->

For example, after switching the language from English to Finnish, special characters and how they are displayed should be performed every 10 seconds.

![Finnish subtitles](5_SubtitlesFin.png?raw=true)

### Ad-insertion
 [TODO]
 ### In-band events
 [TODO]
 ### Engineer view

RefApp offers an engineer view with console output that can be utilized in real-time. The view can be accessed via pressing the *blue* button while the app is open.

![Engineer View](6_EngineerView.png?raw=true)

The engineer view helps debugging and offers relevant information about key presses and the current state of the stream.

### Live

RefApp also supports live-stream testing with a variety of live-streams. Note that currently there are *NoDRM-*, *PlayReady-*, and *Marlin* streams available.

![Live category](7.0_LiveCategory.png?raw=true)

While a live-stream is playing, there should be the *LIVE* indicator on the right of the progression bar.

![Live playing](7_LivePlay.png?raw=true)

### Settings

RefApp allows configuration to some extent. Currently the HbbTV mode can be set to either 1.5 or 2.0.1. RefApp also offers tools to delete cookies as well as save console logs.

![Live](8_Live.png?raw=true)

