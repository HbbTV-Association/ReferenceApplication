ReferenceApplication for Dash packager
https://refapp.hbbtv.org/
https://github.com/HbbTV-Association/ReferenceApplication

Dasher
====================
Input video file is trancoded to multiple streams (resolution, bitrate).
Streams are dashed to an unecrypted manifest.mpd file.
Streams are encrypted and dashed to a MultiDRM manifest.mpd file (playready,marlin,widevine,clearkey).
Insert EventMessageBox(EMSG) to mp4 segment and manifest.mpd files.
Remove mp4 table from the mp4 files.
Add ttml.xml subtitles (in-band, out-of-band).
Write HLS manifest (experimental, no drm fully supported yet).

Best result is achieved if input file is h264,h265/aac/25fps/16:9 format.
- AVC(h264) video codec, HEVC(h265) video codec
- aac audio codec, use 48000Hz sample rate
- 25/30/50/60 frame rates, some HbbTV televisions may not support less common rates
- aspect 16:9 resolution 1280x720, 1920x1080, 3840x2160 (pixel=1:1, display=16:9)

Tool can output h264(AVC) or h265(HVC1) dash and hls files, 
output folder is using the following file format.
    /videos/dash/video1/manifest.mpd
    /videos/dash/video1/manifest.m3u8
    /videos/dash/video1/v1/i.mp4
    /videos/dash/video1/v1/1..n.m4s
    /videos/dash/video1/a1/i.mp4
    /videos/dash/video1/a1/1..n.m4s
    /videos/dash/video1/cenc/manifest.mpd
    /videos/dash/video1/cenc/manifest.m3u8
    /videos/dash/video1/cenc/v1/i.mp4
    /videos/dash/video1/cenc/v1/1..n.m4s
    /videos/dash/video1/cenc/a1/i.mp4
    /videos/dash/video1/cenc/a1/1..n.m4s

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
Library is compiled to a lib/dasher.jar file.


** Run dasher **
Use Java7 or higher to run an application.
====================
Transcode input file, no drm encoding, overlay a debug text on video tracks,
use automatic segment duration (25fps=3.84s, 30fps=3.20s, 24fps=8s).
  java -jar "/refapp/lib/dasher.jar" \
    "input=/videos/video1.mp4" "output=/videos/dash/video1" \
    "tempfolder=/tmp/video1" "logfile=/tmp/video1/manifest-log.txt" \
    mode=h264 cmaf=cmf2 segdur=auto frags=4 \
    video.1="v1 640x360 768k" \
    video.1.profile=main video.1.level=3.1 video.1.crf=23 \
    video.2="v2 1280x720 1500k" \
    video.2.profile=main video.2.level=4.0 video.2.crf=23 \
    video.3="v3 1920x1080 2100k" \
    video.3.profile=high video.3.level=4.0 video.3.crf=23 \
    audio.1="a1 48000 128k 2" \
    image.seconds=15 \
    overlay=1

Trancode input file, save dash segments to output folder.
  java -jar "/refapp/lib/dasher.jar" config=dasher.properties input=/videos/video1.mp4 output=/videos/dash/video1/
Trancode input file, save dash segments to current working folder.
  java -jar "/refapp/lib/dasher.jar" config=dasher.properties input=/videos/video1.mp4 output=.
Trancode input file, override few configuration values.
  java -jar "/refapp/lib/dasher.jar" config=dasher.properties input=/videos/video1.mp4 output=. drm.marlin=0 drm.widevine=0
Transcode input file, write logfile, use RandomNumberGenerator for kid and key
  java -jar "/refapp/lib/dasher.jar" config=dasher.properties logfile=manifest-log.txt drm.kid=rng drm.key=rng input=/videos/video1.mp4 output=.
Transcode input file, output H265 to current working directory, override few configuration values.
  java -jar "/refapp/lib/dasher.jar" config=dasher.properties mode=h265 logfile=manifest-log.txt drm.kid=rng drm.key=rng input=/videos/video1.mp4 output=.

Unecrypted files are written to an output folder.
Encrypted files are written to an output/cenc, output/cbcs subfolders.

Logging file should not be copied to a public web server, 
it contains sensitive data such as DRM kid,key,iv values.


** Run event inserter **
===========================
Insert EMSG to segment file.
  java -cp "/refapp/lib/*" org.hbbtv.refapp.EventInserter input=/videos/dash/video1/v1_1.m4s scheme="urn:my:scheme" value="1" ts=1 ptd=1 dur=0xFFFF id=1 msg="any payload"
Remove all EMSG boxes from segment file.
  java -cp "/refapp/lib/*" org.hbbtv.refapp.EventInserter input=/videos/dash/video1/v1_1.m4s scheme=""
Insert InbandEventStream element to mpd manifest
  java -cp "/refapp/lib/*" org.hbbtv.refapp.EventInserter input=/videos/dash/video1/manifest.mpd scheme="urn:my:scheme" value="1"
Remove all InbandEventStream elements from mpd manifest 
  java -cp "/refapp/lib/*" org.hbbtv.refapp.EventInserter input=/videos/dash/video1/manifest.mpd scheme=""


** Run box modifier **
===========================
Remove box(moov/trak/senc) from the init segment file, some of the hbbtv televisions 
may not play dash stream if this box is found in an initialization file.
  java -cp "/refapp/lib/*" org.hbbtv.refapp.BoxModifier input=/videos/dash/video1/v1_i.mp4 mode=remove path=moov/trak/senc


** Multiple moof/mdat pairs  **
=================================
Low-latency test may use multiple moof/mdat pairs, stream is splitted to small fragments within
a segment file. Players may play the segment file while still downloading remaining bytes from network.
Use frags=4 argument to add four fragments per second, if segdur=2 then segment file has 4*2=8 fragments.


Config file dasher.properties
========================================
Use configuration file to control dasher arguments.
Values are first read from config=dasher.properties file,
values may be overriden by command-line arguments.

See dasher.properties file for full documentation.


Version history
============================
2023-01-24:
- convert input fps 23.98->24fps, 29.97->30fps, 59.94->60fps
2023-01-19:
- added DasherImage tool to scale image files
2022-12-13:
- added hls, segdur 3.84s, refactor dasher, cenc/cbcs/cbcs0 drm
2019-06-12:
- added mode=dash to skip transcoding and dash+encrypt input files
2018-10-30:
- added frags argument for multifragment(moof/mdat pairs)
2017-02-12:
- added input.* (input.1, input.2) secondary audio input files
2017-11-19:
- added subib.* and subob.* subtitling property keys
2017-11-05:
- added BoxModifier tool
2017-10-25:
- added drm.clearkey DRM system
- fixed CENC pssh version=1 field
- write drm/manifest_clearkey.mpd file
2017-09-12:
- add <InbandEventStream..> to manifest.mpd
2017-09-01:
- added EMSG event inserter
2017-08-14:
- added h265 dash mode
2017-08-11:
- initial release, supported h264 mode only
