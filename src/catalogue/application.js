/**
 * Application initaion methods. Inits catalogue menu, HbbTV Application Manager, Monitor module and selects VideoPlayer to be used
 *
 * @module Application
 */

function showApplication() {
  try {
	var app = document.getElementById('appmgr').getOwnerApplication(document);
    app.show();
    app.activate();
  } catch (e) {
    // ignore
  }
}

function init()
{
	//toggleDebug();
	//console.log("test");
	setLoading(true);
	$.ajaxSetup({ cache: false });
	$.get("config.json", function( menuconfig ){
		config = menuconfig.menus;
		main = config[0];

		var new_config = [];
		for(var i = 0; i < main.items.length; i++){
			if(main.items[i].submenu){
				var submenu = config[main.items[i].submenu];
				//new_config.push({"items":submenu.items, "title":main.items[i].title});
                try{
					var submenuItems = [];
					$.each( submenu.items, function(nth, item){
						// if asset is not se to be relevant to current app profile, set it disabled. It can still be tried to launch if user wish to test
						item.disabled = !( !item.profile || ( Array.isArray( item.profile ) && item.profile.indexOf( profile.version ) >= 0 ) );
						
						// TODO: if host not production change relative urls to production endpoint
						
						if( !item.url.match(/http/) ){
							item.url = item.url.replace(/.*videos/, "http://refapp.hbbtv.org/videos")
						}
						
						submenuItems.push( item );
					});
					new_config.push({"items": submenuItems, "title":main.items[i].title});
				} catch( e ){
					// no drop offs, if error happens
					new_config.push({"items":submenu.items, "title":main.items[i].title});
				}
				
			}
		}

		menu = new Menu("menu", new_config);
		
		/*
		setTimeout( function(){
			// check if saved position found and activate current position
			var previous = sessionStorage.getItem( "refappPosition" );
			if( previous ){
				sessionStorage.removeItem("refappPosition");
				previous = JSON.parse( previous );
				console.log("FF to position ", previous);
				for(i = 0; i < previous[0]; ++i){
					menu.navigate(VK_RIGHT, true);
				}
				for(i = 0; i <= previous[2]; ++i){
					menu.navigate(VK_DOWN, true);
				}
				for(i = 0; i < previous[1]; ++i){
					menu.navigate(VK_RIGHT, true);
				}
			}
		}, 100);
		*/
		
		setLoading(false);
	}, "json");
	
	
	// Monitor instance must be accessible in the application. 
	// If Monitor implementation is not included, empty interface does nothing but must be present
	if( typeof Monitor == "undefined" ){
		Monitor = new monitor( null );
	}
	
	// selects the version of the videoplayer by application profile used
	try{
		
		if( profile.hbbtv == "1.5" ){
			vplayer = new VideoPlayer("videodiv", profile);
			//vplayer = new VideoPlayerBasic("videodiv", profile);
			//vplayer = new VideoPlayerEME("videodiv", profile);
			$("#wrapper").append("<div id='appversion'>HbbTV 1.5</div>");
		}
		else if( profile.hbbtv == false ) {
			vplayer = new VideoPlayerEME("videodiv", profile);
			$("#wrapper").append("<div id='appversion'>MSE-EME</div>");
		}
		else {
			vplayer = new VideoPlayerHTML5("videodiv", profile);
			$("#wrapper").append("<div id='appversion'>HbbTV 2.0.1</div>");
		}
		
		vplayer.populate();
		vplayer.clearVideo();
	} catch(e){
		showInfo("error "+ profile.hbbtv +" " + e.message + e.lineNumber + " vplayer " );
		console.log( e.message );
	}
	
	
	// if debug is included, display button to toggle debug screen on/off
	if( typeof debug == "function" ){
		displayDebugButton( true, "Engineer view" );
	}
}


