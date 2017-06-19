<? 
session_start();

// read settings
$settings = json_decode( file_get_contents("secret_conf_file.json"), true );

$ok_login = $settings['login']['username'];
$ok_pass = $settings['login']['password'];


if ($_POST['act']=="login")
{
	if ($_POST['login']==$ok_login&&$_POST['pass']==$ok_pass)
	{
		$_SESSION['login']=true;
		//markLoki("logged ok");
		header("location:index.php");
		exit;
	
	}
	else
	{
		//markLoki("logged incorrect");
		$feedback = '<p class="error">Incorrect login name or password</p>';
	}
}

else if ($_REQUEST['act']=="logoff")
{
		$_SESSION['login']= false;
		unset( $_SESSION['login'] );
		session_unset(); 
		session_destroy(); 
		//markLoki("logged off");
		$feedback = '<p class="OK">Logout successful.</p>';
	
}	
else
{

		$feedback = '<p></p>';

}
?>
<html xmlns="http://www.w3.org/1999/xhtml">

	<head>
		<meta http-equiv="content-type" content="text/html;charset=utf-8" />
		<meta name="generator" content="Sofia Digital" />
		<meta http-equiv="Expires" content="0" />
		<meta http-equiv="Pragma" content="no-cache" />
		<meta http-equiv="Cache-Control" content="no-cache" />
		<title>Sofia Backstage Launcher Editor</title>
		<link href="css/sofia_backstage_ui.css" rel="stylesheet" type="text/css" media="all" />
		<!-- script type="text/javascript" language="javascript" src="sofia_backstage_ui.js"></script -->

	<style type="text/css">
	body{
	text-align: center;
	min-width: 150px;
	width: auto;
	}
	</style>

	</head>

<body onLoad="">

	<div><img src="css/images/sofialogo.png" alt="Welcome to Sofia Backstage Author" border="0" style="padding-top:20px;"></div>
		
	<div id="loginmain" align="center">
		<?php echo $feedback; ?>
		<form name="loginform" method="post" action="login.php">
		<h2>Please login</h2>
		<div class="loginstartbox">
		   <div class="roundtoplogin">
			 <img src="css/images/navitop_roundcorner_tl.gif" alt="" class="corner" style="display: none;" height="15" width="15">
		   </div>
		   <!--content S -->
		   <table border="0">
		   <tr>
		   		<td>USERNAME</td><td><input id="login" name="login" type="text"></td>
		   	</tr>
		   	<tr>
		   		<td>PASSWORD</td><td><input name="pass" id="pass" type="password"></td>
		   	</tr>
		   	<tr>
		   	<td colspan="2" align="right"><input type="hidden" name="act" value="login"><input type="submit" name="   LOGIN   " class="action" value="Submit"></td>
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
