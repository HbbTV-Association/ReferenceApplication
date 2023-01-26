function Menu(element_id, config){
	this.init(element_id, config);
}

Menu.prototype.init = function(element_id, config){
	
	var self = this;
	self.focus = null;
	self.element = document.getElementById(element_id);
	if(self.element == null){
		var element = document.createElement("div");
		element.id = element_id;
		self.element = element;
	}
	self.element.innerHTML = "";
	self.gridSpacing = 160;
	self.gridScrollView = new GridScrollView("gridScrollView", config);
	self.topmenu = new TopMenu("topMenu", self.gridScrollView.grids);

	// Timeouts
	self.startBoxVideoTimeout = null;

	self.setActiveItem(self.topmenu.items[0]);
	self.populate();
}

Menu.prototype.populate = function(){
	var self = this;
	self.element.innerHTML = "";
	self.topmenu.populate();
	self.gridScrollView.populate();
	self.element.appendChild(self.topmenu.element);
	self.element.appendChild(self.gridScrollView.element);

	if(self.topmenu.items.length > 0){
		var left = -(-640+self.topmenu.items[0].element.offsetLeft+(self.topmenu.items[0].element.offsetWidth/2));
		self.topmenu.scrollLeftTo(left, false);
	}
}

Menu.prototype.setActiveItem = function(item){
	var self = this;
	clearTimeout(self.startBoxVideoTimeout);
	
	if(item != null && typeof(item.setFocus) == "function"){
		var old = self.focus;
		if(self.focus && typeof(self.focus.unsetFocus) == "function"){
			self.focus.unsetFocus();
		}
		item.setFocus();
		self.focus = item;
		if(item instanceof TopMenuItem){
			var left = -(-640+self.focus.element.offsetLeft+(self.focus.element.offsetWidth/2));
			self.topmenu.scrollLeftTo(left);
			if(self.gridScrollView.grids[self.focus.idx].element){
				self.gridScrollView.grids[self.focus.idx].element.removeClass("zoom_in");
			}
			self.setActiveGrid(self.gridScrollView.grids[self.focus.idx]);
		}
		else if(item instanceof GridViewBox){
			if(self.getActiveGrid().idx != item.gridIdx){
				self.setActiveGrid(self.gridScrollView.grids[item.gridIdx]);
			}
			if(self.getActiveGrid().isBig()){
				var left = -Number(self.gridScrollView.getBoxLeft(item) + (item.element.offsetWidth/2) - 640);
				self.gridScrollView.scrollLeftTo(left);
			}
			
		}
		return true;
	}
	return false;
}


Menu.prototype.getActiveGrid = function(){
	var self = this;
	return self.gridScrollView.getActiveGrid();
}

Menu.prototype.setActiveGrid = function(grid){
	var self = this;
	selectElement(self.topmenu.items[grid.idx].element, "topmenuitem");
	var left = -(-640+self.topmenu.items[grid.idx].element.offsetLeft+(self.topmenu.items[grid.idx].element.offsetWidth/2));
	self.topmenu.scrollLeftTo(left);
	self.gridScrollView.setActiveGrid(grid);
	for(var i = 0; i < grid.columns.length; i++){
		if(i < 5){
			grid.columns[i].setVisible(true);
		}
		else{
			grid.columns[i].setVisible(false);
		}
	}
}

