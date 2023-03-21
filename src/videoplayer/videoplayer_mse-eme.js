/**
 * HTML5 MSE-EME video player impelmentation for HbbTV
 * Video player class definition for MSE-EME player.
 * This version is supposed to use on PC with target browser Edge.
 * 
 *
 * @class VideoPlayerEME
 * @extends VideoPlayerBasic
 * @constructor
 */
 
function VideoPlayerEME(element_id, profile, width, height){
	console.log("VideoPlayerEME - Constructor");
	
	// Call super class constructor
	VideoPlayerBasic.call(this, element_id, profile, width, height);
}

VideoPlayerEME.prototype.createPlayer = function(){
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
			+'</div>'
			);
		console.log("Add player component");
	}

	try{
		this.video = $("<video id='video' style='width:100%'></video>")[0]; // data-dashjs-player
		this.element.appendChild( this.video );
		$("<div id='video-caption'></div>").insertAfter("#video"); // put TTML subtitles div after a video element
		this.player = dashjs.MediaPlayer().create();
		this.player.initialize();
		this.player.setAutoPlay(true); // this fixes some slow-to-start live test manifests
		this.player.attachView(document.getElementById("video"));
		this.player.attachTTMLRenderingDiv(document.getElementById("video-caption"));
		this.player.updateSettings({ 
		    debug: { logLevel: dashjs.Debug.LOG_LEVEL_WARNING } // LOG_LEVEL_WARNING,LOG_LEVEL_INFO,LOG_LEVEL_DEBUG
			,streaming: {
				text: {defaultEnabled: true}
				//,manifestUpdateRetryInterval: 100
				,delay: {
					//liveDelayFragmentCount: 4,  // segcount
					//liveDelay: 6, // seconds
					useSuggestedPresentationDelay: true 
				}
			}  
		}); 
		console.log("video object created, dashjs "+this.player.getVersion() );
	} catch( e ){
		console.log(e);
		console.log("Error creating dashjs video object ", e.description );
	}
		
	var player = this.video; // player=HTMLVideoObject, self.player=dashjsPlayer
	
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
	
	player.addEventListener('seeked', function(){
		console.log("Seeked");
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
	
	addEventListeners( player, "stalled suspend", function(e){ 
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
	
	// listen for dash events by schemeUri (inband EMSG in .m4s segments or outband in manifest)
	// event.messageData is byte buffer in EMSG inband and is string in outband manifest.
	var SCHEME_ID_URI = "http://hbbtv.org/refapp";
	var fnEvent = function(evt) {
		var cueValue = uint8ArrayToString(evt.event.messageData);
		var info = "presentationTime="+evt.event.calculatedPresentationTime + ", duration="+evt.event.duration;
		info    += ", "+evt.event.eventStream.schemeIdUri + ", "+ evt.event.eventStream.value;
		info    += ", id="+evt.event.id+", " + cueValue;
		console.log("EVENT.START "+info);
		info =  "cue: '" + cueValue + "' start: " + evt.event.calculatedPresentationTime 
			+ ", ends: " + (evt.event.calculatedPresentationTime+evt.event.duration) + "<br/>";
		showInfo(info, evt.event.duration);
	};
	self.player.on(SCHEME_ID_URI, fnEvent
		, null, { mode: dashjs.MediaPlayer.events.EVENT_MODE_ON_START }); // EVENT_MODE_ON_RECEIVE
	
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
			
		// this = TextTrackList
		console.log("at addtrack nth track: " + this.length + " : set up cuechange listeners"
			, "kind="+track.kind + ", " + track.language + ", " + track.label);
		
		// show subtitle button label if there is a track that is not metadata 
		//if( track.kind != "metadata" ){
		//	$("#subtitleButton").show();
		//}
		//if( track.kind == "audio" ){
		//	$("#audioButton").show();
		//}
		
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
		self.subtitleTrack = 0;
		*/
		
		//console.log("text track ", track);
		/* if( this.kind == "metadata" ){
			track.oncuechange = function(evt) {
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
							console.log( "startTime : " + cue.startTime + ", endTime : " + cue.endTime + " Data: " + cueValue );
							info +=  "cue: '" + cueValue + "' start : " + cue.startTime + ", ends : " + cue.endTime + "<br/>";
						} );						
						showInfo( info, 999 );
					} else{
						showInfo("Metadata cue exit", 1);
					}
				} catch(e){
					console.log("error Reading cues", e.message );
				}
			};
			console.log("oncuechange function set");
		} */
		
	} );
		
	player.addEventListener('playing', function(){
		console.log("playing");
		
		if( dialog.open ){
			player.pause();
			return;
		}
		
		if( self.firstPlay ){
			self.firstPlay = false;
			self.displayPlayer( 5 );

			if(self.player.getTracksFor("text").length>=1)
				$("#subtitleButton").show();
			if(self.player.getTracksFor("audio").length>=1)
				$("#audioButton").show();
			
			if( self.video.textTracks && self.video.textTracks.length ){
				var defaultSub = -1;
				$.each( self.video.textTracks, function(i, track){
					if( defaultSub < 0 && track.kind != "metadata" ) {
						//track.mode = "showing";
						defaultSub = i;
						$("#subtitleButtonText").html("Subtitles: " + track.language );
					//} else if( track.kind != "metadata" ){
					//	track.mode = "hidden";
					}
				} );
				if( defaultSub >= 0 ){
					self.player.setTextTrack(defaultSub); // dashjsPlayer object
					//self.player.updatePortalSize();
					var track=self.video.textTracks[defaultSub]; // TextTrack object
					console.log("Found default subtitle track: " + defaultSub
						, "kind="+track.kind + ", " + track.language + ", " + track.label);
					self.subtitleTrack = defaultSub;
				}
			}
			
			// audio tracks
			var defaultAudio = -1;
			$.each( self.player.getTracksFor("audio"), function(i, track){
				if( defaultAudio < 0) {
					defaultAudio = i;
					$("#audioButtonText").html("Audio: " + track.lang);
				}
			} );
			if( defaultAudio >= 0 ){
				var track = self.player.getTracksFor("audio")[defaultAudio];
				console.log("Found default audio track: " + defaultAudio
					, ""+track.type+ ", "+ track.lang + ", " + track.codec ); //track
				self.audioTrack = defaultAudio;
			}
		}
		Monitor.videoPlaying();
		self.setLoading(false);
		$("#ppauseplay").removeClass("play").addClass("pause");
	} );
	
	
	player.addEventListener('timeupdate', function(){
		if( !dialog.open ){
			self.watched.set( player.currentTime, player.duration, self.videoid );
		}
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

VideoPlayerEME.prototype.setURL = function(url){
	url = url.replace("${GUID}", uuidv4());
	console.log("setURL(",url,")");
	//this.player.attachTTMLRenderingDiv(document.getElementById("video-caption")); //$("#video-caption")[0]);
	
	if(this.adBreaks) this.player.setAutoPlay(false); // disable autoplay, play preroll before starting a video
	this.player.attachSource(url);
	// create id for video url
	this.videoid = url.hashCode();
	return;
};

VideoPlayerEME.prototype.checkAds = function(){
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

VideoPlayerEME.prototype.prepareAdPlayers = function(){
	
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
		
		console.log("ad ended. adCount="+ self.adCount + ", adBuffer length: " + self.adBuffer.length + ", type="+e.type);
		var player = $(this);
		if( self.adCount < self.adBuffer.length ){
			player.addClass("hide");			
			self.playAds();			
		} else{
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
		if( timeLeft != NaN && self.adBuffer!=null ) {
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

VideoPlayerEME.prototype.getAds = function( adBreak ){
	this.onAdBreak = true; // disable seeking
	this.adCount = 0;
	try{
		this.video.pause();
	} catch(e){
		console.log("content video pause failed. May be not initialized yet (prerolls)");
	}
	var self = this;
	console.log("get ads breaks=" + adBreak.ads + ", position="+adBreak.position );
	$.get( "../getAds.php?breaks=" + adBreak.ads + "&position="+adBreak.position, function(ads){
		self.adBuffer = ads;
		console.log( "Got " + ads.length + " ads");		
		self.prepareAdPlayers();		
		self.playAds();		
	}, "json" );
};

VideoPlayerEME.prototype.playAds = function(){
	this.onAdBreak = true; // disable seeking
	try{
		this.video.pause(); // this.video=HTML5VideoElement, this.player=DashjsPlayer
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

VideoPlayerEME.prototype.setSubtitles = function( subtitles ){
	// do not create <Track> html objects inside the <video> element,
	// this is handled by Dashjs if subs are listed in a manifest.
	// FIXME: what if manifest did not have and we wanted to insert adhoc subtitles?
	if(subtitles){
		console.log("VideoPlayerEME.setSubtitles()");
		this.subtitles = subtitles;
	} else {
		this.subtitles = null;
	}
};

VideoPlayerEME.prototype.sendLicenseRequest = function(callback){
	console.log("sendLicenseRequest()");
	
	// Create DRM object and container for it
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
	
	if( this.drm.system == "playready" ){
		// use simple playready config (persistentState=optional, distinctiveIdentifier=optional)
		self.player.setProtectionData({
			"com.microsoft.playready": { "serverURL": laUrl, "priority":1 }
			,"com.widevine.alpha": { "priority":99 }
		});			
	}
	else if( this.drm.system.indexOf("playready.recommendation")===0 
			|| this.drm.system.indexOf("playready.")===0 ){
		// playready.HW, playready.recommendation.SL3000, playready.recommendation.SL2000, playready.recommendation.SL150
		// Trick DashJS to use a new "com.microsoft.playready.recommendation" systemId,
		// this is supported in a recent MSEdge and SmartTVs.
		var useRecommendationSys = this.drm.system.indexOf("playready.recommendation")===0;
		var secLevel = this.drm.system.indexOf(".SL3000")>0 ? "3000" // best
			: this.drm.system.indexOf(".3000")>0            ? "3000"
			: this.drm.system.indexOf(".HW")>0              ? "3000"
			: this.drm.system.indexOf(".SL2000")>0          ? "2000"
			: this.drm.system.indexOf(".2000")>0            ? "2000"
			: this.drm.system.indexOf(".SL150")>0           ? "150"
			: this.drm.system.indexOf(".150")>0             ? "150" // worst
			: "2000";
		console.log("Use playready security level "+secLevel);
		if(useRecommendationSys || secLevel=="3000") {
			// use new systemStringPriority to activate a new ".recommmendation" drm on Edge
			self.player.setProtectionData({
				"com.microsoft.playready": { 
					"serverURL": laUrl
					, "priority":1
					, "persistentState": "required", "distinctiveIdentifier": "required"
					, "videoRobustness": secLevel // SL3000 needs a new GPU(trusted module) 
					, "audioRobustness": secLevel=="150" ? "150": "2000"  // always SL2000 for audio
					, "systemStringPriority": [ "com.microsoft.playready.recommendation","com.microsoft.playready" ]
				}
				,"com.widevine.alpha": { "priority":99 }
			});
		} else {
			// this "persistentState+distinctiveIdentifier" without sysStrPriority used to activate a new drm on older dashjs releases
			self.player.setProtectionData({
				"com.microsoft.playready": { 
					"serverURL": laUrl
					, "priority":1
					, "persistentState": "required", "distinctiveIdentifier": "required"
					, "videoRobustness": secLevel
					, "audioRobustness": secLevel=="150" ? "150": "2000"  // always SL2000 for audio
				}
				,"com.widevine.alpha": { "priority":99 }
			});
		}
		
		// playready.UTF8, playready.UTF16
		// some devices may use utf-8 playready format.
		var msgFormat="";
		msgFormat= this.drm.system.indexOf(".UTF8")>0  || this.drm.system.indexOf(".UTF-8")>0  ? "utf-8" : msgFormat;
		msgFormat= this.drm.system.indexOf(".UTF16")>0 || this.drm.system.indexOf(".UTF-16")>0 ? "utf-16": msgFormat;
		if(msgFormat!="") {
			var keySystems = self.player.getProtectionController().getKeySystems();
			for(var idx=0; idx<keySystems.length; idx++) {
				if(keySystems[idx].systemString.indexOf("com.microsoft.playready")===0)
					keySystems[idx].setPlayReadyMessageFormat(msgFormat);
			}
			console.log("Use playready message format " + msgFormat);
		}		
	}
	else if( this.drm.system == "marlin" ){
		// Not supported
	}
	else if( this.drm.system == "clearkey" ){
		self.player.setProtectionData({
			"org.w3.clearkey": { 
				"serverURL": laUrl
				/* "clearkeys": { "EjQSNBI0EjQSNBI0EjQSNA" : "QyFWeBI0EjQSNBI0EjQSNA" } */
			}
		});
	} else if(this.drm.system.indexOf("widevine")===0) {
		// widevine, widevine.HW, widevine.SL1, widevine.SL2, widevine.SL3, also "widevine.SL1D"
		// security level(best to worst): Widevine 1,2,3 | EME 5,4,3,2,1
		var secLevel = this.drm.system.indexOf(".SL1")>0 ? "HW_SECURE_ALL"  // best
			: this.drm.system.indexOf(".1")>0            ? "HW_SECURE_ALL"
			: this.drm.system.indexOf(".HW")>0           ? "HW_SECURE_ALL"
			: this.drm.system.indexOf(".SL1D")>0         ? "HW_SECURE_DECODE"
			: this.drm.system.indexOf(".1D")>0           ? "HW_SECURE_DECODE"
			: this.drm.system.indexOf(".SL2")>0          ? "HW_SECURE_CRYPTO"
			: this.drm.system.indexOf(".2")>0            ? "HW_SECURE_CRYPTO" 
			: "SW_SECURE_DECODE";  // worst L1 for video
		console.log("Use widevine security level "+secLevel);			
		self.player.setProtectionData({
			"com.widevine.alpha": {
				"serverURL": laUrl
				, "priority":1
				//, "initDataTypes": [ "cenc" ]
				//, "sessionTypes": [ "temporary" ] // persistent-license, temporary
				//, "persistentState": "required", "distinctiveIdentifier": "required"
				, "persistentState": "optional", "distinctiveIdentifier": "optional"
				, "videoRobustness": secLevel
				, "audioRobustness": "SW_SECURE_CRYPTO" // worst L1 for audio
			}
			,"com.microsoft.playready": { "priority":99 }
		});
	} else {
		var protData={};
		protData[self.drm.system] = { "serverURL": laUrl };
		self.player.setProtectionData(protData);
	}
	
	self.drm.ready = true;
	
	if( callback ){
		callback();
	}
};


VideoPlayerEME.prototype.startVideo = function( isLive ){
	var self = this; // VideoPlayerEME object
	console.log("startVideo(), " + self.currentItem.title);

	// always reset progress bar 
	this.resetProgressBar();	
	this.subtitleTrack = false;
	this.onAdBreak = false;
	this.firstPlay = true;
	
	if( isLive ){
		self.live = true;
	} else {
		self.live = false;
	}
	
	if( !this.subtitles ){
		this.subtitleTrack = false;
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
	
	try{	/*
		self.element.removeClass("hidden");
		self.visible = true;
		
		console.log("video.play()")
		self.video.play();

		self.setFullscreen(true);
		self.displayPlayer(5);
		*/
		
		self.element.removeClass("hidden");
		self.visible = true;
		self.watched.load();
		var position = null; // this.watched.get( self.videoid );
		//console.log("position", position );
		if( !self.live && position ){
			self.video.pause();
			console.log("video paused");
			showDialog("Resume","Do you want to resume video at position " + toTime( position.position ) , ["Yes", "No, Start over"], function( val ){
				if( val == 0 ){
					self.video.play(1);
					console.log("Seek to resume and play")
					self.video.seek( position.position );
					self.setFullscreen(true);
					self.displayPlayer(5);
				} else{
					console.log("video.play()")
					self.video.play(1);
					self.setFullscreen(true);
					self.displayPlayer(5);
				}
			}, 0, 0, "basicInfoDialog");
		}
		else{
			console.log("video.play()")
			self.player.play(); // self.player=dashjsPlayer, self.video.play() =Html5VideoElement
			self.setFullscreen(true);
			self.displayPlayer(5);
		}
	}
	catch(e){
		console.log( e.message );
		console.log( e.description );
	}
};


VideoPlayerEME.prototype.stop = function(){
	var self = this;
	
	self.watched.save();
	
	showInfo("Exit Video", 1);

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

VideoPlayerEME.prototype.play = function(){
	var self = this;
	try{
		self.video.play();
		self.displayPlayer(5);
	}
	catch(e){
		console.log(e);
	}
};

VideoPlayerEME.prototype.clearVideo = function(){
	var self = this;
	self.element.addClass("hidden");
	$("#player").removeClass("show");
	$("#subtitleButton").hide();
	$("#audioButton").hide();
	self.visible = false;
	try{
		if(self.video){
			self.video.pause();
			//self.video.src = ""; // must not clear a field value or dashjs gets an infinite error loop
			self.player.attachSource(null); // source+buffer teardown, keep settings
			$("#video").remove(); // clear from dom
			$("#video-caption").remove();
			self.player.destroy(); // destroy an instance
			this.video = null;
		}
	} catch(e){
		console.log("Error at clearVideo()");
		console.log( e.description );
	}
	
	this.clearAds();	
	this.subtitles = null;
};

VideoPlayerEME.prototype.clearAds = function(){
	var self = this;
	try{
		if( self.adPlayer ){
			$( self.adPlayer[0] ).addClass("hide");
			$( self.adPlayer[1] ).addClass("hide");
			self.adPlayer[0].src = "";
			self.adPlayer[1].src = "";
			
			self.adPlayer = null;
			self.onAdBreak = false;
			self.adBreaks = null;
			self.adBuffer = null;
			self.adCount = 0;
		}
		$( "#ad1" ).remove(); // clear from dom
		$( "#ad2" ).remove(); // clear from dom
		$( "#adInfo" ).remove(); // clear from dom
	} catch(e){
		console.log("Error at clearAds()");
		console.log(e.description);
	}
};

VideoPlayerEME.prototype.isFullscreen = function(){
	var self = this;
	return self.fullscreen;
};

VideoPlayerEME.prototype.isPlaying = function(){
	return ( this.video && !this.video.paused ); // return true/false
};

VideoPlayerEME.prototype.getAudioTracks = function(){
	try {
		var tracks=this.player.getTracksFor("audio");
		return tracks.length;
	} catch(e){
		showInfo( "getComponents not available", e.message );
	}
};

VideoPlayerEME.prototype.getCurrentAudioTrack = function(){
	try {
		var track=this.player.getCurrentTrackFor("audio");
		return track.lang;
	} catch(e){
		return "undefined";
	}
};

