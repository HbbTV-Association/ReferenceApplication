/***
Notes:
	
	Video player respects the declaration of HbbTV 2.0.1 here: https://www.hbbtv.org/wp-content/uploads/2015/07/HbbTV-SPEC20-00023-001-HbbTV_2.0.1_specification_for_publication_clean.pdf
	
	Out of band subtitle tracks:
	<video>
		<source src='http://mycdn.de/video.mp4'type='video/mp4'>
		<track kind='subtitles'srclang='de'label='German for the English'src='http://mycdn.de/subtitles_de.ttml'/>
		<track kind='subtitles'srclang='de'label='German for the hard of hearing'src='http://mycdn.de/subtitles_de2.ttml'/>
		<track kind='captions'srclang='en'src='http://mycdn.de/subtitles_hearing_impaired.ttml'/>
	</video>

	
***/



function VideoPlayerHTML5(element_id, profile, width, height){
	this.FILETYPES = {
		MP4:0,
		MPEG:1,
		DASH:2
	};
	this.DRMTYPES = {
		NONE:0,
		PLAYREADY:1,
		MARLIN:2,
		WIDEVINE:3
	};
	this.element_id = element_id;
	this.element = document.getElementById(element_id);
	if(!this.element){
		this.element = document.createElement("div");
		this.element.setAttribute("id", this.element_id);
	}
	$(this.element).addClass("hidden");
	this.fullscreenElement = this.element;
	this.width = width;
	this.height = height;
	this.visible = false;
	this.url = null;
	this.video = null;
	this.profile = profile;

	// Timers and intervals
	this.progressUpdateInterval = null;

	this.init();
}

VideoPlayerHTML5.prototype.init = function(){
	var self = this;
	
	var buttons = [
		{
			"id": "pause_icon", 
			"action": function(){
				self.pause();
			}
		},
		{
			"id": "stop_icon", 
			"action": function(){
				self.stop();
			} 
		},
		{
			"id": "play_icon", 
			"action": function(){
				self.play();
			} 
		},
		{
			"id": "rewind_icon", 
			"action": function(){
				self.rewind();
			} 
		},
		{
			"id": "forward_icon", 
			"action": function(){
				self.forward();
			} 
		}
	];
	this.controls = new VideoPlayerControls("playerControls", buttons);
	for(var i = 0; i < buttons.length; i++){
		this.controls.addButton(buttons[i].id, buttons[i].action);
	}
}

VideoPlayerHTML5.prototype.populate = function(){
	this.element.innerHTML = "";
	this.video = null;
	//console.log("Player created "+ this.video);
	//this.element.appendChild(this.video);
	this.loadingImage = document.createElement("div");
	this.loadingImage.setAttribute("id", "loadingImage");
	this.loadingImage.addClass("hidden");
	this.element.appendChild(this.loadingImage);
	this.element.appendChild(this.controls.element);
	this.setFullscreen(true);
}

VideoPlayerHTML5.prototype.navigate = function(key){
	var self = this;
	switch(key){
		case VK_UP:
			self.controls.show();
		break;

		case VK_DOWN:
			self.controls.hide();
		break;

		case VK_BACK:
		case VK_STOP:
			self.clearVideo();
		break;

		case VK_LEFT:
		case VK_RIGHT:
		case VK_ENTER:
			self.controls.navigate(key);
		break;
	}
}

VideoPlayerHTML5.prototype.setDisplay = function( container ){
	if( container ){
		// detach from DOM
		var element = $(this.element).detach();
		element.addClass("hidden");
		// append into
		$(container).prepend( element );
		element.removeClass("hidden");
	}
	else{
		// if target not set, assume to set fullscreen
		this.setFullscreen(true);
	}
};

