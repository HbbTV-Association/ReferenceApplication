/**
 * HTML5 video player impelmentation for HbbTV 2.0.1 capable devices
 * 
 * @class VideoPlayerHTML5
 * @constructor
 * @uses VideoPlayerBasic
 */
 

function VideoPlayerHTML5(element_id, profile, width, height){
	console.log("VideoPlayerHTML5 - Constructor");
	
	// Call super class constructor
	VideoPlayerBasic.call(this, element_id, profile, width, height);
	
	console.log("Initialized " + this.element_id);
}

VideoPlayerHTML5.prototype.createPlayer = function(){
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
			+'<div id="subtitleButton"><div id="subtitleButtonText">Subtitles</div></div>'
			+'<div id="audioButton"><div id="audioButtonText">Audio</div></div>'
			+'</div>');
		console.log("Add player component");
	}

	try{
		// removed type attribute
		//this.video = $("<video id='video' type='application/dash+xml' class='fullscreen'></video>")[0];
		this.video = $("<video id='video' class='fullscreen'></video>")[0];
		this.element.appendChild( this.video );
		console.log("html5 video object created");
	} catch( e ){
		console.log("Error creating dashjs video object ", e.description );
	}

	var player = this.video;
	
	addEventListeners( player, 'ended abort', function(e){
		console.log( e.type );
		self.stop();
	} );
	
	player.addEventListener('error', function(e){
		self.setLoading(false);
		if( !self.video ){
			return;
		}
		try{
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
		} catch(e){
			console.log("error reading video error code");
			console.log(e.description);
		}
	} );
	
	player.addEventListener('play', function(){ 
		console.log("video play event triggered");
	} );
	
	player.seektimer = null;
	player.addEventListener('seeked', function(){
		console.log("Seeked");
	});
	
	player.addEventListener('playing', function(){
		console.log("playing");
		if( dialog && dialog.open ){
			player.pause();
		}
	});
	
	var canplay = false;
	player.addEventListener('canplay', function(){
		canplay = true;
		console.log("canplay");
		
	} );
	
	player.addEventListener('loadedmetadata', function(){
		console.log("loadedmetadata");
	} );
	
	player.addEventListener('loadstart', function(){
		console.log("loadstart");
		self.setLoading(true);
	} );
	
	addEventListeners( player, "waiting", function(e){ 
		console.log( e.type );
		self.setLoading(true);
	} );
	
	addEventListeners( player, "waiting stalled suspend", function(e){ 
		console.log( e.type );
	} );
	
	addEventListeners( player, 'playing pause emptied', function(e){
		self.setLoading(false);
		console.log( e.type );
	} );
	
	
	player.addEventListener('ended emptied error', function(){
		self.setLoading(false);
		Monitor.videoEnded(console.log);
	} );
	
	player.addEventListener('progress', function( e ){
		
	} );
	
	player.addEventListener('pause', function(){
		Monitor.videoPaused(); 
		self.setLoading(false);
		$("#ppauseplay").removeClass("pause").addClass("play");
	} );
	
	if( player.textTracks ){
		player.textTracks.addEventListener('addtrack', function(evt){
			
			// set up inband cue events listeners for new tracks
			var track = evt.track;
			
			// TODO: First check if same language code exist, do not add duplicates. 
			// (may occur if subtitles are served both inband and out-of-band)
			try{
				/*
				$.each( $(player).find("track"), function(olderTrack){
					if( olderTrack.label == track.language ){
						console.log("Language " + track.language + " text track already exists. Skip");
						$(player)
						return;
					}
				} );
				*/
				/*
				var found = false;
				$.each( player.textTracks, function(olderTrack){
					if( olderTrack.label == track.language ){
						console.log("Language " + track.language + " text track already exists. Skip");
						delete track;
						found = true;
						return false;
					}
				} );
				if(found){
					return;
				}
				*/
			} catch( e ){
				console.log( "error checking tracks: " + e.description );
			}
			
			track.onerror = track.onload = function(){
				console.log( arguments );
			}
			
			console.log("at addtrack nth track: " + this.length + " : set up cuechange listeners", track);
			
			
			// show subtitle button label if there is a track that is not metadata 
			if( track.kind != "metadata" ){
				$("#subtitleButton").show();
			}
			
			/*
			// the first track is set showing
			if( self.subtitleTrack === false ){
				track.mode = "showing";
				self.subtitleTrack = 0;
				console.log("set showing track ", track.language, track.label);
				$("#subtitleButtonText").html("Subtitles: " + track.language );
			}
			else{
				track.mode = "hidden";
			}
			*/
			
			track.label = track.language;
			console.log("text track " + track);
			track.oncuechange = function(evt) {
				
				if( this.kind == "metadata" ){
				
					showInfo("cuechange! kind=" + this.kind);
					
					try{
						var cuelist = this.activeCues;
						if ( cuelist && cuelist.length > 0) {
							console.log("cue keys: ",  Object.keys( cuelist[0] ) ); 
							var info = "";
							$.each( cuelist, function(c, cue){
								
								// try read text attribute
								if( cue.text ){
									showInfo( cue.text );
								}
								
								var cueValue = arrayBufferToString( cue.data );
								//console.log( "cues["+c+"].data ("+ cue.data.constructor.name+") = " + cueValue ); 
								console.log( "startTime : " + cue.startTime + ", endTime : " + cue.endTime + " cueValue: " + cueValue );
								info +=  "cue: '" + cueValue + "' start : " + cue.startTime + ", ends : " + cue.endTime + "<br/>";
								
							} );
							
							showInfo( info, 999 );
						}
						else{
							showInfo("Metadata cue exit", 1);
						}
					} catch(e){
						console.log("error Reading cues", e.message );
					}
					
				}
				else{
					console.log("cue event " + this.kind + " received");
					if( this.activeCues.length ){
						console.log("cue keys " + Object.keys( this.activeCues[0] ) + " received");
					}
				}
			};
			console.log( "oncuechange function set" );
		} );
	}
	
	player.addEventListener('playing', function(){
		console.log("video playing");
		if( self.firstPlay ){
			self.firstPlay = false;
			self.displayPlayer( 5 );
			// TODO: Set the first subtitle track active if any exists.
			if( self.video.textTracks && self.video.textTracks.length ){
				var defaultSub = -1;
				$.each( self.video.textTracks, function(i, track){
					if( defaultSub < 0 && track.kind != "metadata" ) {
						track.mode = "showing";
						defaultSub = i;
						$("#subtitleButtonText").html("Subtitles: " + track.language );
					} else if( track.kind != "metadata" ){
						track.mode = "hidden";
					}
				} );
				if( defaultSub >= 0 ){
					console.log("Found default subtitle track: " + defaultSub);
					self.subtitleTrack = defaultSub;
					console.log( self.video.textTracks[ defaultSub ] );
				}
				$("#subtitleButton").show();
			}
			else{
				$("#subtitleButton").hide();
			}
			
			if( self.getAudioTracks() ){
				$("#audioButton").show();
			}else{
				$("#audioButton").hide();
			}
			
			// audio tracks
			if( self.video.audioTracks && self.video.audioTracks.length ){
				var defaultAudio = -1;
				$.each( self.video.audioTracks, function(i, track){
					console.log("audiotrack " + i);
					console.log( track );
					if( defaultAudio < 0 && track.kind != "metadata" ) {
						track.mode = "showing";
						defaultAudio = i;
						$("#audioButtonText").html("Audio: " + track.language );
						$("#audioButton").show();
					} else if( track.kind != "metadata" ){
						track.mode = "hidden";
					}
				} );
				if( defaultAudio >= 0 ){
					console.log("Found default audio track: " + defaultAudio);
					self.audioTrack = defaultAudio;
					console.log( self.video.audioTracks[ defaultAudio ] );
				}
			}
			
		}
		Monitor.videoPlaying();
		self.setLoading(false);
		$("#ppauseplay").removeClass("play").addClass("pause");
	} );
	
	
	player.addEventListener('timeupdate', function(){
		self.watched.set( player.currentTime, player.duration, self.videoid );
		if( self.seekTimer == null ){
			self.updateProgressBar();
			self.checkAds();
		}
	} );
	
	player.seek = function( sec, absolute ){
		try{
			var target = ( absolute? sec : player.currentTime + sec);
			
			if( target < 0 )
				target = 0;
			else if( target > player.duration )
				return;
			
			console.log("position: " + player.currentTime + "s. seek "+sec+"s to " + target);
			// Set position
			player.currentTime = target;
		} catch(e){
			console.log("error seeking: " + e.description);
		}
	};
	
	return true;
}

