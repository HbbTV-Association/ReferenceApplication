/* GridColumn */

function GridColumn(idx, id, boxes){
	this.idx = idx;
	this.element_id = id;
	this.visible = false;
	this.init(boxes);
}

GridColumn.prototype.init = function(boxes){
	this.boxes = boxes;
	this.populate();
}

GridColumn.prototype.setVisible = function(visible){
	this.visible = visible;
	$(this.element).addClass("visible");
	for(var i = 0; i < this.boxes.length; i++){
		this.boxes[i].setVisible(visible);
	}
}

GridColumn.prototype.populate = function(){
	var self = this;
	self.element = document.getElementById(self.element_id);
	if(self.element == null){
		self.element = document.createElement("div");
		self.element.setAttribute("id", self.element_id);
		self.element.addClass("gridColumn");
		self.element.addClass("columnsize_"+self.size);
	}
	self.element.innerHTML = "";
	for(var i = 0; i < self.boxes.length; i++){
		self.boxes[i].populate();
		self.element.appendChild(self.boxes[i].element);
	}
	if(self.boxes.length > 0)
		self.setVisible(self.boxes[0].visible);
}