<?php
ini_set('post_max_size', '100M');
ini_set('upload_max_filesize', '100M');
header('Content-Type: application/json');


// $fp = fopen('php://input', 'rb');
// stream_filter_append($fp, 'dechunk', STREAM_FILTER_READ);
// $data = stream_get_contents($fp);

$data = json_decode(file_get_contents('php://input'), true);

// and now we have the data

if ($_GET["save"] == "config")
{
	foreach ($data["menus"] as $menukey => $menu) {
		foreach ($menu["items"] as $itemkey => $item) {
			if(isset($item["img"])){
				$imagesize = getimagesize("../".$item["img"]);
				$data["menus"][$menukey]["items"][$itemkey]["imagesize"] = $imagesize;
			}
		}
	}
	$encoded = json_encode( $data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES );
	file_put_contents("../config.json",$encoded);
	echo '{"message" : "Config.json saved successfully!"}';
}
else if ($_GET["save"] == "css")
{
	if( $HTTP_RAW_POST_DATA == "" )
	{
		unlink("../user.css");
		echo '{"message" : "user.css deleted. Refresh page to load oroginal css file to be edited."}';
	}
	else
	{
		$fout = fopen("../user.css","w+");
		fwrite($fout, $HTTP_RAW_POST_DATA);
		echo '{"message" : "user.css file saved. Original css is restored, if this editor file is emptied and saved blank."}';
	}
}
else
	echo '{"message" : "An error occured: Missing argument ?save=config|css"}';

?>