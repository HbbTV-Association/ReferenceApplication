/***
	HTML5 <video> player impelmentation for HbbTV
***/


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
			+'</div>');
		console.log("Add player component");
	}

	try{
		this.video = $("<video id='video' data-dashjs-player></video>")[0];
		this.element.appendChild( this.video );
		this.player = dashjs.MediaPlayer().create();
		console.log( "video object created ", this.player );
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
	
	var canplay = false;
	player.addEventListener('canplay', function(){
		canplay = true;
		console.log("canplay");
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
		}
		
		// if preroll is not found, move on to content video
		if( !playPreroll ){
			player.play();
		}
		
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
	
	player.textTracks.addEventListener('addtrack', function(evt){
		
		// set up inband cue events listeners for new tracks
		var track = evt.track;
		console.log("at addtrack nth track: " + this.length + " : set up cuechange listeners", track);
		
		// show subtitle button label if there is a track that is not metadata 
		if( track.kind != "metadata" ){
			$("#subtitleButton").show();
		}
		
		// the first track is set showing
		if( this.length == 1 ){
			track.mode = "showing";
			self.subtitleTrack = 0;
			console.log("set showing track ", track.language, track.label);
			$("#subtitleButtonText").html("Subtitles: " + track.language );
		}
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
							var cueValue = arrayBufferToString( cue.data );
							console.log( "cues["+c+"].data ("+ cue.data.constructor.name+") = " + cueValue ); 
							console.log( "startTime : " + cue.startTime + ", endTime : " + cue.endTime );
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
			}
		};
		console.log( "oncuechange function set" );
	} );
	
	player.addEventListener('playing', function(){
		if( self.firstPlay ){
			self.firstPlay = false;
		}
		Monitor.videoPlaying();
		self.setLoading(false);
		$("#ppauseplay").removeClass("play").addClass("pause");
	} );
	
	
	player.addEventListener('timeupdate', function(){
		self.updateProgressBar();
		self.checkAds();
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
	console.log("setURL(",url,")");
	console.log("player.attachSource(url)");
	this.player.attachSource(url);
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
			self.video.play();
			$(self.video).removeClass("hide"); // show content video
		}
		
	};
	
	var onAdPlay = function(){};
	
	var onAdProgress = function(e){};
	
	var onAdTimeupdate = function(){
		var timeLeft = Math.floor( this.duration - this.currentTime )
		if( timeLeft != NaN ){
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

VideoPlayerEME.prototype.getAds = function( adBreak ){
	this.onAdBreak = true; // disable seeking
	this.adCount = 0;
	this.video.pause();
	var self = this;
	console.log("get ads breaks=" + adBreak.ads);
	$.get( "../getAds.php?breaks=" + adBreak.ads, function(ads){
		self.adBuffer = ads;
		console.log( "Got " + ads.length + " ads");
		
		self.prepareAdPlayers();
		
		self.playAds();
		
	}, "json" );
};

VideoPlayerEME.prototype.playAds = function(){
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

VideoPlayerEME.prototype.setAdBreaks = function( breaks ){
	if( !breaks){
		this.adBreaks = null;
	}
	else{
		console.log("setAdBreaks(", breaks ,")");
		this.adBreaks = $.extend(true, {}, breaks);
	}
};

VideoPlayerEME.prototype.getVideoType = function(file_extension){
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

VideoPlayerEME.prototype.sendLicenseRequest = function(callback){
	console.log("sendLicenseRequest()");
	
	/***
		Create DRM object and container for it
	***/

	this.drm.successCallback = callback;
	var self = this;
	
	// Case Playready
	if( this.drm.system == "playready" ){
		self.player.setProtectionData({
			"com.microsoft.playready": { "serverURL": self.drm.la_url }
		});
	}
	else if( this.drm.system == "marlin" ){
		// Not supported
	}
	else if( this.drm.system == "clearkey" ){
		self.player.setProtectionData({
			"org.w3.clearkey": { 
				"serverURL" : "https://mhp.sofiadigital.fi/tvportal/referenceapp/videos/laurl_ck.php",
				/* "clearkeys": { "EjQSNBI0EjQSNBI0EjQSNA" : "QyFWeBI0EjQSNBI0EjQSNA" } */
			}
		});
	}
	
	self.drm.ready = true;
	
	if( callback ){
		callback();
	}
};


VideoPlayerEME.prototype.startVideo = function(fullscreen){
	console.log("startVideo()");
	
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
	
	try{	
		self.element.removeClass("hidden");
		self.visible = true;
		
		console.log("video.play()")
		self.video.play();
		if(fullscreen){
			self.setFullscreen(fullscreen);
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

VideoPlayerEME.prototype.rewind = function( sec ){
	var self = this;
	try{
		sec = sec || -30;
		if( sec > 0 ){
			sec = -sec;
		}
		//sec = Math.max(self.video.currentTime+sec, 0);
		console.log("rewind video "+ sec +"s");
		Monitor.videoSeek(sec);
		self.video.seek(sec);
		$("#prew").addClass("activated");
		clearTimeout( this.seekActiveTimer );
		this.seekActiveTimer = setTimeout( function(){
			$("#prew").removeClass("activated");
		}, 700);
	}
	catch(e){
		console.log(e.message);
		console.log(e.description);
	}
};

VideoPlayerEME.prototype.forward = function( sec ){
	var self = this;
	try{
		sec = sec || 30;
		
		if( self.video.duration > self.video.currentTime + sec ){
			Monitor.videoSeek(sec);
			self.video.seek(sec);
			console.log("forward video "+sec+"s");
			self.displayPlayer(5);
			$("#pff").addClass("activated");
			clearTimeout( this.seekActiveTimer );
			this.seekActiveTimer = setTimeout( function(){
				$("#pff").removeClass("activated");
			}, 700);
		}
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
	self.visible = false;
	try{
		if(self.video){
			self.video.pause();
			self.video.src = "";
			$( "#video" ).remove(); // clear from dom
			this.video = null;
		}
	}
	catch(e){
		console.log("Error at clearVideo()");
		console.log( e.description );
	}
	
	this.clearAds();
	
	this.subtitles = null;
};

VideoPlayerEME.prototype.clearAds = function(){
	try{
		if( self.adPlayer ){
			self.adPlayer[0].stop();
			self.adPlayer[1].stop();
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
	}
	catch(e){
		console.log("Error at clearVideo()");
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

