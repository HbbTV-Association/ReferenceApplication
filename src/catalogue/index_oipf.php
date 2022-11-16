<?php
	date_default_timezone_set("Europe/Helsinki");
	
	//error_reporting(E_ALL);
	//ini_set('display_errors', 1);
	
	header( "Last-Modified: " . gmdate("D, d M Y H:i:s") . " GMT" );
	header( "Cache-Control: no-cache, must-revalidate" );
	header( "Pragma: no-cache" );
	header( "Content-Type: application/vnd.hbbtv.xhtml+xml;charset=utf-8" );
	echo "<?xml version='1.0' encoding='utf-8' ?>";
?>
<!DOCTYPE html PUBLIC '-//HbbTV//1.2.1//EN' 'http://www.hbbtv.org/dtd/HbbTV-1.2.1.dtd'>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
	<title>HbbTV Reference Video Application</title>
	
	<meta http-equiv="content-type" content="application/vnd.hbbtv.xhtml+xml; charset=UTF-8" />
	<script type="text/javascript">
	
	/***
		Settings
	***/
	var profile = { hbbtv : "1.5", video : "avobject", version : "oipf"};
		
	</script>
	<!-- List all css and js resource files or minified and combined resource files -->
	<?php 
		$profileResources = "oipf"; // additional resources
		include("resources.php"); 
	?>
	
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
<script onload="odd.init('sofia')" src="https://odd.dtv.fi/odd.js"></script>
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