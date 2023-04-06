/**
 * OIPF AV-Object videoplayer for HbbTV 1.5 devices
 * 
 * 
 *
 * @class VideoPlayer
 * @extends VideoPlayerBasic
 * @constructor
 */


function VideoPlayer(element_id, profile, width, height){
	console.log("VideoPlayer - Constructor");
	
	// Call super class constructor
	VideoPlayerBasic.call(this, element_id, profile, width, height);
	this.timeInMilliseconds = true;
	console.log("Initialized " + this.element_id);
}

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
			+'<div id="subtitleButton"><div id="subtitleButtonText">Subtitles</div></div>'
			+'<div id="audioButton"><div id="audioButtonText">Audio</div></div>'
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
	url = url.replace("${GUID}", uuidv4());
	console.log("setURL("+url+")");
	
	var type = "application/dash+xml";
	if( url.match(/mp4$/) ){
		this.video.setAttribute("type", "video/mp4");
	}
	else{
		this.video.setAttribute("type", type );
	}
	try{
		this.url = url; // see sendLicenseRequest()
		this.video.data = url;
	} catch( e ){
		console.log( e.message );
	}
	
	// create id for video url
	this.videoid = url.hashCode();

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
			
			self.video.play(1);
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
	console.log("get ads breaks=" + adBreak.ads + ", position="+adBreak.position );
	$.get( "../getAds.php?breaks=" + adBreak.ads + "&position="+adBreak.position, function(ads){
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


VideoPlayer.prototype.setSubtitles = function( subtitles ){
	if( subtitles ){
		console.log("setSubtitles()");
		this.subtitles = subtitles;
	}
	else{
		this.subtitles = null;
	}
};

VideoPlayer.prototype.clearLicenseRequest = function(callback){
	console.log("clearLicenseRequest()");
	
	// if drm object exists set an empty acquisition
	this.oipfDrm = $("#oipfDrm")[0];	
	if( !this.oipfDrm ){
		if( callback ){
			callback("oipfDrm is null");
		}
		return;
	}
	
	var msgType="";
	var self = this;
	if(!this.drm || !this.drm.system) {
		callback();
		return;
	} else if(this.drm.system.indexOf("playready")===0) {
		msgType = "application/vnd.ms-playready.initiator+xml";
		var xmlLicenceAcquisition =
		'<?xml version="1.0" encoding="utf-8"?>' +
		'<PlayReadyInitiator xmlns="http://schemas.microsoft.com/DRM/2007/03/protocols/">' +
		  '<LicenseServerUriOverride><LA_URL></LA_URL></LicenseServerUriOverride>' +
		'</PlayReadyInitiator>';
		var DRMSysID = "urn:dvb:casystemid:19219";		
	}	
	else if( this.drm.system == "marlin" ){
		msgType = "application/vnd.marlin.drm.actiontoken+xml";
		var xmlLicenceAcquisition =
		'<?xml version="1.0" encoding="utf-8"?>' +
		'<Marlin xmlns="http://marlin-drm.com/epub"><Version>1.1</Version><RightsURL><RightsIssuer><URL></URL></RightsIssuer></RightsURL></Marlin>';
		var DRMSysID = "urn:dvb:casystemid:19188";
	}
	else if(this.drm.system.indexOf("widevine")===0) {
		msgType = "application/widevine+xml";
		var DRMSysID = "urn:dvb:casystemid:19156";
		var xmlLicenceAcquisition =
		'<?xml version="1.0" encoding="utf-8"?>' +
		'<WidevineCredentialsInfo xmlns="http://www.smarttv-alliance.org/DRM/widevine/2012/protocols/">' +
		'<ContentURL></ContentURL>' +
		'<DRMServerURL></DRMServerURL>' +
		'<DeviceID></DeviceID><StreamID></StreamID><ClientIP></ClientIP>' +
		'<DRMAckServerURL></DRMAckServerURL><DRMHeartBeatURL></DRMHeartBeatURL>' +
		'<DRMHeartBeatPeriod></DRMHeartBeatPeriod>' +
		'<UserData></UserData>' +
		'<Portal></Portal><StoreFront></StoreFront>' +
		'<BandwidthCheckURL></BandwidthCheckURL><BandwidthCheckInterval></BandwidthCheckInterval>' +
		'</WidevineCredentialsInfo>';
	}
	else if( this.drm.system == "clearkey" ){
		callback();
		return;
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
		var msgId=-1;
		if(msgType!="")
			msgId = this.oipfDrm.sendDRMMessage(msgType, xmlLicenceAcquisition, DRMSysID);
		console.log( this.drm.system+" drm data cleared, msgId: " + msgId );
	} catch (e) {
		console.log("sendLicenseRequest Error 3: " + e.message );
		callback();
	}
	
};

VideoPlayer.prototype.sendLicenseRequest = function(callback){
	console.log("sendLicenseRequest()");
	createOIPFDrmAgent(); // see common.js
	this.oipfDrm = $("#oipfDrm")[0];
	
	this.drm.successCallback = callback;
	var self = this;
	
	// persistent-license test needs a session GUID to track laurl invocation
	var laUrl = self.drm.la_url;
	if(laUrl.indexOf("${GUID}")>=0) {
		self.drm.la_url_guid = uuidv4();
		laUrl = laUrl.replace("${GUID}", self.drm.la_url_guid);
	} else {
		delete self.drm.la_url_guid;
	}
	
	if(this.drm.system.indexOf("playready")===0) {
		var msgType = "application/vnd.ms-playready.initiator+xml";
		var DRMSysID = "urn:dvb:casystemid:19219";
		var xmlLicenceAcquisition =
		'<?xml version="1.0" encoding="utf-8"?>' +
		'<PlayReadyInitiator xmlns="http://schemas.microsoft.com/DRM/2007/03/protocols/">' +
		  '<LicenseServerUriOverride>' +
			'<LA_URL>' +
				laUrl +
			'</LA_URL>' +
		  '</LicenseServerUriOverride>' +
		'</PlayReadyInitiator>';		
	} else if( this.drm.system == "marlin" ){
		var msgType = "application/vnd.marlin.drm.actiontoken+xml";
		var DRMSysID = "urn:dvb:casystemid:19188";
		var xmlLicenceAcquisition =
		'<?xml version="1.0" encoding="utf-8"?>' +
		'<Marlin xmlns="http://marlin-drm.com/epub"><Version>1.1</Version><RightsURL><RightsIssuer><URL>'+ laUrl +'</URL></RightsIssuer></RightsURL></Marlin>';
	} else if(this.drm.system.indexOf("widevine")===0) {
		var msgType = "application/widevine+xml";
		var DRMSysID = "urn:dvb:casystemid:19156";
		var xmlLicenceAcquisition =
		'<?xml version="1.0" encoding="utf-8"?>' +
		'<WidevineCredentialsInfo xmlns="http://www.smarttv-alliance.org/DRM/widevine/2012/protocols/">' +
		'<ContentURL>' + XMLEscape(this.url) +'</ContentURL>' +
		'<DRMServerURL>' + XMLEscape(laUrl) + '</DRMServerURL>' +
		'<DeviceID></DeviceID><StreamID></StreamID><ClientIP></ClientIP>' +
		'<DRMAckServerURL></DRMAckServerURL><DRMHeartBeatURL></DRMHeartBeatURL>' +
		'<DRMHeartBeatPeriod></DRMHeartBeatPeriod>' +
		'<UserData></UserData>' +
		'<Portal></Portal><StoreFront></StoreFront>' +
		'<BandwidthCheckURL></BandwidthCheckURL><BandwidthCheckInterval></BandwidthCheckInterval>' +
		'</WidevineCredentialsInfo>';
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
		var msgId = this.oipfDrm.sendDRMMessage(msgType, xmlLicenceAcquisition, DRMSysID);
		console.log("sendLicenseRequest msgId: " + msgId);
	} catch (e) {
		console.log("sendLicenseRequest Error 3: " + e.message );
	}
	
	function drmMsgHandler(msgID, resultMsg, resultCode) {
		console.log("drmMsgHandler drmMsgID, resultMsg, resultCode: " + msgID +","+  resultMsg +","+ resultCode);
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
			showInfo("" + resultCode + " " + errorMessage );
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


VideoPlayer.prototype.startVideo = function( isLive ){
	var self = this;
	console.log("startVideo(), " + self.currentItem.title);
	
	this.resetProgressBar(); // always reset progress bar	
	if( isLive ){
		self.live = true;
	} else{
		self.live = false;
	}
	
	try{
		var broadcast = $("#broadcast")[0];
		if( !broadcast ){
			$("body").append("<object type='video/broadcast' id='broadcast'></object>");
		}
		broadcast = $("#broadcast")[0];
		console.log( "Current broadcast.playState="+ broadcast.playState );
		if( broadcast.playState != 3 ) { // 0=unrealized, 1=connecting, 2=presenting, 3=stopped
			broadcast.bindToCurrentChannel();
			broadcast.stop();
			console.log("broadcast stopped");
		}
	} catch(e){
		console.log("error stopping broadcast");
	}
	
	setOIPFActiveDRM(self.currentItem);
	
	if( this.drm && this.drm.ready == false ){
		console.log("Send DRM License acquisition");
		this.sendLicenseRequest( function( response ){
			console.log("license ready ", self.drm);
			if( self.drm.ready ){
				self.startVideo(isLive); // async 2nd call
			} else if( self.drm.error ){
				showInfo( "Error: " + self.drm.error );
			} else{
				showInfo( "Unknown DRM error! " + JSON.stringify( response ));
			}
		} );
		return;
	}

	if( !self.video ){
		self.populate();
		self.setEventHandlers();
	}
	
	try{
		var player = this.video;
		this.subtitles = player.textTracks;
				
		if( menu.focus.subtitles ){
			console.log("set OIPF OOB subs")
			this.subtitles = menu.focus.subtitles;
		}
		
		// out-of-band subtitles must be an array containing containing language code and source.ttml file url.
		if( this.subtitles ){
			$.each( this.subtitles, function(i, lang){
				$(this.video).append("<param name='subtitles' value='srclang:"+ lang.code +" src: " + lang.src + "' />");
				console.log("Set subtitle " + lang.code);
			} );
		}
		
	} catch(e){
		console.log("error setting subs: " + e);
	}
		
	self.video.onPlayStateChange = function(){ self.doPlayStateChange(); };
	self.element.removeClass("hidden");
	self.visible = true;
		
	/*
	self.video.play(1);
	
	self.setFullscreen(true);
	self.displayPlayer(5);
	*/
		
	try{
		self.watched.load();
		var position = null; //this.watched.get( self.videoid );
		if( !self.live && position ){
			self.resumePosition = position.position;
			console.log("resumePosition is " + self.resumePosition);
			self.whenstart = function(){
				self.pause();
				console.log("video paused by resume dialog in whenstart function");
				showDialog("Resume","Do you want to resume video at position " + toTime( self.resumePosition ) , ["Yes", "No, Start over"], function( val ){
					if( val == 0 ){
						self.whenstart = function(){
							console.log("Seek to resume and play " + self.resumePosition * 1000);
							self.video.seek( self.resumePosition * 1000 );
							self.whenstart = null;
							self.resumePosition = 0;
							
						};
						self.setFullscreen(true);
						self.play();
					}
					else{
						console.log("video.play()")
						self.play();
						self.setFullscreen(true);
						self.resumePosition = 0;
					}
					
				}, 0, 0, "basicInfoDialog");
			};
		}
		
	} catch(e){
		console.log("getting resume position: " + e.description);
	}
	
	try{
		console.log("video.play()");
		self.play();
	} catch(e){
		console.log("error start video play: " , e);
	}
	
	self.setFullscreen(true);
	self.displayPlayer(5);
};

VideoPlayer.prototype.pause = function(){
	console.log("oipf player pause");
	var self = this;
	try{
		self.video.play(0);
		self.displayPlayer();
	}
	catch(e){
		console.log(e);
	}
};

VideoPlayer.prototype.stop = function(){
	showInfo("Exit Video", 1);
	
	var self = this;
	self.watched.save();
	
	try{
		self.video.stop();
		console.log( "video stop succeed" );
		self.clearVideo();
		console.log( "clear video succeed" );
		self.resetProgressBar();
		console.log( "reset progressBar succeed" );
	} catch(ex) {
		console.log(ex);
	}
	
	if(self.currentItem.setActiveDRM_drmSystemId)
		setOIPFActiveDRM(null);
};

VideoPlayer.prototype.play = function(){
	var self = this;
	try{
		self.video.play(1);
		self.displayPlayer(5);
	}
	catch(e){
		console.log("Error at VideoPlayer.play() " + e.description);
	}
};

VideoPlayer.prototype.clearVideo = function(){
	var self = this;
	self.element.addClass("hidden");
	self.visible = false;
	clearInterval(self.progressUpdateInterval);
	try{
		if(self.video){
			if( self.isPlaying() ){
				self.video.stop();
			}
			$( "#video" ).remove(); // clear from dom
			this.video = null;
			console.log("video object stopped, removed from dom and VideoPlayerClass");
		}
		if( $("#broadcast")[0] ){
			$("#broadcast")[0].bindToCurrentChannel();
		}
	}
	catch(e){
		console.log("Error at clearVideo()");
		console.log( e.description );
	}
	
	this.subtitles = null;	
	this.clearLicenseRequest( function(msg){
		//destroyOIPFDrmAgent();
		console.log("License cleared:" + msg);
	});
};

VideoPlayer.prototype.isFullscreen = function(){
	var self = this;
	return self.fullscreen;
};

VideoPlayer.prototype.isPlaying = function(){
	return ( this.video && this.video.playState == 1 ); // return true/false
};

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
			
			if( dialog.open ){
				console.log("pause on dialog");
				self.pause();
				return;
			}
			
        	self.visible = true;
            self.setLoading(false);
            clearInterval(self.progressUpdateInterval);
            self.progressUpdateInterval = window.setInterval( function(){
				if( self.video ){
					self.watched.set( self.video.playPosition / 1000, self.video.playTime / 1000, self.videoid );
				}
				if( self.seekTimer == null ){
					self.updateProgressBar();
					//self.displayPlayer( 5 );
				}
            }, 1000);
			Monitor.videoPlaying();
			
			if( self.getAudioTracks() > 1 ){ // if more than one audiotrack selectable show button
				$("#audioButton").show();
			}else{
				$("#audioButton").hide();
			}
			
			if( this.subtitles && this.subtitles.length ){
				$("#subtitleButton").show();
			}
			else{
				$("#subtitleButton").hide();
			}
			
			// check if there is function to execute after all other things are done for video start
			if( self.whenstart && typeof self.whenstart == "function" ){
				self.whenstart();
				self.whenstart = null;
			}
			
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
			self.stop();
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
};

VideoPlayer.prototype.getStreamComponents = function(){
	try {
		if(typeof this.video.getComponents == 'function') {
			this.subtitles = vidobj.getComponents( 1 ); // 1= audio
			if (this.subtitles.length > 1) {
				showInfo("Found "+this.subtitles.length+" audio track(s)");
			}
		} else {
			showInfo("Switching audio components not supported");
		}
	} catch (e) {
		showInfo("Switching audio components not supported");
	}
	
};

VideoPlayer.prototype.getAudioTracks = function(){	
	try{
		if(typeof this.video.getComponents == 'function') {
			var avComponent = this.video.getComponents( this.AVCOMPONENTS.AUDIO );
			return avComponent.length;
		}
		else{
			return 0;
		}
	} catch(e){
		showInfo( "getComponents not available", e.message );
	}	
};

VideoPlayer.prototype.getCurrentAudioTrack = function(){
	/*
	try{
		if(typeof this.video.getComponents == 'function') {
			var avComponent = this.video.getComponents( this.AVCOMPONENTS.AUDIO );
			var track = avComponent[ self.audioTrack ];
			return track.language;
		}
		else{
			return "default";
		}
	} catch(e){
		showInfo( "getComponents not available", e.message );
		return "default";
	}
	*/
};


VideoPlayer.prototype.changeAVcomponent = function( component ) {
	console.log("changeAVcomponent("+ component +")");
	var self = this;
	try{
		var track = ( component == self.AVCOMPONENTS.AUDIO? self.audioTrack : self.subtitleTrack );
		console.log("current track: " + track  );
		if( track == undefined || track == NaN || track === false ){
			console.log("Change to 0"  );
			track = 0;
		}
		track++;
		
		console.log("switched track: " + track );
		
		switch ( this.video.playState) {
			case 1:
				// components can be accessed only in PLAYING state
				//ref 7.16.5.1.1 OIPF-DAE
				/*
				COMPONENT_TYPE_VIDEO: 0,
				COMPONENT_TYPE_AUDIO: 1,
				COMPONENT_TYPE_SUBTITLE: 2
				*/
				var avComponent = this.video.getComponents( component );
				if( track >= avComponent.length){
					track = 0;
				}
				
				if( component == self.AVCOMPONENTS.AUDIO ){
					self.audioTrack = track;
					console.log("Updated audioTrack value to: " + self.audioTrack);
				}
				else{
					self.subtitleTrack = track;
					console.log("Updated subtitleTrack value to: " + self.subtitleTrack);
				}
				
				console.log("Video has " + avComponent.length + " "+ ["video","audio","subtitle"][component] +" tracks. selected track is: " + track );
				
				// unselect all
				for (var i=0; i<avComponent.length; i++){
					console.log( "track " + i + ": " + avComponent[i].language );
					this.video.unselectComponent(avComponent[i]);
				}
				
				showInfo("select track " + track + "("+avComponent[track].language+")");
				console.log("select track " + track);
				this.video.selectComponent(avComponent[track]);
				console.log("READY");
				console.log( avComponent[track].language, avComponent[track].label || "label undefined" );
				
			break;
			case 6:
				/*ERROR*/
				showInfo("Error has occured");
				break; 
		}
    } catch(e){
		console.log("enableSubtitles - Error: " + e.description);
	}

};

VideoPlayer.prototype.enableSubtitles = function( next ) {
	console.log("enableSubtitles("+ next +")");
	try{
		if( next ){
			console.log("current track: " + this.subtitleTrack  );
			if( this.subtitleTrack == undefined || this.subtitleTrack == NaN ){
				console.log("Change NaN to 0"  );
				this.subtitleTrack = 0;
			}
			if( this.subtitleTrack === false ){
				this.subtitleTrack = 0;
			}
			else{
				this.subtitleTrack++;
			}
			
			console.log("switched track: " + this.subtitleTrack  );
		}
		switch ( this.video.playState) {
			case 1:
				// components can be accessed only in PLAYING state
				//ref 7.16.5.1.1 OIPF-DAE
				/*
				COMPONENT_TYPE_VIDEO: 0,
				COMPONENT_TYPE_AUDIO: 1,
				COMPONENT_TYPE_SUBTITLE: 2
				*/
				var avSubtitleComponent = this.video.getComponents( 2 );
				if( this.subtitleTrack >= avSubtitleComponent.length){
					this.subtitleTrack = 0;
				}
				console.log("Video has " + avSubtitleComponent.length + " subtitle tracks. selected track is: " + this.subtitleTrack );
				for (var i=0; i<avSubtitleComponent.length; i++){
					if ( this.subtitleTrack == i ) {
						showInfo("select subtitleTrack " + i);
						console.log("select subtitleTrack " + i);
						this.video.selectComponent(avSubtitleComponent[i]);
						console.log("READY");
					} else {
						console.log("unselect subtitleTrack " + i);
						this.video.unselectComponent(avSubtitleComponent[i]);
						console.log("READY");
					}
				}
				
			break;
			case 6:
				/*ERROR*/
				showInfo("Error has occured");
				break; 
		}
    } catch(e){
		console.log("enableSubtitles - Error: " + e.description);
	}

};
