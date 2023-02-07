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
	"https://refapp.hbbtv.org/videos/test/test1_30s.mp4"
	/*,"https://refapp.hbbtv.org/videos/test/test2_30s.mp4"
	,"https://refapp.hbbtv.org/videos/test/test3_30s.mp4"
	,"https://refapp.hbbtv.org/videos/test/test4_30s.mp4"
	*/
	);
	
// how many ads (defaults one)
$adBreaks = ( isset( $_GET["breaks"] )? (int)$_GET["breaks"] : 1 );
$preroll  = "preroll"==$_GET["position"];

// slice result from shuffled list
$result=null;
if($preroll) {
	$result = array_slice( $ads, 0, $adBreaks ); // use 5s-15s adverts only
} else {
	shuffle($ads); // randomize midroll adverts
	$result = array_slice( $ads, 0, $adBreaks );
}

header("Content-type:application/json");
echo json_encode( $result, JSON_PRETTY_PRINT );

?>
