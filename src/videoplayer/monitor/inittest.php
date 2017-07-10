<?php
	header('Cache-Control: no-cache, must-revalidate');
	header('Expires: Mon, 26 Jul 1997 05:00:00 GMT');
	header('Content-Type: application/json;charset=utf-8');

	include('settings.php');

	$cookiename = $settings['COOKIE'];
	$jsonstr = file_get_contents('php://input');
	$json = json_decode($jsonstr);
	$json->user_agent = $_SERVER['HTTP_USER_AGENT'];
	$json->ip_address = $_SERVER['HTTP_X_FORWARDED_FOR'];
	
	if (!isset($_COOKIE[$cookiename]) || $_COOKIE[$cookiename] == "" || $_COOKIE[$cookiename] == "null") { // if no cookie, add device first and get receiverid
		$receiverstr = "";
	} else {
		$receiverstr = "receiver_id=".$_COOKIE[$cookiename]."&";
	}	
	
	if (isset($json->capabilities)) {
		$xmlstr = $json->capabilities;		
	} else {
		$xmlstr = "";
	}

	// file_put_contents("result_".date("YmdHis")."_prepost.txt",$jsonstr);
	
	$ua = $_SERVER['HTTP_USER_AGENT'];
	$getstr = $receiverstr."ip=".$_SERVER['HTTP_X_FORWARDED_FOR']."&useragent=".urlencode($ua);
	$url = $settings['TEST_SERVER']."setdevice.php?".$getstr;
	$ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
	curl_setopt($ch, CURLOPT_POSTFIELDS,
                    "xmlRequest=".$xmlstr);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
	// curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 300);
	$result = curl_exec($ch);
	curl_close($ch);
	
	$result_json = json_decode($result);
	
	// file_put_contents("result_".date("YmdHis")."_test.txt", $result);
	
	$uuid = $result_json->uuid;
	$expire=time()+60*60*24*30*12*10;
	setcookie($cookiename, $uuid, $expire, "/");

	$json->receiver_id = $result_json->id;
	$json->ua_id = $result_json->ua_id;
	$jsonstr = json_encode($json);
	
	$options = array(
		'http' => array(
		'method'  => 'POST',
		'content' => $jsonstr,
		'header'=>  "Content-Type: application/json\r\n" .
        "Accept: application/json\r\n")
	);

	$context = stream_context_create($options);
	$result = file_get_contents($settings['TEST_SERVER']."/benchmark_result.php", false, $context);
	$result_json = json_decode($result);
	$result_id = $result_json->result_id;
	// file_put_contents("result_".date("YmdHis")."_post.txt","resultid: ".$result);
	
	echo '{"success":1,"receiver_id":"'.$uuid.'","result_id":'.$result_id.'}'; 
	
?>
