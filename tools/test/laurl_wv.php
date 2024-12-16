<?php
header( "Expires: Mon, 20 Dec 1998 01:00:00 GMT" );
header( "Last-Modified: " . gmdate("D, d M Y H:i:s") . " GMT" );
header( "Cache-Control: no-cache, must-revalidate" );
header( "Pragma: no-cache" );
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: origin,range,accept,accept-encoding,referer,content-type,SOAPAction,X-AxDRM-Message,access-control-allow-origin');
header('Access-Control-Allow-Methods: GET,HEAD,OPTIONS,POST');
header('Access-Control-Expose-Headers: server,range,content-range,content-length,content-type');
// write content-type header after OPTIONS check
// 1st request: OPTIONS cors
// 2nd request: 2-bytes post payload, Widevine Service Certificate Request, pass as-is to widevine server
// 3rd request: many bytes post payload, laurl license request

// laurl_wv.php?laurl=Prod1235&alg=cenc&logfile=myname1
// laurl_wv.php?alg=cbcs&logfile=myname1

$url = @$_REQUEST['laurl']; // redirect soapxml to this LAURL address or use predefined values
$alg = strtolower(@$_REQUEST['alg']); // cenc,cbcs, default to "cenc"
$headerCustomdata = @$_REQUEST['header-customdata']; // put to LAURL request header (BuyDRM xmlauth)

$logfile = @$_REQUEST['logfile']; // name of logfile (optional), allow a-z|0-9 characters only.
if ($logfile!="") {
	if (preg_match('/^[a-zA-Z0-9]+$/', $logfile))
		$logfile = "./log/widevine_".$logfile.".txt";
	else
		$logfile = ""; // disable if invalid logfile format
}
		
// some players may submit OPTIONS request(zero-length) before POST drm.xml submit
if ($_SERVER['REQUEST_METHOD']=="OPTIONS") {
	header("Content-Length: 0");
	header("Expires: -1");
	return;
}
//header('Content-Type: text/plain; charset=utf-8');
//header('Content-Type: text/html; charset=utf-8'); // this comes from GoogleLaUrlProxy so use it even if reply was a binary
header('Content-Type: application/octet-stream');

$query = file_get_contents('php://input'); // read POST bodypart as-is
$reqLen= strlen($query);

// Service Certificate Request: if url was empty then use ExpressPlay Prod1236 url
if($reqLen>0 && $reqLen<6 && $url=="")
	$url="Prod1236";

// read KeyID from request, find last 08,01,12,10 delim then len=16 bytes.
// TODO: parse CENC,CBCS schema? for now caller must give "?alg=cbcs" param.
if($reqLen>15 && $url=="") {
  $kid=""; // "43215678123412341234123412341236"
  //echo("|");
  //for($idx=0; $idx<$reqLen; $idx++) {
  //  echo(bin2hex($query[$idx]));
  //}
  //echo("|");
  $foundIdx=13; // default to 13 it may work if we are lucky
  for($idx=10; $idx<$reqLen-5; $idx++) {
	if( ord($query[$idx])==0x08 && ord($query[$idx+1])==0x01
			&& ord($query[$idx+2])==0x12 && ord($query[$idx+3])==0x10 ) {
		$foundIdx = $idx;
	}
	if( ord($query[$idx])==0x0A && ord($query[$idx+1])==0x30
			&& ord($query[$idx+2])==0x12 && ord($query[$idx+3])==0x10 ) {
		$foundIdx = $idx;
	}
	// refapp test keys "43,21,56,78,..,12,34"
	if( ord($query[$idx])==0x43 && ord($query[$idx+1])==0x21
			&& ord($query[$idx+2])==0x56 && ord($query[$idx+3])==0x78 ) {
		$foundIdx = $idx-4;
		break;
	}	
  }
  $maxIdx=$foundIdx+4+16;
  for($idx=$foundIdx+4; $idx<$maxIdx; $idx++)
    $kid = $kid . bin2hex($query[$idx]);  
  
  if($kid!="") $url = "Prod".substr($kid, 28, 4);
  if($alg=="cbcs") $url=$url."_CBCS";
  //echo($url);
  //return;
}

