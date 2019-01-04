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

// laurl_pr.php?laurl=MS1236&logfile=mymedia1

$url = @$_REQUEST['laurl']; // redirect soapxml to this LAURL address or use predefined values

$logfile = @$_REQUEST['logfile']; // name of logfile (optional), allow a-z|0-9 characters only.
if ($logfile!="") {
	if (preg_match('/^[a-zA-Z0-9]+$/', $logfile))
		$logfile = "./log/playready_".$logfile.".txt";
	else
		$logfile = ""; // disable if invalid logfile format
}
		
// some players may submit OPTIONS request(zero-length) before POST drm.xml submit
if ($_SERVER['REQUEST_METHOD']=="OPTIONS") {
	header("Content-Length: 0");
	header("Expires: -1");
	return;
}
//header('Content-type: application/soap+xml; charset=utf-8');
header('Content-Type: text/xml; charset=utf-8');
//header('Content-Type: text/plain; charset=utf-8');

if ($url=="") {
	$url="MS1236h";
	//return;
}

if ($url=="MS1234") {
	$url="https://test.playready.microsoft.com/service/rightsmanager.asmx?cfg=(kid:header,sl:2000,persist:false,firstexp:60,contentkey:EjQSNBI0EjQSNBI0EjQSNA==)";
} else if ($url=="MS1235") {
	$url="https://test.playready.microsoft.com/service/rightsmanager.asmx?cfg=(kid:header,sl:2000,persist:false,firstexp:60,contentkey:EjQSNBI0EjQSNBI0EjQSNQ==)";
} else if ($url=="MS1236") {
	$url="https://test.playready.microsoft.com/service/rightsmanager.asmx?cfg=(kid:header,sl:2000,persist:false,firstexp:60,contentkey:EjQSNBI0EjQSNBI0EjQSNg==)";
} else if ($url=="MS1237") {
	$url="https://test.playready.microsoft.com/service/rightsmanager.asmx?cfg=(kid:header,sl:2000,persist:false,firstexp:60,contentkey:EjQSNBI0EjQSNBI0EjQSNw==)";
} else if ($url=="MS1238") {
	$url="https://test.playready.microsoft.com/service/rightsmanager.asmx?cfg=(kid:header,sl:2000,persist:false,firstexp:60,contentkey:EjQSNBI0EjQSNBI0EjQSOA==)";

} else if ($url=="MS1236h") {
	$url="http://test.playready.microsoft.com/service/rightsmanager.asmx?cfg=(kid:header,sl:2000,persist:false,firstexp:60,contentkey:EjQSNBI0EjQSNBI0EjQSNg==)";
}

$c_url = curl_init();

// $post = array();
// $query = http_build_query($post);
$query = file_get_contents('php://input'); // read POST bodypart
curl_setopt($c_url, CURLOPT_URL, $url);
curl_setopt($c_url, CURLOPT_RETURNTRANSFER, true);
curl_setopt($c_url, CURLOPT_POST, 1);
curl_setopt($c_url, CURLOPT_POSTFIELDS, $query);
curl_setopt($c_url, CURLOPT_HTTPHEADER, array(
	'Content-Type: text/xml; charset=utf-8',
	'SOAPAction: "http://schemas.microsoft.com/DRM/2007/03/protocols/AcquireLicense"'
));

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