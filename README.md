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

 - Test latest version of the application at http://meridian.sofiadigital.fi/tvportal/referenceapp/
 - Follow [installation] guide to get source and set up local version
 - Read API documentation: http://meridian.sofiadigital.fi/tvportal/referenceapp/doc/
 - Follow [integration] guide to integrate videoplayer and/or components to different application


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
