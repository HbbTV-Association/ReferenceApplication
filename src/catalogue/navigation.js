if (typeof(KeyEvent)!='undefined') {
    if (typeof(KeyEvent.VK_LEFT)!='undefined') {
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

        //ABox42
        var VK_HOME = KeyEvent.VK_HOME;
        var VK_INFO = KeyEvent.VK_INFO;
        var VK_GUIDE = KeyEvent.VK_GUIDE;
        var VK_EXIT = KeyEvent.VK_EXIT;
        var VK_MENU = KeyEvent.VK_MENU;
        var VK_VOLUP = KeyEvent.VK_VOLUP;
        var VK_VOLDN = KeyEvent.VK_VOLDN;
        var VK_CHANNEL_DOWN = KeyEvent.VK_CHANNEL_DOWN;
        var VK_CHANNEL_UP = KeyEvent.VK_CHANNEL_UP;
        var VK_REFRESH = KeyEvent.VK_REFRESH;
        var VK_MUTE = KeyEvent.VK_MUTE;
        var VK_CLEAR = KeyEvent.VK_CLEAR;
        var VK_BACK_SPACE = KeyEvent.VK_BACK_SPACE;
        var VK_TELETEXT = KeyEvent.VK_TELETEXT;
        var VK_RECORD = KeyEvent.VK_RECORD;
        var VK_FAST_FWD = KeyEvent.VK_FF;
        var VK_REWIND = KeyEvent.VK_REW;
        var VK_TRACK_PREV = KeyEvent.VK_TRACK_PREV;
        var VK_TRACK_NEXT = KeyEvent.VK_TRACK_NEXT;
        var VK_STAR = KeyEvent.VK_STAR;
        var VK_TELETEXT = KeyEvent.VK_TELETEXT;      
    }
}
if (typeof (VK_LEFT) == "undefined") {
    var VK_RED      = 116; //403 humax
    var VK_GREEN    = 117; //404 humax
    var VK_YELLOW   = 118; //405 humax
    var VK_BLUE     = 119; //406 humax
    
    var VK_LEFT     = 37;
    var VK_UP       = 38;
    var VK_RIGHT    = 39;
    var VK_DOWN     = 40;
    var VK_ENTER    = 13;
    
    var VK_0        = 48;
    var VK_1        = 49;
    var VK_2        = 50;
    var VK_3        = 51;
    var VK_4        = 52;
    var VK_5        = 53;
    var VK_6        = 54;
    var VK_7        = 55;
    var VK_8        = 56;
    var VK_9        = 57;
    
    var VK_PLAY     = 415;
    var VK_PAUSE    = 19;
    var VK_STOP     = 413;
    // var VK_FAST_FWD = 417;
    // var VK_REWIND   = 412;
    
    var VK_HOME     = 771;
    var VK_END      = 35;
    var VK_BACK     = 461;
    var VK_TELETEXT = 113;
    
    // page up 427, page down 428
    
    var VK_TELETEXT = 459;
}

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
		return;
	}
	
    if(!animating && !loading){
        if(vplayer.isVisible() && vplayer.isFullscreen()){
            vplayer.navigate(keycode);
            return;
        }
        menu.navigate(keycode);
    }
}