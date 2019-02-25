<?php
	date_default_timezone_set("Europe/Helsinki");
	
	//error_reporting(E_ALL);
	//ini_set('display_errors', 1);
	
	header( "Last-Modified: " . gmdate("D, d M Y H:i:s") . " GMT" );
	header( "Cache-Control: no-cache, must-revalidate" );
	header( "Pragma: no-cache" );
	
	header( "Content-Type: application/vnd.hbbtv.xhtml+xml;charset=utf-8" );
	echo "<?xml version='1.0' encoding='utf-8' ?>\n"; 
	
?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
	<title>HbbTV Reference Video Application</title>

	<meta http-equiv="content-type" content="application/vnd.hbbtv.xhtml+xml; charset=UTF-8" />
	<script type="application/javascript">
	
	var profile = { hbbtv : "2.0", video : "html5", version : "html5"};
	// change this to point to video files location. This will be used as root for relative links. Absolute urls are not affected
	var defaultVideoRoot = "http://meridian.sofiadigital.fi/tvportal/referenceapp/videos/"; 
	
	/*** End of Settings ***/
	
	console.log("Application Start");

	var config 		= null;
	var loading 	= false;
	var animating 	= false;
	var menu 		= null;
	var vplayer 	= null;
	var main 		= null;

	function onLoad(){
		console.log("onLoad");
		showApplication();
		init();
		registerKeys(1);
		registerKeyListener();
	}
	</script>
	
	<?php
		/*** 
		print all resource files with url-parameter version=filemtime 
		to ensure device is not using cache when file is modified
		***/
		$profileResources = "html5"; // additional resources
		include("resources.php"); 
	?>
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