# Reference Video Application

## Reference application for online video streaming.
This application is implemented to be a reference video catalogue and player application 
for DASH content on HbbTV 1.5 and 2.0.1 devices, with various DRM and subtitle tests. 

Application prowides test cases and test material done with tools included in [tools]
- DASH Clear content ACV / HEVC
- DRM (Playready, Marlin, Clearkey)
- Out-of-Band Subtitles
- Inband subtitles
- Inband CueData



The software is under continuous development and lisenced with MIT Lisence.
Issues can be reported here in github or you may send email to hbbtv_refapp@sofiadigital.com
for any problems or questions

### Usage, testing, installation, integration:

>A) Test latest version of the application at http://meridian.sofiadigital.fi/tvportal/referenceapp/
>B) Follow [installation] guide to get source and set up local version
>C) Read API documentation: http://meridian.sofiadigital.fi/tvportal/referenceapp/doc/
>D) Follow [integration] guide to integrate videoplayer and/or components to different application


### Components and modules:

See components and modules listing at [integration] guide


### Catalogue menu structure:

Mainmenu, submenus, assets and actions are configured in __[config.json]__ file. 

The file can be changed to any endpoint for data to make static menu dynamic.

Menu structure for the catalogue app should respect used json structure that 
is designed to represent a vod catalogue build by mainmenu and submenus. 
JSON Example here is commented using extra properties with __comment__ -prefix:

#### Overall menu structure

JSON Attribute | Definition
------------ | -------------
menus | Array containing all the possible menus. menus[0] is always the main menu
menus[0] | First menu is always the main menu. It defines all accessible submenus
menus[i].center | Default focused item index in specific menu
menus[i].title | Title of the menu. (In mainmenu this is displayed as menu title)
menus[i].items | Array containing submenu entries, assets and actions
menus[i].items[j].title | Title of submenu entry, asset, or action
menus[i].items[j].app | item type. 6=DASH content, other values are obsolote/deprecated
menus[i].items[j].submenu | submenu entry (index of subemnu. if submenu is 1 this entry opens menu menus[1] )

```json
{
    "menus": [
        {
            "center": 1, 
            "title": "Main",
            "items": [
                {
                    "title": "NoDRM",
                    "app": 0,
                    "submenu": 1
                },
```

#### Video asset common attributes and DRM

JSON Attribute | Definition
------------ | -------------
menus[i].items[j].url | Url of playable DASH content
menus[i].items[j].img | Poster image of asset/action item
menus[i].items[j].la_url | License acquisition URL (for DRM content only)
menus[i].items[j].drm | DRM system (playready/marlin/clearkey). (not defined for Clear content)
menus[i].items[j].app | 6= always for DASH content
menus[i].items[j].desc | Description of the asset or action displayed when menu item is focused
menus[i].items[j].profile | Array of profiles in which specific item is supported. Possible values are "html5", "mse-eme" and "oipf". If this is not set, all profiles are supported

at menus[i].items:
```json
{
"center": 0,
"title": "DASH PlayReady",
"items": [
    {
        "title": "Linear advert insertion",
        "url": "videos/02_gran_dillama_1080p_25f75g6sv2/drm/manifest.mpd",
        "img": "videos/02_gran_dillama_1080p_25f75g6s/image_320x180.jpg",
        "la_url": "https://test.playready.microsoft.com/service/rightsmanager.asmx?cfg=(kid:header,sl:2000,persist:false,firstexp:60,contentkey:EjQSNBI0EjQSNBI0EjQSNg==)",
        "drm": "playready",
        "app": 6,
		"desc": "Ads delivered from any ad-server on ad-event time",
		"profile" : ["html5", "mse-eme"]					
    }
]
}
```
#### Ad Breaks definition

JSON Attribute | Definition
------------ | -------------
menus[i].items[j].adBreaks | If set, tells ad insertion positions. For each ad break mandatory attributes are __position__ and __ads__
menus[i].items[j].adBreaks[k].position | Ad break position in seconds for midroll ad insertion. Special values are __preroll__ and __postroll__ to define adbreak before the content and after the content
menus[i].items[j].adBreaks[k].ads | Number of ads shown on specific ad break

at menus[i].items:
```json
{
"center": 0,
"title": "DASH PlayReady",
"items": [
    {
        "title": "Linear advert insertion",
        "url": "videos/02_gran_dillama_1080p_25f75g6sv2/drm/manifest.mpd",
        "img": "videos/02_gran_dillama_1080p_25f75g6s/image_320x180.jpg",
        "app": 6,
		"desc": "Ads delivered from any ad-server on ad-event time",
		"adBreaks" : [
			{ "position" : "preroll", "ads" : 1 },
			{ "position" : 20, "ads" : 3 },
			{ "position" : 40, "ads" : 1 },
			{ "position" : 60, "ads" : 3 },
			{ "position" : "postroll", "ads" : 1 }
		],
		"profile" : ["html5", "mse-eme"]					
    }
]
}
```


#### Out-of-Band subtitle files
JSON Attribute | Definition
------------ | -------------
menus[i].items[j].subtitles | Array containing Out-of-Band subtitles
menus[i].items[j].subtitles[k].code | Subtitle language code ISO 639‑2
menus[i].items[j].subtitles[k].src | Source url for subtitling file. getAds.php may be used to prevent possible CORS issues when fetching XML -files from cross domain location

```json
{
    "title": "Out of band subtitles",
    "url": "videos/02_gran_dillama_1080p_25f75g6sv2/drm/manifest.mpd",
    "img": "videos/02_gran_dillama_1080p_25f75g6s/image_320x180.jpg",
    "app": 6,
	"desc": "TTML subtitles",
	"subtitles" : [{
        "code" : "eng",
        "src" : "../getSubs.php?file=https://meridian.sofiadigital.fi/tvportal/referenceapp/videos/02_gran_dillama_1080p_25f75g6sv2/sub_eng.xml"
    },
    {
        "code" : "fin",
        "src" : "videos/02_gran_dillama_1080p_25f75g6sv2/sub_fin.xml"
    }],
	"profile" : ["html5", "mse-eme"]					
}

```

[//]: # (references)

[tools]: <https://github.com/HbbTV-Association/ReferenceApplication/tree/master/tools>
[integration]: <https://github.com/HbbTV-Association/ReferenceApplication/blob/master/doc/integration.md>
[installation]: <https://github.com/HbbTV-Association/ReferenceApplication/blob/master/doc/installation_testing.md>
[config.json]: <https://github.com/HbbTV-Association/ReferenceApplication/blob/master/src/catalogue/config.json>