// map predefined names to an url
// 2023-10-05/Aki
if ($url=="wvproxy") {
	$url="https://widevine-proxy.appspot.com/proxy"; // generic Google test proxy
} else if ($url=="debug") {
	$url="https://m.dtv.fi:8443/debug.jsp"; // dump request-response txt(does not work as a license)

} else if ($url=="Prod1234") {
	$url="https://wv.service.expressplay.com/hms/wv/rights/?ExpressPlayToken=BwAAABc2KcgAJDY2NzY5OWMwLTViODYtNDMwOS1iMjA4LTRlY2JkMjdmMWNmOAAAAIBvWQ0UTVvbmnBsYWPW04moKNTnqGI0a-p7HVtbTDyYPdvX3Mzel0xFeXzossdq2MhMAj0nREOeq3AC3ee6Li2TtK7BA_kDe5o-6Dzg7ORYKXnmh-PvhTRS0a5-2hZ7K4tD69GJJXJn3w1ZVxcnR7JG3RstdkanYkI0LSiNKyU39uYlQQUA1MUjnxSdiu8taJgaoHtC";
} else if ($url=="Prod1235") {
	$url="https://wv.service.expressplay.com/hms/wv/rights/?ExpressPlayToken=BwAAABc2KdcAJDY2NzY5OWMwLTViODYtNDMwOS1iMjA4LTRlY2JkMjdmMWNmOAAAAIAkNQZ5zucxMDUEvO6uhp5QiUW9gN3SMS8dLT8T0GFLm88KRUIiM6sQOOqqNx9gL-FejCDaM721kqxIPWbxMAoXi3IHjFoPAIczz-0CtENO2OievwiCN-RFzcBxdOeRQWx2j3taqZ1y2ZPLqqbmMxpmF0Qw926Xl2w9vhmEaRITU33Lq1kK7uhIAf5z8V4DgEkRkJOy";
} else if ($url=="Prod1236") {
	$url="https://wv.service.expressplay.com/hms/wv/rights/?ExpressPlayToken=BwAAABc2KeEAJDY2NzY5OWMwLTViODYtNDMwOS1iMjA4LTRlY2JkMjdmMWNmOAAAAIC7eetKNLrt0kWI-1g6u46WqQO13UEUkHevGFyrWZgfOYoPqWTl_d7A3qn7T1XpfADcozqapYVkHYwVekuq56wND7Sl35MlUFe4ecVKIHU5vjzoczEpth9-q-bIc1vrWZNfoQbBKBxy3Q1jXib_CbukzBiQv3HxYmFezmal6JCiawF3LH4Ptqg6iG38rTNCaAnAuLKM";
} else if ($url=="Prod1237") {
	$url="https://wv.service.expressplay.com/hms/wv/rights/?ExpressPlayToken=BwAAABc2KZ4AJDY2NzY5OWMwLTViODYtNDMwOS1iMjA4LTRlY2JkMjdmMWNmOAAAAICuhJDhUbGN_mJLOCREdhhtGjYnKhjRDLhIoXN4wSy3OsITEwP0_ttZHRGKmGAdh3MsT9ZsZi7EUPeyrFfspFKcgmjpmvB4WTvI629HmG7PCyN-SiVZGRqUkQm_Db4BFwg_Qxz8Cc3B6AqsBau-CXWEz6AJOESBIJVuqttuFNxesxDJslzNrRX0EMb0GJtWtWcmFoEp";

} else if ($url=="Prod1235_CBCS") {
	// use "Prod1235" key for now
	$url="https://wv.service.expressplay.com/hms/wv/rights/?ExpressPlayToken=BwAAABc2KdcAJDY2NzY5OWMwLTViODYtNDMwOS1iMjA4LTRlY2JkMjdmMWNmOAAAAIAkNQZ5zucxMDUEvO6uhp5QiUW9gN3SMS8dLT8T0GFLm88KRUIiM6sQOOqqNx9gL-FejCDaM721kqxIPWbxMAoXi3IHjFoPAIczz-0CtENO2OievwiCN-RFzcBxdOeRQWx2j3taqZ1y2ZPLqqbmMxpmF0Qw926Xl2w9vhmEaRITU33Lq1kK7uhIAf5z8V4DgEkRkJOy";
} else if ($url=="Prod1236_CBCS") {
	$url="https://wv.service.expressplay.com/hms/wv/rights/?ExpressPlayToken=BwAAABc2KfcAJDY2NzY5OWMwLTViODYtNDMwOS1iMjA4LTRlY2JkMjdmMWNmOAAAAIDO1fImL3H2sAcEsPbaJ7lvHKsudYA2crFN_RqG9_eMl5Veynbrosm-HsP_Cv_2Gvt8veUp2rt-2iGK45Kqx-1riTiiCn9fhfNRKDyGFk9qq_KCkyh8hpXXQMaMIKFRlXuBNvcHWu8NDIy0W8shSYGVNfNPZ6HhMIYmEMb0P9CrBnnyJ9Jwth-GoDCiNyqRIaLO96rr";
} else if ($url=="Prod1237_CBCS") {
	$url="https://wv.service.expressplay.com/hms/wv/rights/?ExpressPlayToken=BwAAABc2KbQAJDY2NzY5OWMwLTViODYtNDMwOS1iMjA4LTRlY2JkMjdmMWNmOAAAAIAcywxhKuUjclu8Mb9U7vyiHX7LosyvpXYWSh6PcuQSH-_9KXdk4KQApHHaYBVrSJS0D2Q-AlVJlfwtA5qWCvnBRjJMA2OKJLdZXa9gYXdkulPNia4DV0tc_M9q12tA4LehD3n6ZcmdD7hXScxGPFWF_H9RH7kZFIl9BNPLsHeBp6yiyWCLq47pvRUZrNsluwDk6eu2";

} else if ($url=="Prod12371236") { // SL3000,SL1
	$url="https://wv.service.expressplay.com/hms/wv/rights/?ExpressPlayToken=BwAAABc2Ka4AJDY2NzY5OWMwLTViODYtNDMwOS1iMjA4LTRlY2JkMjdmMWNmOAAAALAFdou2SIbyKqi5RDgerm-ZsPiDAdAue82-S8Q147it6Me9-jXfOvA75VksodkyBnY27Qwr-k8C1HmTKohRD08aLt99RTs1BFlugeXtPkQhElyNUAHK2JbDwyI1XRc2bO32APE_dgDXgvXGu732Cio8yssnE3aXlwCLH-TGv_vb4QCDGd_g4EE0WG7subaW3THF5N3O38UEpNldofSiqLb4_5OA31PMkrwvGf6cEuPIR3kq3gtN4-9sTtZhZMOl3qomwUum";
} else if ($url=="Prod12371236_7") { // SL2000,SL2
	$url="https://wv.service.expressplay.com/hms/wv/rights/?ExpressPlayToken=BwAAABc2KaYAJDY2NzY5OWMwLTViODYtNDMwOS1iMjA4LTRlY2JkMjdmMWNmOAAAALDljjYzDweX6ApBcKBnxCeSNWvnElm336havWqZQA6F6TYuTsSxVjHTotRJhSdpn_5_v7mnYEXmWr6bkjsazYl-S2PvabSjgPPpQi_gql6BAv0gxqyhzsf1wPv0b5RUY81dc_jH6TcAV0QXc3GUpBp6eSvAxPazPakR8RKiMuwYwxKN1oZYdWwibdwarXuQr466WuDo0Z1dKU8hwwtZEbGb_HC_lPXTZ5KtxxMGgeMG0MUV3RRsdo8H-WVzlqAQ1Rza5UGK";
} // else use $url value as-is


