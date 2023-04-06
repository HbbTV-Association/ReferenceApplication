<?php
header( "Expires: Mon, 20 Dec 1998 01:00:00 GMT" );
header( "Last-Modified: " . gmdate("D, d M Y H:i:s") . " GMT" );
header( "Cache-Control: no-cache, must-revalidate" );
header( "Pragma: no-cache" );
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: origin,range,accept,accept-encoding,referer,content-type, SOAPAction,X-AxDRM-Message');
header('Access-Control-Allow-Methods: GET,HEAD,OPTIONS,POST');
header('Access-Control-Expose-Headers: server,range,content-range,content-length,content-type');
// write content-type header after OPTIONS check
// ClearKey DRM server

// some players may submit OPTIONS request(zero-length) before POST drm.xml submit
if ($_SERVER['REQUEST_METHOD']=="OPTIONS") {
	header("Content-Length: 0");
	header("Expires: -1");
	return;
}
//header('Content-Type: text/plain; charset=utf-8');
header('Content-Type: application/json; charset=utf-8');

// https://www.w3.org/TR/encrypted-media/#clear-key-request-format
// https://tools.ietf.org/html/rfc7515
// Request may have one or more KIDs(base64), read first KID from the request for now.
// KID base64 is without trailing "=" padding chars, base64url(no padding "=", "+" is "-", "/" is "_")
// ShakaPlayer(json POST):
//   Request : {"kids":["QyFWeBI0EjQSNBI0EjQSNA"],"type":"temporary"}
//   Response: {"keys": [{"k": "EjQSNBI0EjQSNBI0EjQSNA", "kty": "oct", "kid": "QyFWeBI0EjQSNBI0EjQSNA" }], "type": "temporary"}
// DashjsPlayer(simple GET):
//   https://myserver.com/laurl_ck.php/?QyFWeBI0EjQSNBI0EjQSNA
$kidb="";
$kid ="";

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $req = file_get_contents('php://input'); // read POST bodypart
  $json= json_decode($req);
  $kidb= $json->{"kids"}[0]; // base64 format
  $kidb= str_replace("-","+", str_replace("_","/",$kidb));
  $kid = bin2hex(base64_decode($kidb, true)); // hex format
} else {
  $idx = strrpos($_SERVER['QUERY_STRING'], '?');
  $kidb= substr($_SERVER['QUERY_STRING'], $idx?$idx+1:0);
  $kidb= str_replace("-","+", str_replace("_","/",$kidb));
  $kid = bin2hex(base64_decode($kidb, true)); // hex format
}
if($kid=="") $kid = $_REQUEST["kid"]; // failsafe to "?kid=4321..." param
$kid = strtoupper($kid);
if(strlen($kid)==4) $kid="4321567812341234123412341234".$kid;

// KID=KEY lookup table, find KEY and base64(trim trailing "=" chars)
// "12341234123412341234123412341234" -> "EjQSNBI0EjQSNBI0EjQSNA==" -> "EjQSNBI0EjQSNBI0EjQSNA"
$keys = array(
  "43215678123412341234123412341234" => "12341234123412341234123412341234",
  "43215678123412341234123412341235" => "12341234123412341234123412341235",
  "43215678123412341234123412341236" => "12341234123412341234123412341236",
  "43215678123412341234123412341237" => "12341234123412341234123412341237",
  "43215678123412341234123412341238" => "12341234123412341234123412341238",
  "43215678123412341234123412341239" => "12341234123412341234123412341239",

  "5A461E692ABF5534A30FFC45BFD7148D" => "307F7B3F5579BEF53894A6D946762267"
);
$key = base64_encode(hex2bin($keys[$kid]));
$key = str_replace("=","", str_replace("+","-", str_replace("/","_",$key)));
$kidb= base64_encode(hex2bin($kid));
$kidb= str_replace("=","", str_replace("+","-", str_replace("/","_",$kidb)));

$data = "{\"keys\": [{\"k\": \$key, \"kty\": \"oct\", \"kid\": \$kid }], \"type\": \"temporary\"}";
$data = str_replace("\$key", "\"".$key."\"", $data);
$data = str_replace("\$kid", "\"".$kidb."\"", $data);

echo $data;

?>