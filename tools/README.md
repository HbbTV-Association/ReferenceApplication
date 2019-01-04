## Reference Video Application, Tools

### test

`test/download-testvideos.sh`

Download few public domain example videos. Script transcodes files 
to 1920x1080/16:9/25fps format to have best compatibility across 
various HbbTV televisions. 
You may use files as an input file for `dasher` tool.

`test/laurl_ck.php`

ClearKey drm license server script to be used as LAURL address for dash players. 
This script returns kid=key value pair by given kid parameter.

`test/laurl_pr.php`

Playready drm license proxy script to be used as LAURL address for dash players.
This script allows debugging of soapxml request and response payloads.

`RegisterDRM_MicrosoftTest.py`

Generates Microsoft Playready test server license urls for kid=key value pairs.
You may use urls as LAURL address for dash players.

### java

`dasher`

This tool creates dash media file package.
* Transcode input file to one or more resolution/bitrate stream
* Create Dash init.mp4, segment.m4s and manifest.mpd files (NoDRM)
* Create image.jpg thumbnail images
* Encrypt Dash files (MultiDRM)
* Create drm/manifest.mpd (MultiDRM)
* Create drm/manifest_clearkey.mpd (ClearKeyDRM test manifest)

You also need ffmpeg, ffprobe and mp4box binary tools.
