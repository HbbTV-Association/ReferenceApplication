/*****************************

Navigation in different states 

*****************************/


if (typeof(KeyEvent) != 'undefined') {
  if (typeof(KeyEvent.VK_LEFT) != 'undefined') {
    var VK_LEFT = KeyEvent.VK_LEFT;
    var VK_UP = KeyEvent.VK_UP;
    var VK_RIGHT = KeyEvent.VK_RIGHT;
    var VK_DOWN = KeyEvent.VK_DOWN;
    var VK_ENTER = KeyEvent.VK_ENTER;
    var VK_RED = KeyEvent.VK_RED;
    var VK_GREEN = KeyEvent.VK_GREEN;
    var VK_YELLOW = KeyEvent.VK_YELLOW;
    var VK_BLUE = KeyEvent.VK_BLUE;
    var VK_PLAY = KeyEvent.VK_PLAY;
    var VK_PAUSE = KeyEvent.VK_PAUSE;
    var VK_STOP = KeyEvent.VK_STOP;
    var VK_FAST_FWD = KeyEvent.VK_FAST_FWD;
    var VK_REWIND = KeyEvent.VK_REWIND;
    var VK_BACK = KeyEvent.VK_BACK;
    var VK_0 = KeyEvent.VK_0;
    var VK_1 = KeyEvent.VK_1;
    var VK_2 = KeyEvent.VK_2;
    var VK_3 = KeyEvent.VK_3;
    var VK_4 = KeyEvent.VK_4;
    var VK_5 = KeyEvent.VK_5;
    var VK_6 = KeyEvent.VK_6;
    var VK_7 = KeyEvent.VK_7;
    var VK_8 = KeyEvent.VK_8;
    var VK_9 = KeyEvent.VK_9;
  }
}
if (typeof(VK_LEFT) == "undefined") {
  var VK_RED = 82; // r
  var VK_GREEN = 71; // g
  var VK_YELLOW = 89; // y
  var VK_BLUE = 66; // b
  var VK_LEFT = 37;
  var VK_UP = 38;
  var VK_RIGHT = 39;
  var VK_DOWN = 40;
  var VK_ENTER = 13;

  var VK_0 = 48;
  var VK_1 = 49;
  var VK_2 = 50;
  var VK_3 = 51;
  var VK_4 = 52;
  var VK_5 = 53;
  var VK_6 = 54;
  var VK_7 = 55;
  var VK_8 = 56;
  var VK_9 = 57;

  var VK_PLAY = 415;
  var VK_PAUSE = 19;
  var VK_STOP = 413;
  var VK_FAST_FWD = 417;
  var VK_REWIND   = 412;
  var VK_HOME = 771;
  var VK_END = 35;
  var VK_BACK = 220;
  var VK_TELETEXT = 113;

  // page up 427, page down 428
  var VK_TELETEXT = 459;
}

document.addEventListener('keypress', function(e) {
	e.preventDefault();
	//console.log("key event filtered");
}, false);

function globalNavigation( keyCode )
{
	if( loading && keyCode != VK_LEFT && keyCode != VK_RIGHT )
		return;
	
	if(movieDetailScreen && movieDetailScreen.open){
		return;
	}

	if( loading )
		updateView = false;
	
	var menu = menustructure[ actmenu ];
	if( autoloadTimer )
		clearTimeout( autoloadTimer );
	
	switch (keyCode) {
		case VK_RED:
			//console.log("exit vod");
			exit();
			break;
		case VK_BLUE:
			break;
		case VK_RIGHT:
			$("#item"+actmenu+"_"+ menu.center).removeClass("focused");
			menu.center++;
			if( menu.center >= menu.items.length )
				menu.center = 0;
			$("#item"+actmenu+"_"+ menu.center).addClass("focused");
			if( searchScreen.focused )
				searchScreen.close();  //searchScreen.focused = false;
			checkAutoload();
			break;
		case VK_LEFT:
			$("#item"+actmenu+"_"+ menu.center).removeClass("focused");
			menu.center--;
			if( menu.center < 0 )
				menu.center = menu.items.length-1;
			$("#item"+actmenu+"_"+ menu.center).addClass("focused");
			if( searchScreen.focused )
				searchScreen.close(); //searchScreen.focused = false;
			checkAutoload();
			break;
		case VK_BACK:
			exit();
			break;
		case VK_UP:
			
			$("#item" + actmenu + "_" + menu.center).removeClass("focused");
			actmenu = menustack.pop() || 0;
			
			if( menustructure[ actmenu ].type == "grid" )
			{
				showMenuSmart(actmenu);
			}
			activateItem();
			
			break;
		case VK_ENTER:
		case VK_DOWN:
			var item = menu.items[ menu.center ];
			var stop = false;
			if( typeof( item.func ) == "function" ){
				stop = item.func();
			}
			else if( typeof( item.func ) == "string" ){
				if( item.func.match(/\(.*\)/) )
					stop = eval( item.func );
				else
					stop = window[ item.func ]();
			}
			
			if(stop)
				break;
			if( item.submenu )
				enterMenu( item.submenu );
			else{
				console.log("item has no action");
			}
			break;
		case VK_GREEN:
			break;
		case VK_0:
			activateDebug( true );
			break;
		case VK_1:
			activateDebug( false );
			break;
		case VK_9:
			location.reload();
			break;
		default:
			return false;
	}
	
	return true;
}

