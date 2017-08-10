/* Video Playback Monitor */

//var Monitor = new monitor( "../videoplayer/monitor/" );
var Monitor = new monitor( "http://mhp.sofiadigital.fi/tvportal/referenceapp_monitor/" );

function monitor( monitorRoot ) {
	var self = this;
	this.monitorRoot = monitorRoot;
	// this.resultsSent = false;
	
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
		self.datapacket = deepCopy(self.results);
		if (self.xmlCapabilities != null) {
			var serializer = new XMLSerializer();
			var xmlstr = serializer.serializeToString(self.xmlCapabilities);
			self.datapacket.capabilities = xmlstr;
		} else {
			self.datapacket.capabilities = "<profilelist></profilelist>";
		}
		
		console.log( self.datapacket.capabilities );
		
		$.ajax({ 
			async: true,
			//crossDomain: true,
			//xhrFields: {
			//	withCredentials: true
			//},
			type: "POST",
			url: self.monitorRoot + "inittest.php",
			contentType: "application/json; charset=utf-8",
			data: JSON.stringify(self.datapacket),
			error: function (content) {
				console.log( "Monitor: Error communication with test server" );
				if (typeof self.onInit == "function" ){
					self.onInit();
				}
			},
			success: function (content) {
				console.log("Monitor: test initiated");
				self.results.result_id = content.result_id;
				self.resultIndex = 0;
				if (typeof self.onInit == "function" ){
					self.onInit();
				}
			}
		});
	}
	
	this.videoStart = function() {
		self.refTime = new Date().getTime();
		self.results.items.push({step_name:"video_init", timestamp: 0});
		self.sendResults();
	}
	
	this.videoPlaying = function() {
		var tempTime = new Date().getTime();
		self.results.items.push({step_name:"video_playing", timestamp : tempTime-self.refTime});
		self.sendResults();		
	}
	
	this.videoPaused = function()  {
		var tempTime = new Date().getTime();
		self.results.items.push({step_name:"video_paused", timestamp : tempTime-self.refTime});
		self.sendResults();
	}
	
	this.videoConnecting = function()  {
		var tempTime = new Date().getTime();
		self.results.items.push({step_name:"video_connecting", timestamp : tempTime-self.refTime});
		self.sendResults();
	}
	
	this.videoBuffering = function()  {
		var tempTime = new Date().getTime();
		self.results.items.push({step_name:"video_buffering", timestamp : tempTime-self.refTime});
		self.sendResults();
	}

	this.videoStopped = function(callback)  { // on stop() or manual exit from video
		self.onExit = callback;
		var tempTime = new Date().getTime();
		self.results.items.push({step_name:"video_stopped", timestamp : tempTime-self.refTime});
		self.sendResults(true);
	}

	this.videoEnded = function(callback)  { // on video finished event
		self.onExit = callback;
		var tempTime = new Date().getTime();
		self.results.items.push({step_name:"video_end", timestamp : tempTime-self.refTime});
		self.sendResults(true);
	}
	
	this.videoSeek = function(sec) { // target time code in seconds, sent before seek executed
		var seekTo = 1000*sec;
		var tempTime = new Date().getTime();
		self.results.items.push({step_name:"video_seek", timestamp : tempTime-self.refTime, comment: "\""+seekTo+"\""});
		self.sendResults();		
	}	
	
	this.videoError = function(errormsg)  {
		var tempTime = new Date().getTime();
		self.results.items.push({step_name:"video_error", timestamp : tempTime-self.refTime, comment: "\""+errormsg+"\""});
		self.sendResults();
	}
	
	this.drmError = function(errormsg)  {
		var tempTime = new Date().getTime();
		self.results.items.push({step_name:"drm_error", timestamp : tempTime-self.refTime, comment: "\""+errormsg+"\""});
		self.sendResults();
	}
	
	this.switchAudio = function(lang) {
		var tempTime = new Date().getTime();
		self.results.items.push({step_name:"switch_audio", timestamp : tempTime-self.refTime, comment: "\""+lang+"\""});
		self.sendResults();	
	}
	
	this.switchSubtitle = function(lang) {
		var tempTime = new Date().getTime();
		self.results.items.push({step_name:"switch_subtitle", timestamp : tempTime-self.refTime, comment: "\""+lang+"\""});
		self.sendResults();	
	}
	
	this.sendResults = function(endtest) {
		if (endtest == undefined) endtest = false;
		if (self.sending) {
			window.setTimeout(function() {
				self.sendResults(endtest);
			},1000);
		}
		if (self.results.items[self.resultIndex+1] == undefined) return;
		self.sending = true;
		var datapacket = deepCopy(self.results);
		datapacket.items = [];
		var next = self.resultIndex+1;
		datapacket.items.push(self.results.items[next]); // next unsent	
		console.log('Monitor: sending result "'+ self.results.items[next].step_name +'" ('+next+')');	

		$.ajax({ 
			async: true,
			//crossDomain: true,
			//xhrFields: {
			//	withCredentials: true
			//},
			type: "POST",
			url: self.monitorRoot +  "senddata.php",
			contentType: "application/json; charset=utf-8",
			data: JSON.stringify(datapacket),
			error: function (content) {
				self.sending = false;
				console.log('Monitor: error sending test result');	
			},
			success: function (content) {
				self.sending = false;
				self.resultIndex++;
				console.log('Monitor: sent result ('+self.resultIndex+')');	
				if (self.resultIndex < self.results.items.length-1) {
					self.sendResults(endtest);
				} else {									
					if (endtest) {
						// sendResults_to_filesystem();
						console.log('Monitor: all results sent');
						if (typeof self.onExit == "function") {
							self.onExit();
						}
					}
				}
			}
		});
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
