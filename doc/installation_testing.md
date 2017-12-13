# Reference DASH-DRM Video Application

## Installation

#### Server requirements for installation: 
 * www-server
 * PHP 5 or above
 * Git


#### Cloning repository
Run git clone to accessible location in your test server:
```
git clone https://github.com/HbbTV-Association/ReferenceApplication.git
```
After that, you can test application at src/catalogue/index.php
### Content editing

##### Generation of own content

For content creation read about [tools] used for creating assets available in reference installation

##### Setting files to application configurarion

Config.json file has menustructure, which includes mainmenu and submenus that produces grid-boxes to the UI.
In each grid-box menu you can add assets or actions in array "items". 

Example format for ad insertion: Attribute adBreaks shall contain a list of objects, representing individual adBreak. Each adBreak representation shall have *position* in second or special word "preroll" or "postroll" to be set the break in the beginning or in the end of content video. Each adBreak also shall have attribute *ads* to tell how many ads are inserted to specific break
```
{
	"title": "Linear advert insertion",
	"url": "videos/manifest.mpd",
	"img": "icons/icons_1x1_insert-ad.png",
	"app": 6,
	"desc": "Ads delivered from any ad-server on ad-event time",
	"adBreaks" : [
		{ "position" : "preroll", "ads" : 1 },
		{ "position" : 10, "ads" : 3 },
		{ "position" : 30, "ads" : 1 },
		{ "position" : 60, "ads" : 3 },
		{ "position" : "postroll", "ads" : 1 }
	],
	"profile" : ["html5", "mse-eme"]					
}
```

*Example format for DRM test. "drm" value may be playready/marlin/clearkey*
```
{
	"title": "Tears of Steel AVC 1080p",
	"url": "videos/drm/manifest.mpd",
	"img": "videos/image_320x180.jpg",
	"la_url": "https://test.playready.microsoft.com/service/rightsmanager.asmx?cfg=(kid:header,sl:2000,persist:false,firstexp:60,contentkey:EjQSNBI0EjQSNBI0EjQSNw==)",
	"drm": "playready",
	"app": 6,
	"desc": "License URL override method"
}
```

Example action item: Clear javascript commands can be set to be evaluated with attribute *eval*
```
{
    "title": "Check Internet Connection",
    "eval": "showInfo( (navigator.onLine )); ",
    "app": 0,
    "img": "icons/icons_1x1_checkinternet.png"
}
```

Example Out of band subtitles. Mandatory fields for *subtitle* array objects are *code* (language code for file) and *src* (file location). getSubs.php -subtitle proxy is preferred to use if the subtitle file is retreived from different origin server due to CORS issues with video player. 
```
{
    "title": "Out of band subtitles",
    "url": "manifest.mpd",
    "img": "icons/icons_1x1_out-of-band-subtitle.png",
    "app": 6,
	"desc": "TTML subtitles",
	"subtitles" : [{
        "code" : "eng",
        "src" : "../getSubs.php?file=https://different.host/sub_eng.xml"
    },
    {
        "code" : "fin",
        "src" : "sub_fin.xml"
    }],
	"profile" : ["html5", "mse-eme"]					
}
```

### Setting up to a Channel

Create service to your playout system, and application for HbbTV 1.5 and above. Set your local installation url to AIT autostart application, or link its URL to existing application to make it accessible

### Running tests

Start application and run tests added to configuration. With blue button you can see application console output. After testing session you can save all console logs to your installation servers cataloque/log/ folder by selecting 'Save Application log' in settings view.

[//]: # (references)

[tools]: <https://github.com/HbbTV-Association/ReferenceApplication/tree/master/tools>
