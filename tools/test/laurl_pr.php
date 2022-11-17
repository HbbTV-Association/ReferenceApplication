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
// laurl_pr.php?laurl=clientinfo&logfile=mymedia1

$url = @$_REQUEST['laurl']; // redirect soapxml to this LAURL address or use predefined values, if empty use WRMHeaderKID
$headerCustomdata  = @$_REQUEST['header-customdata']; // put to LAURL request header (BuyDRM xmlauth)
$headerNVAuth      = @$_REQUEST['header-nvauth']; // nv-authorizations jwt token(nagra)
$headerNVPreAuth   = @$_REQUEST['header-nvpreauth']; // PreAuthorization jwt token(nagra)
$headerCustomdataDT= @$_REQUEST['header-dtcd']; // DrmToday CustomData

$persist = @$_REQUEST['persist']; // MSTest server persist license

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

$query = file_get_contents('php://input'); // read POST bodypart

// parse KID from playready soapxml
// <soap:Envelope..> / <soap:Body> / <AcquireLicense..> / <challenge> / <LA..> / <ContentHeader> / <WRMHEADER..
// <WRMHEADER version="4.0.0.0"><DATA><PROTECTINFO><KEYLEN>16</KEYLEN><ALGID>AESCTR</ALGID></PROTECTINFO><KID>base64..</KID><LA_URL>..</LA_URL><LUI_URL>..</LUI_URL><CHECKSUM>hpGkml6ZzKQ=</CHECKSUM></DATA></WRMHEADER>
// <WRMHEADER version="4.3.0.0"><DATA><LA_URL>..</LA_URL><PROTECTINFO><KIDS><KID ALGID="AESCBC" VALUE="base64.."></KID></KIDS></PROTECTINFO></DATA></WRMHEADER>
// KID(wrm)   : eFYhQzQSNBISNBI0EjQSNg==
// KID(wrmhex): 78562143 3412 3412 1234 123412341236
// KID(Guid)  : 43215678-1234-1234-1234-123412341236
//$xml = simplexml_load_string($query, 'SimpleXMLElementEx');
//if($xml===false) {
//	writeError(404, "XML resource not found");
//	die();
//}
$kid    = "";
$algId  = "";
$delimH = strpos($query, "<WRMHEADER", 0);
$delimS = strpos($query, "<KID>", $delimH);
$delimE = -1;
if($delimS<1) {		
	$delimS = strpos($query, "<KID ", $delimH); // v4.3
	$delimS = strpos($query, "VALUE=\"", $delimS)+7;
	$delimE = $delimS>7 ? strpos($query, "\"", $delimS) : -1;
	$algId  = strpos($query, " ALGID=\"AESCBC\"", $delimH) > 0 ? "aescbc" : "";
} else {
	$delimE = strpos($query, "</KID>", $delimS); // v4.0
	if($delimE>0) $delimS = $delimS+5;
	$algId  = strpos($query, "<ALGID>AESCBC</", $delimH) > 0 ? "aescbc" : "";
}
if($delimE>0) {
	$val = substr($query, $delimS, $delimE-$delimS); // KIDWrm base64
	$kid = bin2hex( base64_decode($val,TRUE) ); // KIDWrmhex in mixed bigendian-littleendian
	$kid =   substr($kid, 6,2).substr($kid, 4,2).substr($kid, 2,2).substr($kid, 0,2) // KID(guid)
		."-".substr($kid, 10,2).substr($kid, 8,2)
		."-".substr($kid, 14,2).substr($kid, 12,2)
		."-".substr($kid, 16,4)
		."-".substr($kid, 20,12);
}

