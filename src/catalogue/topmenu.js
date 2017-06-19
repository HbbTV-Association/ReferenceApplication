/* TOPMENU */

function TopMenu(element_id, items){
	this.element_id = element_id;
	this.init(items);
}
TopMenu.prototype.init = function(items){
	this.items = [];
	for(var i = 0; i < items.length; i++){
		var topmenuitem = new TopMenuItem(items[i]);
		topmenuitem.idx = i;
		this.items.push(topmenuitem);
	}
	this.populate();
}
TopMenu.prototype.populate = function(){
	this.element = document.createElement("div");
	this.element.setAttribute("id", this.element_id);
	for(var i = 0; i < this.items.length; i++){
		this.element.appendChild(this.items[i].element);
	}
}
TopMenu.prototype.scrollLeftTo = function(left, animate){
	animating = true;
	this.element.style.left = left + "px";
	var duration = (animate) ? 350 : 0;
	setTimeout(function(){
		animating = false;
	},duration);
}