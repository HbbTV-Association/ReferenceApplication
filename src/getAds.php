<?php

$ads = array(
	/*
	"https://refapp.hbbtv.org/videos/test/test1_5s.mp4",
	"https://refapp.hbbtv.org/videos/test/test2_5s.mp4",
	"https://refapp.hbbtv.org/videos/test/test3_5s.mp4",
	*/
	"https://refapp.hbbtv.org/videos/test/test4_5s.mp4",
	"https://refapp.hbbtv.org/videos/test/test1_15s.mp4",
	"https://refapp.hbbtv.org/videos/test/test2_15s.mp4",
	"https://refapp.hbbtv.org/videos/test/test3_15s.mp4",
	"https://refapp.hbbtv.org/videos/test/test4_15s.mp4",
	"https://refapp.hbbtv.org/videos/test/test1_30s.mp4" /* ,
	"https://refapp.hbbtv.org/videos/test/test2_30s.mp4",
	"https://refapp.hbbtv.org/videos/test/test3_30s.mp4",
	"https://refapp.hbbtv.org/videos/test/test4_30s.mp4"
	*/
	);
	
// randomize order
shuffle($ads);

// how many ads (defaults one)
$adBreaks = ( isset( $_GET["breaks"] )? (int)$_GET["breaks"] : 1 );

// slice result from shuffled list
$result = array_slice( $ads, 0, $adBreaks );

header("Content-type:application/json");
echo json_encode( $result, JSON_PRETTY_PRINT );

?>
