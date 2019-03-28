# Reference Video Application

## Reference application for online video streaming.
This application is implemented to be a reference video catalogue and player application 
for DASH content on HbbTV 1.5 and 2.0.1 devices, with various DRM and subtitle tests. 

Application prowides test cases and test material done with tools included in [tools]
- DASH Clear content AVC / HEVC
- DRM (Playready, Marlin, Clearkey)
- Out-of-Band Subtitles
- Inband subtitles
- Inband CueData
- Audio selection
- Ad insertion (pre-roll and mid-roll)
- Live DASH



The software is under continuous development and licensed with MIT License.
Issues can be reported here in github (PLEASE REMEMBER TO ASSIGN YOUR ISSUE TO JUHA JOKI) or you may send email to hbbtv_refapp@sofiadigital.com
for any problems or questions

### Usage, testing, installation, integration:

 - Test latest stable version of the application at http://refapp.hbbtv.org/production (see versions for more info)
 - Follow [installation] guide to get source and set up local version
 - Read API documentation: http://meridian.sofiadigital.fi/tvportal/referenceapp/doc/
 - Follow [integration] guide to integrate videoplayer and/or components to different application
 - Follow [dasher] guide to use dasher tool to create dash media files
 - See [tests] report

### Versions

## Production
 - Updated in line with Test Suite, 3 times a year
 - HbbTV 2.0.1 and 1.5 Playready and Marlin DRM streams 
 - Also non-DRM streams for reference and including MSE/EME for non HbbTV browsers
 - Subtitle and audio stream selection via color buttons
 - Live and VOD DASH profiles
 - available at http://refapp.hbbtv.org/production/
 
 ## Staging
 - Intended for early access testing of new features
 - Will be in line with github repository
 - Low latency (multi moof/mdat) Live and VOD DASH
 - available at http://refapp.hbbtv.org/staging/

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
