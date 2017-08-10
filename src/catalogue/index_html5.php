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
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
	<title>HbbTV Reference Video Application</title>

	<meta http-equiv="content-type" content="Content-Type: application/vnd.hbbtv.xhtml+xml; charset=UTF-8" />
	<script type="text/javascript" language="javascript">
	
	/*** Settings ***/
	
	var profile = { hbbtv : "2.0", video : "html5"};
	// change this to point to video files location. This will be used as root for relative links. Absolute urls are not affected
	var defaultVideoRoot = "http://meridian.sofiadigital.fi/tvportal/referenceapp/videos/"; 
	
	/*** End of Settings ***/
	</script>
	<link href='menu.css?version=1498116461' rel='stylesheet' type='text/css'/>
	<link href='../videoplayer/vplayer.css?version=1498116560' rel='stylesheet' type='text/css'/>
	<link href='../common.css?version=1498568138' rel='stylesheet' type='text/css'/>
	<script src='../jquery-1.11.3.min.js?version=1475231609' type='text/javascript'></script>
	<script src='../common.js?version=1498636970' type='text/javascript'></script>
	<script src='application.js?version=1498571561' type='text/javascript'></script>
	<script src='gridcolumn.js?version=1497337421' type='text/javascript'></script>
	<script src='gridview.js?version=1472020302' type='text/javascript'></script>
	<script src='gridscrollview.js?version=1471943889' type='text/javascript'></script>
	<script src='gridviewbox.js?version=1497518410' type='text/javascript'></script>
	<script src='menu.js?version=1499089377' type='text/javascript'></script>
	<script src='topmenu.js?version=1471527651' type='text/javascript'></script>
	<script src='topmenuitem.js?version=1470740434' type='text/javascript'></script>
	<script src='../videoplayer/videoplayer_html5.js?version=1499073910' type='text/javascript'></script>
	<!-- script src='../videoplayer/videoplayercontrols.js?version=1498637849' type='text/javascript'></script -->
	<script src='../debugscreen.js?version=1498571047' type='text/javascript'></script>
	<script src='navigation.js?version=1498026910' type='text/javascript'></script>
	<script src='../videoplayer/monitor/monitor.js' type='text/javascript'></script>
	<link href='../debugscreen.css?version=1497879428' rel='stylesheet' type='text/css'/>
	
	<script type="text/javascript" language="javascript">

	console.log("Application Start");

	var config 		= null;
	var loading 	= false;
	var animating 	= false;
	var menu 		= null;
	var vplayer 	= null;
	var main 		= null;

	function onLoad() {
		showApplication();
		init();
		registerKeys(1);
		registerKeyListener();
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
		<div id="itemDescription"></div>
	</div>
	
	<div id="info" class="hide"></div>
	
</body>
</html>