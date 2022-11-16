/* GRIDVIEW */


function GridView(idx, data){
	this.BOX_WIDTH = 284;
	this.BOX_HEIGHT = 160;
	this.BORDER = 5;
	this.IMAGESIZES = {
		ONE_BY_ONE: {"name":"ONE_BY_ONE", "weight": 1, "priority":4, "class": "gridViewBox_1x1", "width": 1, "height":1 },
		TWO_BY_ONE: {"name":"TWO_BY_ONE", "weight": 2, "priority":3, "class": "gridViewBox_2x1", "width": 1, "height":2 },
		ONE_BY_TWO: {"name":"ONE_BY_TWO", "weight": 2, "priority":2, "class": "gridViewBox_1x2", "width": 2, "height":1 },
		TWO_BY_TWO: {"name":"TWO_BY_TWO", "weight": 4, "priority":1, "class": "gridViewBox_2x2", "width": 2, "height":2 }
	};
	this.idx = idx;
	this.element_id = "grid_"+idx;
	this.title = data.title;
	this.init(data.items);
}

GridView.prototype.init = function(items){
	var self = this;
	self.columns = [];

	/* IMAGESIZE */

	for(var i = 0; i < items.length; i++){
		var imageSizeClass = self.IMAGESIZES.ONE_BY_ONE;
		if(items[i].imagesize != null){
			if(items[i].imagesize[0] >= ((self.BOX_WIDTH*2) + (self.BORDER*2))){
				imageSizeClass = self.IMAGESIZES.ONE_BY_TWO;
			}
			if(items[i].imagesize[1] >= ((self.BOX_HEIGHT*2) + (self.BORDER*2))){
				if(imageSizeClass == self.IMAGESIZES.ONE_BY_TWO){
					imageSizeClass = self.IMAGESIZES.TWO_BY_TWO;
				}
				else{
					imageSizeClass = self.IMAGESIZES.TWO_BY_ONE;
				}
			}
		}
		items[i].imageSizeClass = imageSizeClass;
		
	}
	
	items = items.sort(function(a,b){
		if(a.imageSizeClass.priority > b.imageSizeClass.priority){
			return 1;
		}
		else if(b.imageSizeClass.priority > a.imageSizeClass.priority){
			return -1;
		}
		else{
			return 0;
		}
	});
	
	/* IMAGESIZE END */

	/* CREATE GRID LAYOUT */
	
	var columnCount = 0;
	var slots = null;

	while(items.length > 0){
		var max_blocks = 3;
		var size = 3;
		if(items[0].imageSizeClass.width == 2){
			size = 6;
		}	
		slots = self.getSlots(size);

		max_blocks = size;
		var columnItems = {"items":[], "empty":max_blocks, "size":size};
		for(var i = 0; i < items.length; i++){
			var item = items[i];

			if(slots[item.imageSizeClass.name] > 0){
				max_blocks -= (item.imageSizeClass.width * item.imageSizeClass.height);
				columnItems.items.push(items.splice(i, 1)[0]);
				i--;
				columnItems.empty = max_blocks;

				if(item.imageSizeClass.name != self.IMAGESIZES.ONE_BY_ONE.name){
					slots[item.imageSizeClass.name] = Math.max(0, slots[item.imageSizeClass.name]-1);
					slots[self.IMAGESIZES.ONE_BY_ONE.name] = Math.max(0, slots[self.IMAGESIZES.ONE_BY_ONE.name] - item.imageSizeClass.weight);
				}
				else{
					slots[item.imageSizeClass.name] = Math.max(0, slots[item.imageSizeClass.name]-1);
				}

				if(slots[self.IMAGESIZES.TWO_BY_TWO.name] == 0){
					slots[self.IMAGESIZES.TWO_BY_ONE.name] = 0;
					slots[self.IMAGESIZES.ONE_BY_TWO.name] = Math.min(slots[self.IMAGESIZES.ONE_BY_TWO.name], 1);
					slots[self.IMAGESIZES.ONE_BY_ONE.name] = Math.min(slots[self.IMAGESIZES.ONE_BY_ONE.name], 3);
				}
				if(slots[self.IMAGESIZES.TWO_BY_ONE.name] <= 1){
					slots[self.IMAGESIZES.TWO_BY_TWO.name] = 0;
				}
				if(slots[self.IMAGESIZES.ONE_BY_TWO.name] <= 1){
					slots[self.IMAGESIZES.TWO_BY_TWO.name] = 0;
					slots[self.IMAGESIZES.TWO_BY_ONE.name] = 0;
				}

				if(max_blocks == 0){
					break;
				}
				
			}
		}

		var columnBoxes = [];
		for(var i = 0; i < columnItems.items.length; i++){
			var boxObject = new GridViewBox(columnItems.items[i]);
			boxObject.gridIdx = self.idx;
			columnBoxes.push(boxObject);
		}

		var column 	= new GridColumn(columnCount, self.element_id + "_column_" + columnCount, columnBoxes);
		column.size = size;
		self.columns.push(column);
		columnCount++;
	}

	self.populate();
}

GridView.prototype.getSlots = function(blocks){
	if(blocks == 3){
		return slots = {
			"TWO_BY_ONE": 1,
			"ONE_BY_ONE": 3
		};
	}
	else if(blocks == 6){
		return slots = {
			"TWO_BY_TWO": 1,
			"TWO_BY_ONE": 2,
			"ONE_BY_TWO": 3,
			"ONE_BY_ONE": 6
		};
	}
}

GridView.prototype.isBig = function(){
	var columns = 0;
	for(var i = 0; i < this.columns.length; i++){
		columns += (this.columns[i].size == 6) ? 2 : 1;
	}
	return columns > 4;
}

GridView.prototype.getBoxes = function(){
	var boxes = [];
	for(var i = 0; i < this.columns.length; i++){
		boxes = boxes.concat(this.columns[i].boxes);
	}
	return boxes;
}

GridView.prototype.populate = function(){
	var self = this;
	self.element = document.getElementById(self.element_id);
	if(self.element == null){
		self.element = document.createElement("div");
		self.element.setAttribute("id", self.element_id);
		self.element.addClass("grid");
		self.element.style.left = self.left + "px";
	}

	self.element.innerHTML = "";
	for(var i = 0; i < self.columns.length; i++){
		self.columns[i].populate();
		self.element.appendChild(self.columns[i].element);
	}
}

GridView.prototype.calculateWidth = function(){
	var self = this;
	var boxWidth = 284 + 10;
	var marginWidth = 12;
	var columns = 0;
	for(var i = 0; i < this.columns.length; i++){
		columns += (this.columns[i].size == 6) ? 2 : 1;
	}
	return (columns * boxWidth) + (marginWidth*2);
}
