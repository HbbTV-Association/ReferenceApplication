<?php
header('Content-Type: application/json');

function scanContents( $dir )
{
	$ret = array_diff(scandir($dir), array('..', '.'));
	foreach( $ret as &$file )
	{
		if( is_dir( $dir ."/". $file ) )
			$ret[ $file ] = scanContents( $dir ."/". $file );
	}
	return $ret;
}

$get = $_GET;

if( $get["action"] == "list")
{
	$ret = array_values( array_diff(scandir("../videos"), array('..', '.')) );
	foreach( $ret as &$video )
	{
		if( is_dir( "../videos/".$video ) && is_file("../videos/".$video."/".$video.".mpd") )
		{
			$video .= "/".$video.".mpd";
		}
	}
	echo json_encode( $ret );
}

?>