VideoPlayerHTML5.prototype.setURL = function(url){
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
		this.video.src = url;
	} catch( e ){
		console.log( e.message );
	}
	
	// create id for video url
	this.videoid = url.hashCode();
	
	return;
};

VideoPlayerHTML5.prototype.checkAds = function(){
	//console.log("checkAds");
	if( this.adBreaks ){
		
		if( this.video == null ){
			// video has stopped just before new ad checking. exit player
			this.clearVideo();
			return;
		}
		
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

VideoPlayerHTML5.prototype.prepareAdPlayers = function(){
	
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
			
			if( self.video == null ){
				// video has stopped during ads. exit
				self.clearVideo();
				return;
			}
			
			if( self.firstPlay ){
				self.startVideo( self.live );
			}
			else{
				self.video.play();
			}
			$(self.video).removeClass("hide"); // show content video
		}
		
	};
	
	var onAdPlay = function(){
		console.log("ad playing");
		self.setLoading(false);
	};
	
	var onAdProgress = function(e){};
	
	var onAdTimeupdate = function(){
		var timeLeft = Math.floor( this.duration - this.currentTime )
		if( timeLeft != NaN ){
			$("#adInfo").addClass("show");
			$("#adInfo").html("Ad " + self.adCount + "/" + self.adBuffer.length + " (" + timeLeft + "s)" );
		}
	};
	
	$.each( self.adPlayer, function(i, player){
		addEventListeners( player, 'ended', adEnd );
		addEventListeners( player, 'playing', onAdPlay );
		addEventListeners( player, 'timeupdate', onAdTimeupdate );
		addEventListeners( player, 'progress', onAdProgress );
	} );
};

