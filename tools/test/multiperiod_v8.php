<?php
require "common.php";

// Dynamic(live) multiperiod.mpd, use MPD Reload Event to refresh manifest.
// MPD events, EMSG events, inband subtitles, advert periods, multiple audio langs
// - see "MPDReload" comments
// - see "lang3 to lang2(natural)" hardcoded list
// /videos/multiperiod_v8.php?drm=ck,cbcs&advert=1&emsg=1&video=v1&audiolang=eng&sublang=eng,fin
// /videos/multiperiod_v8.php?drm=pr,cenc&advert=1&emsg=1&subtitle=&video=&audio=
// Static(vod) multiperiod.mpd
// /videos/multiperiod_v8.php?drm=&advert=1&emsg=1&video=v1,v2,v3&audio=a1,a2,a1-1,a2-1&sublang=eng,fin,swe&static=1

header("Expires: Mon, 20 Dec 1998 01:00:00 GMT" );
header("Last-Modified: " . gmdate("D, d M Y H:i:s") . " GMT" );
header("Cache-Control: max-age=0, no-cache, no-store, must-revalidate" );
header("Pragma: no-cache" );
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: origin,range,accept,accept-encoding,referer,content-type,SOAPAction,X-AxDRM-Message,access-control-allow-origin');
header('Access-Control-Allow-Methods: GET,HEAD,OPTIONS,POST');
header('Access-Control-Expose-Headers: server,range,content-range,content-length,content-type,date');
// write content-type header after OPTIONS check
// some players may submit OPTIONS request(zero-length)
if ($_SERVER['REQUEST_METHOD']=="OPTIONS") {
	header("Content-Length: 0");
	header("Expires: -1");
	return;
}

$CONFIG_FILE = getParam($path, "config", "multiperiod_00llama_h264").".json";
if( strpos($CONFIG_FILE, "..", 0)!==false || strpos($CONFIG_FILE, "/", 0)!==false 
		|| strpos($CONFIG_FILE, "\\", 0)!==false ) {
	header("Content-Type: text/plain");
	header("Content-Language: en-US");
	echo("config error");
	return;
}

$basedir= dirname(__FILE__); // "/srv/www/htdocs/myapp"
$host   = getContextHost();  // "https://myapp.server.com"
$ctx    = getContextPath();  // "/videos" use as a cookie context path
$path   = getSuffixPath();   // "session/xx/periods/yy/.."
//$proto  = isHTTPS() ? "https" : "http";
$script = basename($_SERVER['SCRIPT_FILENAME']); // myscript.php

$debug      = intval(getParam($path, "debug", "0")); // 0=no, 1=yes, 2=yesFull

$idVideo    = getParam($path, "video", ""); // v1,v2,v3, empty=use all
if($idVideo!="") $idVideo=",".$idVideo.",";
$idAudio    = getParam($path, "audio", ""); // a1,a2, a1-1,a2-2, empty=use all
if($idAudio!="") $idAudio=",".$idAudio.",";

$langAudio  = getParam($path, "audiolang", ""); // eng,fin, empty=use all
if($langAudio=="0")      $langAudio="UseNothing";
else if($langAudio=="1") $langAudio="";
else if($langAudio!="")  $langAudio=",".$langAudio.",";

$langSub    = getParam($path, "sublang", "UseNothing");   // eng,swe,ger, empty=use all
if($langSub=="0")      $langSub="UseNothing";
else if($langSub=="1") $langSub="";
else if($langSub!="")  $langSub=",".$langSub.",";

$isAdvert   = getParam($path, "advert", "1")=="1"; // advert breaks
$isEmsg     = getParam($path, "emsg", "0")=="1"; // inband EMSG event
$isStatic   = getParam($path, "static", "0")=="1"; // use static mpd(non-live)

$mup        = getParam($path, "mup", "event"); // event=MPDEvent, 1..n=minimumUpdatePeriod seconds
$spd        = getParam($path, "spd", "8"); // SuggestedPresentationDelay 1..n seconds, 0=do not write

$pFlag      = getParam($path, "pflag", ""); // period flags: startdur,startonfirst

$drm        = getParam($path, "drm", ""); // pr,wv,ck,cenc,cbcs, empty=no drm
if($drm=="0" || $drm=="") $drm="";
else if($drm=="1") $drm=",pr,wv,cenc,";
else $drm = ",".$drm.",";

$tzUTC = new DateTimeZone("UTC");
$dtZero= DateTime::createFromFormat('Y-m-d\TH:i:s', '1970-01-01T00:00:00', $tzUTC);
$dtNow = new DateTime("now", $tzUTC);

// testing use only, modify systime to a fixed value !!
//$dtNow = DateTime::createFromFormat('Y-m-d\TH:i:s.v', '2021-11-19T10:23:18.000', $tzUTC);
//$dtNow = DateTime::createFromFormat('Y-m-d\TH:i:s.v', '1970-01-01T00:00:00.000', $tzUTC);
//$dtNow->add(new DateInterval("PT".( intval($periodsDurMillis*5/1000) )."S"));
//$dtNow = DateTime::createFromFormat('Y-m-d\TH:i:s.v', '1970-01-01T00:00:00.000', $tzUTC);
//$dtNow->modify("+67925 milliseconds"); // 83280: fullCycles=1, durExtraCycle=3840 | 87120, 79440, 64080, 67920

$dtAST = clone $dtZero; //DateTime::createFromFormat('Y-m-d\TH:i:s', '1970-01-01T00:00:00', $tzUTC); // AvailabilityStartTime
$backBufferSecs = 60*4; // backbuffer window in seconds (timeShiftBufferDepth rewind window in MPD)

