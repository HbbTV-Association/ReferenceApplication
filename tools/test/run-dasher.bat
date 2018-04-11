@REM Run dasher, create test files for Reference Application
@REM Make sure input and output folders match your environment,
@REM inputfolder should have mp4 and sub.xml files.

set dasher=C:/sd/gitbase/ReferenceApplication/tools/java
set ffmpeg=C:/projects/media-autobuild_suite/bin/ffmpeg.exe
set mp4box=C:/projects/media-autobuild_suite/bin/MP4Box.exe

set inputfolder=D:/sofiadigital/media/videos/mp4/dasher
set outputfolder=D:/sofiadigital/media/videos/mp4/dasher
set IV=0x22ee7d4745d3a26a

@rem change current drive
D:
cd "%inputfolder%"

:START


:01llamadrama
set inputfile=01_llama_drama_1080p_25fps.mp4
set inputfile.1=
set inputfile.2=
set inputfile.3=
set outputfile=01_llama_drama_1080p_25f75g6sv3
set prlaurl="https://test.playready.microsoft.com/service/rightsmanager.asmx?cfg=(kid:header,sl:2000,persist:false,firstexp:60,contentkey:EjQSNBI0EjQSNBI0EjQSNA==)"
set KID=0x43215678123412341234123412341234
set KEY=0x12341234123412341234123412341234
set sub1=
set sub2=
CALL :DASHER1080 "%inputfolder%/%inputfile%" "%outputfile%"

:02grandilamma
set inputfile=02_gran_dillama_1080p_25fps.mp4
set inputfile.1=
set inputfile.2=
set inputfile.3=
set outputfile=02_gran_dillama_1080p_25f75g6sv3
set prlaurl="https://test.playready.microsoft.com/service/rightsmanager.asmx?cfg=(kid:header,sl:2000,persist:false,firstexp:60,contentkey:EjQSNBI0EjQSNBI0EjQSNg==)"
set KID=0x43215678123412341234123412341236
set KEY=0x12341234123412341234123412341236
set sub1="sub_eng eng %~dp0%sub_eng.xml"
set sub2="sub_fin2 fin %~dp0%sub_fin2.xml"
CALL :DASHER1080 "%inputfolder%/%inputfile%" "%outputfile%"
CALL :EVENTINSERTER "%outputfolder%/%outputfile%"

:tos
set inputfile=tears_of_steel_1080p_25fps.mp4
set inputfile.1=
set inputfile.2=
set inputfile.3=
set outputfile=tears_of_steel_1080p_25f75g6sv3
set prlaurl="https://test.playready.microsoft.com/service/rightsmanager.asmx?cfg=(kid:header,sl:2000,persist:false,firstexp:60,contentkey:EjQSNBI0EjQSNBI0EjQSNw==)"
set KID=0x43215678123412341234123412341237
set KEY=0x12341234123412341234123412341237
set sub1="sub_eng eng %~dp0%tears_of_steel_eng.xml"
set sub2=
CALL :DASHER1080 "%inputfolder%/%inputfile%" "%outputfile%"

:01llamadramaH265
set inputfile=01_llama_drama_1080p_25fps.mp4
set inputfile.1=
set inputfile.2=
set inputfile.3=
set outputfile=01_llama_drama_2160p_25f75g6sv3
set prlaurl="https://test.playready.microsoft.com/service/rightsmanager.asmx?cfg=(kid:header,sl:2000,persist:false,firstexp:60,contentkey:EjQSNBI0EjQSNBI0EjQSNQ==)"
set KID=0x43215678123412341234123412341235
set KEY=0x12341234123412341234123412341235
set sub1=
set sub2=
CALL :DASHER2160 "%inputfolder%/%inputfile%" "%outputfile%"

:01llamadramaMULTIAUDIO
set inputfile=02_gran_dillama_1080p_25fps.mp4
set inputfile.1="%inputfolder%/02_gran_dillama_fin.mp4"
set inputfile.2="%inputfolder%/02_gran_dillama_ger.mp4"
set inputfile.3="%inputfolder%/02_gran_dillama_swe.mp4"
set outputfile=02_gran_dillama_1080p_ma_25f75g6sv3
set prlaurl="https://test.playready.microsoft.com/service/rightsmanager.asmx?cfg=(kid:header,sl:2000,persist:false,firstexp:60,contentkey:EjQSNBI0EjQSNBI0EjQSNg==)"
set KID=0x43215678123412341234123412341236
set KEY=0x12341234123412341234123412341236
set sub1="sub_eng eng %~dp0%sub_eng.xml"
set sub2="sub_fin2 fin %~dp0%sub_fin2.xml"
CALL :DASHER1080 "%inputfolder%/%inputfile%" "%outputfile%"
CALL :EVENTINSERTER "%outputfolder%/%outputfile%"


GOTO :END

