<?php
// css dile getter
echo file_get_contents( (file_exists("../user.css")? "../user.css" : "../launcher.css") );
?>