<?php
// common functions

function startsWith($haystack, $needle) {
     $length = strlen($needle);
     return (substr($haystack, 0, $length) === $needle);
}

function endsWith($haystack, $needle) {
    $length = strlen($needle);
	return ($length==0 ? true : substr($haystack, -$length)===$needle);
}

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
		if ($position===false) {
			$path="/".$path; // must start with "/" char
			$position = strpos($path, "/".$variableName."/", 0);		
		}
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

function getContextHost() {
	$proto  = isHTTPS() ? "https" : "http";
	return $proto."://".$_SERVER["HTTP_HOST"]; // "https://myapp.server.com"
}

function isHTTPS() {
	if(isset($_SERVER["HTTPS"])) {
		if($_SERVER["HTTPS"]==1) return true;
		else if($_SERVER["HTTPS"]=="on") return true;
	}
	return false;
}

function readBinaryFile($filename) {
	if(!is_file($filename)) return null;
	$size = filesize($filename);
	$file = fopen($filename, "rb");
	$data = fread($file, $size);
	fclose($file);
	return $data;
}

function writeError($errorCode, $errorText, $contentType="text/plain") {
	// use: writeError(404, "Parameter not found");
	ob_start();
	http_response_code($errorCode);
	echo $errorText;
	$size = ob_get_length();
	header('Content-type: '.$contentType);
	header('Content-length: ' . $size);
	header('Cache-Control: no-store, no-cache, must-revalidate');
	header('Expires: 0');
	ob_end_flush();
	ob_flush();
	flush();
}

//*** XML ***
function xml_appendElement($dom, $parent, $name, $value=null) {	
	$elem = $value==null ? $dom->createElement($name) : $dom->createElement($name, $value);
	$parent->appendChild($elem);
	return $elem;
}

function xml_insertElement($dom, $parent, $name, $value=null, $beforeElem=null) {	
	$elem = $value==null ? $dom->createElement($name) : $dom->createElement($name, $value);
	if ($beforeElem==null) $beforeElem=$parent->firstChild;
	$parent->insertBefore($elem, $beforeElem);
	return $elem;
}

function xml_createAttribute($dom, $name, $value) {
	$attr= $dom->createAttribute($name);
	$attr->value = $value;
	return $attr;
}

function xml_appendAttribute($dom, $parent, $name, $value) {
	$attr = xml_createAttribute($dom, $name, $value);
	$parent->appendChild($attr);
	return $attr;
}



?>