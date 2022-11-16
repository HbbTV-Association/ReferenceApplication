<?php
// Provides dynamic multiperiod.mpd, each MDPUpdate(refresh) reload request
// contains more periods. Use session param to track playback session.
// /videos/multiperiod.php?session=myrandomid&periods=p1;p2,p3,p4,p5;p6,p7,p8,p9;p10,p11&mpd=00_llama_multiperiod_v1/manifest.mpd
// /videos/multiperiod.php/session/myrandomid/periods/p1;p2,p3,p4,p5;p6,p7,p8,p9;p10,p11/debug/0/mpd/00_llama_multiperiod_v1/manifest.mpd


header("Expires: Mon, 20 Dec 1998 01:00:00 GMT" );
header("Last-Modified: " . gmdate("D, d M Y H:i:s") . " GMT" );
header("Cache-Control: no-cache, must-revalidate" );
header("Pragma: no-cache" );
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: origin,range,accept,accept-encoding,referer,content-type,SOAPAction,X-AxDRM-Message,access-control-allow-origin');
header('Access-Control-Allow-Methods: GET,HEAD,OPTIONS,POST');
header('Access-Control-Expose-Headers: server,range,content-range,content-length,content-type');
// write content-type header after OPTIONS check
// some players may submit OPTIONS request(zero-length)
if ($_SERVER['REQUEST_METHOD']=="OPTIONS") {
	header("Content-Length: 0");
	header("Expires: -1");
	return;
}

$basedir= dirname(__FILE__); // "/srv/www/htdocs/myapp"
$ctx    = getContextPath();  // "/videos" use as a cookie context path
$path   = getSuffixPath();   // "session/xx/periods/yy/.."
$proto  = isHTTPS() ? "https" : "http";

$debug  = getParam($path, "debug", "0")=="1";
$session= getParam($path, "session", "");
$arrPeriods = explode(";", getParam($path, "periods", "") );
$mpd    = getParam($path, "mpd", "", true); // NOTE: this must be a last value in a pathparam

if($session=="" || $arrPeriods[0]=="" || !strpos($mpd, "..", 0)===false ) {
	writeError(404, "Parameter not found");
	die();
}
if(preg_match("/[^A-Za-z0-9\-\_]/", $session)) {
	writeError(404, "Session not found");
	die();
}

if($debug) {
	header("Content-Type: text/plain");
	//echo "basedir=" . $basedir . "\n";
	//echo "sessionSavePath=" . session_save_path() . "\n"; // "/var/lib/php7"
	echo "ctx=" . $ctx ."\n";
	echo "path=" . $path ."\n";
	echo "mpd=" . $mpd ."\n";
	echo "session=" . $session ."\n";
	for($idx=0; $idx<count($arrPeriods); $idx++)
		echo "period_".$idx ."=". $arrPeriods[$idx]."\n";
} else {
	header("Content-Type: Content-Type: application/dash+xml");
}

$xml = simplexml_load_string(file_get_contents($basedir."/".$mpd), 'SimpleXMLElementEx');
if($xml===false || $xml->getName()!="MPD") {
	writeError(404, "XML resource not found");
	die();
}

// modify existing BaseURLs (NOTE: hardcoded hostname for now, should be dynamic)
foreach($xml->Period as $period) {
	$val = $period->BaseURL;
	if($val!="") {
		$val = str_replace("../../", $proto."://refapp.hbbtv.org/videos/", $val);
		$val = str_replace("../", $proto."://refapp.hbbtv.org/videos/", $val);
		$period->BaseURL = $val;
	}
}


$arrSession = readSessionFile($session); // read session file
$step = (int)( $arrSession["step"]!="" ? $arrSession["step"] : "0" ); // 0..n
if($step >= count($arrPeriods)-1) {
	// last refresh, return all periods, delete session file
	$step=count($arrPeriods)-1;
	writeSessionFile($session, null);
} else {
	// next refresh, use next periods step
	$arrSession["step"]    = strval($step+1);
	$arrSession["mpd"]     = $mpd;
	$arrSession["remoteIP"]= $_SERVER["REMOTE_ADDR"];
	$arrSession["ua"]      = isset($_SERVER["HTTP_USER_AGENT"]) ? $_SERVER["HTTP_USER_AGENT"] : "";
	writeSessionFile($session, $arrSession);
}
/*startSession($ctx); // php session per this appcontext path, this did not work properly in dashjs player why?
$step = (int)getSessionValue("multiperiod_step_".$session, "0"); // 0..n
if($step >= count($arrPeriods)-1) {
	// last refresh, return all periods
	$step=count($arrPeriods)-1;
	setSessionValue("multiperiod_step_".$session, "0");
} else {
	// next refresh, use next periods step
	setSessionValue("multiperiod_step_".$session, strval($step+1) );
}*/


