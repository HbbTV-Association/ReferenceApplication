<?php
ini_set('post_max_size', '100M');
ini_set('upload_max_filesize', '100M');
header('Content-Type: application/json');

// "/opt/nginx/html/prod/catalogue/log/save.php" -> "/opt/nginx/html/prod/log"
$basedir = dirname(__FILE__,3);
$savedir = $basedir=="/" ? "/log" : $basedir."/log";

try{
	// find out the last log #number and generate next
	$files = array_values( array_diff(scandir($savedir, 1), array('.', '..', 'save.php')) );
	$nth = 0;
	if( count( $files ) ){
		// find out the last file number
		$numbers = array();
		foreach( $files as $filename ){
			$m;
			preg_match('/log(?P<number>\d+).json/', $filename, $m);
			if( isset( $m['number'] ) ){
				$numbers[] = (int)$m['number'];
			}
		}
		rsort($numbers);
		$nth = $numbers[0] + 1; // the greatest number plus one
	}
	$filename = "log".$nth.".json";
	//echo( $savedir."/".$filename );
	
	// save file
	$data = json_decode( file_get_contents('php://input') );
	file_put_contents( $savedir."/".$filename, json_encode( $data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) );
	$response = array( "success" => true, "log" => "log/".$filename );
	echo json_encode( $response );
} catch( Exception $e ){
	echo json_encode( array( "success" => false, "message" => $e->getMessage() ) );
	die();
}

?>