function navigateScrollList( keyCode )
{
	var actlist = menu.items[ menu.center ];
	switch (keyCode) {
		case VK_RIGHT:
			
			actlist.center++;
			if( actlist.center >= actlist.items.length )
			{
				if( actlist.featured ){
					actlist.center = 0;
				}
				else{
					actlist.center = actlist.items.length-1;
					var animatedRow = $(".focused").parent();
					var left = new String( animatedRow.css('left') );
					animatedRow.css( "left", (parseInt( left ) - 100) + "px" );
					setTimeout(function(){
						animatedRow.css( "left", left ); // restore correct left status
					}, 150);
					break;
				}
			}
			if( !actlist.load && !actlist.featured && actlist.connector != "client" )
				checkMore( actlist );
			stopScrollText();
			adjustScrollList( actlist, keyCode );
			activateItem();
			autoScrollText(3000,2000);
			break;
		case VK_BACK:
			exit();
			break;
		case VK_YELLOW:
			while( menustack.length && menustack.last() != 0 )
				menustack.pop();
			menu.center = 0;
			//adjustGridTop( menu );
			showMenuSmart( actmenu );
			actmenu = 0;
			showMenuSmart( actmenu );
			break;
		case VK_LEFT:
			actlist.center--;
			if( actlist.center < 0  )
			{
				if( actlist.featured ){
					actlist.center = actlist.items.length-1;
					stopScrollText();
					activateItem();
					adjustScrollList( actlist, keyCode );
				}
				else
					actlist.center = 0; 
			}
			else
			{	
				stopScrollText();
				activateItem();
				adjustScrollList( actlist, keyCode );
				autoScrollText(3000,2000);
			}
			break;
		case VK_UP:
			if( menu.center <= 0 )
			{
				actmenu = menustack.pop() || 0;
				showMenuSmart( actmenu );
				break;
			}
			
			do{
				menu.center--; // one row up
			} while( !menu.items[ menu.center ].items.length && menu.center );
			
			//menu.center--; // one row up
			actlist = menu.items[ menu.center ];
			adjustGridTop( menu ); // adjust row to be visible
			
			var next = null;
			if( actlist.featured ){
				next = $(".bannerItem2").attr("id"); // get the centered featured banner item when enter to featured list
			} else{
				next = findClosest( $(".focused").attr('id'), $("[id^=item"+actmenu+"_"+menu.center+"] .scrollListItem") );
			}
			if( next )
			{
				actlist.center = parseInt( next.grep(/item\d+_\d+_(\d+)/) ); // get the id of next item
			}
			stopScrollText();
			adjustScrollList( actlist );
			activateItem(function(){
				autoScrollText(3000,2000);
			});
			break;
		case VK_DOWN:
			
			
			var lastOK = menu.center;
			if( menu.center == menu.items.length-1 )
				break;
			try{
				do{
					menu.center++; // one row down
					
				} while( !menu.items[menu.center].items.length && !(menu.center == menu.items.length-1 ) );
			} catch( e ){
				console.log( e.message );
				menu.center = lastOK;
			}
			if( menu.center == menu.items.length ){
				menu.center = lastOK;
				break;
			}
			
			actlist = menu.items[ menu.center ];
			adjustGridTop( menu ); // adjust row to be visible
			var next = findClosest( $(".focused").attr('id'), $("[id^=item"+actmenu+"_"+menu.center+"] .scrollListItem") );
			if( next )
			{
				actlist.center = parseInt( next.grep(/item\d+_\d+_(\d+)/) ); // get the id of next item
			}
			stopScrollText();
			adjustScrollList( actlist );
			activateItem(function(){
				autoScrollText(3000,2000);
			},500);
			// check if there is up to 2 more rows initialized in the dom
			if( menu.items.length > menu.center+2 && !$("#item"+actmenu+"_"+(menu.center+2)+"_0")[0] ){
				showScrollMenu(0, menu.items[ menu.center+2 ] );
			}
			break;
			
		case VK_ENTER:
			var item = actlist.items[ actlist.center ];
			console.log("load scroll list item or play asset", item);
			
			// satellite
			console.log("ProgramInfo item", item);
			if( !item.start ){
				item.start = "0000-00-00T";
			}
			mcDataLayer.pagename = "sg:toggle:tv_hbbtv:catchup:"+item.start.split('T')[0].split('-').join('')+":"+item.code+"_"+item.title;
			mcDataLayer.contentid = item.code;
			mcDataLayer.contentname = item.title; 
			console.log(mcDataLayer.pagename);
			//_satellite.track('explicitfire');
			// end of satellite
			
			stop = false;
			if( item.code && !isNaN( parseInt( item.code ) ) ){
				console.log("item.code", item.code);
				if( item.straightPlay || item.mediausage == "CLIP" ){
					
                    var that = this;
                    var entitlementSuccessCb = function(){ 
                        console.log("entitlementSuccesCb");
                        //showInfo("Entitlement ok!");
						showLoadImg(false);
                        prepareVideoStart();
                        stop = true;
                    };
                        
                    var entitlementErrorCb = function(){
                        console.log("entitlementErrorCb");
						showLoadImg(false);
                        //showInfo("Error getting entitlement!");
                    };
					
					showLoadImg(true);
                    entitlement.checkEntitlement(null, item, entitlementSuccessCb, entitlementErrorCb);
				}
				else if(item.mediausage && item.mediausage == "Movie")
				{
					$.get("../getmovies.php?codes="+item.code, function(response){
						if(response.movies.length > 0){
							if(movieDetailScreen.show(new Movie(response.movies[0]))){
								movieDetailScreen.closeAction = function(){
									$("#master").show(); 
									updateContinueWatchingList();
								}
								$("#master").hide();
							}
						}
					});
				}
			}
			else if( typeof( item.func ) == "function" ){
				if(item.mediausage && item.mediausage == "Movie"){
					//stop = item.func();
				}
				stop = item.func();
			}
			else if( typeof( item.func ) == "string" ){
				if( item.func.match(/\(.*\)/) )
					stop = eval( item.func );
				else
					stop = window[ item.func ]();
			}
			if( stop )
				break;
			if( item.submenu )
				enterMenu( item.submenu );
			else if( item.serieid )
			{
				if (actlist.name != "Extras" && actlist.name != "latest") {
					
					buttonbar.saveState();
					try{

						console.log("ProgramInfo item", item);
						programInfo.show({ 
							"serie" : item.serieid.toString(), 
							"id" : item.code.toString(), 
							"sname" : (item.sname ? item.sname: undefined) 
						});
					}
					catch(e){
						console.log("failed open programInfo");
						buttonbar.restoreState();
					}
					
					//programInfo.closeAction = function(){
					//	buttonbar.restoreState();
					//};
					programInfo.onClose = function(){ 
						updateContinueWatchingList();
					}
					stop = true;
				} else {
									
                    var that = this;
                    var entitlementSuccessCb = function(){ 
                        console.log("entitlementSuccesCb");
                        //showInfo("Entitlement ok!");
                        execWhenPlaying = null;
                        execWhenStop = null;
						showLoadImg(false);
                        prepareVideoStart();
                        stop = true;
                    };
                        
                    var entitlementErrorCb = function(){
                        console.log("entitlementErrorCb");
						showLoadImg(false);
                        //showInfo("Error getting entitlement!");
                    };
					showLoadImg(true);
                    entitlement.checkEntitlement(null, item, entitlementSuccessCb, entitlementErrorCb);
                    
				}
			}
			break;
		default:
			return false;
	}
	return true;
}



