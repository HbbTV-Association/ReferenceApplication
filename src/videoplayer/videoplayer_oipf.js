/***
	OIPF AV-object player impelmentation for HbbTV
***/


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
	this.hidePlayerTimer = null;

	this.init();
}

VideoPlayer.prototype.init = function(){
	var self = this;
	
}

VideoPlayer.prototype.populate = function(){
	this.element.innerHTML = "";
	this.video = null;
	this.loadingImage = document.createElement("div");
	this.loadingImage.setAttribute("id", "loadingImage");
	this.loadingImage.addClass("hidden");
	this.element.appendChild(this.loadingImage);
	//this.element.appendChild(this.controls.element);
	this.setFullscreen(true);
}

VideoPlayer.prototype.displayPlayer = function( sec ){
	clearTimeout( this.hidePlayerTimer );
	$("#player").removeClass("hide");
	$("#player").addClass("show");
	if(sec){
		this.hidePlayerTimer = setTimeout( function(){
			$("#player").removeClass("show");
		}, sec * 1000);
	}
}

VideoPlayer.prototype.navigate = function(key){
	var self = this;
	console.log("Key code pressed: " + key);
	
	if( self.onAdBreak ){
		console.log("Navigation on ad break");
	}
	switch(key){
		case VK_UP:
			//self.controls.show();
			self.displayPlayer(5);
		break;

		case VK_DOWN:
			//self.controls.hide();
			self.displayPlayer(5);
		break;

		case VK_BACK:
		case VK_STOP:

			self.stop();
		break;

		case VK_LEFT:
		case VK_REWIND:
			if( !self.onAdBreak ){
				self.rewind( 30 );
				self.displayPlayer(5);
			}
			break;
		case VK_RIGHT:
		case VK_FAST_FWD:
			if( !self.onAdBreak ){
				self.forward( 30 );
				self.displayPlayer(5);
			}
			break;
		case VK_ENTER:
		case VK_PLAY_PAUSE:
		case VK_PAUSE:
		case VK_PLAY:
			if( !self.onAdBreak ){
				if( this.isPlaying() ){
					this.pause();
				}
				else{
					this.play();
				}
			}
		break;
		case VK_YELLOW:
			try{
				if( this.video.textTracks ){
					console.log("switch text Track");
					n = 0;
					$.each( this.video.textTracks, function(i, lang){
						console.log("Subtitles " + i + ": " + lang.language + " - " + lang.label + " mode: " + lang.mode);
						lang.mode = 'hidden';
						n++;
					} );
					this.subtitleTrack += 1;
					if( this.subtitleTrack >= n )
						this.subtitleTrack = -1;
					if( this.subtitleTrack >= 0 ){
						this.video.textTracks[ this.subtitleTrack ].mode = 'showing';
						console.log("set track " + this.subtitleTrack  + ": " + this.video.textTracks[ this.subtitleTrack ].language );
						showInfo("Switch subtitles to language: " + this.video.textTracks[ this.subtitleTrack ].label );
					}
					else{
						showInfo("Subtitles off");
					}
				}
			} catch( e ){
				console.log( e.description );
			}
		break;
		default:
			if( key >= VK_0 && key <= VK_9 ){
				self.showSubtitleTrack( key );
			}
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
VideoPlayer.prototype.createPlayer = function(){
	
	console.log("createPlayer()");
	
	var self = this;

	if( !$("#player")[0] ){
		$("body").append( '<div id="player" class="hide">'
			+'<div id="playposition"></div>'
			+'<div id="playtime"></div>'
			+'<div id="progress_currentTime" style="left:130px"></div>'
            +'<div id="progressbarbg"></div><div id="progressSeekable" style="transition03all"></div><div id="progressbar" style="transition03all"></div>'
			+'<div id="prew"></div>'
			+'<div id="ppauseplay" class="pause"><div class="vcrbtn"></div><span id="pauseplay"></span></div> '
			+'<div id="pff"></div>'
			+'</div>');
		console.log("Add player component");
	}

	if( this.profile.hbbtv == "1.5" ){
		this.video = $("<object id='video' type='application/dash+xml'></object>")[0];
		this.element.appendChild( this.video );
		return true;
	}
};

VideoPlayer.prototype.setURL = function(url){
	console.log("setURL(",url,")");
	
	// add defaultVideoRoot prefix for non abolute video urls if defaultVideoRoot is set
	if( ! url.match(/^https?\:/) && typeof defaultVideoRoot == "string" && defaultVideoRoot.length ){
	//	url = defaultVideoRoot + url;
	}
	var type = "application/dash+xml";
	if( url.match(/mp4$/) ){
		this.video.setAttribute("type", "video/mp4");
	}
	else{
		this.video.setAttribute("type", type );
	}
	try{
		//this.url = url;
		this.video.data = url;
	} catch( e ){
		console.log( e.message );
	}

	return;
};

VideoPlayer.prototype.checkAds = function(){
	//console.log("checkAds");
	if( this.adBreaks ){
		
		var position =  Math.floor( this.video.currentTime );
		var self = this;
		$.each( this.adBreaks, function(n, adBreak){
			if( !adBreak.played && adBreak.position == position ){
				console.log("found ad break at position " + position);
				adBreak.played = true;
				self.getAds( adBreak ); // play ads on current second
				return false;
			}
		} );
	}
};

VideoPlayer.prototype.prepareAdPlayers = function(){
	
	// if ad players are prepared do nothing
	if( $("#ad1")[0] && $("#ad2")[0] ){
		console.log("ready to play ads");
		return;
	}
	var self = this;
	// create new adPlayers
	self.adPlayer = [ $("<video id='ad1' type='video/mp4' preload='auto'></video>")[0], $("<video id='ad2' type='video/mp4' preload='auto'></video>")[0] ];
	self.element.appendChild( self.adPlayer[0] );
	self.element.appendChild( self.adPlayer[1] );
	self.element.appendChild( $("<div id='adInfo'></div>")[0] );
	
	console.log("html5 ad-video objects created");
	
	var adEnd = function(e){
		self.setLoading(false);
		
		console.log("ad ended. adCount="+ self.adCount + " adBuffer length: " + self.adBuffer.length );
		console.log( e.type );
		var player = $(this);
		if( self.adCount < self.adBuffer.length ){
			player.addClass("hide");
			
			self.playAds();
			
		}
		else{
			// no more ads, continue content
			console.log("No more ads, continue content video");
			self.onAdBreak = false;
			player.addClass("hide"); // hide ad video
			$("#adInfo").removeClass("show");
			
			self.video.play();
			$(self.video).removeClass("hide"); // show content video
		}
		
	};
	
	var onAdPlay = function(){ 
		//console.log("ad play event triggered");
		
		//$("#adInfo").html("");
	};
	
	var onAdProgress = function(e){ 
		//console.log( e.type );
	};
	
	var onAdTimeupdate = function(){
		//self.updateProgressBar();
		var timeLeft = Math.floor( this.duration - this.currentTime )
		if( timeLeft != NaN ){
			//console.log( timeLeft );
			$("#adInfo").addClass("show");
			$("#adInfo").html("Ad " + self.adCount + "/" + self.adBuffer.length + " (" + timeLeft + "s)" );
		}
	};
	
	addEventListeners( self.adPlayer[0], 'ended', adEnd );
	addEventListeners( self.adPlayer[1], 'ended', adEnd );
	addEventListeners( self.adPlayer[0], 'playing', onAdPlay );
	addEventListeners( self.adPlayer[1], 'playing', onAdPlay );
	addEventListeners( self.adPlayer[0], 'timeupdate', onAdTimeupdate );
	addEventListeners( self.adPlayer[1], 'timeupdate', onAdTimeupdate );
	addEventListeners( self.adPlayer[0], 'progress', onAdProgress );
	addEventListeners( self.adPlayer[1], 'progress', onAdProgress );
};

VideoPlayer.prototype.getAds = function( adBreak ){
	this.onAdBreak = true; // disable seeking
	this.adCount = 0;
	this.video.pause();
	var self = this;
	console.log("get ads breaks=" + adBreak.ads);
	$.get( "../getAds.php?breaks=" + adBreak.ads, function(ads){
		self.adBuffer = ads;
		//self.adCount = ads.length;
		console.log( "Got " + ads.length + " ads");
		
		self.prepareAdPlayers();
		
		self.playAds();
		
	}, "json" );
};

VideoPlayer.prototype.playAds = function(){
	this.onAdBreak = true; // disable seeking
	this.video.pause();
	$(this.video).addClass("hide");
	
	var self = this;
	
	var activeAdPlayer = self.adPlayer[ self.adCount % 2 ];
	var idleAdPlayer = self.adPlayer[ (self.adCount + 1) % 2 ];
	
	// for the first ad, set active ad src. Later the active players url is always set and preload before the player is activated
	if( self.adCount == 0 ){
		activeAdPlayer.src = self.adBuffer[ self.adCount ];
	}
	
	self.adCount++
	
	// set next ad url to idle player and preload it
	if( self.adBuffer.length > self.adCount ){
		idleAdPlayer.src = self.adBuffer[ self.adCount ];
		idleAdPlayer.load();
	}
	
	activeAdPlayer.play();
	$( activeAdPlayer ).removeClass("hide");
	$( idleAdPlayer ).addClass("hide");
};

VideoPlayer.prototype.setAdBreaks = function( breaks ){
	if( !breaks){
		this.adBreaks = null;
	}
	else{
		console.log("setAdBreaks(", breaks ,")");
		this.adBreaks = Object.assign({}, breaks ); // deep copy
	}
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
	
	console.log("Create DRM agent");
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
		
		if( resultCode > 0 ){
			showInfo( errorMessage );
			Monitor.drmError(errorMessage);
		}
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

VideoPlayer.prototype.setSubtitles = function(){
	// out-of-band subtitles must be an array containing containing language code and source.ttml file url.
	
	try{
		var player = this.video;
		
		console.log("set subs from active assets metadata 'subtitles'");
		this.subtitles = menu.focus.subtitles;
		
		console.log( JSON.stringify( this.subtitles ) );
		
		if( this.subtitles && this.subtitles.length ){
			
			$.each( this.subtitles, function(i, lang){
				//console.log( lang );
				console.log("Subtitles " + i + ": " + lang.code + " - " + lang.src);
				//var track = $("<track name='subtitles' value='srclang:"+ lang.code +" src: " + lang.src + "' />")[0];

								
				var track = document.createElement("track");
				//track.kind = "captions";
				track.kind = "subtitles";
				track.label = "Language " + i;
				track.srclang = lang.code;
				track.src = lang.src;
				track.addEventListener("load", function() {
					console.log("text track ready: " + this.srclang);
					if( this.language == this.subtitles[0].code ){
						this.mode = "showing";
						//player.textTracks[0].mode = "showing"; // disabled?
					}
					else{
						this.mode = 'hidden';
					}
				});
				track.addEventListener("oncuechange", function() {
					console.log("oncuechange");
				});
				player.appendChild(track);
				
			} );
			console.log( "Text tracks: " + player.textTracks.length );
			$.each( player.textTracks, function(i, track){
				console.log( track );
			} );
			this.subtitleTrack = 0;
			player.textTracks[0].mode = "showing";
		}
		else{
			console.log( "no subs" );
		}
	} catch(e){
		console.log("r:582  " + e.description );
	}
};

VideoPlayer.prototype.showSubtitleTrack = function(nth){
	var player = this.video;
	if( player.textTracks.length <= nth ){
		console.log( "No track " + nth + " available. Tracklist length is " + player.textTracks.length );
		return;
	}
	// hide all tracks
	$.each( player.textTracks, function(i, track){
		track.mode = "hidden";
		console.log( track );
	} );
	
	// show selected
	player.TextTracks.TextTrack[nth].mode = "showing";
	
	$.each( player.textTracks, function(i, track){
		console.log( track.language + ": " + track.mode );
	} );
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
		
		var player = this.video;
		this.subtitles = player.textTracks;
		
		console.log( JSON.stringify( this.subtitles ) );
		
		if( true ){
			console.log("set subs")
			this.subtitles = menu.focus.subtitles;
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
			//self.controls.show();
			self.displayPlayer(5);
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
		//self.controls.show();
		self.displayPlayer();
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
		//self.controls.show();
		self.displayPlayer(5);
	}
	catch(e){
		console.log(e);
	}
}

VideoPlayer.prototype.rewind = function(){
	var self = this;
	try{
		var ms = Math.max(self.video.playPosition-30000, 0);
		self.video.seek( ms );
		Monitor.videoSeek( Math.round( ms/1000 ) );
		//self.controls.show();
		self.displayPlayer(5);
	}
	catch(e){
		console.log(e);
	}
}

VideoPlayer.prototype.forward = function(){
	var self = this;
	try{
		var ms = Math.min(self.video.playPosition+(30000), self.video.playTime);
		self.video.seek( ms ); 
		Monitor.videoSeek( Math.round( ms/1000 ) );
		//self.controls.show();
		self.displayPlayer(5);
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
			$( "#video" ).remove(); // clear from dom
			this.video = null;
		}
	}
	catch(e){
		console.log( e.description );
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
			Monitor.videoEnded(console.log);
            break;
        case 1: // playing
        	console.log("playing");
        	self.visible = true;
            self.setLoading(false);
            clearInterval(self.progressUpdateInterval);
            self.progressUpdateInterval = window.setInterval( function(){
            	self.updateProgressBar();
            }, 1000);
			Monitor.videoPlaying();
            break;
        case 2: // paused
            self.setLoading(false);
            clearInterval(self.progressUpdateInterval);
            if(self.isFullscreen()){
                //self.controls.show();
            }
			Monitor.videoPaused();
            break;
        case 3: // connecting
        	clearInterval(self.progressUpdateInterval);
            self.setLoading(true, "Connecting");
			Monitor.videoConnecting();
            break;
        case 4: // buffering
        	clearInterval(self.progressUpdateInterval);
            self.setLoading(true, "Buffering");
			Monitor.videoBuffering();
            break;
        case 5: // finished
        	clearInterval(self.progressUpdateInterval);
            self.setLoading(false);
            if(self.isFullscreen()){
                //self.controls.show();
            }
            break;
        case 6: // error
        	clearInterval(self.progressUpdateInterval);
            self.setLoading(false);
            //self.controls.hide();
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
			Monitor.videoError( error );
            //self.clearVideo();
            break;
        default:
            self.setLoading(false);
            // do nothing
            break;
	}
}

VideoPlayer.prototype.updateProgressBar = function(){
	try{
		var self = this;
		var position = this.video.playPosition;
		var duration = this.video.playTime;
		
		console.log("update progress bar");
		
		pbar = document.getElementById("progressbar");

		var barWidth = Math.floor((position / duration) * 895 );
		if(barWidth > 895){
			barWidth = 895;
		}
		else if( barWidth < 0 ){
			barWidth = 0;
		}
		
		pbar.style.width = barWidth + "px";
		
		var play_position = barWidth;
		
		$("#playposition").css("left", play_position);
		$("#progress_currentTime").css("left", play_position);


		
		$("#playposition").html("");
		if(position){
			var pp_hours = Math.floor(position / 1000 / 60 / 60);
			var pp_minutes = Math.floor((position / 1000 -(pp_hours*60*60)) / 60);
			var pp_seconds = Math.round((position / 1000 -(pp_hours*60*60)-(pp_minutes*60)));
			$("#playposition").html( addZeroPrefix(pp_hours) + ":" + addZeroPrefix(pp_minutes) + ":" + addZeroPrefix(pp_seconds) );
		}

		document.getElementById("playtime").innerHTML = "";
		if(duration){
			var pt_hours = Math.floor(duration / 1000 / 60 / 60);
			var pt_minutes = Math.floor((duration / 1000-(pt_hours*60*60))  / 60);
			var pt_seconds = Math.round((duration / 1000-(pt_hours*60*60)-(pt_minutes*60)) );
			document.getElementById("playtime").innerHTML = addZeroPrefix(pt_hours) + ":" + addZeroPrefix(pt_minutes) + ":" + addZeroPrefix(pt_seconds);
		}
	} catch(e){
		console.log( e.message );
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

VideoPlayer.prototype.getStreamComponents = function(){
	
	try {
		if(typeof this.video.getComponents == 'function') {
			this.subtitles = vidobj.getComponents(this.video.COMPONENT_TYPE_AUDIO);
			if (this.subtitles.length > 1) {
				showInfo("Found "+this.subtitles.length+" audio track(s)");
			}
		} else {
			showInfo("Switching audio components not supported");
		}
	} catch (e) {
		showInfo("Switching audio components not supported");
	}
	
}
