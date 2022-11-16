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

// laurl_wv.php?laurl=wvproxy&logfile=myname1

$url = @$_REQUEST['laurl']; // redirect soapxml to this LAURL address or use predefined values
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

// map predefined names to an url
if ($url=="wvproxy") {
	$url="https://widevine-proxy.appspot.com/proxy"; // generic Google test proxy
} else if ($url=="debug") {
	$url="https://m.dtv.fi:8443/debug.jsp"; // dump request-response txt(does not work as a license)
} // else use $url value as-is

$query = file_get_contents('php://input'); // read POST bodypart as-is

$reqParams  = array();
$reqHeaders = array();

array_push($reqHeaders, 'Content-Type: application/octet-stream');
array_push($reqHeaders, "Content-Length: " . strlen($query) );

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