function onKey(keyCode) {
	
	
	
	$("#info").addClass("hide");
	//showInfo("key press " + keyCode);
	
	if( errorPage )
	{
		showErrorPage(false); // any key stroke will exit error page
		return;
	}
	
	menu = menustructure[actmenu];
	
	
	if( !menu ){
		console.log("WRONG MENU SELECTED");
	}
	
    if(mobilePlatformView && mobilePlatformView.open){
            mobilePlatformView.navigate(keyCode);
            return;
    }
    
    if( settings.open )
	{
		settings.navigate( keyCode );
		return;
	}
    
	if( dialog.open )
	{
		navigateDialog( keyCode );
		return;
	}
    
    if( pinEntryDialog.open )
	{
		pinEntryDialog.navigate( keyCode );
		return;
	}
	
	if( playerOpen )
	{
		navigatePlayer( keyCode );
		return;
	}
	
	if( programInfo && programInfo.open )
	{
		programInfo.key( keyCode ); // any key stroke will exit error page
		return;
	}
	
	if( searchScreen.open)
	{
		if (!animating) {
			searchScreen.key( keyCode );
		}
		if (!searchScreen.open) activateItem();
		return;
	}

	if(movieDetailScreen && movieDetailScreen.open){
		movieDetailScreen.navigate(keyCode);
		return;
	}
   
	// if there is keyboard that is active
	if( keyboard && keyboard.active )
	{
		keyboard.key( keyCode );
		return;
	}
	
	/*
	if( menu.center < 0 )
	{
		navigateSerieDescription( keyCode ) || navigateScrollList( keyCode ) || globalNavigation( keyCode ); //  globalNavigation( keyCode );
		return;
	}
	*/
	
	if( menu.type == "grid" || menu.type == "serie" )
	{
		navigateScrollList( keyCode ) || globalNavigation( keyCode );
		return;
	}
	// when another menu active
	else
	{
		globalNavigation( keyCode );
		return;
	}
	
}