@REM ========================================
:DASHER1080
set input=%~1
set name=%~2
set output=%outputfolder%/%name%/
set logfile=%outputfolder%/%name%/manifest-log.txt
echo Dash 1080p %input% to %output%
java -jar "%dasher%/lib/dasher.jar" config="%dasher%/dasher.properties" "input=%input%" ^
  input.1=%inputfile.1% input.2=%inputfile.2% input.3=%inputfile.3% ^
  "output=%output%" ^
  "logfile=%logfile%" drm.kid=%KID% drm.key=%KEY% drm.iv=%IV%  drm.playready.laurl=%prlaurl% ^
  subib.1=%sub1% subib.2=%sub2% subob.1=%sub1% subob.2=%sub2% ^
  "tool.ffmpeg=%ffmpeg%" "tool.mp4box=%mp4box%"
GOTO :EOF

:DASHER2160
set input=%~1
set name=%2
set output=%outputfolder%/%name%/
set logfile=%outputfolder%/%name%/manifest-log.txt
echo Dash 2160p %input% to %output%
java -jar "%dasher%/lib/dasher.jar" config="%dasher%/dasher265.properties" "input=%input%" "output=%output%"  ^
  "logfile=%logfile%" drm.kid=%KID% drm.key=%KEY% drm.iv=%IV%  drm.playready.laurl=%prlaurl% ^
  subib.1=%sub1% subib.2=%sub2% subob.1=%sub1% subob.2=%sub2% ^
  "tool.ffmpeg=%ffmpeg%" "tool.mp4box=%mp4box%"
GOTO :EOF

:DASHER2160-SR
set input=%~1
set name=%2
set output=%outputfolder%/%name%/
set logfile=%outputfolder%/%name%/manifest-log.txt
echo Dash 2160p-sameres %input% to %output%
java -jar "%dasher%/lib/dasher.jar" config="%dasher%/dasher265.properties" "input=%input%" "output=%output%"  ^
  "logfile=%logfile%" drm.kid=%KID% drm.key=%KEY% drm.iv=%IV%  drm.playready.laurl=%prlaurl% ^
  "video.1=v1 3840x2160 1500k" "video.2=v2 3840x2160 2100k" "video.3=v3 3840x2160 3500k" "video.4=" video.level=5.0 ^
  subib.1=%sub1% subib.2=%sub2% subob.1=%sub1% subob.2=%sub2% ^
  "tool.ffmpeg=%ffmpeg%" "tool.mp4box=%mp4box%"
GOTO :EOF

:DASHER2160-MR
set input=%~1
set name=%2
set output=%outputfolder%/%name%/
set logfile=%outputfolder%/%name%/manifest-log.txt
echo Dash h265-1080pmax %input% to %output%
java -jar "%dasher%/lib/dasher.jar" config="%dasher%/dasher265.properties" "input=%input%" "output=%output%"  ^
  "logfile=%logfile%" drm.kid=%KID% drm.key=%KEY% drm.iv=%IV%  drm.playready.laurl=%prlaurl% ^
  "video.4=" video.level=4.0 ^
  subib.1=%sub1% subib.2=%sub2% subob.1=%sub1% subob.2=%sub2% ^
  "tool.ffmpeg=%ffmpeg%" "tool.mp4box=%mp4box%"
GOTO :EOF


@REM ============================================
:EVENTINSERTER
set scheme=http://hbbtv.org/refapp
set value=1a2b3c
call :EVENTINSERTER-EMSGs "%~1"
call :EVENTINSERTER-EMSGs "%~1/drm" 
GOTO :EOF

:EVENTINSERTER-EMSGs
echo Insert EMSG %scheme%, %value% to %~1
CALL :EVENTINSERTER-EMSG "%~1/v1_1.m4s"  1
CALL :EVENTINSERTER-EMSG "%~1/v2_1.m4s"  1
CALL :EVENTINSERTER-EMSG "%~1/v3_1.m4s"  1
CALL :EVENTINSERTER-EMSG "%~1/v1_5.m4s"  2
CALL :EVENTINSERTER-EMSG "%~1/v2_5.m4s"  2
CALL :EVENTINSERTER-EMSG "%~1/v3_5.m4s"  2
CALL :EVENTINSERTER-EMSG "%~1/v1_10.m4s" 3
CALL :EVENTINSERTER-EMSG "%~1/v2_10.m4s" 3
CALL :EVENTINSERTER-EMSG "%~1/v3_10.m4s" 3
java -cp "%dasher%/lib/*" org.hbbtv.refapp.EventInserter input="%~1/manifest.mpd" output="%~1/manifest_evtib.mpd" scheme="%scheme%" value="%value%"
java -cp "%dasher%/lib/*" org.hbbtv.refapp.EventInserter input="%~1/manifest_subib.mpd" output="%~1/manifest_subib_evtib.mpd" scheme="%scheme%" value="%value%"
java -cp "%dasher%/lib/*" org.hbbtv.refapp.EventInserter input="%~1/manifest_subob.mpd" output="%~1/manifest_subob_evtib.mpd" scheme="%scheme%" value="%value%"
GOTO :EOF

:EVENTINSERTER-EMSG
set input=%~1
set id=%2
set ts=1
set ptd=0
rem set dur=0x0000FFFF
set dur=12
set msg=EMSG event(value=%value%, id=%id%)
java -cp "%dasher%/lib/*" org.hbbtv.refapp.EventInserter input="%input%" scheme="%scheme%" value="%value%" ts=%ts% ptd=%ptd% dur=%dur% id=%id% msg="%msg%"
goto :EOF



@REM ========================================
:END
pause
