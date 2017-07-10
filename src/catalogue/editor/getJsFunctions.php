<?php
header('Content-Type: application/json');

$scanned = "../";

$files = array_diff(scandir($scanned), array('..', '.'));

$functions = array();

foreach($files as $file)
{
	$info = pathinfo($scanned. "/". $file);
	if( $info['extension'] == "js" && strpos( $file, "jquery") === FALSE )
		scanFunctions( $scanned. "/". $file, $functions );
}

echo json_encode( $functions );

function scanFunctions( $filename, &$functions )
{
	$matches = null;
	preg_match_all("/function ([\w|\d]+\(.*\))/U", file_get_contents( $filename ), $matches);
	$functions = array_merge( $functions, $matches[1] );
}
?>