if($debug>0) {
	header("Content-Type: text/plain");
	header("Content-Language: en-US");
} else {
	header("Content-Type: application/dash+xml");
}

$config = json_decode(file_get_contents($CONFIG_FILE),true);
$config["drm"] = array(
  "pr"   => strpos($drm, ",pr,", 0)!==false?1:0, // playready
  "wv"   => strpos($drm, ",wv,", 0)!==false?1:0, // widevine
  "ck"   => strpos($drm, ",ck,", 0)!==false?1:0, // clearkey, if enabled then disable pr+wv
  "type" => "" // cenc, cbcs or "" if no drm
);
if     (strpos($drm, ",cenc,", 0)!==false) $config["drm"]["type"]="cenc";
else if(strpos($drm, ",cbcs,", 0)!==false) $config["drm"]["type"]="cbcs";
if($config["drm"]["ck"]==1) $config["drm"]["pr"]=$config["drm"]["wv"]=0;

// count=number of periods per type, periodId=current period@id value
$periodTypes = array(
	"main"  => array("count"=>0, "dur"=>0, "periodId"=>""),
	"advert"=> array("count"=>0, "dur"=>0, "periodId"=>"")
);

// calc durations, update additional fields, align period.duration to segment.duration,
// skip optional adverts,
$newPeriods      = array();
$periodCount     = count($config["periods"]); // num of periods in one cycle
$periodsDurMillis= 0; // total duration(millis) of pre-defined periods
for($idx=0, $startNumberMain=1; $idx<$periodCount; $idx++) {
	//$item   = &$config["periods"][$idx]; // &reference so that we can edit the original array object
	$item   = $config["periods"][$idx];
	$content= &$config[$item["name"]];   // "main","advert1","advert2" content name in json config
	$dur    = $item["dur"]; // period duration in milliseconds
	
	if(isset($item["flag"])) { // flag for testing use
		$val = $item["flag"];
		if($val=="end") break; // skip this and remaining periods
	}
	
	$type   = $item["name"]=="main" ? "main" : "advert"; // internal content.type idenfifier
	$content["type"] = $type;
	
	if($dur <= 0 || (!$isAdvert && $type=="advert") )
		continue; // skip this period
	
	// on first time, update content fields (initUrl, mediaUrl)
	// "main": align period boundaries to segment duration
	// period.dur=24000, segdurms=3840 -> period.dur=23040, segcount=6	
	if(!isset($content["segdurms"])) {
		$content["segdurms"] = intval(intval($content["video"]["segdur"]) / intval($content["video"]["timescale"]) * 1000);
		// video,audio,sub = primary | audio1..n, sub1..n = additional tracks
		$asCounter=0;
		foreach(array("video","audio","sub") as $keyPrefix) {
		for($temp=0; ; $temp++) {					
			$key = $temp==0 ? $keyPrefix : $keyPrefix.strval($temp);
			if(!array_key_exists($key, $content)) break;
			
			$asCounter++;
			$asType="";
			if(startsWith($key,"video"))      $asType="video";
			else if(startsWith($key,"audio")) $asType="audio";
			else if(startsWith($key,"sub"))   $asType="text";
			else $asType = "UnknownType";

			// drop video,audio,sub tracks
			if($idVideo!="" && $asType=="video") // && $type=="main")
				filterRepresentations($idVideo, $content[$key]["reps"]);
			
			if($asType=="audio") {
				if($langAudio!="") {
					if( strpos($langAudio, ",".$content[$key]["lang"].",", 0)===false ) {
						array_splice($content[$key]["reps"], 0); // clear reps[] array
						$idAudio="";
					}
				}
				if($idAudio!="")
					filterRepresentations($idAudio, $content[$key]["reps"]);
			}
			
			if($langSub!="" && $asType=="text") {
				if( strpos($langSub, ",".$content[$key]["lang"].",", 0)===false )
					array_splice($content[$key]["reps"], 0); // clear reps[] array
			}
			if(count($content[$key]["reps"])<1) {
				unset($content[$key]); // drop if reps[] array is empty
				continue;
			}
		
			// manifest BaseURL points to a main nondrm folder, adverts use "../advertN/i.mp4",
			// drm use "./cenc/i.mp4", subtitles use "./sub_eng/sub_i.mp4",
			// filenames follow RefappDasher tool's naming convention !!
			$urlPrefix="";
			$fileInit = "i.mp4";
			$fileSeg  = "\$Number\$.m4s";
			if($type=="advert") {
				$urlPrefix = $content["folder"]."/"; // advert never use DRM, relative to a main nodrm folder
			} else if($asType=="text") {
				$fileInit = "sub_i.mp4";
				$fileSeg  = "sub_\$Number\$.m4s";
			} else if($config["drm"]["type"]!="") {
				$urlPrefix = $config["drm"]["type"]."/"; // cenc/i_prcenc.mp4, cenc/i_wvcenc.mp4, cenc/i_prwvcenc.mp4
				$fileInit   = "";
				if ($config["drm"]["pr"]==1) $fileInit = $fileInit."pr";
				if ($config["drm"]["wv"]==1) $fileInit = $fileInit."wv";				
				$fileInit = "i_${fileInit}cenc.mp4";
			}
			$content[$key]["initurl"]= $urlPrefix."\$RepresentationID\$/${fileInit}";
			$content[$key]["segurl"] = $urlPrefix."\$RepresentationID\$/${fileSeg}";

			$content[$key]["type"]   = $asType; // AdaptationSet@contentType
			$content[$key]["id"]     = $asCounter; // AdaptationSet@id 1..n number
			// lang3 to lang2(natural), use lang2 in AdaptationSet@lang
			$val = $content[$key]["lang"];
			if($val=="eng")      $val="en";
			else if($val=="fin") $val="fi";
			else if($val=="ger") $val="de";
			else if($val=="swe") $val="sv";
			else if($val=="pol") $val="pl";
			else if($val=="kor") $val="ko";
			else if($val=="ita") $val="it";
			else if($val=="gre") $val="el";
			else if($val=="spa") $val="es";
			$content[$key]["lang2"] = $val;
		}}
	}
	
	$segcount=0;
	if($type=="main") {
		$segcount = intval($dur / $content["segdurms"]); // align duration to a multiply of segdur
		$dur = $segcount * $content["segdurms"];
		$item["dur"]        = $dur;		
		$item["startNumber"]= $startNumberMain;
		$startNumberMain   += $segcount; // each main period is N..N segments
		$item["id"]         = "p"; // prefix of period@id
	} else if($type=="advert") {
		$segcount = intval($dur / $content["segdurms"]);
		if($segcount*$content["segdurms"] < $dur) $segcount++; // last segment may be a partial duration
		$item["startNumber"]= 1; // adverts always use 1..N segments
		$item["id"]         = "a";
	}
	$periodTypes[$type]["count"]+= 1;
	$periodTypes[$type]["dur"]  += $dur;
	$item["segcount"]= $segcount;

	$periodsDurMillis += $dur;	
	array_push($newPeriods, $item);	
}
//unset($item); // always unset a &$reference variable after loops
unset($content);
$config["periods"] = $newPeriods;
$periodCount = count($config["periods"]); // num of periods in one cycle, advert optional may have had dropped

