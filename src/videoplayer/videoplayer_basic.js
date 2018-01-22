/**
 * Videoplayer common superclass impelmentation for all inherited versions. Common interface that can be extended and specified
 * 
 * 
 *
 * @class VideoPlayerBasic
 * @constructor
 */
function VideoPlayerBasic(element_id, profile, width, height){
	console.log("VideoPlayerBasic - Constructor");
	this.FILETYPES = {
		MP4:0,
		MPEG:1,
		DASH:2
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
	this.timeInMilliseconds = false;

	// Timers and intervals
	this.progressUpdateInterval = null;
	this.hidePlayerTimer = null;
	this.seekTimer = null;
	this.seekValue = 0;
	
	
	/**
	 * Creates player component and sets up event listeners
	 * Basic version is left empty and inherited players must define this method for all different players creation
	 * @method createPlayer
	**/
	this.createPlayer = this.__proto__.createPlayer;
	
	/**
	 * Basic video player populate method to initialize player html elements ready for setting up
	 * @method populate
	**/
	this.populate = function(){
		console.log("VideoPlayerBasic - populate");
		this.element.innerHTML = "";
		this.video = null;
		this.loadingImage = document.createElement("div");
		this.loadingImage.setAttribute("id", "loadingImage");
		this.loadingImage.addClass("hidden");
		this.element.appendChild(this.loadingImage);
		this.setFullscreen(true);
	};
	
	 	
	 	

	/**
	 * Displays player over video. Player shows current play position, duration and buttons that can be used
	 * @param {Int} sec. seconds player is displayed on screen and hidden after. If sec is not defined player remains on screen and is not hidden.
	 * @method displayPlayer
	 */
	this.displayPlayer = function( sec ){
		console.log("VideoPlayerBasic - displayPlayer");
		clearTimeout( this.hidePlayerTimer );
		$("#player").removeClass("hide");
		$("#player").addClass("show");
		if(sec){
			this.hidePlayerTimer = setTimeout( function(){
				$("#player").removeClass("show");
			}, sec * 1000);
		}
	};
	
	/**
	 * Handles navigation during video playback. This super class method may be re-defined on inherited class
	 * @param {Int} key. keycode of pressed key. Keycodes are defined in keycodes.js file
	 * @method navigate
	 */
	/* Use inherited basic method or player specified */
	this.navigate = this.__proto__.navigate || function(key){
		var self = this;
		
		if( self.onAdBreak ){
			console.log("Navigation on ad break");
		}
		
		switch(key){
			case VK_UP:
				self.displayPlayer(5);
			break;

			case VK_DOWN:
				self.displayPlayer(5);
			break;

			case VK_BACK:
			case VK_STOP:
			case 8: // for edge backspace button
				self.stop();
			break;

			case VK_LEFT:
			case VK_REWIND:
				if( !self.onAdBreak ){
					self.seek( -30 );
					self.displayPlayer(5);
				}
				break;
			case VK_RIGHT:
			case VK_FAST_FWD:
				if( !self.onAdBreak ){
					self.seek( 30 );
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
						//var tracks = this.video.textTracks.length;
						
						// count all tracks except metadata
						var tracks = 0;
						for( var i = 0; i < this.video.textTracks.length; ++i ){
							if( this.video.textTracks[i].kind != "metadata" ){
								tracks++;
								this.video.textTracks[i].mode = 'hidden'; // hide all
							}
						}
						
						console.log("text tracks " + tracks );
						if( !tracks ){
							showInfo("No Subtitles Available");
							break;
						}
						
						if( this.subtitleTrack === false )
						{
							this.subtitleTrack = 0;
						}
						console.log("Current track index " + this.subtitleTrack);
						if( this.subtitleTrack >= tracks ){
							this.subtitleTrack = 0; // was off, select first
						}
						else{
							//this.video.textTracks[ this.subtitleTrack ].mode = 'hidden'; // hide current
							this.subtitleTrack++;
						}
						
						var lang = (this.subtitleTrack >= tracks? "off" : this.video.textTracks[ this.subtitleTrack ].language );
						
						$("#subtitleButtonText").html( "Subtitles: " + lang );
						showInfo("Subtitles: " + lang);
						
						if( lang != "off" ){
							console.log("Set textTrack["+ this.subtitleTrack +"] Showing: " + lang);
							this.video.textTracks[ this.subtitleTrack ].mode = 'showing';
						}
					}
					else if( typeof this.enableSubtitles  == "function" ){
						this.enableSubtitles(true);
					}
				} catch( e ){
					console.log( e.description );
				}
			break;
			default:
			break;
		}
	};
	
	/**
	 * 
	 * @param {HTML Element} container. Container for video display. Video will be set inside the container 
	 * @method setDisplay
	 */
	this.setDisplay = function( container ){
		/*
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
		*/
	};
	
	
	/**
	 * 
	 * @param {Object} subtitles. Creates HTML track objects for Out-Of-Band subtitle files
	 * @method setSubtitles
	 */
	this.setSubtitles = this.__proto__.setSubtitles || function( subtitles ){
		// out-of-band subtitles must be an array containing containing language code and source.xml file url.
		var self = this;
		try{
			var player = this.video;
			
			console.log("set subs from active assets metadata 'subtitles'");
			this.subtitles = subtitles;
			
			console.log( JSON.stringify( this.subtitles ) );
			
			if( this.subtitles && this.subtitles.length ){
				
				$.each( this.subtitles, function(i, lang){
					//console.log( lang );
					console.log("Subtitles " + i + ": " + lang.code + " - " + lang.src);
									
					var track = document.createElement("track");
					track.kind = "subtitles";
					track.label = lang.code;
					track.language = lang.code;
					track.srclang = lang.code;
					track.src = lang.src;
					track.onerror = function(e){
						self.lastError = e;
						console.log(e);
						showInfo("Error getting subtitle file");
					};
					
					player.appendChild(track);
					
				} );
				$("#subtitleButton").show();
				$("#subtitleButtonText").html( "Subtitles: " + player.textTracks[0].label );
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
			console.log("Error: setSubtitles: " + e.description );
		}
	};
	/**
	 * 
	 * Pause video playback and display player on screen
	 * @method pause
	 */
	this.pause = this.__proto__.pause || function(){
		console.log("VideoPlayerBasic pause");
		var self = this;
		try{
			self.video.pause();
			self.displayPlayer();
		}
		catch(e){
			console.log(e);
		}
	};
	
	/**
	 * 
	 * @param {bool} loading. Sets player's loading indicator visible if true, and hides if false
	 * @param {String} reason. logs reason for loading if specified
	 * @method setLoading
	 */
	this.setLoading = function(loading, reason){
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
	};
	
	/**
	 * 
	 * @param {bool} fs. Set video fullscreen if true, and to the active asset box if false
	 * @method setFullscreen
	 */
	this.setFullscreen = function(fs){
		
		this.fullscreen = fs;
		if(fs){
			this.element.addClass("fullscreen");
			//this.setDisplay( $("body")[0] ); // sets video player object to child of body
		}
		else{
			this.element.removeClass("fullscreen");
			//this.setDisplay( menu.focus.element ); // sets video player object to child of focused tile element
			$("#player").removeClass("show");
		}
	};
	
	/**
	 * 
	 * returns true if player is visible
	 * @method isVisible
	 */
	this.isVisible = function(fs){
		return this.visible;
	};
	
	/**
	 * 
	 * Updates progress bar. Progress bar is only visible when player UI is displayed, but it is always updated non-visible when this method is called
	 * @method updateProgressBar
	 */
	this.updateProgressBar = function( sec ){
		var position = 0;
		var duration = 0;
		var pbMaxWidth = 895; // progress bar maximum width in pixels
		
		// first try get time out of player and decide which player is used
		try{
			
			if( this.live ){
				duration = 100;
				position = 100;
			}
			else{
				// <video> object used
				if( this.video.duration ){
					position = (sec ? sec + this.video.currentTime : this.video.currentTime);
					duration = this.video.duration;
				}
				// oipf player object used. Convert milliseconds to seconds
				else if( this.video.playTime ){
					position = (sec? this.video.playPosition / 1000 + sec : this.video.playPosition / 1000);
					duration = this.video.playTime / 1000;
				}
				else{
					console.log("Videoplayer not ready. Can not get position or duration");
					return;
				}
			}
		} catch(e){
			console.log( e.message );
		}
		
		try{
			var self = this;

			pbar = document.getElementById("progressbar");

			var barWidth = Math.floor((position / duration) * pbMaxWidth );
			if(barWidth > pbMaxWidth){
				barWidth = pbMaxWidth;
			}
			else if( barWidth < 0 ){
				barWidth = 0;
			}
			
			pbar.style.width = barWidth + "px";
			
			var play_position = barWidth;
			
			console.log(  play_position, position, duration );
			
			$("#playposition").css("left", play_position);
			$("#progress_currentTime").css("left", play_position);


			
			$("#playposition").html("");
			if(position){
				var pp_hours = Math.floor(position / 60 / 60);
				var pp_minutes = Math.floor((position-(pp_hours*60*60)) / 60);
				var pp_seconds = Math.round((position-(pp_hours*60*60)-(pp_minutes*60)));
				$("#playposition").html( addZeroPrefix(pp_hours) + ":" + addZeroPrefix(pp_minutes) + ":" + addZeroPrefix(pp_seconds) );
			}

			document.getElementById("playtime").innerHTML = "";
			if(duration){
				if( duration == Infinity || self.live ){
					document.getElementById("playtime").innerHTML = "LIVE";
				}
				else{
					var pt_hours = Math.floor(duration / 60 / 60);
					var pt_minutes = Math.floor((duration-(pt_hours*60*60))  / 60);
					var pt_seconds = Math.round((duration-(pt_hours*60*60)-(pt_minutes*60)) );
					document.getElementById("playtime").innerHTML = addZeroPrefix(pt_hours) + ":" + addZeroPrefix(pt_minutes) + ":" + addZeroPrefix(pt_seconds);
				}
			}
		} catch(e){
			console.log( e.message );
		}

	};
	
	/**
	 * 
	 * @param {String} system. Specifies DRM system to be used as a string value (for example playeready or marlin)
	 * @param {String} la_url. DRM lisence url
	 * @method setDRM
	 */
	this.setDRM = function( system, la_url){
		if( !system ){
			this.drm = null;
		}
		else{
			console.log("setDRM("+ system +", "+la_url+")");
			this.drm = { la_url : la_url, system : system, ready : false, error : null};
		}
	};
	
	/**
	 * 
	 * @param {Object} breaks. Sets ad break positions, and ad amount to be requested as a list of objects with needed attributes
	 * @method setAdBreaks
	 */
	this.setAdBreaks = function( breaks ){
		if( !breaks){
			this.adBreaks = null;
		}
		else{
			console.log("setAdBreaks(", breaks ,")");
			this.adBreaks = $.extend(true, {}, breaks);
		}
	};
	
	
	/**
	 * Return players playback position and duration as an object with duration and position value.
	 * Times are represented in seconds for all players
	 * @method time
	 * @returns (Object) { duration : \d+, position : \d+ }
	 */
	this.time = function(){
		try{
			
			if( this.timeInMilliseconds && this.video.playTime ){
				return { duration : this.video.playTime/1000, position : this.video.playPosition/1000 };
			}
			else if( this.video.duration ){
				return { duration : this.video.duration, position : this.video.currentTime };
			}
			else{
				console.log("timedata not available")
				return { duration : 0, position : 0 };
			}
			
		} catch(e){
			console.log("error getting playback position and duration");
			return { duration : 0, position : 0 };
		}
		
	}
	
	/**
	 * Perform seek operation. To be called when user presses seek button. 
	 * Timeout is set to wait for continious seek operations before actual seeking
	 * If this is called multiple times the value to be seeked is added up.
	 * After delay of 700ms the seek is performed
	 * @method seek
	 * @param (Int) sec: How many seconds is seeked. Positiove integer for forward, negative for rewind.
	 */
	this.seek = function( sec ){
		var self = this;
		try{
			
			console.log( this.time(), this.seekValue, sec );
			// if seek value goes below zero seconds, do immediate seek
			if( this.time().position + (this.seekValue + sec) < 0 ){
				console.log( "seek below starting position. go to start" );
				clearTimeout( this.seekTimer );
				this.updateProgressBar( -this.time().position );
				self.video.seek( -( self.timeInMilliseconds? this.time().position * 1000 : this.time().position ) );
				self.seekValue = 0;
				clearTimeout( this.seekTimer );
				self.seekTimer = null;
				
				
				return;
			}
			
			// if seek value goes above playtime, do not add seek seconds
			if( this.time().position + (this.seekValue + sec) > this.time().duration ){
				return;
			}
			
			this.seekValue += sec;
			
			console.log("seek video "+ this.seekValue +"s");
			this.updateProgressBar( self.seekValue );
			clearTimeout( this.seekTimer );
			
			this.seekTimer = setTimeout( function(){
				console.log("perform seek now!");
				self.seekTimer = null;
				try{
					var toSeek = (self.timeInMilliseconds? self.seekValue * 1000 : self.seekValue);
					self.video.seek( toSeek );
					Monitor.videoSeek( self.seekValue );
					console.log("seek completed to " + toSeek);
					
					
				} catch(e){
					console.log("seek failed: " + e.description);
				}
				
				self.seekValue = 0;
			}, 700);
			
			var buttonActivated = ( sec < 0? "prew" : "pff" );
			$("#prew, #pff" ).removeClass("activated");
			$("#" + buttonActivated ).addClass("activated");
			clearTimeout( this.seekActiveTimer );
			this.seekActiveTimer = setTimeout( function(){
				$("#prew, #pff" ).removeClass("activated");
			}, 700);
		}
		catch(e){
			console.log(e.message);
			console.log(e.description);
		}
	};
}











