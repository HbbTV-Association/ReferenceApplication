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
- MultiPeriod DASH


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
 - Intended for testing of new features considered stable enough
 - Will be in line with github repository
 - Low latency (multi moof/mdat) Live and VOD DASH
 - available at http://refapp.hbbtv.org/staging/
 
  ## Testing
 - Intended for rolling out new features and signaling
 - New content: Multiperiod DASH (Task 6)
 - available at http://refapp.hbbtv.org/testing/
 
 # Please refer to http://refapp.hbbtv.org/videos/00_llama_multiperiod_v1/readme.txt 

for information regarding MultiPeriod DASH content. From the user point of view one should see on the TV screen the notifications of received events (similar to the inband event test now). And transitions between main content (llama drama cartoon) and ad contents (orange test video with time counters). 

Transitions are listed below, and the device should follow this timeline. While playing, there are popups informing about MPD and EMSG events, these fizz by quite fast, but they are logged in file as well. check the readme for complete list of events.

Period p1: 00:00:00-00:01:00, 60s, 00_llama (main 00:00:00-00:01:00)
Period p2: 00:01:00-00:01:30, 30s, test01 (advert 1 00:00:00-00:00:30)
Period p3: 00:01:30-00:02:00, 30s, test02 (advert 2 00:00:00-00:00:30)
Period p4: 00:02:00-00:02:30, 30s, test03 (advert 3 00:00:00-00:00:30)
Period p5: 00:02:30-00:03:30, 60s, 00_llama (main 00:01:00-00:02:00)
Period p6: 00:03:30-00:04:00, 30s, test01 (advert 1 00:00:00-00:00:30)
Period p7: 00:04:00-00:04:30, 30s, test02 (advert 2 00:00:00-00:00:30)
Period p8: 00:04:30-00:05:00, 30s, test03 (advert 3 00:00:00-00:00:30)
Period p9: 00:05:00-00:06:00, 60s, 00_llama (main 00:02:00-00:03:00)
Period p10: 00:06:00-00:07:30, 90s, test00 (advert 1+2+3 00:00:00-00:01:30)
Period p11: 00:07:30-00:10:56, 206s, 00_llama (main 00:03:00-06:26:00)
 
 ## MPEG-2 TS
 - Includes AITs with direct links to production and staging instances
 - separate links for HbbTV 1.5 and 2.0.2 versions
 - available at http://refapp.hbbtv.org/videos/refapp_10_04_2019.ts

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
