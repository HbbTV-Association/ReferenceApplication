/**
 * Common helpers to be used in catalogue or videoplayers
 *
 * @module Common
 */


/***
	Time/Date helpers
***/
function twoDigitString( number ){
	return ('0'+number).substr(-2);
}

function timeToDate( hhmm ){
	var t = new Date();
	return t.getFullYear() + "-" + (t.getMonth()+1) + "-" + t.getDate() + "T" + hhmm + ":00";
}

function daysLeft( time ){
	return Math.ceil(Math.abs(((new Date(time)).getTime()) - ((new Date).getTime()))/8.64e7);
}


function UTCDate(){
	return new Date(new Date().getTime() + new Date().getTimezoneOffset()*60*1000);
}

Date.prototype.getDayString = function(){
	var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
	return days[this.getDay()];
}

Date.prototype.getMonthString = function(){
	var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
	return months[this.getMonth()];
}

/**
 * Extends Array to support sortBy, which sorts an array of objects by given attributes
 * If secondary or more attributes are given and previous attribute comparison is equal, the next attribute is compared in given priority sorting order
 * If an attribute is given with - prefix, the sort order is DESC.
 * @method Array.prototype.sortBy
 * @for Common
**/
Array.prototype.sortBy = function(){

	var fields = arguments;
	this.sort(function(a, b){
		for( var i = 0; i < fields.length; ++i )
		{
			var field = fields[i];
			var desc = false;
			if( field[0] == "-" )
			{
				desc = true;
				field = field.substring(1);
			}
			if (a[field] < b[field]){
				return -1 + (2*desc);
			}
			if (a[field] > b[field]){
				return 1 - (2*desc);
			}
		}
		return 0;
	});
};

Array.prototype.last = function(){
	return this[this.length - 1];
};

/**
 * greps off matching regular expression from a string. If there is more capturing blocs, return an array of strings.
 * @method String.prototype.grep
 * @param needle: the regular expression to perform for the string
 * @param nomatch: default return value if string does not match to regex
 * @param bytes: Additional regex bytes as a string.
**/
String.prototype.grep = function( needle, nomatch, bytes ){
	var match = this.match( new RegExp(needle, bytes) );
	return ( match? ( match.length == 2? match[1] : ( match.length==1? match[0] : match.slice(1)) ) : nomatch );
};

// like substring, capable to index negative numbers as indexes from the end.
String.prototype.cut = function( from, to ){
	return this.substring( ( from < 0? this.length + from : from ), (to < 0? this.length + to : to ) )
};

var infoTimer = null;
function showInfo( msg, timeout, inMs )
{
	clearTimeout( infoTimer );
    timeout = timeout || 4; // sec
	infoTimer = setTimeout(function(){
        $("#info").addClass("hide");
    }, timeout * ( inMs? 1 : 1000));
	try{
		$("#info").removeClass("hide");
		if( typeof msg != "string" ){
			msg = JSON.stringify( msg );
		}
		$("#info").html( XMLEscape( msg ) );
	}
	catch(e){
		console.log( "error in show info function: " + e.message );
	}
}

// adds event listener (action) for multiple (events) "separated by space" for object (obj) 
function addEventListeners( obj, events, action ){
	$.each(events.split(" "), function(i,event){
		obj.addEventListener( event, action );		
	});
}

Element.prototype.addClass = function(cls){
	$( this ).addClass( cls );
}

Element.prototype.removeClass = function(cls){
	$( this ).removeClass( cls );
}

function selectElement(element, cls) {
	$( "." + cls ).removeClass( "selected" );
	$( element ).addClass( "selected" );
}

function setLoading(load){
	loading = load;
}