$dom = new DOMDocument();
$dom->encoding  = "UTF-8";
$dom->xmlVersion="1.0";
$dom->formatOutput = true;
$dom->preserveWhiteSpace=false;
$root=$dom->createElement("MPD");
$dom->appendChild($root);

// write header elements, BaseURL points to main content's nodrm folder.
writeMPD($dom, $root);
$root->setAttribute("availabilityStartTime", $dtAST->format("Y-m-d\TH:i:s\Z") );
$root->setAttribute("publishTime", $dtNow->format("Y-m-d\TH:i:s\Z") ); // "Y-m-d\TH:i:s.u\Z"
$root->setAttribute("maxSegmentDuration", "PT8S");
$root->setAttribute("timeShiftBufferDepth", "PT${backBufferSecs}S");
if($spd!="0")  $root->setAttribute("suggestedPresentationDelay", "PT${spd}S");
else           $root->removeAttribute("suggestedPresentationDelay");

if($mup!="event" && !$isStatic)
	$root->appendChild( xml_createAttribute($dom, "minimumUpdatePeriod", "PT${mup}S" ) );

//$val = $host.$ctx."/${script}";
//$elem=xml_appendElement($dom, $root, "Location", $val);
$elem=xml_appendElement($dom, $root, "BaseURL", $host.$ctx."/". $config["main"]["folder"] ."/");	

$msStart = intval($dtNow->format("Uv"));   // U=secs,v=millis to get time in full milliseconds
$msStart-= ($backBufferSecs+1)*1000;
$skipCycles = intval($msStart / $periodsDurMillis)-1; // full periods cycles 0..n before the start of backlogbuffer window
if($skipCycles<0) $skipCycles=0;

$msStart = intval($dtAST->format("Uv")); // start of periods
$msStart+= $skipCycles * $periodsDurMillis;
$msEnd   = intval($dtNow->format("Uv")); // end of periods
//$msEnd   = $msEnd - 4000;

// if static then write all periods once (skipCycles=0, msEnd=periodsDur)
if($isStatic) {	
	if($pFlag=="") $pFlag="startonfirst";
	$dtNow     = DateTime::createFromFormat('Y-m-d\TH:i:s.v', '1970-01-01T00:00:00.000', $tzUTC);
	$msStart   = 0;
	$skipCycles= 0;
	$backBufferSecs=0;
	$msEnd     = $periodsDurMillis;
	$root->setAttribute("type", "static");
	$root->setAttribute("mediaPresentationDuration", "PT".number_format($periodsDurMillis/1000,3,".","")."S" );
	$root->removeAttribute("availabilityStartTime");
	$root->removeAttribute("publishTime");
	$root->removeAttribute("timeShiftBufferDepth");	
	$root->removeAttribute("suggestedPresentationDelay");	
}

$fullCycles= intval( ($msEnd-$msStart) / $periodsDurMillis); // write 1..n full period cycles
$durExtraCycle= ($msEnd-$msStart) - ($fullCycles*$periodsDurMillis); // duration of last partial period cycle

$dtStart = clone $dtZero;
$dtStart->modify("+${msStart} milliseconds");
$dtEnd  = clone $dtZero;
$dtEnd->modify("+${msEnd} milliseconds");

$dtBackbuffer = clone $dtNow;
$dtBackbuffer->modify("-".($backBufferSecs*1000)." milliseconds");

$extraPeriods=0;   // num of periods in a last partial cycle
$durExtraPeriod=0; // duration of last partial period
for($periodIdx=0, $durSum=0, $durRemaining=$durExtraCycle;
		$periodIdx<$periodCount; $periodIdx++) {
	if($durRemaining<=0) break;
	$extraPeriods++;
	$item = $config["periods"][$periodIdx];
	$durSum += $item["dur"]; // cumulative duration until the last period is found
	if($durSum>=$durExtraCycle) {
		$durExtraPeriod = $durRemaining;
		break;
	}
	$durRemaining -= $item["dur"];
}

