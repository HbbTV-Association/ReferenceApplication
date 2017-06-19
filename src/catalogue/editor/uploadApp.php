<?php 
header('Content-Type: application/json');
session_start();
$overwrite = ( $_POST['overwrite'] == "on");
$cleanold = ( $_POST['cleanold'] == "on");

$pathinfo = pathinfo( $_FILES["appfile"]["name"] );
$appname = $pathinfo['filename'];
$source = $_FILES["zip_file"]["tmp_name"];
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

function cleanOld(&$contents, &$files, &$curPath)
{
	global $app_root;
	global $cleared;
	$pre = substr( $app_root, 0, -1);
	foreach( $contents as $key => $file )
	{
		if( is_array( $file ) )
		{
			array_push( $curPath, $key );
			cleanOld( $file, $files, $curPath);
			array_pop( $curPath );
		}
		else
		{
			$name = implode("/", $curPath) . "/" . $file;
			if( $name[0] != "/" )
				$name = "/".$name;
			if( !in_array( $name, $files ) && !is_dir($pre . $name)) // remove if not exist in zip
			{
				//echo $pre  . $name . "\n";
				array_push( $cleared, $name );
				unlink( $pre  . $name );
			}
		
		}
	}
	
}


if( $pathinfo['extension'] == "zip" )
{
	$basepath = str_replace("/editor","/upload",dirname(__FILE__));
	$target_path = $basepath."/";
	$app_root = $basepath."/" . $appname . "/";
	$targetzip = $target_path . $_FILES["appfile"]["name"];
	$source = $_FILES["appfile"]["tmp_name"];
	
	$filesToExtract = array();
	
	if( ! opendir( $app_root )) {
		// no dir
		mkdir( $app_root );
	}
	
	$contents = scanContents($app_root);
	$filesInZip = array();
	
	if(move_uploaded_file($source, $targetzip)) {
	
		$zip = new ZipArchive();
		
		$x = $zip->open($targetzip); // open the zip file to extract
		if ($x === true) {
			
			 for($i = 0; $i < $zip->numFiles; $i++) {
				$filename = $zip->getNameIndex($i);
				if( $overwrite || !file_exists( $target_path . $filename ) )
					array_push( $filesToExtract, $filename );
				else if( file_exists( $target_path . $filename ) )
					array_push( $filesInZip, $filename ); 
					
			}
			
			$zip->extractTo($target_path, $filesToExtract); // place in the directory with same name
			$zip->close();
			 
			unlink($targetzip);
			if( count( $filesToExtract ) )
				$message = "Your .zip file was uploaded and unpacked.";
			else
				$message = "Your .zip file was uploaded but no any files overwritten";
			
			if( $cleanold )
			{
				$filesInZip = array_merge( $filesInZip, $filesToExtract );
				$curDir = array();
				foreach( $filesInZip as &$file )
					$file = explode( $appname, $file)[1];
				//print_r( $filesInZip );
				cleanOld( $contents, $filesInZip, $curDir );
			}
		} 
		else {	
			$message = "There was a problem with the upload. Please try again.";
		}
		echo $message;
	}
	
	$_SESSION['uploadApp'] = array( "message" => $message, "files" => $filesToExtract, "cleared" => $cleared);
}
else
{
	$_SESSION['uploadApp'] = array( "message" => "Wrong type of file. Only zip accepted!" );
}

file_put_contents( "upload_app_log.txt", json_encode( $_SESSION['uploadApp'] ) . "\n", FILE_APPEND );

header("location:index.php");
?>




