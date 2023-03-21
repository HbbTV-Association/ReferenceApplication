<?php
header( "Expires: Mon, 20 Dec 1998 01:00:00 GMT" );
header( "Last-Modified: " . gmdate("D, d M Y H:i:s") . " GMT" );
header( "Cache-Control: no-cache, must-revalidate" );
header( "Pragma: no-cache" );
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: origin,range,accept,accept-encoding,referer,content-type,SOAPAction,X-AxDRM-Message,access-control-allow-origin');
header('Access-Control-Allow-Methods: GET,HEAD,OPTIONS,POST');
header('Access-Control-Expose-Headers: server,range,content-range,content-length,content-type');
// write content-type header after OPTIONS check
// 1st request: OPTIONS cors
// 2nd request: 2-bytes post payload, Widevine Service Certificate Request, pass as-is to widevine server
// 3rd request: many bytes post payload, laurl license request

// laurl_wv.php?laurl=Prod1235&alg=cenc&logfile=myname1
// laurl_wv.php?alg=cbcs&logfile=myname1

$url = @$_REQUEST['laurl']; // redirect soapxml to this LAURL address or use predefined values
$alg = strtolower(@$_REQUEST['alg']); // cenc,cbcs, default to "cenc"
$headerCustomdata = @$_REQUEST['header-customdata']; // put to LAURL request header (BuyDRM xmlauth)

$logfile = @$_REQUEST['logfile']; // name of logfile (optional), allow a-z|0-9 characters only.
if ($logfile!="") {
	if (preg_match('/^[a-zA-Z0-9]+$/', $logfile))
		$logfile = "./log/widevine_".$logfile.".txt";
	else
		$logfile = ""; // disable if invalid logfile format
}
		
// some players may submit OPTIONS request(zero-length) before POST drm.xml submit
if ($_SERVER['REQUEST_METHOD']=="OPTIONS") {
	header("Content-Length: 0");
	header("Expires: -1");
	return;
}
//header('Content-Type: text/plain; charset=utf-8');
//header('Content-Type: text/html; charset=utf-8'); // this comes from GoogleLaUrlProxy so use it even if reply was a binary
header('Content-Type: application/octet-stream');

$query = file_get_contents('php://input'); // read POST bodypart as-is
$reqLen= strlen($query);

// Service Certificate Request: if url was empty then use ExpressPlay Prod1236 url
if($reqLen>0 && $reqLen<6 && $url=="")
	$url="Prod1236";

// read KeyID from request, find last 08,01,12,10 delim then len=16 bytes.
// TODO: parse CENC,CBCS schema? for now caller must give "?alg=cbcs" param.
if($reqLen>15 && $url=="") {
  $kid=""; // "43215678123412341234123412341236"
  //echo("|");
  //for($idx=0; $idx<$reqLen; $idx++) {
  //  echo(bin2hex($query[$idx]));
  //}
  //echo("|");
  $foundIdx=13; // default to 13 it may work if we are lucky
  for($idx=10; $idx<$reqLen-5; $idx++) {
	if( ord($query[$idx])==0x08 && ord($query[$idx+1])==0x01
			&& ord($query[$idx+2])==0x12 && ord($query[$idx+3])==0x10 ) {
		$foundIdx = $idx;
	}
	if( ord($query[$idx])==0x0A && ord($query[$idx+1])==0x30
			&& ord($query[$idx+2])==0x12 && ord($query[$idx+3])==0x10 ) {
		$foundIdx = $idx;
	}
	// refapp test keys "43,21,56,78,..,12,34"
	if( ord($query[$idx])==0x43 && ord($query[$idx+1])==0x21
			&& ord($query[$idx+2])==0x56 && ord($query[$idx+3])==0x78 ) {
		$foundIdx = $idx-4;
		break;
	}	
  }
  $maxIdx=$foundIdx+4+16;
  for($idx=$foundIdx+4; $idx<$maxIdx; $idx++)
    $kid = $kid . bin2hex($query[$idx]);  
  
  if($kid!="") $url = "Prod".substr($kid, 28, 4);
  if($alg=="cbcs") $url=$url."_CBCS";
  //echo($url);
  //return;
}