VideoPlayerHTML5.prototype.getAds = function( adBreak ){
	this.onAdBreak = true; // disable seeking
	this.adCount = 0;
	try{
		this.video.pause();
	} catch(e){
		console.log("content video pause failed. May be not initialized yet (prerolls)");
	}
	var self = this;
	console.log("get ads breaks=" + adBreak.ads);
	$.get( "../getAds.php?breaks=" + adBreak.ads, function(ads){
		self.adBuffer = ads;
		console.log( "Got " + ads.length + " ads");
		
		self.prepareAdPlayers();
		
		self.playAds();
		
	}, "json" );
};

VideoPlayerHTML5.prototype.playAds = function(){
	this.onAdBreak = true; // disable seeking
	try{
		this.video.pause();
	} catch(e){
		console.log("content video pause failed. May be not initialized yet (prerolls)");
	}
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

VideoPlayerHTML5.prototype.clearLicenseRequest = function(callback){
	console.log("clearLicenseRequest()");
	
	/***
		if drm object exists set empty acquisition
	***/

	this.oipfDrm = $("#oipfDrm")[0];
	
	if( !this.oipfDrm ){
		if( callback ){
			callback("oipfDrm is null");
		}
		return;
	}
	
	var self = this;
	if( this.drm.system == "playready" ){
		var msgType = "application/vnd.ms-playready.initiator+xml";
		var xmlLicenceAcquisition =
		'<?xml version="1.0" encoding="utf-8"?>' +
		'<PlayReadyInitiator xmlns="http://schemas.microsoft.com/DRM/2007/03/protocols/">' +
		'</PlayReadyInitiator>';
		var DRMSysID = "urn:dvb:casystemid:19219";
		
	}
	else if( this.drm.system == "marlin" ){
		var msgType = "application/vnd.marlin.drm.actiontoken+xml";
		var xmlLicenceAcquisition =
		'<?xml version="1.0" encoding="utf-8"?>' +
		'<Marlin xmlns="http://marlin-drm.com/epub"><Version>1.1</Version><RightsURL><RightsIssuer><URL></URL></RightsIssuer></RightsURL></Marlin>';
		var DRMSysID = "urn:dvb:casystemid:19188";
	}
	else if( this.drm.system == "clearkey" ){
		self.player.setProtectionData({
			"org.w3.clearkey": { 
				"serverURL": ""
			}
		});
		callback();
	}
	
	
	try {
		this.oipfDrm.onDRMMessageResult = callback;
	} catch (e) {
		console.log("sendLicenseRequest Error 1: " + e.message );
	}
	try {
		this.oipfDrm.onDRMRightsError = callback;
	} catch (e) {
		console.log("sendLicenseRequest Error 2: " + e.message );
	}
	try {
		this.oipfDrm.sendDRMMessage(msgType, xmlLicenceAcquisition, DRMSysID);
		console.log("drm data cleared");
	} catch (e) {
		console.log("sendLicenseRequest Error 3: " + e.message );
	}
	
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
	else if( this.drm.system == "clearkey" ){
		self.player.setProtectionData({
			"org.w3.clearkey": { 
				"serverURL": self.drm.la_url
				/* "serverURL" : "https://mhp.sofiadigital.fi/tvportal/referenceapp/videos/laurl_ck.php", */
				/* "clearkeys": { "EjQSNBI0EjQSNBI0EjQSNA" : "QyFWeBI0EjQSNBI0EjQSNA" } */
			}
		});
	}
	
	console.log( xmlLicenceAcquisition );
	
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


VideoPlayerHTML5.prototype.startVideo = function( isLive, nthCall ){
	console.log("startVideo()");
	this.subtitleTrack = false
	// reset progress bar always
	this.resetProgressBar();
	
	var self = this;
	this.onAdBreak = false;
	this.firstPlay = true;
	
	if( isLive ){
		self.live = true;
	}
	else{
		self.live = false;
	}
	
	if( !this.subtitles ){
		this.subtitleTrack = false;
	}
	
	if( nthCall && nthCall > 0 ){
		try{
			var broadcast = $("#broadcast")[0];
			if( !broadcast ){
				$("body").append("<object type='video/broadcast' id='broadcast'></object>");
			}
			broadcast = $("#broadcast")[0];
			console.log( broadcast );
			broadcast.bindToCurrentChannel();
			broadcast.stop();
			console.log("broadcast stopped");
		}
		catch(e){
			console.log("error stopping broadcast");
		}
	}
	
	var self = this;
	this.onAdBreak = false;
	this.firstPlay = true;
	
	try{
		if( !self.video ){
			console.log("populate player and create video object");
			self.populate();
			self.createPlayer();
			self.setEventHandlers();
		}
	}
	catch(e){
		console.log( e.message );
		console.log( e.description );
	}
		
	self.element.removeClass("hidden");
	self.visible = true;
	self.setFullscreen(true);

	
	// first play preroll if present
	var playPreroll = false;
	// check prerolls on first start
	if( self.adBreaks ){
		$.each( self.adBreaks, function(n, adBreak){
			if( !adBreak.played && adBreak.position == "preroll" ){
				console.log("play preroll");
				adBreak.played = true;
				playPreroll = true;
				self.getAds( adBreak );
				return false;
			}
		});
		if( playPreroll ){
			return; // return startVideo(). after prerolls this is called again
		}
	}
	
	
	if( this.drm && this.drm.ready == false ){
		console.log("Send DRM License aquistion");
		this.sendLicenseRequest( function( response ){
			console.log("license ready ", self.drm);
			if( self.drm.ready ){
				self.startVideo( isLive, 2 );
			}
			else if( self.drm.error ){
				showInfo( "Error: " + self.drm.error );
			}
			else{
				showInfo( "Unknown DRM error! " + JSON.stringify( response ));
			}
		} );
		return;
	}
	
	
	try{
		if( !self.video ){
			console.log("populate player and create video object");
			self.populate();
			self.createPlayer();
			self.setEventHandlers();
		}
	}
	catch(e){
		console.log( e.message );
		console.log( e.description );
	}
	
	try{	
		self.element.removeClass("hidden");
		self.visible = true;
		self.watched.load();
		var position = this.watched.get( self.videoid );
		console.log("position", position );
		if( position ){
			self.video.pause();
			console.log("video paused");
			showDialog("Resume","Do you want to resume video at position " + toTime( position.position ) , ["Yes", "No, Start over"], function( val ){
				if( val == 0 ){
					self.video.play();
					console.log("Seek to resume and play")
					self.video.seek( position.position );
					self.setFullscreen(true);
					self.displayPlayer(5);
				}
				else{
					console.log("video.play()")
					self.video.play();
					self.setFullscreen(true);
					self.displayPlayer(5);
				}
			}, 0, 0, "basicInfoDialog");
		}
		else{
			console.log("video.play()")
			self.video.play();
			self.setFullscreen(true);
			self.displayPlayer(5);
		}
	}
	catch(e){
		console.log( e.message );
		console.log( e.description );
	}
};

VideoPlayerHTML5.prototype.stop = function(){
	showInfo("Exit Video", 1);
	
	var self = this;
	self.watched.save();
	this.onAdBreak = false;
	// if video not exist
	if( !self.video ){
		self.clearVideo();
		return;
	}
	try{
		self.video.pause();
		console.log("video.pause(); succeed");
		self.clearVideo();
		console.log("clearVideo(); succeed");
		self.resetProgressBar();
	}
	catch(e){
		console.log("error stopping video");
		console.log(e.description);
	}
};

VideoPlayerHTML5.prototype.play = function(){
	var self = this;
	try{
		self.video.play();
		self.displayPlayer(5);
	}
	catch(e){
		console.log(e);
	}
};

VideoPlayerHTML5.prototype.clearVideo = function(){
	
	var self = this;
	self.element.addClass("hidden");
	$("#player").removeClass("show");
	self.visible = false;
	try{
		if(self.video){
			self.video.pause();
			self.video.src = "";
			$( "#video" ).remove(); // clear from dom
			this.video = null;
		}
		if( $("#broadcast")[0] ){
			$("#broadcast")[0].bindToCurrentChannel();
		}
	}
	catch(e){
		console.log("Error at clearVideo()");
		console.log( e.description );
	}
	
	this.clearAds();
	
	this.subtitles = null;
	
	this.clearLicenseRequest( function(msg){
		console.log("License cleared:" + msg);
	});
	
};
VideoPlayerHTML5.prototype.clearAds = function(){
	if( self.adPlayer ){
		try{
			self.adPlayer[0].stop();
		} catch(e){ console.log("Error at clearAds(): " + e.message); }
		try{
			self.adPlayer[1].stop();
		} catch(e){ console.log("Error at clearAds(): " + e.message); }
		try{
			$( self.adPlayer[0] ).addClass("hide");
			$( self.adPlayer[1] ).addClass("hide");
			self.adPlayer[0].src = "";
			self.adPlayer[1].src = "";
		} catch(e){ console.log("Error at clearAds(): " + e.message); }
		
		self.adPlayer = null;
		self.onAdBreak = false;
		self.adBreaks = null;
		self.adBuffer = null;
		self.adCount = 0;
	}
	$( "#ad1" ).remove(); // clear from dom
	$( "#ad2" ).remove(); // clear from dom
	$( "#adInfo" ).remove(); // clear from dom
};

VideoPlayerHTML5.prototype.isFullscreen = function(){
	var self = this;
	return self.fullscreen;
};

VideoPlayerHTML5.prototype.isPlaying = function(){
	return ( this.video && !this.video.paused ); // return true/false
};

VideoPlayerHTML5.prototype.getAudioTracks = function(){
	try{
		var tracks = this.video.audioTracks;
		return tracks.length;
	} catch(e){
		console.log(e.message);
		return 0;
	}
}




