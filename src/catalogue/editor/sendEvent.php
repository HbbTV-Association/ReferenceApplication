<?php

$url = "http://212.226.118.166:8080/playout_manager/superuser/stream_event_fire.jsp?cmd=fire";

//$data = $_POST;

// test data:
$data = array(
	"application_id" => 3,
	"carousel_id" => 9,
	"desctype" => "kvpairs",
	"event_description" => "content=Press OK to read News\nurl=http://hbbtv.dtv.fi/mtv3/juurinyt/\nvalid=10\ntimeout=10\ndelay=0",
	"event_name" => "launcherEvent");

$options = array(
        'http' => array(
        'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
        'method'  => 'POST',
        'content' => http_build_query($data),
    )
);

$context  = stream_context_create($options);
$result = file_get_contents($url, false, $context);
var_dump($result);
//var_dump( $context );

?>