/*** 
	Video Playback Monitor  
	
	Monitor interface. Empty interface can used to create implementation for monitor. 
	Monitor must implement this interface or leave it as is. Monitor may also be extended.
***/
function monitor( monitorRoot ) {
	var self = this;
	this.monitorRoot = monitorRoot;
	
	this.initSession = function(url, videotype, playertype, callback) { // videotype: 6=dash, playertype: html5/oipf 
		self.onInit = callback;
		self.onExit = null;
		self.xmlCapabilities = null;
		self.sending = false;
		self.resultIndex = -1;
		self.results = {video_url:url, video_type:videotype, player_type: playertype, items:[{step_name:"app_init", timestamp:0}]};
		self.getCapabilities();
	}
	
	this.getCapabilities = function() {
		try {
				var capobj = function(){
					var object = document.getElementById("oipfcap");
					if( !object ){
						object = document.createElement("object");
						object.setAttribute("id", "oipfcap");
						object.setAttribute("type", "application/oipfCapabilities");
						document.body.appendChild( object );
					}
					return object;
				}();
				try {		
					self.xmlCapabilities = capobj.xmlCapabilities;
				} catch (e) {
					self.xmlCapabilities = null;
				}
				self.initTest();
		} catch (e) {
			self.initTest();
		}
	}
	
	this.initTest = function() {
		this.onInit();
	}
	
	this.videoStart = function() {}
	
	this.videoPlaying = function() {}
	
	this.videoPaused = function() {}
	
	this.videoConnecting = function() {}
	
	this.videoBuffering = function() {}

	this.videoStopped = function(callback) {}

	this.videoEnded = function(callback) {}
	
	this.videoSeek = function(sec) {}
	
	this.videoError = function(errormsg) {}
	
	this.drmError = function(errormsg) {}
	
	this.switchAudio = function(lang) {}
	
	this.switchSubtitle = function(lang) {}
	
	this.sendResults = function(endtest) {
		this.onExit();
	}
}

function deepCopy(obj) {
    if (Object.prototype.toString.call(obj) === '[object Array]') {
        var out = [], i = 0, len = obj.length;
        for ( ; i < len; i++ ) {
            out[i] = arguments.callee(obj[i]);
        }
        return out;
    }
    if (typeof obj === 'object') {
        var out = {}, i;
        for ( i in obj ) {
            out[i] = arguments.callee(obj[i]);
        }
        return out;
    }
    return obj;
}
