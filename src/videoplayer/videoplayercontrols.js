/* VIDEO PLAYER CONTROLS */

function VideoPlayerControls(element_id){
	this.element_id = element_id;
	this.init();
}

VideoPlayerControls.prototype.init = function(){
	this.focusedButton = null;
	this.selectedButton = null;
	this.buttons = [];
	this.populate();
}

VideoPlayerControls.prototype.addButton = function(id, action){
	var button = new VideoPlayerButton(id, action);
	this.buttons.push(button);
	this.playerButtonsContainer.appendChild(button.element);
}

VideoPlayerControls.prototype.populate = function(){
	this.element = document.getElementById(this.element_id);
	if(!this.element){
		this.element = document.createElement("div");
		this.element.setAttribute("id", this.element_id);
	}
	this.element.innerHTML = "";
	this.element.addClass("hidden");

	// Progressbar
	var progressbarBg = document.createElement("div");
		progressbarBg.setAttribute("id", "progressbarBg");
	this.progressbar = document.createElement("div");
	this.progressbar.addClass("progressbar");
	this.progressbar.style.width = "0px";

	var playPosition = document.createElement("div");
		playPosition.setAttribute("id", "playPosition");
	var playTime = document.createElement("div");
		playTime.setAttribute("id", "playTime");

	progressbarBg.appendChild(this.progressbar);

	// Button container
	var playerButtonsContainer = document.createElement("div");
	playerButtonsContainer.setAttribute("id", "playerButtonsContainer");
	this.playerButtonsContainer = playerButtonsContainer;

	this.element.appendChild(progressbarBg);
	this.element.appendChild(playPosition);
	this.element.appendChild(playTime);
	this.element.appendChild(playerButtonsContainer);

	if(this.buttons.length > 0){
		this.buttons[0].setFocus();
	}
}

VideoPlayerControls.prototype.navigate = function(key){
	var self = this;
	try{
		switch(key){
			case VK_LEFT:
				var idx = self.buttons.indexOf(self.focusedButton);
				if(idx > 0){
					self.setFocus(self.buttons[idx-1]);
				}
			break;

			case VK_RIGHT:
				var idx = self.buttons.indexOf(self.focusedButton);
				if(idx < self.buttons.length-1){
					self.setFocus(self.buttons[idx+1]);
				}
			break;

			case VK_ENTER:
				this.focusedButton.navigate(key);
			break;
		}
	} catch(e){
		console.log( e.message );
	}
}

VideoPlayerControls.prototype.setFocus = function(button){
	if(this.focusedButton != null){
		this.focusedButton.unFocus();
	}
	button.setFocus();
	this.focusedButton = button;
}

VideoPlayerControls.prototype.hide = function(){
	this.element.addClass("hidden");
}

VideoPlayerControls.prototype.show = function(){
	var self = this;
	self.element.removeClass("hidden");
	if(self.focusedButton == null){
		self.setFocus(self.buttons[0]);
	}
}

function VideoPlayerButton(element_id, action){
	this.element_id = element_id;
	this.action = action;
	this.init();
}

VideoPlayerButton.prototype.init = function(){
	this.populate();
}

VideoPlayerButton.prototype.populate = function(){
	this.element = document.createElement("div");
	this.element.addClass("playerbtn");
	this.element.setAttribute("id", this.element_id);
}

VideoPlayerButton.prototype.navigate = function(key){
	var self = this;
	switch(key){
		case VK_ENTER:
			if(typeof(self.action) == "function"){
				try{
					self.action();
				}
				catch(e){
					console.log(e);
				}
			}
		break;
	}
}

VideoPlayerButton.prototype.setFocus = function(){
	this.element.addClass("focused");
}
VideoPlayerButton.prototype.unFocus = function(){
	this.element.removeClass("focused");
}