$arrStepPeriods=[]; // "p1", "p2", ...
for($idx=0; $idx<=$step; $idx++)
	$arrStepPeriods = array_merge($arrStepPeriods, explode(",", $arrPeriods[$idx]));

header('X-MPD-Periods: ' . implode(",",$arrStepPeriods) );

if($debug) {
	echo "step=".$step."\n";
	for($idx=0; $idx<count($arrStepPeriods); $idx++)
		echo "period_".$idx ."=". $arrStepPeriods[$idx]."\n";
}

for($idx=count($xml->Period)-1; $idx>=0; $idx--) {
	$period = $xml->Period[$idx];
	if(!in_array($period["id"], $arrStepPeriods))
		unset($xml->Period[$idx]); // drop <Period>
}

echo $xml->asXML();
//$out = $xml->asXML();
//$out = preg_replace("/<!--(.|\s)*?-->/", "", $out);
//$dom = new DOMDOcument();
//$dom->preserveWhiteSpace=false;
//$dom->formatOutput=true;
//$dom->loadXML($out);
//$out = $dom->saveXML();
//$out = str_replace("\n", "\r\n", $out);
//echo $out;

//******************************************
//******************************************

// read url param or suffixpath param
function getParam($path, $variableName, $default="", $remainingData=false) {
	if (isset($_GET[$variableName])) {
		$val = $_GET[$variableName];
	} else {
		$val = getParamFromPath($path, $variableName, $default, $remainingData);
	}
	return $val!="" ? $val : $default;
}

// read param from suffixpath
function getParamFromPath($path, $variableName, $default="", $remainingData=false) {
	if ($remainingData==true) {
		// return "/cid/xxx/seg/v1/i.mp4" -> "v1/i.mp4"
		$position = strpos($path, "/".$variableName."/", 0);		
		if ($position===false) return $default;
		return substr($path, $position+strlen($variableName)+2);
	} else {
		$urlParts = explode('/', preg_replace('/\?.+/', '', $path));
		$position = array_search($variableName, $urlParts);
		if($position !== false && array_key_exists($position+1, $urlParts))
			return $urlParts[$position+1];
		return $default;
	}
}

// Get trailing path from URI after this script name.
function getSuffixPath() {
	$url = $_SERVER['REQUEST_URI']; // "/some/app/script.php/cid/c1/seg/1234-init.mp4
	$idx = strpos($url, ".php/", 0);
	if($idx===false) return "";
	$url = substr($url, $idx+1); // script.php/cid/c1/seg/1234-init.mp4
	$path= substr($url, strpos($url, "/",0)+1); // cid/c1/seg/1234-init.mp4
	return $path;
}

function getContextPath() {
	// parse application context path from URL
	$url = $_SERVER['REQUEST_URI']; // "/myfolder/sub1/page.php"
	$url = substr($url, 0, strpos($url, ".php", 0) );
	return substr($url, 0, strrpos($url, "/", 0)); // "/myfolder/sub1"
}

function isHTTPS() {
	if(isset($_SERVER["HTTPS"])) {
		if($_SERVER["HTTPS"]==1) return true;
		else if($_SERVER["HTTPS"]=="on") return true;
	}
	return false;
}

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

function writeError($errorCode, $errorText) {
	ob_start();
	http_response_code($errorCode);
	echo $errorText;
	$size = ob_get_length();
	header('Content-type: text/plain');
	header('Content-length: ' . $size);
	header('Cache-Control: no-store, no-cache, must-revalidate');
	header('Expires: 0');
	ob_end_flush();
	ob_flush();
	flush();
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