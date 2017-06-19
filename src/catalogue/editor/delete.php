<?php
//header('Content-Type: application/json');

if ( isset( $_GET["delete"] )  )
{
	// extract filename
	$file = str_replace( "../icons/", "", $_GET["delete"] );
	$filePath = "../icons/$file";
	
	if (strpos($file,'/') !== false)
		die('Illegal file. Only icons in icons/ directory may be deleted from editor');
	if( !file_exists( $filePath ) )
		die('File not exist');
	
	// deleted file ensured to be in right directory and it exists. Safe to remove
	unlink( $filePath );
	
	
	echo "File $file deleted successfully!";
}
else
{
	echo "No data";
}
?>