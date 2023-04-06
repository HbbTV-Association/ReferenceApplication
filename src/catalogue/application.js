/**
 * Application initaion methods. Inits catalogue menu, HbbTV Application Manager, Monitor module and selects VideoPlayer to be used
 *
 * @module Application
 */

function showApplication() {
  try {
	var app = document.getElementById('appmgr').getOwnerApplication(document);
    app.show();
    //app.activate();
  } catch (e) {
    // ignore
  }
}

function init() {
	//toggleDebug();
	var ctxUrl = window.location.href;
	var delim  = ctxUrl.lastIndexOf("/");
	ctxUrl = ctxUrl.substring(0, delim);    // "http://my.server.com/production/catalogue"
	delim  = ctxUrl.indexOf("/", 9)+1;
	var appName= ctxUrl.substring(delim, ctxUrl.indexOf("/", delim)); // "production"
	
	setLoading(true);
	$.ajaxSetup({ cache: false });
	$.get("config.json", function( menuconfig ){
		config = menuconfig.menus;
		main = config[0];

		var new_config = [];		
		var sessionGUID = uuidv4(); // GUID per each configjson reload session
		console.log("SessionGUID=" + sessionGUID);

		for(var i = 0; i < main.items.length; i++){
			if(main.items[i].submenu){
				var submenu = config[main.items[i].submenu];
                try{
					var submenuItems = [];
					$.each( submenu.items, function(nth, item){
						// if asset is not se to be relevant to current app profile, set it disabled. It can still be tried to launch if user wish to test
						item.disabled = !( !item.profile || ( Array.isArray( item.profile ) && item.profile.indexOf( profile.version ) >= 0 ) );

						if(item.url && !item.url.match(/http/)) {
							item.url = ctxUrl+"/"+item.url; //item.url.replace(/.*videos/, "http://refapp.hbbtv.org/videos")
						}
						
						if(item.url)    item.url   = item.url.replace("${SESSION_GUID}", sessionGUID);
						if(item.la_url) item.la_url= item.la_url.replace("${SESSION_GUID}", sessionGUID);
						if(item.desc) {
							item.desc = item.desc.replace("${SESSION_GUID}", sessionGUID);
						} else {
							item.desc = "";
						}
						
						// create MarlinMS3 url syntax
						// ms3://ms3.service.com/laurl#https%3A%2F%2Fcontent.com%2Fvideos%2Fmyvideo%2Fdrm%2Fmanifest.mpd
						if(item.drm && item.drm=="marlin") {
							item.url = item.la_url + "#" + encodeURIComponent(item.url)
							delete item.la_url
						}
						
						if(item.title=="Reload Video catalogue") {
							item.desc = ctxUrl; // + ", YYYY-MM-DD";
						}

						submenuItems.push( item );
					});
					if(submenuItems.length>0)
						new_config.push({"items": submenuItems, "title":main.items[i].title});
				} catch(ex){
					console.log(ex);
					// no drop offs, if error happens
					if(submenu && submenu.items.length>0)
						new_config.push({"items":submenu.items, "title":main.items[i].title});
				}
				
			}
		}

		menu = new Menu("menu", new_config);
		menu.sessionGUID = sessionGUID;
		
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
		monitorAppState();
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
			$("#wrapper").append("<div id='appversion'>HbbTV 1.5/"+appName+"</div>");
		}
		else if( profile.hbbtv == false ) {
			vplayer = new VideoPlayerEME("videodiv", profile);
			$("#wrapper").append("<div id='appversion'>MSE-EME/"+appName+"</div>");
		}
		else {
			vplayer = new VideoPlayerHTML5("videodiv", profile);
			$("#wrapper").append("<div id='appversion'>HbbTV 2.0.1/"+appName+"</div>");
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

var lifetime = 0;
var playerStates = [];
var appStateInterval = null;
function monitorAppState(){
	appStateInterval = setInterval( function(){
		lifetime += 1000;
		if( vplayer ){
			playerStates.push( { time : lifetime, playerPlaying : vplayer.isPlaying(), playerTime : vplayer.time() } );
		}
		
		// check if player is jamming
		var jamming = true;
		$.each( playerStates, function(nth, state){
			if( !playerStates[0].playerPlaying || playerStates[0].playerPlaying != state.playerPlaying || playerStates[0].playerTime != state.playerTime ){
				jamming = false;
				return false;
			}
		} );
		
		//console.log("is jamming? " + jamming);
		if( jamming ){
			showInfo("Player is jamming");
		}
		
		if( playerStates.length > 10 ){
			playerStates.shift();
		}
	}, 1000 );
	
}
