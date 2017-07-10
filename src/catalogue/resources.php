<?php
/*** 
	Resources and optimization
***/

// use this to determine if optimization is used by default. Always can be switched by url parameter
$optimizeDefault = false;

// modify here
$resources = array(
	"menu.css",
	"../videoplayer/vplayer.css",
	"../common.css",
	"../jquery-1.11.3.min.js",
	"../common.js",
	"application.js",
	"gridcolumn.js",
	"gridview.js",
	"gridscrollview.js",
	"gridviewbox.js",
	"menu.js",
	"topmenu.js",
	"topmenuitem.js",
	"../videoplayer/videoplayer_oipf.js",
	"../videoplayer/videoplayer_html5.js",
	"../videoplayer/videoplayercontrols.js",
	"../debugscreen.js",
	"navigation.js",
	"../debugscreen.css"
);


// do not modify below

// 1. Do not use minified version on mhp if not set optimize=1.
// 2. Do not use minified if it does not exist. run first minify.php
if( !file_exists( "app.min.js" ) || ( (strpos( $_SERVER['SERVER_NAME'], "mhp") !== FALSE || !$optimizeDefault ) && !isset( $_GET["optimize"] ) ) ){ //mhp or min file not found
	$useMinified = false;
}
else{
	$useMinified = "app.min.js";
	$fileversion = $useMinified . "?version=" . filemtime( $useMinified );
	echo "<script src='$fileversion' type='text/javascript'></script>\n";
}

// css
if( !file_exists( "app.min.css" ) || ( (strpos( $_SERVER['SERVER_NAME'], "mhp") !== FALSE || !$optimizeDefault ) && !isset( $_GET["optimize"] ) ) ){ //mhp or min file not found
	$useMinifiedCss = false;
}
else{
	$useMinifiedCss = "app.min.css";
	$fileversion = $useMinifiedCss . "?version=" . filemtime( $useMinifiedCss );
	echo "<link href='$fileversion' rel='stylesheet' type='text/css'/>\n";
}

foreach($resources as $file){
	$fileversion = $file . "?version=" . filemtime( $file );
	if( !$useMinified && substr( $file, -2 ) == "js" ){
		echo "<script src='$fileversion' type='text/javascript'></script>\n";
	}else if( !$useMinifiedCss && substr( $file, -3 ) == "css" ){
		echo "<link href='$fileversion' rel='stylesheet' type='text/css'/>\n";
	}
}

/*** 
	End of Resources and optimization
***/
?>