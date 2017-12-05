<?php
header('Cache-Control: no-cache, must-revalidate');
header('Expires: Mon, 26 Jul 1997 05:00:00 GMT');	
header('Content-Type: application/xml;charset=UTF-8');

$http_origin = ( isset( $_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : ( isset( $_SERVER['HTTP_HOST'])? $_SERVER['HTTP_HOST'] : "*" ) );
header("Access-Control-Allow-Origin: $http_origin");
header("Access-Control-Allow-Credentials: true");			
header("Access-Control-Allow-Headers: *");
header("Access-Control-Allow-Methods: GET,HEAD,OPTIONS");
header("Access-Control-Max-Age: 1");

$filename = ( isset( $_GET['file'] )? $_GET['file'] : false );

if( $filename != false ){
	echo file_get_contents( $filename );
}
?>