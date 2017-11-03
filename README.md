# Reference Video Application



## Reference application for online video streaming.





	This application is implemented to be a reference video catalogue and player application 
	for DASH content on HbbTV 1.5 and 2.0.1 devices, with various DRM and subtitle tests. 

	The software is under continuous development.



### Usage:



A) Test latest version of the application at http://meridian.sofiadigital.fi/tvportal/referenceapp/

B) Download source code from git repository to your server and add your own content to configuration

C) Contribute



### Components and modules:


General main application to be used for all HbbTV 1.5 or 2.0.1 devices and browsers. 
Application tries to determine HbbTV version of the device and use the preferred player.

	src/catalogue/index.php

HTML5 version of the application for HbbTV 2.0.1 devices:

	src/catalogue/index_html5.php

HTML5 video player component:

	src/videoplayer/videoplayer_html5.js

	

OIPF AV object version of the application for HbbTV 1.5 devices:

	src/catalogue/index_oipf.php

OIPF AV object video player component:

	src/videoplayer/videoplayer_oipf.js

MSE-EME version of the application for target browser Edge:

	src/catalogue/index_mse-eme.php

MSE-EME video player component:

	src/videoplayer/videoplayer_mse-eme.js
	


Monitor module to implement analytics about use cases of video playback. Monitor can be changed but it must follow the monitor interface.

	Interface included:
	src/videoplayer/monitor/monitor-base.js
	
	Implementation (excluded but may be implemented for differeent analytics systems):
	src/videoplayer/monitor/monitor.js



Menu module. Main functionality to maintain menu structure of the catalogue app for video content, actions and submenus

	src/menu.js



Navigation. Common keymapping, event listeners and navigation functionality

	src/navigation.js

Debugscreen and debug-console saving feature. Pressing blue button applications console.log is printed on screen.
There is action option in settings menu to send log on server. Application will inform the log name on screen if succeed.
On reference installation, logfiles are saved to folder http://meridian.sofiadigital.fi/tvportal/referenceapp/src/catalogue/log/
naming log<<number>>.json, for example log0.json and so on

	src/debugscreen.js



### Catalogue menu structure:

Mainmenu, submenus, assets and actions are configured in config.json file. 

The file can be changed to any endpoint for data to make static menu dynamic.

Menu structure for the catalogue app should respect used json structure that 
is designed to represent a vod catalogue build by mainmenu and submenus. 
JSON Example here is commented using extra properties with __comment__ -prefix:



```json

{
	"__comment__menus": " menus is an array containing all the possible menus. menus[0] is always the main menu ",
	"menus": [
		{
			"__comment__center": " center attribute is the index of initially focused item in specified menu",
			"center": 0,
			"__comment__title": " title is the title of the menu, that can be displayed in UI",
			"title": "Main",
			"__comment__items": " items is an array to contain all asset/submenu entries / actions in specified menu",
			"items": [
				{
					"__comment__title": "As these items are mainmenu items (menus[0]), these titles are displayed in top bar",
					"title": "NoDRM",
					"__comment__app": "Specifies app type or video type. Obsolote for submenu entries",
					"app": 0,
					"__comment__submenu": "submenu index tell which gridview menu will open when this entry is selected",
					"submenu": 1,
					"__comment__profile" : [ "list of versions of the app this asset is available" ],
					"profile" : ["html5", "oipf", "mse-eme"]
				},
				{
					"title": "PlayReady",
					"app": 0,
					"submenu": 2
				}
			]
		},
		{
			"center": 0,
			"title": "DASH NoDRM",
			"__comment__items": "assets or actions in grid view menu",
			"items": [
				{
					"__comment__title": " Title of the video asset in video asset menu",
					"title": "Llama Drama AVC 1080p",
					"__comment__desc": "Description of the asset",
					"desc": "AVC 1080p clear dash video asset",
					"__comment__url": "URL of the video",
					"url": "videos/01_llama_drama_1080p_25f75g6s/manifest.mpd",
					"__comment__img": " Video asset poster in grid menu",
					"img": "videos/01_llama_drama_1080p_25f75g6s/image_320x180.jpg",
					"__comment__app": " app, link or video type. 6 = DASH video",
					"app": 6
				},
				{
					"title": "Gran Dillama AVC 1080p(ob,playready)",
					"url": "videos/02_gran_dillama_1080p_25f75g6s/drm/manifest_subob.mpd",
					"img": "videos/02_gran_dillama_1080p_25f75g6s/image_320x180.jpg",
					"__comment__la_url": "License Acquisition url",
					"la_url": "http://pr.service.expressplay.com/playready/RightsManager.asmx?ExpressPlayToken=AQAAABc2N30AAABgBn4lJkOh7rGbzg8FAGA__5dMOL2dJWxTSTq2STx0DnBWAmske8JU1azAR0-__zPnMWvyKTqVh3ZtHJCPiwT7mu3BCzm3X7U1utgGfcZ97n6CClFjsUdHVQ70IqMuDkRUvIDi2BpU8VEn64kE56r1Evy0wFM",
					"__comment__drm": "DRM system used for the video. Values: [empty], 'playready', 'marlin'",
					"drm": "playready",
					"app": 6,
					"__comment__adBreaks" : "A list of ad break positions. The list contains objects that shall have ad break (position) in seconds or named 'preroll' or 'postroll' and number of (ads) in specified break",
					"adBreaks" : [
						{ "position" : "preroll", "ads" : 1 },
						{ "position" : 10, "ads" : 3 },
						{ "position" : 30, "ads" : 1 },
						{ "position" : 60, "ads" : 3 },
						{ "position" : "postroll", "ads" : 1 }
					]
				}
			]					
		}
	]
}
```