VideoPlayerHTML5.prototype.createPlayer = function(){
	var self = this;
	if( this.profile.hbbtv == false ){
		// TODO: EME
		return false;
	}
	else if( this.profile.hbbtv == "1.5" ){
		this.video = $("<object id='video' type='application/dash+xml'></object>")[0];
		this.element.appendChild( this.video );
	}
	else if( this.profile.hbbtv == "2.0" ){
		this.video = $("<video id='video' type='application/dash+xml' class='fullscreen'></video>")[0];
		this.element.appendChild( this.video );
		var player = this.video;
		addEventListeners( player, 'ended abort', function(e){
			console.log( e.type );
			self.clearVideo();
		} );
		
		player.addEventListener('error', function(e){
			self.setLoading(false);

			var errorMessage = "undefined";
			switch( self.video.error.code ){
				case 1: /* MEDIA_ERR_ABORTED */ 
					errorMessage = "fetching process aborted by user";
					break;
				case 2: /* MEDIA_ERR_NETWORK */
					errorMessage = "error occurred when downloading";
					break;
				case 3: /* = MEDIA_ERR_DECODE */ 
					errorMessage = "error occurred when decoding";
					break;
				case 4: /* MEDIA_ERR_SRC_NOT_SUPPORTED */ 
					errorMessage = "audio/video not supported";
					break;
			}
			showInfo( "MediaError: " + errorMessage );
			
			Monitor.videoError( errorMessage );
		} );
		
		player.addEventListener('play', function(){ 
			console.log("video play event triggered");
		} );
		
		player.seektimer = null;
		player.addEventListener('seeked', function(){
			console.log("Seeked");
			player.play();
		});
		
		var canplay = false;
		player.addEventListener('canplay', function(){
			canplay = true;
			console.log("canplay");
			player.play();
		} );
		
		player.addEventListener('loadedmetadata', function(){
			console.log("loadedmetadata");
		} );
		
		addEventListeners( player, "waiting", function(e){ 
			console.log( e.type );
			self.setLoading(true);
		} );
		
		addEventListeners( player, "waiting stalled suspend", function(e){ 
			console.log( e.type );
		} );
		
		addEventListeners( player, 'playing playing pause emptied', function(e){
			self.setLoading(false);
			console.log( e.type );
		} );
		
		
		player.addEventListener('ended emptied error', function(){
			self.setLoading(false);
			Monitor.videoEnded(console.log);
		} );
		
		player.addEventListener('progress', function(){
			//Monitor.videoBuffering(); 
			self.setLoading(false);
		} );
		
		player.addEventListener('pause', function(){
			Monitor.videoPaused(); 
			self.setLoading(false);
		} );
		
		player.addEventListener('playing', function(){
			Monitor.videoPlaying();
			self.setLoading(false);
		} );
		
		
		player.addEventListener('timeupdate', function(){
			self.updateProgressBar();
		} );
		return true;
	}
	return true;
}

/*
TODO: Add analytics
Monitor.videoConnecting(); // playstate 3
Monitor.videoStopped(callback); // käyttäjä  painaa back/stop tms // callbackkiin funkkari joka kutsutaan kun kaikki tulokset on lähetetty ja palataan takaisin videon toistosta
Monitor.switchAudio(lang); // code of language track
Monitor.switchSubtitle(lang); // annetaan valitun raidan kielikoodi
*/

// TODO: outband subtitles handling: https://developer.mozilla.org/en-US/Apps/Fundamentals/Audio_and_video_delivery/Adding_captions_and_subtitles_to_HTML5_video



VideoPlayerHTML5.prototype.setURL = function(url){
	console.log("setURL(",url,")");
	
	// add defaultVideoRoot prefix for non abolute video urls if defaultVideoRoot is set
	if( ! url.match(/^https?\:/) && typeof defaultVideoRoot == "string" && defaultVideoRoot.length ){
	//	url = defaultVideoRoot + url;
	}
	if( url.match(/mp4$/) ){
		this.video.setAttribute("type", "video/mp4");
	}
	
	
	try{
		//this.url = url;
		this.video.src = url;
	} catch( e ){
		console.log( e.message );
	}
	
	var type = "application/dash+xml";
	console.log("video type ", type);
	
	this.video.setAttribute("type", type );
	return;
};

VideoPlayerHTML5.prototype.setDRM = function( system, la_url){
	if( !system ){
		this.drm = null;
	}
	else{
		console.log("setDRM(",la_url,")");
		this.drm = { la_url : la_url, system : system, ready : false, error : null};
	}
};

VideoPlayerHTML5.prototype.getVideoType = function(file_extension){
	if(file_extension == "mp4"){
		return this.FILETYPES.MP4;
	}
	else if(["mpg", "mpeg", "ts"].indexOf(file_extension) > -1){
		return this.FILETYPES.MPEG;
	}
	else if(file_extension == "mpd"){
		return this.FILETYPES.DASH;
	}
	return null;
};

