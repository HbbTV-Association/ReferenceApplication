## Reference Video Application, Tools

### test

`test/download-testvideos.sh`

Download few public domain example videos. Script transcodes files 
to 1920x1080/16:9/25fps format to have best compatibility across 
various HbbTV televisions. 
You may use files as an input file for `dasher` tool.

### java

`dasher`

This tool creates dash media file package.
* Transcode input file to one or more resolution/bitrate stream
* Create Dash init.mp4, segment.m4s and manifest.mpd files (NoDRM)
* Create image.jpg thumbnail images
* Encrypt Dash files (MultiDRM)

You also need ffmpeg, ffprobe and mp4box binary tools.
