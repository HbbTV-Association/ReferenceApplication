function TopMenuItem(data){
	this.element = document.createElement("div");
	this.element.addClass("topmenuitem");
	this.element.innerHTML = data.title;
}
TopMenuItem.prototype.setFocus = function(){
	this.element.addClass("focused");
}
TopMenuItem.prototype.unsetFocus = function(){
	this.element.removeClass("focused");
}