# Reference DASH-DRM Video Application - Integration


### Components and modules:

General catalogue application to be used for all HbbTV 1.5 or 2.0.1 devices and browsers. 
Application tries to determine HbbTV version of the device and use the preferred player.

	src/catalogue/index.php

VideoPlayerBasic base class that shall be inherited for different videoplayer classes below:

	src/videoplayer/videoplayer_basic.js

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
	
Resource file management. PHP file to be included in application index file. File will list all the needed js/css resources for the specified application profile HbbTV 1.5, HbbTv 2.0.1, MSE-EME.
For development purposes this generator will set last modified timestamp as an version parameter for all resource files. This ensures a client device should always use a modified file instead cached.
	
	src/catalogue/resources.php

Monitor module to implement analytics about use cases of video playback. Monitor can be changed but it must follow the monitor interface.

	Interface included:
	src/videoplayer/monitor/monitor-base.js
	
	Implementation (excluded but may be implemented for differeent analytics systems):
	src/videoplayer/monitor/monitor.js



Menu module. Main functionality to maintain menu structure of the catalogue app for video content, actions and submenus.
Menu structure for catalogue is configured in configuration file. For real-world application configuration file may be replaced with backend api to produce similar json.

	src/catalogue/menu.js
	src/catalogue/config.json


Navigation. Common keymapping, event listeners and navigation functionality

	src/navigation.js

Debugscreen and debug-console saving feature. Pressing blue button applications console.log is printed on screen.
There is action option in settings menu to send log on server. Application will inform the log name on screen if succeed.

 * On reference installation, logfiles are saved to folder     http://meridian.sofiadigital.fi/tvportal/referenceapp/src/catalogue/log/
 * In local installation make sure php has write permission to folder *src/catalogue/log/*

naming **log<number>.json**, for example log7.json and so on

	src/debugscreen.js


### Integration

##### Use real-world backend with catalogue app, code changes to integrate

* In **src/catalogue/application.js**, replace **src/config.json** with dynamic backend that produces similar menu structure. 
Existing video library backend may be integrated implementing *getter proxy* between client and actual backend, 
which shall format the data to be compliant with the cataloque structure
* use **src/getAds.php?breaks=<breaks amount>** to use test ad videos, or replace real-world ad-insertion backend to Videoplayer class `getAds()` -method
* use **src/getSubs.php=file<sub.xml-url>** to fetch cross domain subtitling files 

##### Using videoplayer component in different application

Dependencies: Include to the application
 * **src/videoplayer/videoplayer_basic.js** *(Mandatory always)*
 * **src/videoplayer/videoplayer_oipf.js** *(If needed for HbbTV 1.5)*
 * **src/videoplayer/videoplayer_html5.js** *(If needed for HbbTV 2.0.1)*
 * **src/videoplayer/videoplayer_mse-eme.js** *(If needed for EME application)*
     * **src/videoplayer/dash.all.js** *(If mse-eme is used, include also dash-js library)*
 * **src/videoplayer/monitor/monitor-base.js** *(Mandatory to be included. may be extended)*
 * **src/videoplayer/vplayer.css** *(Common styles for all player versions)*

Hint: **src/resources.php** may be used to include selected resources in different application


##### Video player API

API documentation here: http://meridian.sofiadigital.fi/tvportal/referenceapp/doc/




