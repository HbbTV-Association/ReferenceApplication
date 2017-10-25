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
		console.log( e.message );
	}
	
	// if debug is included, display button to toggle debug screen on/off
	if( typeof debug == "function" ){
		displayDebugButton( true, "Engineer view" );
	}
}


