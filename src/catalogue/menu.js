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
	console.log("Menu.populate()");
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
	
	// clear video if previous video is playing
	vplayer.clearVideo();
	
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

			console.log("activated GridViewBox");
			if(self.focus.url && self.focus.url.length > 0){
				if(self.focus.url.isVideoURL()){
					self.startBoxVideoTimeout = setTimeout( function(){
						console.log("start video in GridViewBox box");
						try{
							for(var i = 0; i < vplayer.element.childNodes.length; i++){
								if(vplayer.element.childNodes[i].id == "video" && vplayer.element.childNodes[i].tagName == "OBJECT"){
									vplayer.element.removeChild(vplayer.element.childNodes[i]);
								}
							}
						}
						catch(e){
							console.log(e);
						}
						
						if(vplayer.video == null){
							vplayer.populate();
						}
						
						try{
							vplayer.setURL( self.focus.url );
							if( self.focus.la_url ){
								vplayer.setDRM( "playready", self.focus.la_url );
							}
							else{
								vplayer.setDRM( false );
							}
							//vplayer.video.data = self.focus.url;
						} catch(e){
							console.log("try: " + self.focus.url + " : " + e.message );
						}
						//self.focus.addVideo(vplayer.video, (self.focus.url) );
						var position = $( self.focus.element ).offset();
						$( "#videodiv" ).css( { 
							position: "absolute", 
							left : position.left, 
							top : position.top, 
							width : self.focus.element.offsetWidth + "px", 
							height : self.focus.element.offsetHeight + "px",
							"z-index" : 999
						} );
						//vplayer.video.setAttribute("width", self.focus.element.offsetWidth);
						//vplayer.video.setAttribute("height", self.focus.element.offsetHeight);
						vplayer.setFullscreen(false);
						vplayer.startVideo();
					}, 3000);
				}
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

Menu.prototype.navigate = function(key){
	var self = this;
	if(!animating){

		clearTimeout(self.startBoxVideoTimeout);

		switch(key){

			case VK_ENTER:
				if(self.focus instanceof GridViewBox){
					if( self.focus.eval ){
						eval( self.focus.eval );
					}
					if(self.focus.url && self.focus.url.length > 0){
						console.log(self.focus.url);
						if( self.focus.url.match(/\.mpd$/) ){
							try{
								vplayer.video.data = self.focus.url;
								if( self.focus.la_url ){
									vplayer.setDRM( "playready", self.focus.la_url );
								}
								else{
									vplayer.setDRM( false );
								}
							} catch(e){
								console.log("try: " + self.focus.url + " : " + e.message );
							}
							vplayer.startVideo();
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
			
				console.log("Back pressed");

			break;
		}
	}
}

function getOffset(element){
	var bodyRect = document.body.getBoundingClientRect(),
    elemRect = element.getBoundingClientRect(),
    offset_y   = elemRect.top - bodyRect.top;
    offset_x   = elemRect.left - bodyRect.left;

    return {"x":offset_x, "y":offset_y};
}

String.prototype.isVideoURL = function(){
	var file_extension = this.substring(this.lastIndexOf(".")+1);
	return vplayer.getVideoType(file_extension) != null;
}










