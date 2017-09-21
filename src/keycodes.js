/***
	Determine keyCodes
***/

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
    var VK_PLAY_PAUSE = ( typeof( KeyEvent.VK_PLAY_PAUSE ) != 'undefined'? KeyEvent.VK_PLAY_PAUSE : 463 );
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
  var VK_PLAY_PAUSE = 463;
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