if($debug>0) {
	if($debug>=2) {
		echo json_encode($config, JSON_PRETTY_PRINT)."\n";
		//echo json_encode($periodTypes, JSON_PRETTY_PRINT)."\n";
	}
	echo("Parameters\n");
	echo(" drm.pr=".$config['drm']['pr'].", drm.wv=".$config['drm']['wv']
		.", drm.ck=".$config['drm']['ck'].", drm.type=".$config['drm']['type']
		.", static=${isStatic}\n");
	echo(" skipCycles=${skipCycles}, periodsDur=${periodsDurMillis}, periods=${periodCount}");
	echo(", mainDur=". $periodTypes['main']["dur"] .", advertDur=". $periodTypes["advert"]["dur"] ."\n");
	echo(" timeShift=${backBufferSecs}S fullCycles=${fullCycles}, durExtraCycle=${durExtraCycle}\n");
	echo(" extraPeriods=${extraPeriods}, durExtraPeriod=${durExtraPeriod}\n");			
	echo(" startTime=".$dtStart->format("Y-m-d\TH:i:s.v\Z"). ", ". intval($dtStart->format("Uv")) ."\n");  // U=secs, v=millis
	echo(" timeShift=".$dtBackbuffer->format("Y-m-d\TH:i:s.v\Z"). ", ". intval($dtBackbuffer->format("Uv")) ."\n");
	echo(" endTime  =".$dtEnd->format("Y-m-d\TH:i:s.v\Z"). ", ". intval($dtEnd->format("Uv")) ."\n");
	echo(" nowTime  =".$dtNow->format("Y-m-d\TH:i:s.v\Z"). ", ". intval($dtNow->format("Uv")) ."\n");
	echo("Period timelines\n");
}

$periodIdSeq = $skipCycles*$periodCount; // period@id sequence 1..n, 1970-01-01="p1" id
$fullPeriods = $fullCycles*$periodCount;
$lastIdx = $fullPeriods+$extraPeriods-1; // inclusive foreach index for <Period> loop

//if($durExtraPeriod>0) {
//	// drop last (partial)period if less than segment.duration, period must have at least one full segment.
//	$item   = $config["periods"][$lastIdx % $periodCount];
//	$content= $config[$item["name"]];
//	$dur    = intval($durExtraPeriod / $content["segdurms"]) * $content["segdurms"];
//	if($dur<1) {
//		$lastIdx--;
//		$durExtraPeriod=0;
//	}	
//}

