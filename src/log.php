<?php
// this file saves client side errors to file clientError.txt ( could be put in database aswell )
// errors must be caught in client side script and send here as json string with post method.
// json format is an array of errors occured. Each item has relevant data to one client error.
// clientError.txt format is not valid json, but consist of valid json stings on each row, so it can be easily extracted to variables

header('Content-Type: application/json');

$fp = fopen('php://input', 'rb');
stream_filter_append($fp, 'dechunk', STREAM_FILTER_READ);
$HTTP_RAW_POST_DATA = stream_get_contents($fp);
$data = json_decode( $HTTP_RAW_POST_DATA );

if ( $data )
{
	$type = "log";
	if( isset( $_GET['type'] ) ){
		$type = $_GET['type'];
	}
	
	foreach( $data as $i => $error )
	{
		$row = array( "time" => date("Y-m-d H:i:s"), "user_agent" => $_SERVER['HTTP_USER_AGENT'], "message" => $error);
		file_put_contents("log/".$type.".txt", json_encode( $row ) ."\n", FILE_APPEND );
	}
	echo "{'message' : '". count( $data ) ." client side ".$type." saved to server'}";
}
else
{
	echo "{'message' : 'Error saving client side message to server'}";
}
?>