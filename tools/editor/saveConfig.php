<?php
// Save Refapp menu config.json to a disk
// EditorApp : "/usr/share/nginx/html/refapp/editor"
// Refapp    : "/usr/share/nginx/html/refapp/"
//             "/usr/share/nginx/html/refapp/catalogue/"
// ConfigFile: "/usr/share/nginx/html/refapp/editor/../catalogue/config.json"

$BASEDIR = dirname(__FILE__); // "/usr/share/nginx/html/refapp/editor"

header('Content-Type: application/json');
header('Content-Type: text/plain');

$jsonRetval = new \stdClass();
$jsonRetval->status = "";
$jsonRetval->message= "";

$jsonData = null;
$strData = file_get_contents('php://input'); // read POST bodypart
if(strlen($strData)>200*1024) { // ~200KB max size
	$jsonRetval->message="Data too large";
} else if(strlen($strData)<20) {
	$jsonRetval->message="Data is empty";
}  else {
	$jsonData = json_decode($strData); ## try to parse json, returns NULL if syntax errors
}

if($jsonData == null) {
	http_response_code(400); // BAD_REQUEST
	$jsonRetval->status = "ERROR";
	echo(json_encode($jsonRetval));
	return;
}

$configFile = $BASEDIR . "/../catalogue/config.json";
file_put_contents($configFile, $strData);

$jsonRetval->status = "OK";
echo(json_encode($jsonRetval));

?>