$writtenPeriods = 0;
$dtPeriodStart = null;
$dtPeriodEnd = clone $dtStart;
for($idx=0; $idx<=$lastIdx; $idx++) {
	$dtPeriodStart = $dtPeriodEnd; // increment dtPeriodStart, dtPeriodEnd
	$periodIdSeq++;
	$periodIdx= $idx % $periodCount;
	$item     = $config["periods"][$periodIdx];
	$content  = $config[$item["name"]];
	
	$type = $content["type"]; // main,advert
	$prevPeriodId = $periodTypes[$type]["periodId"]; // "p84465281"
	$periodId = $item["id"].strval($periodIdSeq); // "p"+"84465282" or "a"+"84465282"
	$periodTypes[$type]["periodId"] = $periodId;

	$dur = $item["dur"];
	
	// MPDReload: cut duration of last period to sysTime, however players stalled so 
	// keep the original period.duration even if goes over the sysTime !!
	//if($idx==$lastIdx && $durExtraPeriod>0) $dur = $durExtraPeriod;
	
	$dtPeriodEnd  = clone $dtPeriodStart; // increment dtPeriodStart, dtPeriodEnd
	$dtPeriodEnd->modify("+${dur} milliseconds");

	if($type!="main") $prevPeriodId=""; // use connectivityProp(PrevPeriodId<-PeriodId) on main periods only
	
	if($debug>0) {
		echo(" ".str_pad($item["name"]."_".$periodIdx,10) );
		echo(",".str_pad(strval($dur), 6, " ", STR_PAD_LEFT) );
		echo(", ".$dtPeriodStart->format("Y-m-d\TH:i:s.v\Z") );
		echo(" - ".$dtPeriodEnd->format("H:i:s.v\Z") ); //echo(" - ".$dtPeriodEnd->format("Y-m-d\TH:i:s.v\Z") );
		echo(", ". str_pad(intval($dtPeriodStart->format("Uv")), 10, " ", STR_PAD_LEFT) );
		echo(" - ". str_pad(intval($dtPeriodEnd->format("Uv")), 10, " ", STR_PAD_LEFT) );
		echo(", id=".str_pad($periodId, 10, " ", STR_PAD_LEFT) );
		echo(", prevId=".str_pad($prevPeriodId, 10, " ", STR_PAD_LEFT) );
		echo(", startNum=".str_pad($item["startNumber"], 4, " ", STR_PAD_LEFT) );
		echo(", ".$content["folder"]);
		echo("\n");
	}

	// skip first main period if no prevPeriodId available. todo: should we write it anyway?
	if($type=="main" && $prevPeriodId=="" && !$isStatic ) continue;
	$writtenPeriods++;
	
	// use number_format with a decimal delim(".") without thousands delim("")
	$msPeriodStart = intval($dtPeriodStart->format("Uv"));
	$period = $dom->createElement("Period");
	$root->appendChild($period);
	$period->appendChild( xml_createAttribute($dom, "id", $periodId) );

	if($pFlag=="startdur") { // @start + @duration on all
		$period->appendChild( xml_createAttribute($dom, "start", "PT".number_format($msPeriodStart/1000,3,".","")."S" ));
		$period->appendChild( xml_createAttribute($dom, "duration", "PT".number_format($dur/1000,3,".","")."S" ));
	} else if($pFlag=="startonfirst") {
		if($writtenPeriods==1) // @start on first period only, all @duration. best for static?
			$period->appendChild( xml_createAttribute($dom, "start", "PT".number_format($msPeriodStart/1000,3,".","")."S" ));
		$period->appendChild( xml_createAttribute($dom, "duration", "PT".number_format($dur/1000,3,".","")."S" ));			
	} else { // @start on all. best for live?
		$period->appendChild( xml_createAttribute($dom, "start", "PT".number_format($msPeriodStart/1000,3,".","")."S" ));
	}
	//if($writtenPeriods==1) // write @start on first period only
	//	$period->appendChild( xml_createAttribute($dom, "start", "PT".number_format($msPeriodStart/1000,3,".","")."S" ));
	//$period->appendChild( xml_createAttribute($dom, "duration", "PT".number_format($dur/1000,3,".","")."S" ));

	$period->appendChild($dom->createComment(" "
		."ms=".$msPeriodStart
		.", time=".$dtPeriodStart->format("Y-m-d\TH:i:s.v\Z")
		." - ".$dtPeriodEnd->format("H:i:s.v\Z") 		
		.", now=".$dtNow->format("Y-m-d\TH:i:s.v\Z")
		.", ".str_pad($item["name"]."_".$periodIdx,10)
		." "));	// debug comment

	// MPD Custom Event on each period,
	// NOTE: Event@id is xs:unsignedInt(0-4294967295), periodIdSeq should not overflow
	$elemEvent = writeEvent($dom, $period, "http://hbbtv.org/refapp", "1a2b3c", 1000, "MPD event(${periodId}, period start)", 1000, 3000, strval($periodIdSeq) );
	$temp = $dur-3000;
	if($temp>0) // fixme: 1000000+?
		writeEvent($dom, $elemEvent, "http://hbbtv.org/refapp", "1a2b3c", 1000, "MPD event(${periodId}, ending soon)", $temp, 3000, "10".strval($periodIdSeq) ); // use "10" prefix to use unique numbering
	
	// MPD Reload Event(value=1) on last period, 3sec before end-of-duration
	if($idx==$lastIdx && !$isStatic && $mup=="event") {
		// MPDReload: use sysTimeSec for event@id so that it's changed on every mpd refresh
		// FIXME: what if player jumps to an ahead of time and reload event is skipped, possible?
		$msPeriodEnd = intval($dtPeriodEnd->format("Uv"));
		$tsNow       = intval($dtNow->format("Uv"));
		$time        = $tsNow >= $msPeriodEnd-3000 ? $dur-100 : $dur-3000; // //$time = $dur-3000;
		$temp        = intval($tsNow/1000); // intval($dtNow->format("U"));
		writeEvent($dom, $period, "urn:mpeg:dash:event:2012", "1", 1000, "", $time<0?1:$time, -1, strval($temp) );
	}

	// loop adaptation sets, content may not have all "audio","audio1..n","sub1..n" keys,
	// do not exit loop until idx threshold. "video" is always just one key.
	$maxTempIdx = count($content);
	foreach(array("video","audio","sub") as $keyPrefix) {		
	for($temp=0; $temp<$maxTempIdx; $temp++) {
		$key = $temp==0 ? $keyPrefix : $keyPrefix.strval($temp);
		if(!array_key_exists($key, $content)) {
			if($keyPrefix=="video") break;
			else continue;
		}
			
		$as = writeAS($dom, $period, $content[$key]);
		if( $config["drm"]["type"]!="" && array_key_exists("drm", $content[$key]) )
			writeDRM($dom, $as, $config["drm"], $content[$key]);
		if($prevPeriodId!="") writeConnectivityProp($dom, $as, $prevPeriodId);

		writeRole($dom, $as, $content[$key]["role"]);
		if($isEmsg && $type=="main" && $keyPrefix=="video")
			writeEmsgEvent($dom, $as, "http://hbbtv.org/refapp", "1a2b3c"); // write inside video AdaptationSet

		writeSegmentTemplate($dom, $as, $item, $content[$key]);
		writeRepresentations($dom, $as, $item, $content[$key]);
	}}
}

// write trailing elements after the last <Period>
writeTrailingElements($dom, $root);
$out = $dom->saveXML(); // str_replace("\n", "\r\n", $out);
echo $out;
return;

// *****************************************************
// *****************************************************