VideoPlayerHTML5.prototype.sendLicenseRequest = function(callback){
	console.log("sendLicenseRequest()");
	
	/***
		Create DRM object and container for it
	***/
	if( !$("#drm")[0] ){
		$("body").append("<div id='drm'></div>");
	}
	$("#drm").html('<object id="oipfDrm" type="application/oipfDrmAgent" width="0" height="0"></object>');
	this.oipfDrm = $("#oipfDrm")[0];
	this.drm.successCallback = callback;
	var self = this;
	// Case Playready
	// TODO: other DRMs
	if( this.drm.system == "playready" ){
		var msgType = "application/vnd.ms-playready.initiator+xml";
		var xmlLicenceAcquisition =
		'<?xml version="1.0" encoding="utf-8"?>' +
		'<PlayReadyInitiator xmlns="http://schemas.microsoft.com/DRM/2007/03/protocols/">' +
		  '<LicenseServerUriOverride>' +
			'<LA_URL>' +
				this.drm.la_url +
			'</LA_URL>' +
		  '</LicenseServerUriOverride>' +
		'</PlayReadyInitiator>';
		var DRMSysID = "urn:dvb:casystemid:19219";
		
	}
	else if( this.drm.system == "marlin" ){
		var msgType = "application/vnd.marlin.drm.actiontoken+xml";
		var xmlLicenceAcquisition =
		'<?xml version="1.0" encoding="utf-8"?>' +
		'<Marlin xmlns="http://marlin-drm.com/epub"><Version>1.1</Version><RightsURL><RightsIssuer><URL>'+ this.drm.la_url +'</URL></RightsIssuer></RightsURL></Marlin>';
		var DRMSysID = "urn:dvb:casystemid:19188";
	}
	
	try {
		this.oipfDrm.onDRMMessageResult = drmMsgHandler;
	} catch (e) {
		console.log("sendLicenseRequest Error 1: " + e.message );
	}
	try {
		this.oipfDrm.onDRMRightsError = drmRightsErrorHandler;
	} catch (e) {
		console.log("sendLicenseRequest Error 2: " + e.message );
	}
	try {
		this.oipfDrm.sendDRMMessage(msgType, xmlLicenceAcquisition, DRMSysID);
	} catch (e) {
		console.log("sendLicenseRequest Error 3: " + e.message );
	}
	
	
	
	function drmMsgHandler(msgID, resultMsg, resultCode) {
		showInfo("msgID, resultMsg, resultCode: " + msgID +","+  resultMsg +","+ resultCode);
		var errorMessage = "";
		switch (resultCode) {
			case 0:
				self.drm.ready = true;
				console.log("call self.drm.successCallback()");
				self.drm.successCallback();
			break;
			case 1:
				errorMessage = ("DRM: Unspecified error");
			break;
			case 2:
				errorMessage = ("DRM: Cannot process request");
			break;
			case 3:
				errorMessage = ("DRM: Wrong format");
			break;
			case 4:
				errorMessage = ("DRM: User Consent Needed");
			break;
			case 5:
				errorMessage = ("DRM: Unknown DRM system");
			break;
		}
		
		showInfo( errorMessage );
		Monitor.drmError(errorMessage);
	}

	function drmRightsErrorHandler(resultCode, id, systemid, issuer) {
		var errorMessage = "";
		switch (resultCode) {
			case 0:
				errorMessage = ("DRM: No license error");
			break;
			case 1:
				errorMessage = ("DRM: Invalid license error");
			break;
			case 2:
				errorMessage = ("license valid");
			break;
		}
		showInfo( errorMessage );
		Monitor.drmError(errorMessage);
	}
	

};

VideoPlayerHTML5.prototype.startVideo = function(fullscreen){
	console.log("startVideo()");
	
	var self = this;
	
	if( this.drm && this.drm.ready == false ){
		console.log("Send DRM License aquistion");
		this.sendLicenseRequest( function( response ){
			console.log("license ready ", self.drm);
			if( self.drm.ready ){
				self.startVideo( fullscreen );
			}
			else if( self.drm.error ){
				showInfo( "Error: " + self.drm.error );
			}
			else{
				showInfo( "Unknown DRM error! " + JSON.stringify( response ));
			}
			//self.startVideo( fullscreen );
		} );
		return;
	}
	
	
	try{
		if( !self.video ){
			self.populate();
		}
		
		// out-of-band subtitles must be an array containing containing language code and source.ttml file url.
		if( this.subtitles ){
			$.each( this.subtitles, function(i, lang){
				$(this.video).append("<param name='subtitles' value='srclang:"+ lang.code +" src: " + lang.src + "' />");
			} );
		}
		
		self.element.removeClass("hidden");
		self.visible = true;
		
		console.log("video.play()")
		self.video.play();
		if(fullscreen){
			self.setFullscreen(fullscreen);
			self.controls.show();
		}
	}
	catch(e){
		console.log(e);
	}
}

