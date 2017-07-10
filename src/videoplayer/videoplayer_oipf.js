


function VideoPlayer(element_id, profile, width, height){
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

VideoPlayer.prototype.init = function(){
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

VideoPlayer.prototype.populate = function(){
	this.element.innerHTML = "";
	console.log("Try to create av-object ");
	this.video = $("<object id='video' type='application/dash+xml'></object>")[0];
	console.log("Player created " + this.video);
	this.element.appendChild(this.video);
	this.loadingImage = document.createElement("div");
	this.loadingImage.setAttribute("id", "loadingImage");
	this.loadingImage.addClass("hidden");
	this.element.appendChild(this.loadingImage);
	this.element.appendChild(this.controls.element);
	this.setFullscreen(true);
}

VideoPlayer.prototype.navigate = function(key){
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

VideoPlayer.prototype.setDisplay = function( container ){
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


VideoPlayer.prototype.setURL = function(url){
	console.log("setURL(",url,")");
	
	// add defaultVideoRoot prefix for non abolute video urls if defaultVideoRoot is set
	if( ! url.match(/^https?\:/) && typeof defaultVideoRoot == "string" && defaultVideoRoot.length ){
	//	url = defaultVideoRoot + url;
	}
	try{
		//this.url = url;
		this.video.data = url;
	} catch( e ){
		console.log( e.message );
	}
	
	var type = "application/dash+xml";
	//var type = this.getVideoType( url );
	console.log("video type ", type);
	
	this.video.setAttribute("type", type );
	return;
};

VideoPlayer.prototype.setSubtitles = function( subtitles ){
	if( subtitles ){
		console.log("setSubtitles()");
		this.subtitles = subtitles;
	}
	else{
		this.subtitles = null;
	}
}


VideoPlayer.prototype.setDRM = function( system, la_url){
	if( !system ){
		this.drm = null;
	}
	else{
		console.log("setDRM(",la_url,")");
		this.drm = { la_url : la_url, system : system, ready : false, error : null};
	}
}



VideoPlayer.prototype.getVideoType = function( file_extension ){
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
}

VideoPlayer.prototype.sendLicenseRequest = function(callback){
	console.log("sendLicenseRequest()");
	
	/***
		Create always new DRM object and container for it if it does not exist
	***/
	if( !$("#drm")[0] ){
		$("body").append("<div id='drm'></div>");
	}
	$("#drm").html('<object id="oipfDrm" type="application/oipfDrmAgent" width="0" height="0"></object>');
	this.oipfDrm = $("#oipfDrm")[0];
	this.drm.successCallback = callback;
	var self = this;
	// Case Playready
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
	}
	
	function drmMsgHandler(msgID, resultMsg, resultCode) {
		showInfo("msgID, resultMsg, resultCode: " + msgID +","+  resultMsg +","+ resultCode);
		switch (resultCode) {
			case 0:
				self.drm.ready = true;
				console.log("call self.drm.successCallback()");
				self.drm.successCallback();
			break;
			case 1:
				showInfo("DRM: Unspecified error");
			break;
			case 2:
				showInfo("DRM: Cannot process request");
			break;
			case 3:
				showInfo("DRM: Wrong format");
			break;
			case 4:
				showInfo("DRM: User Consent Needed");
			break;
			case 5:
				showInfo("DRM: Unknown DRM system");
			break;
		}
	}

	function drmRightsErrorHandler(resultCode, id, systemid, issuer) {
		switch (resultCode) {
			case 0:
				showInfo("DRM: No license error");
			break;
			case 1:
				showInfo("DRM: Invalid license error");
			break;
			case 2:
				showInfo("license valid");
			break;
		}
	}
	

};

VideoPlayer.prototype.startVideo = function(fullscreen){
	console.log("startVideo()");
	var self = this;
	
	if( this.drm && this.drm.ready == false ){
		
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
		
		self.video.onPlayStateChange = function(){ self.doPlayStateChange(); };
		self.element.removeClass("hidden");
		self.visible = true;
		self.video.play(1);
		
		if(fullscreen){
			self.setFullscreen(fullscreen);
			self.controls.show();
		}
	}
	catch(e){
		console.log(e);
	}
}

VideoPlayer.prototype.pause = function(){
	var self = this;
	try{
		self.video.play(0);
		self.controls.show();
		console.log("video should be playing now");
	}
	catch(e){
		console.log(e);
	}
}

VideoPlayer.prototype.stop = function(){
	var self = this;
	try{
		self.video.stop();
		self.clearVideo();
	}
	catch(e){
		console.log(e);
	}
}

VideoPlayer.prototype.play = function(){
	var self = this;
	try{
		self.video.play(1);
		self.controls.show();
	}
	catch(e){
		console.log(e);
	}
}

VideoPlayer.prototype.rewind = function(){
	var self = this;
	try{
		self.video.seek(Math.max(self.video.playPosition-30000, 0));
		self.controls.show();
	}
	catch(e){
		console.log(e);
	}
}

VideoPlayer.prototype.forward = function(){
	var self = this;
	try{

		self.video.seek(Math.min(self.video.playPosition+(30000), self.video.playTime));
		self.controls.show();
	}
	catch(e){
		console.log(e);
	}
}

VideoPlayer.prototype.clearVideo = function(){
	var self = this;
	self.element.addClass("hidden");
	self.visible = false;
	clearInterval(self.progressUpdateInterval);
	try{
		if(self.video){
			self.video.stop();
		}
	}
	catch(e){
		console.log(e);
	}
	this.subtitles = null;
}

VideoPlayer.prototype.isFullscreen = function(){
	var self = this;
	return self.fullscreen;
}

VideoPlayer.prototype.isPlaying = function(){
	return ( this.video && this.video.playState == 1 ); // return true/false
}

VideoPlayer.prototype.doPlayStateChange = function(){
	var self = this;
	if(!self.video) {
        return;
	}
	switch (self.video.playState) {
        case 0: // stopped
        	clearInterval(self.progressUpdateInterval);
            self.setLoading(false);
            break;
        case 1: // playing
        	console.log("playing");
        	self.visible = true;
            self.setLoading(false);
            clearInterval(self.progressUpdateInterval);
            self.progressUpdateInterval = window.setInterval( function(){
            	self.updateProgressBar()
            }, 1000);
            break;
        case 2: // paused
            self.setLoading(false);
            clearInterval(self.progressUpdateInterval);
            if(self.isFullscreen()){
                self.controls.show();
            }
            break;
        case 3: // connecting
        	clearInterval(self.progressUpdateInterval);
            self.setLoading(true, "Connecting");
            break;
        case 4: // buffering
        	clearInterval(self.progressUpdateInterval);
            self.setLoading(true, "Buffering");
            break;
        case 5: // finished
        	clearInterval(self.progressUpdateInterval);
            self.setLoading(false);
            if(self.isFullscreen()){
                self.controls.show();
            }
            break;
        case 6: // error
        	clearInterval(self.progressUpdateInterval);
            self.setLoading(false);
            self.controls.hide();
            var error = "";
            switch (self.video.error) {
                case 0:
                    error = "A/V format not supported";
                    break;
                case 1:
                    error = "cannot connect to server or lost connection";
                    break;
                case 2:
                    error = "unidentified error";
                    break;
            }
            console.log("Error!: " + error);
            showInfo("Error!: " + error);
            //self.clearVideo();
            break;
        default:
            self.setLoading(false);
            // do nothing
            break;
	}
}

VideoPlayer.prototype.updateProgressBar = function(){
	var self = this;
	if(self.controls.progressbar){
		self.controls.progressbar.style.width = self.controls.progressbar.parentNode.offsetWidth * (self.video.playPosition / self.video.playTime) + "px";
	}

	document.getElementById("playPosition").innerHTML = "";
	var playPosition = self.video.playPosition;
	if(playPosition){
		var pp_hours = Math.floor(playPosition / 1000 / 60 / 60);
		var pp_minutes = Math.floor((playPosition-(pp_hours*1000*60*60)) / 1000 / 60);
		var pp_seconds = Math.round((playPosition-(pp_hours*1000*60*60)-(pp_minutes*1000*60)) / 1000);
		document.getElementById("playPosition").innerHTML = addZeroPrefix(pp_hours) + ":" + addZeroPrefix(pp_minutes) + ":" + addZeroPrefix(pp_seconds);
	}

	document.getElementById("playTime").innerHTML = "";
	var playTime = self.video.playTime;
	if(playTime){
		var pt_hours = Math.floor(playTime / 1000 / 60 / 60);
		var pt_minutes = Math.floor((playTime-(pt_hours*1000*60*60)) / 1000 / 60);
		var pt_seconds = Math.round((playTime-(pt_hours*1000*60*60)-(pt_minutes*1000*60)) / 1000);
		document.getElementById("playTime").innerHTML = addZeroPrefix(pt_hours) + ":" + addZeroPrefix(pt_minutes) + ":" + addZeroPrefix(pt_seconds);
	}


}

VideoPlayer.prototype.setLoading = function(loading, reason){
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

VideoPlayer.prototype.setFullscreen = function(fs){
	this.fullscreen = fs;
	if(fs){
		this.element.addClass("fullscreen");
		this.setDisplay( $("body")[0] );
	}
	else{
		this.element.removeClass("fullscreen");
		this.setDisplay( menu.focus.element );
		this.controls.hide();
	}

}

VideoPlayer.prototype.isVisible = function(fs){
	return this.visible;
}