function writeMPD($dom, $root) {
	$root->appendChild( xml_createAttribute($dom, "xmlns", "urn:mpeg:dash:schema:mpd:2011") );
	$root->appendChild( xml_createAttribute($dom, "xmlns:cenc", "urn:mpeg:cenc:2013") );
	$root->appendChild( xml_createAttribute($dom, "xmlns:mspr", "urn:microsoft:playready") );
	$root->appendChild( xml_createAttribute($dom, "xmlns:mas", "urn:marlin:mas:1-0:services:schemas:mpd") );
	$root->appendChild( xml_createAttribute($dom, "xmlns:ck", "http://dashif.org/guidelines/clearKey") );
	$root->appendChild( xml_createAttribute($dom, "xmlns:dashif", "https://dashif.org/") );
	$root->appendChild( xml_createAttribute($dom, "xmlns:xlink", "http://www.w3.org/1999/xlink") );
	$root->appendChild( xml_createAttribute($dom, "type", "dynamic") );
	$root->appendChild( xml_createAttribute($dom, "availabilityStartTime", "todo") );
	$root->appendChild( xml_createAttribute($dom, "publishTime", "todo") ); // this should be changed only when manifest content is actually changed
	$root->appendChild( xml_createAttribute($dom, "timeShiftBufferDepth", "todo" ) ); // manifest must have periods+timeline enough for this backlog
	$root->appendChild( xml_createAttribute($dom, "suggestedPresentationDelay", "todo") ); // effectiveTimeShiftBuffer=(now-timeShiftbuffer)..(now-presentationDelay)
	$root->appendChild( xml_createAttribute($dom, "maxSegmentDuration", "todo" ) );
	$root->appendChild( xml_createAttribute($dom, "minBufferTime", "PT4S" ) ); // usually fragdur, GOP or segdur?
	$root->appendChild( xml_createAttribute($dom, "profiles", "urn:dvb:dash:profile:dvb-dash:2014,urn:dvb:dash:profile:dvb-dash:isoff-ext-live:2014" ) );
}

function writeEvent($dom, $root, $schemeId, $value, $timescale, $msg, $presTime, $dur, $id) {
	// MPD event in manifest
	$elemRoot=$root;
	if($elemRoot->nodeName!="EventStream") {
		$elemRoot=xml_appendElement($dom, $root, "EventStream");
		xml_appendAttribute($dom, $elemRoot, "schemeIdUri", $schemeId);
		xml_appendAttribute($dom, $elemRoot, "value", $value);
		xml_appendAttribute($dom, $elemRoot, "timescale", strval($timescale));
	}
	if($msg!="") $elem=xml_appendElement($dom, $elemRoot, "Event", $msg); // custom event message field
	else $elem=xml_appendElement($dom, $elemRoot, "Event");	// MDP Event without message field
	xml_appendAttribute($dom, $elem, "presentationTime", strval($presTime)); // N sec from start of period
	if($dur>=0) xml_appendAttribute($dom, $elem, "duration", strval($dur));
	xml_appendAttribute($dom, $elem, "id", $id); // must be unsigned_int
	return $elemRoot;
}

function writeEmsgEvent($dom, $as, $schemeId, $value) {
	// EMSG event inside the segment files
	$elem=xml_appendElement($dom, $as, "InbandEventStream");
	xml_appendAttribute($dom, $elem, "schemeIdUri", $schemeId);
	xml_appendAttribute($dom, $elem, "value", $value);
}

function writeRole($dom, $as, $role) {
	// AdaptationSet Role "main", "alternate", ..
	$elem=xml_appendElement($dom, $as, "Role");
	xml_appendAttribute($dom, $elem, "schemeIdUri", "urn:mpeg:dash:role:2011");	
	xml_appendAttribute($dom, $elem, "value", $role);
}

function writeConnectivityProp($dom, $as, $prevPeriodId) {
	// link 2..n periods to the previous one
	$elem=xml_appendElement($dom, $as, "SupplementalProperty");
	xml_appendAttribute($dom, $elem, "schemeIdUri", "urn:mpeg:dash:period-connectivity:2015");
	xml_appendAttribute($dom, $elem, "value", $prevPeriodId);
}

function writeAS($dom, $period, $aset) {
	// $aset=AdaptationSet in config.json "video","audio","audio1",..
	$as = $dom->createElement("AdaptationSet");
	$period->appendChild($as);
	xml_appendAttribute($dom, $as, "id", $aset["id"]); // must be integer value
	xml_appendAttribute($dom, $as, "contentType", $aset["type"]); // video,audio,subtitles,..
	$as->appendChild( xml_createAttribute($dom, "lang", $aset["lang2"]) );
	if($aset["type"]=="video") {
		$val= $aset["reps"][0]["fps"]; // all reps must use the same fps
		$as->appendChild( xml_createAttribute($dom, "maxFrameRate", $val!=""?$val:"25") );

		$rep = $aset["reps"][count($aset["reps"])-1]; // last video representation must be the largest one
		$as->appendChild( xml_createAttribute($dom, "maxWidth", $rep["width"]) );
		$as->appendChild( xml_createAttribute($dom, "maxHeight", $rep["height"]) );

		$val= $aset["par"]; // PixelAspectRatio
		$as->appendChild( xml_createAttribute($dom, "par", $val!=""?$val:"16:9") );

		$as->appendChild( xml_createAttribute($dom, "segmentAlignment", "true") ); // segments must always be SAP aligned
		$as->appendChild( xml_createAttribute($dom, "startWithSAP", "1") );
	} else if($aset["type"]=="audio" || $aset["type"]=="text") {
		xml_appendAttribute($dom, $as, "segmentAlignment", "true");
		xml_appendAttribute($dom, $as, "startWithSAP", "1");
	}
	return $as;
}	

function writeSegmentTemplate($dom, $as, $item, $aset) {
	// $aset=AdaptationSet content in config.json "video","audio","audio1",..
	$startNumber = $item["startNumber"];
	$timeOffset  = ($startNumber-1)*$aset["segdur"]; // segment's offset in timescale, 0..MAX
	$elem=xml_appendElement($dom, $as, "SegmentTemplate");
	xml_appendAttribute($dom, $elem, "duration", $aset["segdur"]);
	xml_appendAttribute($dom, $elem, "timescale", $aset["timescale"]);	
	xml_appendAttribute($dom, $elem, "startNumber", strval($startNumber));
	xml_appendAttribute($dom, $elem, "presentationTimeOffset", strval($timeOffset));

	xml_appendAttribute($dom, $elem, "initialization", $aset["initurl"]);
	xml_appendAttribute($dom, $elem, "media", $aset["segurl"]);
	return $elem;
}

