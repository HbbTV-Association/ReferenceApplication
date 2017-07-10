<?php
//session_name("LAUNCHER");
//session_start();
//include_once("funcs.php");

// enter to hidden superadmin page
if( isset( $_GET['admin'] ) && $_GET['admin']  == "sofiapeelo-salasana" )
{
	header("location:admin.php?admin=". $_GET['admin']);
	die();
}




session_start();
if ( !isset( $_SESSION['login'] ) || $_SESSION['login']!= true)
{
	header("location:login.php");
}

if( isset( $_SESSION['uploadApp'] ) )
{
	$message = $_SESSION['uploadApp'];
	unset( $_SESSION['uploadApp'] );
}
if( isset( $_SESSION['uploadVideo'] ) )
{
	$videoMessage = $_SESSION['uploadVideo'];
	unset( $_SESSION['uploadVideo'] );
}

$settings = json_decode( file_get_contents("secret_conf_file.json"), true );

$eventkeys = array("VK_GREEN","VK_YELLOW","VK_BLUE","VK_ENTER","VK_0","VK_1","VK_2","VK_3","VK_4","VK_5","VK_6","VK_7","VK_8","VK_9");
$apptypes = array("Link","App","Video TS","Video MP4","Audio MP3","Audio MP4");

?>

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">

	<head>
		<meta http-equiv="Content-Type" content="text/html;charset=utf-8"/>
		<title>Sofia Backstage HbbTV Launcher Editor</title>
		<link href="css/sofia_backstage_ui.css" rel="stylesheet" type="text/css" media="all"/>
		<link rel="stylesheet" href="//code.jquery.com/ui/1.11.0/themes/smoothness/jquery-ui.css">
		<script type="text/javascript" src="jquery-1.11.0.min.js"></script>
		<script src="jquery-ui.js"></script>
		<script src="image-picker.min.js"></script>
		<link rel="stylesheet" href="image-picker.css">
		<script type="text/javascript" src="editor.js"></script>
		<script type="text/javascript">
		<?
		//read icons
		$icons_array = array();
		if ($handle = opendir('../icons')) {
			while (false !== ($entry = readdir($handle))) {
				if ($entry != "." && $entry != "..") {
				   array_push($icons_array, "icons/".$entry);
				}
			}
			closedir($handle);
		}
		echo "			var icons = ['" . implode("','", $icons_array )  . "'];";
		?>
			var apptypes = ["Link","App","Video TS","Video MP4","Audio MP3","Audio MP4","DASH", "Video TS Live", "DASH Live", "DASH Live2", "DASH Live2 DRM Agent", "DASH Live2 DRM-proxy"];
			var menus = new Array();
		</script>
		<style>
		#dialog label, #dialog input { display:block; }
		#dialog label { margin-top: 0.5em; }
		#dialog input, #dialog textarea { width: 95%; }
		#tabs { margin-top: 1em; }
		#tabs li .ui-icon-close { float: left; margin: 0.4em 0.2em 0 0; cursor: pointer; }
		#add_tab { cursor: pointer; }
		#cssContainer { width: 0px; height : 0px; overflow: hidden; 
			-webkit-transition: height 1s; 
			-moz-transition: height 1s; 
			-ms-transition: height 1s; 
			-o-transition: height 1s; 
			transition: height 1s;		
		}
		.cssContainerOpen { width: 100% !important; height : 650px !important; 
			
		}
		#info{ position: fixed; top:5px; left : 50px; text-align: middle ; z-index: 99; background: rgba(240,240,240, 0.8); border: 1px solid gray ; color:red; display: none;}
		.iconselector{
			width:0px;position:fixed;background:white;top:0px;right:0px;height:100%;overflow:hidden;
			-webkit-transition: width 200ms; 
			-moz-transition: width 200ms; 
			-ms-transition: width 200ms;
			-o-transition: width 200ms;
			transition: width 200ms;
		}
		.iconselectorOpen{
			width:550px !important;
			overflow: auto !important;
		}
		</style>
	</head>