VideoPlayerHTML5.prototype.setSubtitles = function( subtitles ){
	if( subtitles ){
		console.log("setSubtitles()");
		this.subtitles = subtitles;
	}
	else{
		this.subtitles = null;
	}
}

VideoPlayerHTML5.prototype.pause = function(){
	var self = this;
	try{
		self.video.pause();
		self.controls.show();
		console.log("video should be playing now");
	}
	catch(e){
		console.log(e);
	}
}

VideoPlayerHTML5.prototype.stop = function(){
	var self = this;
	try{
		self.video.stop();
		self.clearVideo();
	}
	catch(e){
		console.log(e);
	}
}

VideoPlayerHTML5.prototype.play = function(){
	var self = this;
	try{
		self.video.play();
		self.controls.show();
	}
	catch(e){
		console.log(e);
	}
}

VideoPlayerHTML5.prototype.rewind = function(){
	var self = this;
	try{
		console.log("rewind video 30s");
		var sec = Math.max(self.video.currentTime-30, 0);
		Monitor.videoSeek(sec);
		self.video.seek(sec);
		self.controls.show();
	}
	catch(e){
		console.log(e);
	}
}

VideoPlayerHTML5.prototype.forward = function(){
	var self = this;
	try{
		console.log("forward video 30s");
		var sec = Math.min(self.video.currentTime+(30), self.video.duration);
		Monitor.videoSeek(sec);
		self.video.seek(sec);
		self.controls.show();
	}
	catch(e){
		console.log(e);
	}
}

VideoPlayerHTML5.prototype.clearVideo = function(){
	var self = this;
	self.element.addClass("hidden");
	self.visible = false;
	try{
		if(self.video){
			self.video.stop();
			$( "#video" ).remove(); // clear from dom
			this.video = null;
		}
	}
	catch(e){
		console.log(e);
	}
	this.subtitles = null;
}

VideoPlayerHTML5.prototype.isFullscreen = function(){
	var self = this;
	return self.fullscreen;
}

VideoPlayerHTML5.prototype.isPlaying = function(){
	return ( this.video && !this.video.paused ); // return true/false
}

VideoPlayerHTML5.prototype.doPlayStateChange = function(){
	
}

VideoPlayerHTML5.prototype.updateProgressBar = function(){
	try{
		var self = this;
		var position = this.video.currentTime;
		var duration = this.video.duration;
		if(this.controls.progressbar){
			this.controls.progressbar.style.width = this.controls.progressbar.parentNode.offsetWidth * (position / duration) + "px";
		}

		document.getElementById("playPosition").innerHTML = "";
		if(position){
			var pp_hours = Math.floor(position / 60 / 60);
			var pp_minutes = Math.floor((position-(pp_hours*60*60)) / 60);
			var pp_seconds = Math.round((position-(pp_hours*60*60)-(pp_minutes*60)));
			document.getElementById("playPosition").innerHTML = addZeroPrefix(pp_hours) + ":" + addZeroPrefix(pp_minutes) + ":" + addZeroPrefix(pp_seconds);
		}

		document.getElementById("playTime").innerHTML = "";
		if(duration){
			var pt_hours = Math.floor(duration / 60 / 60);
			var pt_minutes = Math.floor((duration-(pt_hours*60*60))  / 60);
			var pt_seconds = Math.round((duration-(pt_hours*60*60)-(pt_minutes*60)) );
			document.getElementById("playTime").innerHTML = addZeroPrefix(pt_hours) + ":" + addZeroPrefix(pt_minutes) + ":" + addZeroPrefix(pt_seconds);
		}
	} catch(e){
		console.log( e.message );
	}

}

VideoPlayerHTML5.prototype.setLoading = function(loading, reason){
	this.loading = loading;
	if(this.loading){
		this.loadingImage.removeClass("hidden");
	}
	else{
		this.loadingImage.addClass("hidden");
	}
	if(reason){
		console.log(reason);
	}
}

VideoPlayerHTML5.prototype.setFullscreen = function(fs){
	this.fullscreen = fs;
	if(fs){
		this.element.addClass("fullscreen");
		this.setDisplay( $("body")[0] ); // sets video player object to child of body
	}
	else{
		this.element.removeClass("fullscreen");
		this.setDisplay( menu.focus.element ); // sets video player object to child of focused tile element
		this.controls.hide();
	}

}

VideoPlayerHTML5.prototype.isVisible = function(fs){
	return this.visible;
}