function writeRepresentations($dom, $as, $item, $aset) {
	// $aset=AdaptationSet content in config.json "video","audio","audio1",..
	$lastidx = count($aset["reps"])-1;
	for($idx=0; $idx<=$lastidx; $idx++) {
		$rep = $aset["reps"][$idx];
		$elem=xml_appendElement($dom, $as, "Representation");
		xml_appendAttribute($dom, $elem, "id", $rep["id"]);
		if($aset["type"]=="video") {
			xml_appendAttribute($dom, $elem, "width", $rep["width"]);
			xml_appendAttribute($dom, $elem, "height", $rep["height"]);
			xml_appendAttribute($dom, $elem, "bandwidth", $rep["bandwidth"]);
			xml_appendAttribute($dom, $elem, "frameRate", $rep["fps"]);
			xml_appendAttribute($dom, $elem, "codecs", $rep["codecs"]);
			xml_appendAttribute($dom, $elem, "scanType", "progressive");
			xml_appendAttribute($dom, $elem, "mimeType", "video/mp4");
			xml_appendAttribute($dom, $elem, "sar", "1:1");
		} else if($aset["type"]=="audio") {
			xml_appendAttribute($dom, $elem, "audioSamplingRate", $rep["rate"]);
			xml_appendAttribute($dom, $elem, "bandwidth", $rep["bandwidth"]);
			xml_appendAttribute($dom, $elem, "codecs", $rep["codecs"]);
			xml_appendAttribute($dom, $elem, "mimeType", "audio/mp4");
			//FIXME: always use 2-channel AAC stereo for now
			$elem=xml_appendElement($dom, $elem, "AudioChannelConfiguration");
			xml_appendAttribute($dom, $elem, "schemeIdUri", "urn:mpeg:dash:23003:3:audio_channel_configuration:2011");	
			xml_appendAttribute($dom, $elem, "value", "2");			
		} else if($aset["type"]=="text") {
			xml_appendAttribute($dom, $elem, "bandwidth", $rep["bandwidth"]);
			xml_appendAttribute($dom, $elem, "codecs", $rep["codecs"]); // must be stpp inband m4s subs
			xml_appendAttribute($dom, $elem, "mimeType", "application/mp4");			
		}
	} 
}

function writeDRM($dom, $as, $configDrm, $aset) {
	//FIXME: all v1..v2 resolutions use the same keyid, no separate key for UltraHD
	$elem=xml_appendElement($dom, $as, "ContentProtection");
	xml_appendAttribute($dom, $elem, "cenc:default_KID", $aset["drm"]["keyid"]);
	xml_appendAttribute($dom, $elem, "schemeIdUri", "urn:mpeg:dash:mp4protection:2011");
	xml_appendAttribute($dom, $elem, "value", $configDrm["type"]); // cenc,cbcs

	if($configDrm["pr"]==1) {
		$elem=xml_appendElement($dom, $as, "ContentProtection");
		xml_appendAttribute($dom, $elem, "schemeIdUri", "urn:uuid:9a04f079-9840-4286-ab92-e65be0885f95");
		xml_appendAttribute($dom, $elem, "value", "playready");
		if($aset["drm"]["pr_pro_".$configDrm["type"]])
			xml_appendElement($dom, $elem, "mspr:pro", $aset["drm"]["pr_pro_".$configDrm["type"]]);
		if($aset["drm"]["pr_pssh_".$configDrm["type"]])
			xml_appendElement($dom, $elem, "cenc:pssh", $aset["drm"]["pr_pssh_".$configDrm["type"]]);
	}
	
	if($configDrm["wv"]==1) {
		$elem=xml_appendElement($dom, $as, "ContentProtection");
		xml_appendAttribute($dom, $elem, "schemeIdUri", "urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed");
		xml_appendAttribute($dom, $elem, "value", "widevine");
		if($aset["drm"]["wv_pssh_".$configDrm["type"]])
			xml_appendElement($dom, $elem, "cenc:pssh", $aset["drm"]["wv_pssh_".$configDrm["type"]]);
	}
	
	if($configDrm["ck"]==1) {
		$elem=xml_appendElement($dom, $as, "ContentProtection");
		xml_appendAttribute($dom, $elem, "schemeIdUri", "urn:uuid:e2719d58-a985-b3c9-781a-b030af78d30e");
		xml_appendAttribute($dom, $elem, "value", "ClearKey1.0");
	}	
}

function writeTrailingElements($dom, $root) {
	global $host, $ctx;
	$elem=$dom->createElement("UTCTiming");
	$elem->appendChild( xml_createAttribute($dom, "schemeIdUri", "urn:mpeg:dash:utc:http-iso:2014") );
	$elem->appendChild( xml_createAttribute($dom, "value", $host.$ctx."/utctiming.php") );
	//$elem->appendChild( xml_createAttribute($dom, "value", "https://time.akamai.com/?iso") ); 
	$root->appendChild($elem);
}

function filterRepresentations($ids, &$reps) {
	for($idxB=count($reps)-1; $idxB>=0; $idxB--) {
		if( strpos($ids, ",".$reps[$idxB]["id"].",", 0)===false ) {
			array_splice($reps, $idxB, 1);
		}
	}
}

