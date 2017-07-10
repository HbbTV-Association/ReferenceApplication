<?php

	include('settings.php');

	$cookiename = $settings["COOKIE"];
	$jsonstr = file_get_contents('php://input');
	$json = json_decode($jsonstr);
	
	$json->user_agent = $_SERVER['HTTP_USER_AGENT'];
	$json->ip_address = $_SERVER['HTTP_X_FORWARDED_FOR'];
	
	$receiverid = $_COOKIE[$cookiename];
	$json->device_id = $receiverid;
	
	
	$jsonout = json_encode($json);
	
	//file_put_contents("results_to_filesystem/result_".date("YmdHis")."_data.json",$jsonout); 
	$options = array(
		'http' => array(
		'method'  => 'POST',
		'content' => $jsonout,
		'header'=>  "Content-Type: application/json\r\n" .
		"Accept: application/json\r\n")
	);

	$context  = stream_context_create( $options );	
	$result = file_get_contents( $settings["TEST_SERVER"]."/benchmark_result.php", false, $context );
	$result_json = json_decode($result);
	$result_id = $result_json->result_id;
	
	header('Cache-Control: no-cache, must-revalidate');
	header('Expires: Mon, 26 Jul 1997 05:00:00 GMT');	
	
	header('Content-Type: application/json;charset=UTF-8');
	echo '{"success":1,"receiver_id":"'.$receiverid.'","result_id":'.$result_id.'}'; 
?>