if ($url=="" && $kid!="") $url = "MS".substr($kid, 32, 4);
if ($url=="MS1234") {
	//$url="https://test.playready.microsoft.com/service/rightsmanager.asmx?cfg=(kid:header,sl:2000,persist:false,firstexp:60,contentkey:EjQSNBI0EjQSNBI0EjQSNA==)";
	$url="https://test.playready.microsoft.com/service/rightsmanager.asmx?cfg=(kid:header,sl:2000,persist:false,contentkey:EjQSNBI0EjQSNBI0EjQSNA==,\$algId)";
} else if ($url=="MS1235") {
	$url="https://test.playready.microsoft.com/service/rightsmanager.asmx?cfg=(kid:header,sl:2000,persist:false,contentkey:EjQSNBI0EjQSNBI0EjQSNQ==,\$algId)";
} else if ($url=="MS1236") {
	$url="https://test.playready.microsoft.com/service/rightsmanager.asmx?cfg=(kid:header,sl:2000,persist:false,contentkey:EjQSNBI0EjQSNBI0EjQSNg==,\$algId)";
} else if ($url=="MS1237") {
	$url="https://test.playready.microsoft.com/service/rightsmanager.asmx?cfg=(kid:header,sl:2000,persist:false,contentkey:EjQSNBI0EjQSNBI0EjQSNw==,\$algId)";
} else if ($url=="MS1238") {
	$url="https://test.playready.microsoft.com/service/rightsmanager.asmx?cfg=(kid:header,sl:2000,persist:false,contentkey:EjQSNBI0EjQSNBI0EjQSOA==,\$algId)";

} else if ($url=="MS1236h" || $url=="") {
	$url="http://test.playready.microsoft.com/service/rightsmanager.asmx?cfg=(kid:header,sl:2000,persist:false,contentkey:EjQSNBI0EjQSNBI0EjQSNg==,\$algId)";

} else if ($url=="clientinfo") {	
	$url="https://test.playready.microsoft.com/service/rightsmanager.asmx?cfg=(msg:clientinfo)";
}

if($algId=="aescbc") {
	$url = str_replace("\$algId", "ckt:aescbc", $url); // use aes CBC
} else {
	$url = str_replace(",\$algId", "", $url); // use aes CBR, traditional CENC drm scheme
}

// use MSTest server with a persist license
if($persist) {
	// begindate,enddate=-4min .. +4min
	$dtNow = new DateTime("now", new DateTimeZone("UTC") );
	$dtNow->sub(new DateInterval("PT4M"));
	$sBegin= $dtNow->format("YmdHis"); // YYYYMMDDhhmmss
	$dtNow->add(new DateInterval("PT8M"));
	$sEnd  = $dtNow->format("YmdHis");	
	$url = str_replace(",persist:false,", ",persist:true,begindate:${sBegin},enddate:${sEnd},", $url);
}

$c_url = curl_init();
$reqHeaders = array(
	"Content-Type: text/xml; charset=utf-8",
	"SOAPAction: ". $_SERVER["SOAPAction"], // http://schemas.microsoft.com/DRM/2007/03/protocols/AcquireLicense, /AcknowledgeLicense
	"Content-Length: " . strlen($query)
);
if ($headerCustomdata!="") array_push($reqHeaders, "customdata: ${headerCustomdata}");
if ($headerNVAuth!="") array_push($reqHeaders, "nv-authorizations: ${headerNVAuth}");
if ($headerNVPreAuth!="") array_push($reqHeaders, "PreAuthorization: ${headerNVPreAuth}");
//if ($headerCustomdataDT!="") array_push($reqHeaders, "dt-customdata: ${headerCustomdataDT}");
if ($headerCustomdataDT!="") array_push($reqHeaders, "http-header-CustomData: ${headerCustomdataDT}");

// $post = array();
// $query = http_build_query($post);

curl_setopt($c_url, CURLOPT_URL, $url);
curl_setopt($c_url, CURLOPT_RETURNTRANSFER, true);
curl_setopt($c_url, CURLOPT_POST, 1);
curl_setopt($c_url, CURLOPT_POSTFIELDS, $query);
curl_setopt($c_url, CURLOPT_HTTPHEADER, $reqHeaders);
//curl_setopt($c_url, CURLOPT_HTTPHEADER, array(
//	'Content-Type: text/xml; charset=utf-8',
//	'SOAPAction: "http://schemas.microsoft.com/DRM/2007/03/protocols/AcquireLicense"'
//));

if ($logfile!="") {
	$dtNow = new DateTime("now", new DateTimeZone("UTC") );
	$sNow  = $dtNow->format("Y-m-d H:i:se");
	$data = "------------------------\n"
		. "Request: ". $sNow ."\n"
		. "Url: ". $_SERVER["REQUEST_URI"] ."\n"
		. "UserAgent: ". $_SERVER['HTTP_USER_AGENT'].'' ."\n"
		. "RemoteAddr: ". $_SERVER['REMOTE_ADDR'] ."\n"
		. "LaUrl: ". $url ."\n"
		. "KID(Guid): ". $kid ."\n"
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