////////////////////////////////////////
// full cycle of test periods
// main=6M24S or 384S, use an even duration of 8sec*X for main periods(24=8s*3 segs)
// each period should be longer than 4 seconds !!
//FIXME: advert 6sec jos ei täsmää? pitäskö minimi 8sec?
$SEGDUR_MAIN = 8;  // all main segments must have 100% identical duration
$periods = array();
array_push($periods, 
	// type=main, advert | duration=seconds | startNumber=1..n first segment number
	// id=<period id="p.." or "a.." name prefix, seq=sequence 1..n per type
	 array("type"=>"main",  "duration"=>24, "video"=>"00_llama_1080p_v3"
		 , "startNumber"=>1, "id"=>"", "seq"=>1)
	,array("type"=>"advert", "duration"=>12, "video"=>"test01_v2")
	,array("type"=>"main",   "duration"=>24) // segs 4..6.m4s
	,array("type"=>"advert", "duration"=>8 , "video"=>"test01_v2")
	,array("type"=>"advert", "duration"=>10, "video"=>"test02_v2")
	,array("type"=>"advert", "duration"=>10, "video"=>"test03_v2")
	,array("type"=>"main",   "duration"=>24) // segs 7..9.m4s
	,array("type"=>"advert", "duration"=>26, "video"=>"test00_v2") // combined 1+2+3 advert fixme: tee uusiksi enkodaus 26s pituudelle
	,array("type"=>"main",   "duration"=>24) // segs 10..12.m4s
	,array("type"=>"advert", "duration"=>8 , "video"=>"test01_v2")
	,array("type"=>"main",   "duration"=>24) // segs 13..15.m4s
	,array("type"=>"advert", "duration"=>10 , "video"=>"test02_v2")
	,array("type"=>"main",   "duration"=>24)
	,array("type"=>"advert", "duration"=>10, "video"=>"test03_v2")
	,array("type"=>"main",   "duration"=>24) // main7
	,array("type"=>"main",   "duration"=>24) // main8	
	,array("type"=>"advert", "duration"=>8 , "video"=>"test01_v2")
	,array("type"=>"main",   "duration"=>24)
	,array("type"=>"main",   "duration"=>24)
	,array("type"=>"advert", "duration"=>10, "video"=>"test02_v2")
	,array("type"=>"main",   "duration"=>24) // main11
	,array("type"=>"main",   "duration"=>24) // main12, segs 34..36.m4s
	,array("type"=>"advert", "duration"=>10, "video"=>"test03_v2")
	,array("type"=>"main",   "duration"=>48) // main13, segs 37..39.m4s, 40..42.m4s
	,array("type"=>"advert", "duration"=>8, "video"=>"test03_v2") // advert12
	,array("type"=>"main",   "duration"=>48) // main14, segs 43..45.m4s, 46..48.m4s
	,array("type"=>"advert", "duration"=>4 , "video"=>"test00_v2") // advert13
);


function getSessionValue($key, $default="") {
	return $_SESSION[$key]=="" ? $default : $_SESSION[$key];
}
function setSessionValue($key, $value) {
	$_SESSION[$key] = $value;
}

function startSession($app) {
	// join an existing http session or start a new one
	if($app!="") session_set_cookie_params(0, $app); // limit PHPSESSID to "/appdomain/myapp1" folder
	session_start();
}
function destroySession($app) {
	// destroy http session (deletes PHP tmp/sess_* file)
	if($app!="") {
		$cookieParams = session_get_cookie_params();	
		setcookie(session_name(), '', 0, $cookieParams['path'], $cookieParams['domain'], $cookieParams['secure'], $cookieParams['httponly']);
		$_SESSION = array();
	}
	session_destroy();	
}
function readSessionFile($session) {
	$prefix = session_save_path()."/multiperiod_"; // "/var/lib/php7/multiperiod_xxx.dat"
	$items= array();
	$data= file( $prefix.$session.".dat" );
	foreach($data as $lineidx => $line) {
		if (strpos($line, "=", 0)>0) {
			$item = explode("=", $line);
			$items[trim($item[0])]=trim($item[1]);
		}
	}
	return $items;
}
function writeSessionFile($session, $items) {
	$prefix = session_save_path()."/multiperiod_";
	if($items==null && $session!="") {
		unlink($prefix.$session.".dat");
	} else if ($session!="") {
		$data="##PHP Session File\n";
		foreach($items as $key => $value)
			$data = $data . $key."=".$value."\n";
		$file = fopen($prefix.$session.".dat", "w");
		fwrite($file, $data);
		fclose($file);
	}
}

function getDOMElementByName($elem, $name) {
	foreach($elem->childNodes as $node) {
		if ($node->nodeName==$name) return $node;
	}
	return null;
}
function getDOMElementsByName($elem, $name) : iterable {
	$arr=array();
	foreach($elem->childNodes as $node) {
		if ($node->nodeName==$name) array_push($arr, $node);
	}
	return $arr;
}

class SimpleXMLElementEx extends SimpleXMLElement {
    public function insertChildAt($name, $value, $namespace, $idx) {
		// $idx: 0=first, -1=last
        $targetDom = dom_import_simplexml($this); // Convert ourselves to DOM
        $hasChildren = $targetDom->hasChildNodes(); // Check for children
		if ($namespace=="")
			$newNode = $this->addChild($name, $value);
		else
			$newNode = $this->addChild($name, $value, $namespace);
        // Put in the first position.
        if ($hasChildren) {
            $newNodeDom = $targetDom->ownerDocument->importNode(dom_import_simplexml($newNode), true);
            $targetDom->insertBefore($newNodeDom, $idx<0 ? null : $targetDom->firstChild );
        }
        return $newNode; // Return the new node.
    }
}

?>