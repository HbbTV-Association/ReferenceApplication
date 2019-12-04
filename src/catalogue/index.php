<?php
	
	date_default_timezone_set("Europe/Helsinki");
	
	error_reporting(E_ALL);
	ini_set('display_errors', 1);


	function getApplicationProfile(){
		
		$profiles = json_decode( file_get_contents( "../profiles.json" ), true );
		
		$userAgent = $_SERVER['HTTP_USER_AGENT'];
		$mode = null;

		$hbbtvRe = '/HbbTV\/\d\.(?P<version>\d)\.\d/';
		$matches = null;
		preg_match( $hbbtvRe, $userAgent, $matches );
		
		$profile = null;
		
		if( $matches == null ){
			$profile = $profiles['EME'];
		}
		else if( (int)$matches['version'] == 2 ){
			$profile = $profiles['HbbTV1.5'];
		}
		else if( (int)$matches['version'] == 4 || (int)$matches['version'] == 3 || (int)$matches['version'] == 5){ // 1.4.1 is hbbtv 2.0.1 / 1.3.1 = 2.0.0
			$profile = $profiles['HbbTV2.0'];
		}
		else if( (int)$matches['version'] == 1 ){
			$profile = $profiles['HbbTV1.0'];
		}
		else{
			$profile = $profiles['unknown'];
		}
		
		$profile['userAgent'] = $userAgent;
		return $profile;
	}

	$profile = getApplicationProfile();
	
	if( $profile['supported'] == false ){
		header( "Location: unsupported.html" );
		die();
	}
	
	header( "Expires: Mon, 20 Dec 1998 01:00:00 GMT" );
	header( "Last-Modified: " . gmdate("D, d M Y H:i:s") . " GMT" );
	header( "Cache-Control: no-cache, must-revalidate" );
	header( "Pragma: no-cache" );
	
	// HTTP Header
	header( "Content-Type: ". $profile['contentType'] .";charset=utf-8" );	
	
	// XML Header to start document
	echo $profile['xmlHeader'] ."\n";

	// <!DOCTYPE>
	echo $profile['doctype'] ."\n";
	
?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
	<title>HbbTV Reference Video Application</title>

	<meta http-equiv="content-type" content="<?php echo $profile['contentType']; ?>; charset=UTF-8" />
	<script type="text/javascript">
	
	/***
		Settings
	***/
	var profile = { hbbtv : "<?php echo $profile['hbbtv']; ?>", video : "<?php echo $profile['video']; ?>", version : "<?php echo $profile['version']; ?>"};
	
	// change this to point to video files location. This will be used as root for relative links. Absolute urls are not affected
	var defaultVideoRoot = "http://meridian.sofiadigital.fi/tvportal/referenceapp/videos/"; 
	
	</script>
	<!-- List all css and js resource files or minified and combined resource files -->
	<?php 
		$profileResources = $profile['version'];
		include("resources.php"); 
	?>
	
<script type="text/javascript">

console.log("Application Start");

var config 		= null;
var loading 	= false;
var animating 	= false;
var menu 		= null;
var vplayer 	= null;
var main 		= null;
var lastError = null;
function onLoad() {
	registerKeys(1);
    registerKeyListener();
	showApplication();
	
	try{
		init();
	} catch(e){
		lastError = e;
		error( e );
	}
	
}

</script>

</head>
<body onload="onLoad();">
	<div style="visibility:hidden;width:0px;height:0px;">
		<object id="appmgr" type="application/oipfApplicationManager"></object>
		<object id="oipfcfg" type="application/oipfConfiguration"></object>
	</div>
	<div id="videodiv"></div>
	
	<div id="wrapper">
		<div id="logo1"></div>
		<div id="menu"></div>
		<div id="logo2"></div>
		<div id="itemDescription"></div>
	</div>
	
	<div id="info" class="hide"></div>
	<div id="infoBox" class="hide"></div>
	
</body>
</html>
