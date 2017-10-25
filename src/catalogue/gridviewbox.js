function GridViewBox(data){
	this.init(data);
}
GridViewBox.prototype.init = function(data){
	for(var key in data){
		this[key] = data[key];
	}
}

GridViewBox.prototype.populate = function(){
	var self = this;
	self.element = document.createElement("div");
	self.element.addClass("gridViewBox");
	self.element.addClass(self.imageSizeClass.class);
	if(self.focused){ self.element.addClass("focused"); }
	if(self.visible){ self.element.addClass("visible"); }
	if(self.disabled){ 
		$(self.element).append("<div class='disabled "+self.imageSizeClass.class+"'>Not Supported</div>");
	}
	if(self.img && self.img.length > 0){
		var img = new Image();
		img.onload = function(){
			var imgtag = document.createElement("img");
			imgtag.src = self.img;
			imgtag.alt = "";
			self.element.appendChild(imgtag);
		}(img.src);
		
		if( !self.img.match(/^http/) ){
			self.img = location.href.substring(0, location.href.lastIndexOf("/")) + "/" + self.img;
		}
		img.src = self.img;
	}
	self.element.innerHTML += "<span>"+self.title+"</span>";

	if(self.video){
		self.element.appendChild(self.video);
	}
}

GridViewBox.prototype.setFocus = function(){
	this.focused = true;
	this.element.addClass("focused");
	$("#itemDescription").html( this.desc );
}
GridViewBox.prototype.unsetFocus = function(){
	this.focused = false;
	this.element.removeClass("focused");
	$("#itemDescription").html("");
}

GridViewBox.prototype.setVisible = function(visible){
	this.visible = visible;
	if(this.element){
		if(this.visible){
			this.element.addClass("visible");
		}
		else{
			this.element.removeClass("visible");
		}
	}
}

GridViewBox.prototype.addVideo = function(video){
	var self = this;
	self.video = video;
}