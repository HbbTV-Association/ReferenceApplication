<?php
if( isset( $_POST ) && count( $_POST ) >= 2 )
{
	// 2-dimensional putter. Adds variables to conf. 
	// If variable name contains _  put it as sub object like $conf[ $var[0] ][ $var[1] ] = $val;
	function put( &$conf, $var, $val )
	{
		$parts = explode( "_", $var );
		$varname = array_shift( $parts );
		if( is_numeric( $val ) ) $val = (float) $val;
		if( $val === 1 ) $val = true;
		else if( $val === 0 ) $val = false;
		if( count( $parts ) > 0 )
		{
			if( !isset( $conf[ $varname ] ) )
				$conf[ $varname ] = array( array_shift( $parts ) => $val );
			else
				$conf[ $varname ][ array_shift( $parts ) ] = $val;
		}
		else
			$conf[ $varname ] = $val;
			
	}
	$conf = array();
	foreach( $_POST as $variable => $value )
	{
		put( $conf, $variable, $value );
	}
	$output = json_encode( $conf );
	
	if( $output != null )
	{
		$fout = fopen("secret_conf_file.json","w+");
		fwrite($fout, $output);
		$feedback = "Settings saved successfully! ";
	}
	else
		$feedback = "Error";
}

if( isset( $_GET['admin'] ) && $_GET['admin'] == "sofiapeelo-salasana" )
{
	$settings = json_decode( file_get_contents("secret_conf_file.json"), true );
	
	$radioId = 0;
	function trueFalseRadio( $name, $selected ){
		global $radioId;
		$radioId++;
		return "<div name='radioset'><input name='$name' id='radio1".$radioId."' type='radio' value='1'".($selected==true? " checked":"")."><label for='radio1".$radioId."'>True</label><input name='$name' id='radio0".$radioId."' type='radio' value='0'".($selected==false? " checked":"")."><label for='radio0".$radioId."'>False</label></div>";
	}
	
?>

<html xmlns="http://www.w3.org/1999/xhtml">

	<head>
		<meta http-equiv="content-type" content="text/html;charset=utf-8" />
		<meta name="generator" content="Sofia Digital" />
		<meta http-equiv="Expires" content="0" />
		<meta http-equiv="Pragma" content="no-cache" />
		<meta http-equiv="Cache-Control" content="no-cache" />
		<title>Sofia Backstage Secret Admin Options</title>
		<link href="css/sofia_backstage_ui.css" rel="stylesheet" type="text/css" media="all" />
		
		<link rel="stylesheet" href="//code.jquery.com/ui/1.11.0/themes/smoothness/jquery-ui.css">
		<script src="jquery-1.11.0.min.js"></script>
		<script src="jquery-ui.js"></script>
		<link rel="stylesheet" href="/resources/demos/style.css">
		<script>
		$(function() {
			$( "div[name=radioset]" ).buttonset();
		});
		</script>
	<style type="text/css">
	body{
	text-align: center;
	min-width: 150px;
	width: auto;
	}
	</style>
	
	</head>

<body>

	<div><img src="css/images/sofialogo.png" alt="Welcome to Sofia Backstage Author" border="0" style="padding-top:20px;"></div>
		
	<div id="loginmain" align="center">
		<?php echo $feedback; ?>
		<form name="loginform" method="post" action="admin.php?admin=<?php echo $_GET['admin']; ?>">
		<h2>Set Editor Settings</h2>
		<div class="loginstartbox" style="width:400px;">
		   <div class="roundtoplogin">
			 <img src="css/images/navitop_roundcorner_tl.gif" alt="" class="corner" style="display: none;" height="15" width="15">
		   </div>
		   <!--content S -->
		   <table border="0">
		   <tr>
		   		<td>Username</td><td><input id="login" name="login_username" type="text" value="<?php echo $settings['login']['username']; ?>"></td>
		   	</tr>
		   	<tr>
		   		<td>Password</td><td><input name="login_password" id="pass" type="password" value="<?php echo $settings['login']['password']; ?>"></td>
		   	</tr>
			<tr>
		   		<td>showStreamEvents</td><td><?php echo trueFalseRadio("showStreamEvents", $settings['showStreamEvents'] ); ?></td>
		   	</tr>
			<tr>
		   		<td>showCSSEditor</td><td><?php echo trueFalseRadio("showCSSEditor", $settings['showCSSEditor'] ); ?></td>
		   	</tr>
		   	<tr>
		   	<td colspan="2" align="right"><input type="submit" class="action" value="Submit"></td>
		   	</tr>

		   </table>
	 	 <!--content E -->
		   <div class="roundbottomlogin">
			 <img src="css/images/navitop_roundcorner_bl.gif" alt="" class="corner" style="display: none;" height="15" width="15">
		   </div>
		   </form>
		</div>

	</div>
</body>

</html>

<?php } ?>