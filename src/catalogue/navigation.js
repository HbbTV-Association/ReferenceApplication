/***
	Key registering and navigation
**/

function registerKeyListener() {
    document.addEventListener('keydown', function(e) {
        if (onKey(e.keyCode)) {
            e.preventDefault();
        }
    }, false);
}

function registerKeys(mode) {
    var mask;
    // ui hidden, only red and green registered
    if (mode == 0) {
        mask = 0x1+0x2;
    } else {
        mask = 0x1+0x2+0x4+0x8+0x10+0x20+0x40+0x80;
    }
    try {
        var app = document.getElementById('appmgr').getOwnerApplication(document);
        app.privateData.keyset.setValue(mask);
    } catch (e2) {

    }
}

function onKey(keycode){
	
	if( keycode == VK_BLUE ){
		toggleDebug();
		return true;
	}
	
	if( infoBoxVisible ){
		if( infoBoxScrollable && ( keycode == VK_UP || keycode == VK_DOWN ) ){
			var top = parseInt( $("#infoBox > .verticalMiddle").css("top") );
			$("#infoBox > .verticalMiddle").css("top", ( top + ( keycode == VK_UP? 10 : -10 ) ) + "px");
			showInfo("top:" + top + ", target: " + ( top + ( keycode == VK_UP? 10 : -10 ) ) + "px");
			return;
		}
		showInfoBox(false);
		return;
	}
	
    if(!animating && !loading){
        if(vplayer && vplayer.isVisible() && vplayer.isFullscreen()){
            vplayer.navigate(keycode);
            return true;
        }
        menu.navigate(keycode);
    }
	return true;
}