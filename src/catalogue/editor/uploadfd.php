<?php
/*!
  FileDrop Revamped - server-side upload handler sample
  in public domain  | http://filedropjs.org

 ***

  This is an example of server-side script that handles both AJAX and IFrame uploads.

  AJAX upload provides raw file data as POST input while IFrame is a POST request
  with $_FILES member set.

  Result is either output as HTML with JavaScript code to invoke the callback
  (like JSONP) or in plain text if none is given (it's usually absent on AJAX).
*/

// If an error causes output to be generated before headers are sent - catch it.
ob_start();

// Callback name is passed if upload happens via iframe, not AJAX (FileAPI).
$callback = &$_REQUEST['fd-callback'];

// Upload data can be POST'ed as raw form data or uploaded via <iframe> and <form>
// using regular multipart/form-data enctype (which is handled by PHP $_FILES).
if (!empty($_FILES['fd-file']) and is_uploaded_file($_FILES['fd-file']['tmp_name'])) {
  // Regular multipart/form-data upload.
  $name = $_FILES['fd-file']['name'];
  $data = file_get_contents($_FILES['fd-file']['tmp_name']);
} else {
  // Raw POST data.
  $name = urldecode(@$_SERVER['HTTP_X_FILE_NAME']);
  $data = file_get_contents("php://input");
}

$basepath = str_replace("/editor","",dirname(__FILE__));
$target_path = $basepath."/icons/".$name;
move_uploaded_file( $data, $target_path );

// Output message for this demo upload. In your real app this would be something
// meaningful for the calling script (that uses FileDrop.js).
$output = sprintf('%s; received %s bytes, CRC32 = %08X, MD5 = %s', $name,
                  number_format(strlen($data)), crc32($data), strtoupper(md5($data)));


header('Content-Type: text/plain; charset=utf-8');
echo $output;

