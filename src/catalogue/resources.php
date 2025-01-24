<?php
/*** 
	Resources and optimization
***/
$isHTTPS = ( (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] != 'off') || $_SERVER['SERVER_PORT'] == 443 );

// use this to determine if optimization is used by default. Always can be switched by url parameter
$optimizeDefault = false;

// modify here
$resources = array(
	"menu.css",
	"../videoplayer/vplayer.css",
	"../common.css",
	"../debugscreen.css",
	"../jquery-1.11.3.min.js",
	"../common.js",
	"../common2.js",	
	"../dialog.js",
	"../dialog.css",
	"application.js",
	"gridcolumn.js",
	"gridview.js",
	"gridscrollview.js",
	"gridviewbox.js",
	"menu.js",
	"topmenu.js",
	"topmenuitem.js",
	"../debugscreen.js",
	"../log.js",
	"../keycodes.js",
	"navigation.js", 
	"../videoplayer/videoplayer_basic.js"
	,"../videoplayer/monitor/monitor-base.js" // Monitor interface must be included
	//,"../videoplayer/monitor/monitor.js" // Monitor implementation is not included to reference application
);

if( isset( $profileResources ) ){
	echo "<!-- " . $profileResources. " -->\n";
	if( $profileResources == "mse-eme" ){		
		$dashjs = isset($_GET["dashjs"]) ? $_GET["dashjs"] : "";
		if($dashjs=="nightly") {
			// "/dist/legacy/umd/" is UMD build targeting legacy platforms by specifying the babel target ie: '11', core.js polyfills are enabled.
			// also available "/dist/modern/umd/", "/dist/modern/esm/"
			$resources[] = ($isHTTPS?"https:":"http:")."//reference.dashif.org/dash.js/nightly/dist/legacy/umd/dash.all.debug.js"; // V5
		} else if($dashjs=="latest") {
			$resources[] = ($isHTTPS?"https:":"http:")."//cdn.dashjs.org/latest/dash.all.min.js"; // V4.7.4
		} else if($dashjs=="debug") {
			$resources[] = "../videoplayer/dash.all.debug.js"; // with EME "showing" subtitle fix, V4.7.4
		} else {
			$resources[] = "../videoplayer/dash.all.min.js"; // V4.7.4
		}		
		$resources[] = "../videoplayer/videoplayer_mse-eme.js";
	}
	else if( $profileResources == "html5" ){
		$resources[] = "../videoplayer/videoplayer_html5.js";
	}
	else if( $profileResources == "oipf" ){
		$resources[] = "../videoplayer/videoplayer_oipf.js";
	}
}
else{
	echo "<!-- No correct videoplayer version found guess HbbTV 1.5 -->\n";
	$resources[] = "../videoplayer/videoplayer_oipf.js";
}


// do not modify below


// Do not use minified if it does not exist. run first minify.php
if( !file_exists( "app.min.js" ) || ( !$optimizeDefault && !isset( $_GET["optimize"] ) ) ){ // min-file not found or not set to optimize
	$useMinified = false;
}
else{
	$useMinified = "app.min.js";
	$fileversion = $useMinified . "?version=" . filemtime( $useMinified );
	echo "<script src='$fileversion' type='text/javascript'></script>\n";
}

// css
if( !file_exists( "app.min.css" ) || ( !$optimizeDefault && !isset( $_GET["optimize"] ) ) ){ // min-file not found or not set to optimize
	$useMinifiedCss = false;
}
else{
	$useMinifiedCss = "app.min.css";
	$fileversion = $useMinifiedCss . "?version=" . filemtime( $useMinifiedCss );
	echo "<link href='$fileversion' rel='stylesheet' type='text/css'/>\n";
}

if( !$useMinified || !$useMinifiedCss ){
	foreach($resources as $file){
		$fileversion = $file;		
		if( substr( $file, 0,4 ) != "http" ){
			if(file_exists($file))
				$fileversion = $file . "?version=" . filemtime( $file );
		}
		
		if( !$useMinified && substr( $file, -2 ) == "js" ){
			//echo "<script src='$fileversion' type='text/javascript'></script>\n";
			echo "<script src='$fileversion' type='application/javascript'></script>\n";
		}else if( !$useMinifiedCss && substr( $file, -3 ) == "css" ){
			echo "<link href='$fileversion' rel='stylesheet' type='text/css'/>\n";
		}
	}
}

/*** 
	End of Resources and optimization
***/
?>