<?php 

// for big video files
ini_set('post_max_size', '100000M');
ini_set('upload_max_filesize', '100000M');

//header('Content-Type: application/json');
session_start();

$pathinfo = pathinfo( $_FILES["videofile"]["name"] );
$source = $_FILES["videofile"]["tmp_name"];
$app_root = "";
$cleared = array();

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


$basepath = str_replace("/editor","/videos",dirname(__FILE__));
$target_path = $basepath."/";

$target = $target_path . $_FILES["videofile"]["name"];
$source = $_FILES["videofile"]["tmp_name"];

$targetName = $_FILES["videofile"]["name"];

$resultText = "";
$resultText2 = "";

if(move_uploaded_file($source, $target)) {
	
	if( $_POST['videoconversion'] == "none" )
		$message = "Your video file was uploaded";
	else if( $_POST['videoconversion'] == "mp4_DASH" )
	{
		if( $_POST['videowatermark'] != "" )
		{
			// add watermark
		}
		$outdir = $basepath ."/". $pathinfo['filename'];

		if( !is_dir( $outdir ) )
			mkdir( $outdir );
		
		
		//for live: $command = 'MP4Box -dash 1500 -profile live -out '.$outdir.'/'.$pathinfo['filename'].'.mpd "'.$target.'"#audio:id=audio "'.$target.'"#video:id=video';
		$command = 'MP4Box -dash 1500 -out '.$outdir.'/'.$pathinfo['filename'].'.mpd "'.$target.'"#audio:id=audio "'.$target.'"#video:id=video';
	 	//$sedCommand = "sed -i 's/urn:mpeg:dash:profile:isoff-live:2011/urn:hbbtv:dash:profile:isoff-live:2012,urn:mpeg:dash:profile:isoff-live:2011/g' ".$outdir."/".$pathinfo['filename'].".mpd";
		$resultText = shell_exec( $command );
		//$resultText2 = shell_exec( $sedCommand );
		$targetName = $outdir."/".$pathinfo['filename'].".mpd";
		if( $resultText )
			$message = "An error occured while DASHing video. Description below:";
		else
			$message = "Your video file was uploaded and successfully converted to DASH";
	}
	
}
else
	$message = "Error uploading video";

$_SESSION['uploadVideo'] = array( "message" => $message, "files" => array( $targetName, $resultText ) );


file_put_contents( "upload_video_log.txt", json_encode( $_SESSION['uploadVideo'] ) . "\n", FILE_APPEND );

header("location:index.php");
?>




