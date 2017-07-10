<?php
	date_default_timezone_set("Europe/Helsinki");
	
	error_reporting(E_ALL);
	ini_set('display_errors', 1);
	
	header( "Last-Modified: " . gmdate("D, d M Y H:i:s") . " GMT" );
	header( "Cache-Control: no-cache, must-revalidate" );
	header( "Pragma: no-cache" );
	header( "Content-Type: application/vnd.hbbtv.xhtml+xml;charset=utf-8" );
	echo "<?xml version='1.0' encoding='utf-8' ?>";
?>
<!DOCTYPE html PUBLIC '-//HbbTV//1.2.1//EN' 'http://www.hbbtv.org/dtd/HbbTV-1.2.1.dtd'>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
	<title>HbbTV Reference Video Application</title>

	<meta http-equiv="content-type" content="Content-Type: application/vnd.hbbtv.xhtml+xml; charset=UTF-8" />
	<script type="text/javascript" language="javascript">
	
	/***
		Settings
	***/
	var profile = { hbbtv : "1.5", video : "avobject"};
	
	// change this to point to video files location. This will be used as root for relative links. Absolute urls are not affected
	//var defaultVideoRoot = "http://tvportal.sofiadigital.tv/referenceapp/videos/"; 
	var defaultVideoRoot = "http://meridian.sofiadigital.fi/tvportal/referenceapp/videos/"; 
	
	</script>
	<!-- List all css and js resource files or minified and combined resource files -->
	<?php 
		include("resources.php"); 
	?>
	<script src='../videoplayer/monitor/monitor.js' type='text/javascript'></script>
	
<script type="text/javascript" language="javascript">

console.log("Application Start");

var config 		= null;
var loading 	= false;
var animating 	= false;
var menu 		= null;
var vplayer 	= null;
var main 		= null;

function onLoad() {
	registerKeys(1);
    registerKeyListener();
	showApplication();
    init();
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
		<div id="logo"></div>
		<div id="menu"></div>
	</div>
	
	<div id="info" class="hide"></div>
	
</body>
</html>