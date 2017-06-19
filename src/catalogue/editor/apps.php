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
	$ret = array_values( array_diff(scandir("../upload"), array('..', '.')) );
	echo json_encode( $ret );
}

?>