# Reference Video Application

## Reference application for online video streaming.


	This application is implemented to be a reference video catalogue and player application for DASH content on HbbTV 1.5 and 2.0.1 devices, with various DRM and subtitle tests. 
	The software is under continious development.

### Usage:

A) Test latest version of the application at http://meridian.sofiadigital.fi/tvportal/referenceapp/
B) Download source codde from git repository to your server and add your own content to configuration
C) Contribute

### Components and modules:

HTML5 version of the application for HbbTV 2.0.1 devices:
	src/catalogue/index_html5.php
HTML5 video player component:
	src/videoplayer/videoplayer_html5.js
	
OIPF AV object version of the application for HbbTV 1.5 devices:
	src/catalogue/index_oipf.php
OIPF AV object video player component:
	src/videoplayer/videoplayer_oipf.js
	
General main application to be used for all HbbTV devices. Application try to determine HbbTV version of the device and use preferred player.
	src/catalogue/index.php

Monitor module to implement analytics about use cases of video playback. Monitor can be changed but it must follow the monitor interface.
	src/videoplayer/monitor/monitor.js

Menu module. Main functionality to maintain menustructure of the catalogue app for video content, actions and submenus
	src/menu.js

Navigation. Common keymapping, event listeners and navigation functionality
	src/navigation.js
	
	

### Catalogue menu structure:
Mainmenu, submenus, assets and actions are configured in config.json file. 
The file can be changed to any endpoint for data to make static menu dynamic.
Menu structure for the catalogue app should respect used json structure defined as:

```json
{
    "menus": [ /* menus is an array containing all the possible menus. menu[0] is always the main menu */
        {
            "center": 0, /* center attribute is the index of initially focused item in specified menu */
            "title": "Main", /* title is the title of the menu, that can be displayed in UI */
            "items": [ /* items is an array to contain all asset/submenu entries / actions in specified menu */
                {
                    "title": "NoDRM", /* As these items are mainmenu items (menu[0]), these titles are displayed in top bar */
                    "app": 0, /* Specifies app type or video type. Obsolote for submenu entries */
                    "submenu": 1 /* submenu index tell which gridview menu will open when this entry is selected */
                },
                {
                    "title": "PlayReady",
                    "app": 0,
                    "submenu": 2
                },
              ...
            ]
        },
        {
            "center": 0,
            "title": "DASH NoDRM",
            "items": [ /* assets or actions in grid view menu */
                {
                    "title": "Llama Drama AVC 1080p", /* Title of the video asset in video asset menu */
                    "url": "videos/01_llama_drama_1080p_25f75g6s/manifest.mpd", /* url of the video */
                    "img": "videos/01_llama_drama_1080p_25f75g6s/image_320x180.jpg", /* Video asset poster in grid menu */
                    "app": 6 /* app, link or video type. 6 = DASH video */
                },
				{
                    "title": "Gran Dillama AVC 1080p(ob,playready)",
                    "url": "videos/02_gran_dillama_1080p_25f75g6s/drm/manifest_subob.mpd",
                    "img": "videos/02_gran_dillama_1080p_25f75g6s/image_320x180.jpg",
                    "la_url": "http://pr.service.expressplay.com/playready/RightsManager.asmx?ExpressPlayToken=AQAAABc2N30AAABgBn4lJkOh7rGbzg8FAGA__5dMOL2dJWxTSTq2STx0DnBWAmske8JU1azAR0-__zPnMWvyKTqVh3ZtHJCPiwT7mu3BCzm3X7U1utgGfcZ97n6CClFjsUdHVQ70IqMuDkRUvIDi2BpU8VEn64kE56r1Evy0wFM",
                    /* License Acquisition url */
					"drm": "playready", /* DRM system used for the video. Values: [empty], "playready", "marlin" */
                    "app": 6					
                },
				...
			]
		},
		...
	]
}
```