# Reference DASH-DRM Video Application - Dasher tool

Dasher tool creates dash media files and manifest files. Output folder contains non-encrypted segment files, multidrm segment files and multiple manifest.mpd files for various use cases.

## Command line
This is dasher command line to dash input video file, insert EMSG event objects to segment files, insert EMSG element to manifest.mpd files.

```
## create segments, drm protection and manifest files
java -jar /dasher/lib/dasher.jar config=dasher.properties ^
  input=/videos/video1.mp4 output=/dash/video1/ logfile=/dash/video1/log.txt  

## insert emsg objects to segment files
java -cp "/dasher/lib/*" org.hbbtv.refapp.EventInserter input="/dash/video1/v1_1.m4s" ^
  scheme="http://hbbtv.org/refapp" value=1a2b3c ts=1 ptd=0 ^
  dur=12 id=1 msg="emsg event id=1"
java -cp "/dasher/lib/*" org.hbbtv.refapp.EventInserter input="/dash/video1/drm/v1_1.m4s"  ^
  scheme="http://hbbtv.org/refapp" value=1a2b3c ts=1 ptd=0 ^
  dur=12 id=1 msg="emsg event id=1"

## insert esmg xml element to manifest files
java -cp "/dasher/lib/*" org.hbbtv.refapp.EventInserter input="/dash/video1/manifest.mpd" output="/dash/video1/manifest_evtib.mpd" ^
  scheme="http://hbbtv.org/refapp" value="1a2b3c"
java -cp "/dasher/lib/*" org.hbbtv.refapp.EventInserter input="/dash/video1/drm/manifest.mpd" output="/dash/video1/drm/manifest_evtib.mpd" ^
  scheme="http://hbbtv.org/refapp" value="1a2b3c"  
```

## Configuration file

This is an example of dasher configuration file to create multidrm dash output files. All properties may be overwritten in dasher command line.

```
logfile=
deleteoldfiles=1
deletetempfiles=1

## mode(h264|h265), GOP seconds, segment seconds
mode=h264
gopdur=3
segdur=6

## Draw overlay text on video stream (0=disable, 1=timestamp)
overlay=1

## name size bitrate
video.1=v1 640x360 512k
video.2=v2 1280x720 1500k
video.3=v3 1920x1080 2100k

## name samplerate bitrate channels
audio.1=a1 44100 128k 2

## subtitles(out-of-band) name lang inputfile
subob.1=sub_fin fin /subs/sub_fin.xml
subob.2=sub_eng eng /subs/sub_eng.xml

## subtitles(in-band) name lang inputfile
subib.1=sub_fin fin /subs/sub_fin.xml
subib.2=sub_eng eng /subs/sub_eng.xml

## Output preview images taken from given timestamp
image.seconds=15
image.1=320x180
image.2=640x360

## multidrm arguments (rng=RandomNumberGenerator)
drm.cenc=1
drm.playready=1
drm.playready.laurl=https://test.playready.microsoft.com/service/rightsmanager.asmx
drm.marlin=1
drm.widevine=1
drm.clearkey=1
drm.kid=0x43215678123412341234123412341236
drm.key=0x12341234123412341234123412341236
drm.iv=rng

## Path to executable tools, leave empty to use system-wide default tools
##   ffmpeg=C:/apps/ffmpeg/bin/ffmpeg.exe
##   mp4box=C:/apps/gpac/MP4Box.exe
tool.ffmpeg=
tool.mp4box=
```
