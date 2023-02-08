# Reference Video Application

## Reference application for online video streaming.
This application is implemented to be a reference video catalogue and player application 
for DASH content on HbbTV 1.5 and 2.0.x (and MSE-EME) devices, with various DRM, audio, subtitle and multiperiod tests. 

Application provides test cases and test material done with tools included in [tools]
- DASH Clear content AVC / HEVC
- DRM (Playready, Marlin, Clearkey) including Playready Security Level 3000 and cbcs
- Out-of-Band Subtitles
- Inband subtitles
- Inband CueData
- Audio selection
- Ad insertion (pre-roll and mid-roll)
- Live DASH with multi mood/mdat signaling
- MultiPeriod DASH

The software is under continuous development and licensed with MIT License.

## Disclaimer and data collection

This tool is provided by the HbbTV Association, a cooperation between broadcasters, operators, manufacturers and technology providers worldwide. It is a non-profit association registered in Switzerland, and is as such constrained by competition law which generally forbids coordination of activity, except standardization activity which produces clear benefits for consumers. Therefore, while the provision of this tool has been made to encourage and facilitate standardization around DRM, the HbbTV Association has chosen not to share individual device results with its own members or beyond, to avoid any risk of competitors gaining an advantage through this data.

When the live instance (refapp.hbbtv.org) is accessed it is logged in the server access log. This log is never analysed unless explicitly requested by HbbTV association to obtain for example data about the diversity of devices running the app.
The access data is tabulated monthly as total visitors, total requests and amount of data transferred. This data is shared in the HbbTV IITF Reference Application status report. No data is ever collected about the results of individual tests run by other people.

100% of the test data in the anonymized result sheet (available to HbbTV members) is collected by test engineers of Sofia Digital, using the devices in the test laboratory of Sofia Digital. Sofia maintains internal and confidential data about specific models and results, and this data is available to manufacturers in question upon request. Sofia also sends this data periodically to manufacturers to discuss findings and possible bugs in the test materials or specific devices.

Issues can be reported here in github (PLEASE REMEMBER TO ASSIGN YOUR ISSUE TO JUHA JOKI) or you may send email to hbbtv_refapp@sofiadigital.com for any problems or questions.

### Usage, testing, installation, integration:

 - Test latest stable version of the application at https://refapp.hbbtv.org/production (see versions for more info)
 - Follow [installation] guide to get source and set up local version
 - Read API documentation: https://meridian.sofiadigital.fi/tvportal/referenceapp/doc/
 - Follow [integration] guide to integrate videoplayer and/or components to different application
 - Follow [dasher] guide to use dasher tool to create dash media files
 - See [tests] report

### Versions

## Production
 - Updated in line with Test Suite, 3 times a year
 - HbbTV 2.0.x and 1.5 Playready and Marlin DRM streams 
 - Also non-DRM streams for reference and MSE/EME (dash.js) player for devices without a suitable native player
 - Subtitle and audio stream selection via color buttons
 - Live and VOD DASH profiles
 - available at https://refapp.hbbtv.org/production/
 
 ## Staging
 - Intended for testing of new features considered stable enough
 - Will be in line with github repository
 - Low latency (multi moof/mdat) Live and VOD DASH
 - Security Level 3000 in Playready with recommendation parameter for license acquisition
 - CBCS Playready content
 - Separate KID values for video and audio in Playready 
 - Multiperiod DRM and non-DRM tests
 - Multi-DRM tests (Playready and Widevine)
 - Persistent license tests for native players (MSE-EME coming soon)
 - available at https://refapp.hbbtv.org/staging/
 
  ## Testing
 - Intended for rolling out new features and signaling
 - Now includes Playready persistent license test for OIPF/HTML5 players (native)
 - Suitable for early testing and feedback
 - available at https://refapp.hbbtv.org/testing/catalogue/index.php
 
### Multi-period DASH content

 - MPD and EMSG events timeline
 - transitions between main content (llama drama cartoon) and ad contents (orange test video)
 - static and live multiperiod tests
 
 ## MPEG-2 TS
 - Includes AITs with direct links to production and staging instances
 - separate links for HbbTV 1.5 and 2.0.x versions
 - Version with HTTP links available at https://refapp.hbbtv.org/videos/refapp_10_04_2019.ts (650 MiB)
 - Version with HTTPS links available at https://refapp.hbbtv.org/videos/dash-drm_refapp_2023.ts (450 MiB)
 
### Components and modules:

See components and modules listing at [integration] guide

### Catalogue menu structure:

Mainmenu, submenus, assets and actions are configured in __[config.json]__ file. 

The file can be changed to any endpoint for data to make static menu dynamic.

Menu structure for the catalogue app should respect used json structure that 
is designed to represent a vod catalogue build by mainmenu and submenus. 

Overall menu structure or datamodel is documented here: [datamodel]

[//]: # (references)

[tools]: <https://github.com/HbbTV-Association/ReferenceApplication/tree/master/tools>
[integration]: <https://github.com/HbbTV-Association/ReferenceApplication/blob/master/doc/integration.md>
[installation]: <https://github.com/HbbTV-Association/ReferenceApplication/blob/master/doc/installation_testing.md>
[datamodel]: <https://github.com/HbbTV-Association/ReferenceApplication/blob/master/doc/datamodel.md>
[config.json]: <https://github.com/HbbTV-Association/ReferenceApplication/blob/master/src/catalogue/config.json>
[dasher]: <https://github.com/HbbTV-Association/ReferenceApplication/blob/master/doc/dasher.md>
[tests]: <https://github.com/HbbTV-Association/ReferenceApplication/blob/master/doc/refapp_test.txt>