$reqParams  = array();
$reqHeaders = array();

array_push($reqHeaders, 'Content-Type: application/octet-stream');
array_push($reqHeaders, "Content-Length: " . $reqLen );

if ($headerCustomdata!="") array_push($reqHeaders, "customdata: ${headerCustomdata}");

if(count($reqParams)>0) $url = $url."?".http_build_query($reqParams);

$c_url = curl_init();
curl_setopt($c_url, CURLOPT_URL, $url);
curl_setopt($c_url, CURLOPT_RETURNTRANSFER, true);
curl_setopt($c_url, CURLOPT_POST, 1);
curl_setopt($c_url, CURLOPT_POSTFIELDS, $query);
curl_setopt($c_url, CURLOPT_HTTPHEADER, $reqHeaders);

if ($logfile!="") {
	$dtNow = new DateTime("now", new DateTimeZone("UTC") );
	$sNow  = $dtNow->format("Y-m-d H:i:se");
	$data = "------------------------\n"
		. "Request: ". $sNow ."\n"
		. "UserAgent: ". $_SERVER['HTTP_USER_AGENT'].'' ."\n"
		. "RemoteAddr: ". $_SERVER['REMOTE_ADDR'] ."\n"
		. "Url: ". $url ."\n"
		. $query ."\n";
	file_put_contents($logfile, $data, FILE_APPEND|LOCK_EX);
}

$soap = curl_exec($c_url);
$curl_errno = curl_errno($c_url);
$curl_error = curl_error($c_url);
		
if($soap === FALSE || $curl_errno > 0){
	$soap = $curl_errno." - ".$curl_error;
	curl_close($c_url);	
}
echo $soap;

if ($logfile!="") {
	$data = "\nResponse\n"
		. $soap ."\n"
		. "------------------------\n";
	file_put_contents($logfile, $data, FILE_APPEND|LOCK_EX);
}

?>