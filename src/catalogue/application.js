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
				new_config.push({"items":submenu.items, "title":main.items[i].title});
			}
		}

		menu = new Menu("menu", new_config);
		setLoading(false);
	}, "json");
	
	if( typeof Monitor == "undefined" ){
		// Monitor instance must be accessible in the application.
		Monitor = new monitor( null );
	}
	
	try{
		if( profile.hbbtv == "1.5" ){
			vplayer = new VideoPlayer("videodiv", profile);
		}
		else if( profile.hbbtv == false ) {
			vplayer = new VideoPlayerEME("videodiv", profile);
		}
		else {
			vplayer = new VideoPlayerHTML5("videodiv", profile);
		}
		vplayer.populate();
	} catch(e){
		console.log( e.message );
	}
}