<body onload="">
<div id="master">
	<div id="main">

		<div class="toolbar">
			<div class="toolbarleft"></div>
		</div>
		<!-- toolbar E -->
		
		<h2 id="info"></h2>
		
		<div id="maincontent">
			<h1>HbbTV Launcher Editor <a class="action" href='login.php?act=logoff'>  Log Out  </a></h1>
			
			<?php if( $settings['showStreamEvents'] == true ){ ?>
			<div class="editcontainer">
				<form action="<? echo $pollurl; ?>actions.php?act=trigger" enctype="multipart/form-data" method="post" name="trigger" id="trigger">
					
					<div class="containertitle">Trigger Event</div>    
					<input name="refresh" type="submit" class="action" value="  Trigger  "></input>
					<input type="hidden" name="name" value="<? echo $evt_name; ?>"></input>
					<input type="hidden" name="ret" value="<? echo $_SERVER['SERVER_NAME'].$_SERVER['PHP_SELF']; ?>"></input> 
				
				</form>
			
			
				<form action="actions.php?act=saveevent" enctype="multipart/form-data" method="post" name="event" id="event">
					<div class="containertitle">Stream Event</div> 
					<table id="evttable">
						<tr><td>URL:</td><td><input id="evt_url" name="evt_url" value="<? echo $evt_url; ?>" size="100"></input></td></tr>
						<tr><td>Image:</td><td><input id="evt_img" name="evt_img" value="<? echo $evt_img; ?>" size="100"></input></td></tr>
						<tr><td>Top:</td><td><input id="evt_y" name="evt_y" value="<? echo $evt_y; ?>" size="4"></input> pixels</td></tr>
						<tr><td>Left:</td><td><input id="evt_x" name="evt_x" value="<? echo $evt_x; ?>" size="4"></input> pixels</td></tr>
						<tr><td>Timeout:</td><td><input id="evt_delay" name="evt_delay" value="<? echo $evt_delay; ?>" size="4"></input> seconds</td></tr>
						<tr><td>Event key:</td><td><select id="evt_vk" name="evt_vk">
							<? foreach ($eventkeys as $value) {
								if ($evt_vk==$value) {
									echo "<option value=\"".$value."\" selected=\"selected\">".$value."</option>";
								} else {
									echo "<option value=\"".$value."\">".$value."</option>";
								}
								
							}
						?>
						</select></td></tr>
					</table>
					<input type="hidden" name="evt_name" value="<? echo $evt_name; ?>"></input>
					<input type="hidden" name="ret" value="<? echo $_SERVER['SERVER_NAME'].$_SERVER['PHP_SELF']; ?>"></input>
				</form>
				<input name="save" type="submit" class="action" value="  Save  " onclick="saveEvent();"></input>
				<input name="demo1" type="button" class="action" value="  Demo values  " onclick="fillEvent('demo1');return false;"></input>
			</div>
			
			<?php } ?>
			
			<div class="editcontainer">
				
			
				<!-- Launcher settings -->
				<form enctype="multipart/form-data" name="editor" id="editor">
					<div class="containertitle">Launcher Settings</div>
					<table>
						<tr><td>Red button timeout</td><td><input type="text" name="icondelay" value="" size="4" id='icondelay'></input> seconds</td></tr>
					</table>
					<input type="button" class="action" value="  Save menu and settings  " id="saveButton"></input>
					<div style="margin-top:20px;"></div>
				</form>
				
				<!-- Menus -->
				<button id="add_tab">Add Menu</button>
				<div id="tabs">
					 <ul id="menutabs"></ul>
				</div>
			
			</div>
			
			<!-- Upload Icons -->
			<div class="editcontainer">
				<form action="upload.php" method="post" enctype="multipart/form-data">
					<div class="containertitle">Upload new app icon</div>
					<input type="file" accept="image/*" name="iconfile"></input> <input type="submit" class="action" value=" Upload "></input>
					<div style="margin-top:20px;"></div>
				</form>
			</div>
			
			<!-- Upload Videos -->
			<div class="editcontainer">
				<form action="uploadvideo.php" method="post" enctype="multipart/form-data">
					<div class="containertitle">Upload new video</div>
					Video Conversion 
					<select id="videoconversion" name="videoconversion">
						<option value="none">None</option>
						<option value="mp4_DASH">mp4 to MPEG DASH</option>
					</select><br />
					Burn watermark text layer to video: <input type="text" name="videowatermark"></input><br />
					<input type="file" accept="video/mp4" name="videofile"></input><br />
					<input type="submit" class="action" value=" Upload "></input>
					<div style="margin-top:20px;">
					<?php 
					if( $videoMessage ) 
					{
						echo "<span>" . $videoMessage['message'] . "</span><br>";
						if( count( $videoMessage['files'] ) )
						{
							echo "Uploaded videos: <br><pre>";
							foreach( $videoMessage['files'] as $file )
							{
								echo $file . "\n";
							}
							echo "</pre>";
						}
					}				
					
					?>
					</div>
				</form>
			</div>
			
			<!-- Upload Apps -->
			<div class="editcontainer">
				<form action="uploadApp.php" method="post" enctype="multipart/form-data">
					<div class="containertitle">Upload new app</div>
					<input type="checkbox" name="overwrite"></input> Overwrite existing files<br>
					<input type="checkbox" name="cleanold"></input> Clean old contents in the folder<br>
					<input type="file" accept="/zip" name="appfile"></input> (.zip)
					<input type="submit" class="action" value=" Upload "></input>
					<div style="margin-top:20px;"></div>
				</form>
				<div>
				<?php 
				if( $message ) 
				{
					echo "<span>" . $message['message'] . "</span><br>";
					if( count( $message['files'] ) )
					{
						echo "Extracted files: <br><pre>";
						foreach( $message['files'] as $file )
						{
							echo $file . "\n";
						}
						echo "</pre>";
					}
					if( count( $message['cleared'] ) )
					{
						echo "Removed files: <br><pre>";
						foreach( $message['cleared'] as $file )
						{
							echo $file . "\n";
						}
						echo "</pre>";
					}
				}				
				
				?>
				</div>
			</div>
			
			<?php if( $settings['showCSSEditor'] == true) {  ?>
			<div class="editcontainer">
				<div class="containertitle">Launcher CSS File</div>
				<button id="editcss">Edit Css</button>
				<div id="cssContainer">
					<input type="button" class="action" value="  Cancel  " id="cancelEditCss"></input>
					<input type="button" class="action" value="  Save CSS File  " id="saveCssButton"></input>
					<input type="button" class="action" value="  Restore default CSS  " id="restoreCssDefaultsButton"></input><br>
					<textarea name="csseditor" id="csseditor" rows="25" cols="120"></textarea>
				</div>
				<div style="margin-top:20px;"></div>
			</div>
			<?php } ?>
			
		</div>
	</div>
</div>
<!-- main div kiinni -->
</body>
</html>


