Menu.prototype.navigate = function(key, force){
	var self = this;
	if(!animating || force){

		clearTimeout(self.startBoxVideoTimeout);

		switch(key){

			case VK_ENTER:
				if(self.focus instanceof GridViewBox){
					if( self.focus.eval ){
						eval( self.focus.eval );
					}
					else if(self.focus.url && self.focus.url.length > 0){
						if( self.focus.url.match(/\.mpd$/) || self.focus.url.match(/\.mp4$/) || self.focus.app == 6 ){
							// if video has not autostarted, start it
							if( !vplayer.isPlaying() ){
								console.log("init player session");
								Monitor.initSession( self.focus.url, 6, profile.video, function(){
									Monitor.videoStart();
									self.prepareVideoStart();
									vplayer.startVideo( self.focus.live == true );
								}); 
							}
							// change to fullscreen mode
							vplayer.setFullscreen(true);
						}
						else{
							window.location.href = self.focus.url;
						}
					}
				}
			break;

			case VK_LEFT:
				if(self.focus instanceof TopMenuItem){
					if(self.focus.idx > 0){
						var oldGrid = self.gridScrollView.grids[self.focus.idx];
						var newGrid = self.gridScrollView.grids[self.focus.idx-1];
						self.setActiveItem(self.topmenu.items[self.focus.idx-1]);
						if(newGrid.isBig()){							
							var box = newGrid.columns[0].boxes[0];
							var left = -Number(self.gridScrollView.getBoxLeft(box) + (box.element.offsetWidth/2) - 640);
							self.gridScrollView.scrollLeftTo(left);
						}
						else{
							self.gridScrollView.scrollLeftTo(-Number(newGrid.left + (newGrid.calculateWidth()/2) - 640), true);
						}
					}
				}
				else if(self.focus instanceof GridViewBox){
					var direction = "left";
					// Change of a grid
					if(!self.setActiveItem(getClosest(self.focus, self.gridScrollView.activeGrid.getBoxes(), direction))){
						var oldGrid = self.gridScrollView.activeGrid;
						if(self.gridScrollView.activeGrid.idx > 0){
							var newGrid = self.gridScrollView.grids[self.gridScrollView.activeGrid.idx-1];
							var closest = getClosest(self.focus, newGrid.getBoxes(), direction);
							if(!newGrid.isBig()){
								var left = -Number(newGrid.left + (newGrid.calculateWidth()/2) - 640);
								self.gridScrollView.scrollLeftTo(left, true);
							}
							self.setActiveItem(closest);
						}
					}
					// Same grid
					else if(self.gridScrollView.activeGrid.isBig()){
						var left = -Number(self.gridScrollView.getBoxLeft(self.focus) + (self.focus.element.offsetWidth/2) - 640);
						self.gridScrollView.scrollLeftTo(left, true);
					}					
				}
			break;

			case VK_RIGHT:
				if(self.focus instanceof TopMenuItem){
					if(self.focus.idx < self.topmenu.items.length-1){
						var oldGrid = self.gridScrollView.grids[self.focus.idx];
						var newGrid = self.gridScrollView.grids[self.focus.idx+1];
						self.setActiveItem(self.topmenu.items[self.focus.idx+1]);
						if(self.focus instanceof TopMenuItem){
							if(newGrid.isBig()){	
								var left = -Number(self.gridScrollView.getBoxLeft(newGrid.columns[0].boxes[0]) + (newGrid.columns[0].boxes[0].element.offsetWidth/2) - 640);
								self.gridScrollView.scrollLeftTo(left);
								//self.gridScrollView.scrollLeftTo(-Number(newGrid.left-63));
							}
							else{
								self.gridScrollView.scrollLeftTo(-Number(newGrid.left+ (newGrid.calculateWidth()/2) - 640), true);
							}
						}
					}
				}
				else if(self.focus instanceof GridViewBox){
					var direction = "right";
					if(!self.setActiveItem(getClosest(self.focus, self.gridScrollView.activeGrid.getBoxes(), direction))){
						var oldGrid = self.gridScrollView.activeGrid;
						if(self.gridScrollView.activeGrid.idx < self.gridScrollView.grids.length-1){
							var newGrid = self.gridScrollView.grids[self.gridScrollView.activeGrid.idx+1];
							var closest = getClosest(self.focus, newGrid.getBoxes(), direction);
							if(!newGrid.isBig()){
								self.gridScrollView.scrollLeftTo(-Number(newGrid.left+(newGrid.calculateWidth()/2) - 640), true);
							}
							self.setActiveItem(closest);
						}
					}
					else if(self.gridScrollView.activeGrid.isBig()){
						var left = -Number(self.gridScrollView.getBoxLeft(self.focus) + (self.focus.element.offsetWidth/2) - 640);
						self.gridScrollView.scrollLeftTo(left, true);
					}
				}
			break;

			case VK_DOWN:
				if(self.focus instanceof TopMenuItem){
					self.setActiveItem(self.gridScrollView.activeGrid.getBoxes()[0]);
				}
				else if(self.focus instanceof GridViewBox){
					self.setActiveItem(getClosest(self.focus, self.gridScrollView.activeGrid.getBoxes(), "down"));
				}

			break;

			case VK_UP:
				if(self.focus instanceof GridViewBox){
					if(!self.setActiveItem(getClosest(self.focus, self.gridScrollView.activeGrid.getBoxes(), "up"))){
						self.setActiveItem(self.topmenu.items[self.gridScrollView.activeGrid.idx]);
					}
				}
			break;
			
			case VK_BACK:
			break;
		}
	}
}

Menu.prototype.savePosition = function(){
	var topIndex = $(this.topmenu.element).find(".selected").index();
	var gridColIndex = $(menu.focus.element.parentElement).index();
	var gridRowIndex = $(menu.focus.element).index();
	sessionStorage.setItem( "refappPosition", JSON.stringify( [topIndex, gridColIndex, gridRowIndex] ) );
};

function getOffset(element){
	var bodyRect = document.body.getBoundingClientRect(),
    elemRect = element.getBoundingClientRect(),
    offset_y   = elemRect.top - bodyRect.top;
    offset_x   = elemRect.left - bodyRect.left;

    return {"x":offset_x, "y":offset_y};
}

Menu.prototype.prepareVideoStart = function(){
	var self = this;
	if( vplayer.video == null ){
		vplayer.createPlayer();
	}
	
	try{		
		// if marlin videos are formatted as tokenURL#media, extract them to fit for player interface
		/* This is for now commented out. If marlin url is formatted marlin.drm#dash.mpd use the url straight and not separate them as playurl and lisence url for drm agent
		if( self.focus.drm == "marlin" && self.focus.url.match(/\#/) ){
			var parts = url.split("#");
			self.focus.la_url = parts[0];
			self.focus.url = parts.parts[1];
		}
		*/
		
		vplayer.currentItem = self.focus;
		
		if( self.focus.adBreaks ){
			vplayer.setAdBreaks( self.focus.adBreaks );
		}
		else{
			vplayer.setAdBreaks( null ); // no ads
		}
		
		// set out-of-band subtitles
		if( self.focus.subtitles ){
			vplayer.setSubtitles( self.focus.subtitles );
		}
		
		if( profile.version == "mse-eme" ){
			if( self.focus.la_url ){
				vplayer.setDRM( self.focus.drm, self.focus.la_url );
				vplayer.sendLicenseRequest();
			}
			else{
				vplayer.setDRM( false );
			}
			//vplayer.player.initialize( vplayer.video, null, false);
			vplayer.setURL( self.focus.url );
		}
		else{
			vplayer.setURL( self.focus.url );
			if( self.focus.la_url ){
				vplayer.setDRM( self.focus.drm, self.focus.la_url );
			}
			else{
				vplayer.setDRM( false );
			}
		}
		//vplayer.video.data = self.focus.url;
	} catch(e){
		console.log("try: " + self.focus.url + " : " + e.message );
	}
}