function getClosest(from, target, direction){
	var from_offset = $(from.element).offset();
	var shortest =null;
	var closestItem;
	var cx = $(from.element).width()/2;
	var cy = $(from.element).height()/2;
	var pos = { 
		a : { 
			x : Math.round( from_offset.left + cx ) , 
			y : Math.round( from_offset.top + cy ) ,
			top : Math.round( from_offset.top ),
			bottom: Math.round( from_offset.top + $(from.element).height()),
			right : Math.round( from_offset.left + $(from.element).width()),
			left : Math.round( from_offset.left )
		} 
	};
	
	var finalB = null;
	
	$.each(target, function(i, item){ // find closest item, compares center coordinates
		var el = item.element;
		if(el == from.element)
			return; // do not count itself
		var offset = $(el).offset();
		var cx2 = $(el).width()/2;
		var cy2 = $(el).height()/2;
		pos.b = { 
			x : Math.round( offset.left + cx ) , 
			y : Math.round( offset.top + cy ) ,
			top : Math.round( offset.top ),
			bottom: Math.round( offset.top + $(el).height()),
			right : Math.round( offset.left + $(el).width()),
			left : Math.round( offset.left )
		} 
		
		if( direction ) 
		{
			if( direction == "up" 	 && (pos.b.y == pos.a.y  || pos.b.y > pos.a.y )
			|| 	direction == "down"  && (pos.b.y <= pos.a.y)
			|| 	direction == "left"  && (pos.b.x >= pos.a.x - Math.abs( pos.b.y - pos.a.y ))
			|| 	direction == "right" && (pos.b.x <= pos.a.x + Math.abs( pos.b.y - pos.a.y )))
				return;

			if( direction == "up" 	 && (pos.a.top == pos.b.top  || pos.a.top < pos.b.top )
			|| 	direction == "down"  && (pos.a.bottom == pos.b.bottom  || pos.a.bottom > pos.b.bottom)
			|| 	direction == "left"  && (pos.a.left == pos.b.left  || pos.a.left < pos.b.left)
			|| 	direction == "right" && (pos.a.right == pos.b.right  || pos.a.right > pos.b.right))
				return;
		}
		var horizontal = direction == "left" || direction == "right";
		var diagonalDistance = Math.sqrt(Math.pow(pos.b.x - pos.a.x,2) + Math.pow(pos.b.y - pos.a.y, 2));
		var straightDistance = diagonalDistance;
		
		/* Aligned elements are favoured */
		if(horizontal){
			if((pos.b.top == pos.a.top) || pos.a.bottom == pos.b.bottom){
				straightDistance = (horizontal) ? Math.abs(pos.b.x - pos.a.x) : Math.abs(pos.b.y - pos.a.y);
				straightDistance *= 0.5;
			}
		}
		else{
			if((pos.b.left == pos.a.left) || pos.a.right == pos.b.right){
				straightDistance = (horizontal) ? Math.abs(pos.b.x - pos.a.x) : Math.abs(pos.b.y - pos.a.y);
				straightDistance *= 0.5;
			}
		}

		var dist = Math.min(straightDistance,diagonalDistance);
		if ((!shortest || (dist && dist<shortest))) {
			shortest = dist;
			closestItem = item;
			finalB = pos.b;
		}					
	});
	return closestItem;
}


var registeredKeys = [];
function registerKeys(mode) {
	var mask;
	// ui hidden, only red and green registered
	if (mode == 0) {
		mask = 0x1 + 0x2 + 0x4 + 0x8 + 0x10; // color buttons and navigation for launcher
	}
	else if( mode == -1 ){ // restore previous
		mask = registeredKeys.pop();
	}
	else {
		mask = 0x1 + 0x2 + 0x4 + 0x8 + 0x10 + 0x20 + 0x40 + 0x80 + 0x100;
	}
	try {
		var app = document.getElementById('appmgr').getOwnerApplication(document);
		//showInfo("register keys mask: " + mask);
		app.privateData.keyset.setValue(mask);
		if( mode >= 0 ){
			registeredKeys.push( mask );
		}
	} catch (e) {
	}
}

function stripTags( str ){
	return str.replace(/<\/?[^>]+(>|$)/g, "");
}

function XMLEscape(sValue, bUseApos) {
	try{
		var sval="";
		if(!sValue) return "";
		sValue = stripTags( sValue );

		if (sValue.search("&lt;") != -1 || sValue.search("&gt;") != -1  || sValue.search("&amp;") != -1  || sValue.search("&quot;") != -1  || sValue.search("&apos;") != -1  || sValue.search("&#39;") != -1  || sValue.search("&#x2F;") != -1 ){
			return sValue;
		}
		for(var idx=0; idx < sValue.length; idx++) {
			var c = sValue.charAt(idx);
			if      (c == '<') sval += "&lt;";
			else if (c == '>') sval += "&gt;";
			else if (c == '&') sval += "&amp;";
			else if (c == '"') sval += "&quot;";
			else if (c == '/') sval += "&#x2F;";
			else if (c == '\'') sval += (bUseApos ? "&apos;" : "&#39;");
			else sval += c;
		}
		return sval;
	} catch(e){
		console.log("Error: XMLEscape: " + e.description);
		return "";
	}
}

window.onerror = function(message, url, lineNumber) { 
	//showInfo( message + " url: " + url + " line: " + lineNumber + "<br>" + (new Error()).stack, 10 );
	try{
		console.log(message + " url: " + url + " line: " + lineNumber + "<br>" + (new Error()).stack, 10);
	} catch(e){
		console.log("Error: onerror: " + e.description);
	}
	return false; // when false, print it also to js console
};


	
function updateOnlineStatus(event) {
	var condition = navigator.onLine ? "online" : "offline";
    console.log("Connection state changed to: " + condition);
	showInfo("Connection state changed to: " + condition);
}

window.addEventListener('online',  updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// adds event listener (action) for multiple (events) "separated by space" for object (obj) 
function addEventListeners( obj, events, action ){
	$.each(events.split(" "), function(i,event){
		obj.addEventListener( event, action );		
	});
}

function addZeroPrefix(n){
	return ("0" + n).slice(-2);
}

function arrayBufferToString(buffer){
	var arr = new Uint8Array(buffer);
	var str = String.fromCharCode.apply(String, arr);
	if(/[\u0080-\uffff]/.test(str)){
		throw new Error("this string seems to contain (still encoded) multibytes");
	}
	return str;
}

