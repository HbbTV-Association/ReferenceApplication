<?php
ini_set('post_max_size', '100M');
ini_set('upload_max_filesize', '100M');
header('Content-Type: application/json');

try{
	// find out the last log #number and generate next
	$files = array_values( array_diff(scandir("./", 1), array('.', '..', 'save.php')) );
	$nth = 0;
	if( count( $files ) ){
		$m;
		preg_match('/log(?P<number>\d+).json/', $files[0], $m);
		if( isset( $m['number'] ) ){
			$nth = (int)$m['number'] + 1;
		}
	}
	$filename = "log".$nth.".json";

	// generate file
	$data = json_decode( file_get_contents('php://input') );

	file_put_contents( $filename, json_encode( $data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) );
	$response = array( "success" => true, "log" => "log/".$filename );
	echo json_encode( $response );

} catch( Exception $e ){
	// something wrong
	echo json_encode( array( "success" => false, "message" => $e->getMessage() ) );
	die();
}

?>