function findClosest(from, target, direction) { //from: id, target: link array, direction (optional) up, down, left, right
	try{
		var from_offset = $("#"+from).offset();
		var shortest=2000;
		var index;
		var cx = $("#"+from).width()/2;
		var cy = $("#"+from).height()/2;
		if(from_offset){
			var pos = { a : { x : Math.round( from_offset.left + cx ) , y : Math.round( from_offset.top + cy ) } };
			$.each(target, function(i, el){ // find closest menu item, compares center coordinates
				if( $(el).attr('id') == from )
					return; // do not count itself
				var offset = $(el).offset();
				var cx2 = $(el).width()/2;
				var cy2 = $(el).height()/2;
				pos.b = { x : Math.round( offset.left + cx2 ) , y : Math.round( offset.top + cy2 ) };
				
				/* if direction set, grep off elements out of named direction sector. See below
				
				\ up /
			   l \  / r
			   e  \/  i
			   f  /\  g
			   t /  \ h
				/down\t
				
				*/

				if( direction ) 
				{
					if( direction == "up"   && pos.b.y >= pos.a.y + Math.abs( pos.b.x - pos.a.x )
					|| direction == "down"  && pos.b.y <= pos.a.y + Math.abs( pos.b.x - pos.a.x ) 
					|| direction == "left"  && pos.b.x >= pos.a.x - Math.abs( pos.b.y - pos.a.y )
					|| direction == "right" && pos.b.x <= pos.a.x + Math.abs( pos.b.y - pos.a.y ) )
						return;
				}
				var dist = Math.sqrt(Math.pow(offset.left+cx2-from_offset.left-cx,2)+Math.pow(offset.top+cy2-from_offset.top-cy,2));
				if (dist<shortest) {
					shortest = dist;
					index = el;
				}					
			});
		
			//console.log("Closest: "+$(index).attr('id'));
			return $(index).attr('id'); // closest id
		}
	} catch( e ){
		showInfo("Error: " + e.description ,10);
		error( e );
	}
}

function directions( code )
{
	if( code == VK_UP ) return "up"; 
	if( code == VK_DOWN ) return "down";
	if( code == VK_LEFT ) return "left"; 
	if( code == VK_RIGHT ) return "right";
}
