
function GridScrollView(element_id, items){
	this.element_id = element_id;
	this.activeGrid = null;
	this.grids = [];
	this.visibleGrids = [];
	this.init(items);
}
GridScrollView.prototype.init = function(items){
	var self = this;
	self.grids = [];
	self.left = 0;
	var left = 0;
	var right = 0;
	for(var i = 0; i < items.length; i++){
		if(items[i].items.length > 0){
			var gridView = new GridView(i, items[i]);
			if(i == 0){
				left = 640 - (gridView.calculateWidth() / 2);
				right = left + gridView.calculateWidth();
			}
			else{
				left = right + 160;
				right = left + gridView.calculateWidth();
			}
			gridView.idx = i;
			gridView.left = left;
			gridView.right = right;
			self.grids.push(gridView);
		}
	}
	self.activeGrid = self.grids[0];
	self.populate();
}
GridScrollView.prototype.populate = function(){
	var self = this;
	self.element = document.getElementById(self.element_id);
	if(self.element == null){
		var element = document.createElement("div");
		element.id = self.element_id;
		self.element = element;
		self.element.style.left = "0px";
	}
	self.element.innerHTML = "";
	
	var first = null;
	var last = null;
	for(var i = 0; i < self.grids.length; i++){
		if(self.grids[i].right > Math.abs(self.left) && self.grids[i].left < Math.abs(self.left)+1280){
			if(first == null){ first = i; }
			last = i;
			self.grids[i].populate();
			self.element.appendChild(self.grids[i].element);
		}
	}
	if(first != null && last != null){
		if(first > 0){
			self.grids[first-1].populate();
			self.element.insertBefore(self.grids[first-1].element, self.element.firstChild);
		}
		if(last < self.grids.length-1){
			self.grids[last+1].populate();
			self.element.appendChild(self.grids[last+1].element);
		}
	}
}

GridScrollView.prototype.getActiveGrid = function(){
	var self = this;
	return self.activeGrid;
}
GridScrollView.prototype.setActiveGrid = function(grid, zoom){
	var self = this;
	self.activeGrid = grid;
}

GridScrollView.prototype.scrollLeftTo = function(left, doPopulate){
	var self = this;
	animating = true;
	self.left = left;
	self.element.style.left = left + "px";
	setTimeout(function(){
		animating = false;
		self.populate();
	},350);
}

GridScrollView.prototype.getBoxLeft = function(box){
	var self = this;
	var left = box.element.offsetLeft;
	var column = box.element.parentNode;
	if(column){
		var grid = column.parentNode;
		if(grid){
			left += grid.offsetLeft;
			return left;
		}
	}
	return null;
}