// map predefined names to an url
if ($url=="wvproxy") {
	$url="https://widevine-proxy.appspot.com/proxy"; // generic Google test proxy
} else if ($url=="debug") {
	$url="https://m.dtv.fi:8443/debug.jsp"; // dump request-response txt(does not work as a license)

} else if ($url=="Prod1236") {
	$url="https://wv.service.expressplay.com/hms/wv/rights/?ExpressPlayToken=BgAAABc2Ke0AJDY2NzY5OWMwLTViODYtNDMwOS1iMjA4LTRlY2JkMjdmMWNmOAAAAHBGpE_oy8Ke7joE41kJg_NPODFHaJl6abAZbYLxDwJfc9OHM3PEPUFxf0vKNbPta3iZqzKy29vfWVQ1bNjdHAggOhsPphdJeWDC1fsGSqFPY8A2hcqBBgRLZXQ_sgIYMWFLHCSbxl6TsoFjY8n7Bdvm3WPQVV-m1Q1MvwmDafF1tMcwi6U";
} else if ($url=="Prod1236_CBCS") {
	$url="https://wv.service.expressplay.com/hms/wv/rights/?ExpressPlayToken=BgAAABc2KZ0AJDY2NzY5OWMwLTViODYtNDMwOS1iMjA4LTRlY2JkMjdmMWNmOAAAAHDDA0TTQCSGcSkcYd8sPEpsT7csFco7nOe-7wJ4ws3LQRRaccS07gWw_JlcLEyon6988mcn-NnsBuGDQZtwzuaZB_VgYajXCw2MJ-JSixfpL10ZGVbdpS1myYgxncjOJrGqxsTKeSNVt0MLD2jq5NLjWLJqhU0pxsEW5S5x57uAW4H9p7w";

} else if ($url=="Prod1237") {
	$url="https://wv.service.expressplay.com/hms/wv/rights/?ExpressPlayToken=BgAAABc2KaEAJDY2NzY5OWMwLTViODYtNDMwOS1iMjA4LTRlY2JkMjdmMWNmOAAAAHC_J54gqyb9L61HbWX9a9ZdpGqK3KW97YouIpMqvkFLO8XAP3VV5aGqY_QbHyL4Rl3zE6v8D5BY36U0vgKd0Edvs7WDxBoLE0qxNRlCbMd5e_RZ2PeKX0UBYHg1YOC7EKgL1lvNnz_ui5gdvyxryb8gDUzWRRIWcphPA-yXvaBoBx-Y23s";
} else if ($url=="Prod1237_CBCS") {
	$url="https://wv.service.expressplay.com/hms/wv/rights/?ExpressPlayToken=BgAAABc2Ke0AJDY2NzY5OWMwLTViODYtNDMwOS1iMjA4LTRlY2JkMjdmMWNmOAAAAHC810DjxmIQC5Rv2Hkc-YUb7KcRkX2-vUy2CK9l5Q6tzcIWaEvSf6qLbP8UkmOJqyN3-dYrkzJGQcQR-HsqLJTHRMbfCiwNvLdhWVr8HERSVPnBEIdNBIBcoVHcJui5rKukBJxgX5V1z_WUjs8VYXPJgzOYGXUd24K7yvd-5TtZFD_pg_A";

} // else use $url value as-is


$reqParams  = array();
$reqHeaders = array();

array_push($reqHeaders, 'Content-Type: application/octet-stream');
array_push($reqHeaders, "Content-Length: " . $reqLen );

if ($headerCustomdata!="") array_push($reqHeaders, "customdata: ${headerCustomdata}");

if(count($reqParams)>0) $url = $url."?".http_build_query($reqParams);

$c_url = curl_init();
curl_setopt($c_url, CURLOPT_URL, $url);
curl_setopt($c_url, CURLOPT_RETURNTRANSFER, true);
curl_setopt($c_url, CURLOPT_POST, 1);
curl_setopt($c_url, CURLOPT_POSTFIELDS, $query);
curl_setopt($c_url, CURLOPT_HTTPHEADER, $reqHeaders);

if ($logfile!="") {
	$dtNow = new DateTime("now", new DateTimeZone("UTC") );
	$sNow  = $dtNow->format("Y-m-d H:i:se");
	$data = "------------------------\n"
		. "Request: ". $sNow ."\n"
		. "UserAgent: ". $_SERVER['HTTP_USER_AGENT'].'' ."\n"
		. "RemoteAddr: ". $_SERVER['REMOTE_ADDR'] ."\n"
		. "Url: ". $url ."\n"
		. $query ."\n";
	file_put_contents($logfile, $data, FILE_APPEND|LOCK_EX);
}

$soap = curl_exec($c_url);
$curl_errno = curl_errno($c_url);
$curl_error = curl_error($c_url);
		
if($soap === FALSE || $curl_errno > 0){
	$soap = $curl_errno." - ".$curl_error;
	curl_close($c_url);	
}
echo $soap;

if ($logfile!="") {
	$data = "\nResponse\n"
		. $soap ."\n"
		. "------------------------\n";
	file_put_contents($logfile, $data, FILE_APPEND|LOCK_EX);
}

?>