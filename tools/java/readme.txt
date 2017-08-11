ReferenceApplication for Dash packager

Dasher
====================
Input video file is trancoded to multiple streams (resolution, bitrate).
Streams are dashed to an unecrypted manifest.mpd file.
Streams are encrypted and dashed to a MultiDRM manifest.mpd file (playready,marlin,widevine).

Best result is achieved if input file is h264/aac/25fps/16:9 format.
- h264 video codec
- aac audio codec
- 25 frame rate, some HbbTV televisions don't support less common rates
- aspect 16:9 resolution 1280x720, 1920x1080, 3840x2160 (pixel=1:1, display=16:9)

You may use h265 input files and output h265 dash segments as well.


Binary tools requirements
Resource files
========================================
ffmpeg          transcodes video files
  http://ffmpeg.org/
  https://git.ffmpeg.org/ffmpeg.git
ffprobe         reads video file metadata
  see ffmpeg sources
MP4Box          dash segmenter and drm encryption
  https://gpac.wp.imt.fr/mp4box/dash/
  https://github.com/gpac/gpac

You should use most up-to-date versions of binary tools.
It's especially important mp4box is updated because it
receives constant bug fixes in a github repository.

Roboto TTF font file to be used for ffmpeg overlay text,
this font is already saved in lib folder.
https://fonts.google.com/specimen/Roboto?selection.family=Roboto


Compile and Build
====================
Use Java7 or higher, use Ant1.9 or higher.
Use Eclipse or Ant script to build the project.
  /apache-ant-1.9.4/bin/ant -f build.xml
Library is written to lib/dasher.jar file.


Run dasher
====================
Use Java7 to run an applicatiion.
Trancode input file, save dash segments to output folder.
  java -cp /refapp/lib/* hbbtv.org.refapp.Dasher config=dasher.properties input=/videos/input.mp4 output=/videos/dash/input/
Trancode input file, save dash segments to current working folder.
  java -cp /refapp/lib/* hbbtv.org.refapp.Dasher config=dasher.properties input=/videos/input.mp4 output=.
Trancode input file, override few configuration values.
  java -cp /refapp/lib/* hbbtv.org.refapp.Dasher config=dasher.properties input=/videos/input.mp4 output=. drm.marlin=0 drm.widevine=0
Transcode input file, output to current working directory, override few configuration values.
  java -cp /refapp/lib/* hbbtv.org.refapp.Dasher config=dasher.properties logfile=manifest-log.txt drm.kid=rng drm.key=rng input=/videos/input.mp4 output=.

Unecrypted files are written to output folder.
Encrypted files are written to output/drm subfolder.

Logging file should not be copied to a public web server, 
it contains sensitive data such as DRM kid,key,iv values.


Config file dasher.properties
========================================
Use configuration file to control dasher arguments.
Values are first read from config=dasher.properties file,
values may be overriden by command-line arguments.

See dasher.properties file for full documentation.


Widevine protobuffer object
============================
Protobuffer template WidevineCencHeaderProto.proto is encoded to java file.
This is already included in a source folder so no need to regenerate.
- see src/com/google/protobuf/object/WidevineCencHeaderProto.java

You need Protobuf binary tools if want to generate java file.
- see website https://github.com/google/protobuf
- see specification https://storage.googleapis.com/wvdocs/Widevine_DRM_Encryption_API.pdf
Example command to generate template to java file:
  \protoc-3.3.0-win32\bin\protoc.exe  --java_out=.  WidevineCencHeaderProto.proto


Version history
============================
2017-08-11:
- initial release, h264 mode only
