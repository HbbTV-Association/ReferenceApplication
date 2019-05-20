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

function toTime( s ){
	return  twoDigitString( Math.floor(s / 60) ) + ":" + twoDigitString( Math.floor(s % 60) );
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
/*
var infoBoxVisible = false;

function showInfoBox( html )
{
	if( html == false ){
		$("#infoBox").addClass("hide");
		infoBoxVisible = false;
		return;
	}
	
	try{
		$("#infoBox").removeClass("hide");
		$("#infoBox").html( html );
		$("#infoBox").append( "<div style='position:absolute;top:0px;left:0px;background:rgba(0,0,0,0.9);'>Press OK to Close</div>" );
		infoBoxVisible = true;
	}
	catch(e){
		console.log( "error in show info function: " + e.message );
	}
}
*/


/***
	Infobox scrollable box
***/

var infoBoxVisible = false;
var infoBoxScrollable = false;

function showInfoBox( html )
{
	if( !$("#infoBox")[0] ){
		$("body").append("<div id='infoBox'></div>")
	}
	
	if( html == false ){
		$("#infoBox").addClass("hide");
		infoBoxVisible = false;
		return;
	}
	
	try{
		$("#infoBox").removeClass("hide");
		$("#infoBox").html( html );
		$("#infoBox").append( "<div style='position:absolute;top:0px;left:0px;background:rgba(0,0,0,0.9);'>Press OK to Close</div>" );
		infoBoxVisible = true;
	}
	catch(e){
		console.log( "error in show info function: " + e.message );
	}
	if( $("#infoBox > .verticalMiddle").outerHeight() > $("#infoBox").outerHeight() ){
		// inner container is larger. Activate scrolling
		infoBoxScrollable = true;
		$("#infoBox > .verticalMiddle").css( "top", "500px" );
	}
	else{
		infoBoxScrollable = false;
	}
}

function addTableRow( table, cells ){
	var row = $("<div style='display: table-row;background:rgba(0,0,0,0.9);'></div>");
	$.each( cells, function (i, value){
		row.append("<div style='display: table-cell;vertical-align: middle;border: 1px solid white;'>"+value+"</div>");
	});
	table.append( row );
}

function createTable(data){
	var table = $("<div class='verticalMiddle'></div>");
	$.each(data, function(name, value){
		addTableRow( table, [ name, value ] );
	});
	return table;
}



String.prototype.hashCode = function() {
  var hash = 0, i, chr;
  if (this.length === 0) return hash;
  for (i = 0; i < this.length; i++) {
    chr   = this.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  if( hash < 0 ){
	  hash = -hash;
  }
  return hash;
};

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


/*
window.onerror = function(message, url, lineNumber) { 
	//showInfo( message + " url: " + url + " line: " + lineNumber + "<br>" + (new Error()).stack, 10 );
	try{
		console.log(message + " url: " + url + " line: " + lineNumber ); // + " " + (new Error()).stack);
	} catch(e){
		console.log("Error: onerror: " + e.description);
	}
	return false; // when false, print it also to js console
};
*/

window.onerror = function (msg, url, lineNo, columnNo, error) {
    var string = msg.toLowerCase();
    var substring = "script error";
    if (string.indexOf(substring) > -1){
		
    } else {
        var message = [
            'Message: ' + msg,
            'URL: ' + url,
            'Line: ' + lineNo,
            'Column: ' + columnNo,
            'Error object: ' + JSON.stringify(error)
        ].join(' - ');
		console.log( message );
        showInfo(message);
    }

    return false;
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

/***************
	COOKIES
***************/

function createCookie(name, value, lifetime ) {
	try{
		lifetime = lifetime || (365 * 24 * 60 * 60 * 1000);
		var date = new Date();
		date.setTime(date.getTime() + lifetime );
		var expires = "; expires=" + date.toGMTString();
		
		document.cookie = name + "=" + value + expires + "; path=/; SameSite=lax";
	}
	catch(e)
	{
		console.log("error creating cookie");
	}
}

function readCookie(name) {
  var nameEQ = name + "=";
  var ca = document.cookie.split(';');
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function deleteCookie(name ) {
  document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
}

/***
	Helper functions
***/

function displayChannelList(){
	
	broadcast = $("#broadcast")[0];
		
	if( !broadcast ){
		$("body").append('<object id="broadcast" type="video/broadcast"></object>');
		broadcast = $("#broadcast")[0];
	}
	broadcast.bindToCurrentChannel();
	try {
		var lst = broadcast.getChannelConfig().channelList;
		var table = $("<div class='verticalMiddle'></div>");
		
		
		for (var i=0; i<lst.length; i++) {
			var ch = lst.item(i);
			addTableRow( table, [i, ch.name, ch.ccid, ch.onid, ch.sid, ch.tsid] );
		}
		showInfoBox( table );

	} catch (e) {
		showInfo('accessing channel list failed.');
		return;
	}
}


function getChannelData(){
	try{
		// get channel list and channel position
		broadcast = $("#broadcast")[0];
		
		if( !broadcast ){
			$("body").append('<object id="broadcast" type="video/broadcast"></object>');
			broadcast = $("#broadcast")[0];
			
		}
		broadcast.bindToCurrentChannel();
		/*
		if( !appmgr ){
			$("body").append('<object id="appmgr" type="application/oipfApplicationManager"></object>');
			appmgr = $("#appmgr")[0];
		}
		*/
		
		var chlist = broadcast.getChannelConfig().channelList;
		//var current = broadcast.currentChannel;
		//var current = appmgr.getOwnerApplication().privateData.currentChannel; // not available in Samsung
		var current = null;
		var ccid = null;
		try {
			ccid = broadcast.currentChannel.ccid;
		} catch (e) {
			ccid = null;
		}
		
		try {
			current = chlist.getChannel(ccid);
		} catch (e) {
			current = null;
		}
		
		
		
		var channelPosition = -1;
		
		try{
			for(var i = 0; i < chlist.length; ++i){
				var ch = chlist.item(i);
				console.log( ch, JSON.stringify( ch ) )
				if( ch.ccid == ccid ){
					channelPosition = i;
					break;
				}
			}
		}catch(e){
			showInfo( "Channel data not readable");
		}
		if( current ){
			showInfo( "Channel " + current.name + " at position " + channelPosition );
		}else{
			current = chlist.item(0);
		}
		console.log( "Chlist length " + chlist.length + " ");
		
		var table = $("<div class='verticalMiddle'></div>");
		
		addTableRow( table, [ "Channel position", channelPosition+"/"+chlist.length ]);
		addTableRow( table, [ "Current channel CCID", ccid ]);
		
		var parameters = ["ccid","channelType","dsd","name","onid","sid","tsid"];
		$.each(parameters, function(i, param){
			try{
				addTableRow( table, [ param, current[ param ] ] );
			}catch(e){
				addTableRow( table, [ param, "[Can not display data]"] );
			}
		});
		showInfoBox( table );
	} catch(e){
		showInfo( e.message );
	}
}


function readAllCookies(){
	var cookies = document.cookie.split(';');
	list = {};
	$.each( cookies, function( i, cookie ){
		var search = cookie.grep(/(\w*).?=(.*)/);
		list[ search[0] ] = search[1];
	} );
	return list;
		
}

function displayCookies(time){
	var cookies = readAllCookies();
	var table = $("<div class='verticalMiddle'></div>");
	$.each(cookies, function(name, value){
		if( value.length > 80 ){
			var lbreak = 80;
			while(lbreak < value.length){
				value = value.substr(0, lbreak) + "<br/>" + value.substr( lbreak );
				lbreak += 80;
				console.log("added line break");
			}
		}
		table.append("<div style='display: table-row;background:rgba(0,0,0,0.9);'><div style='display: table-cell;vertical-align: middle;border: 1px solid white;'>"+name+"</div><div style='display: table-cell;vertical-align: middle;border-bottom: 1px solid white;border-top: 1px solid white;'>"+value+"</div></div>");
	});
	showInfoBox( table );
}

/*****
Capabilities
*****/

var capabilities = null;
var xmlstr = "";
var xmlExample = null;
var getCapabilities = function() {
	try {
			var capobj = function(){
				var object = document.getElementById("oipfcap");
				if( !object ){
					object = document.createElement("object");
					object.setAttribute("id", "oipfcap");
					object.setAttribute("type", "application/oipfCapabilities");
					document.body.appendChild( object );
					
				}
				return object;
			}();
			try {		
				capabilities = capobj.xmlCapabilities;
			} catch (e) {
				capabilities = null;
			}
	} catch (e) {
		console.log("error getting capabilities");
	}
	xmlstr = "";
	
	if( !capabilities ){
		
		$.ajax({
			async : false,
			url : "../capabilities_ex.xml",
			dataType : "xml",
			success : function(xml){
				capabilities = xml;
			}
		});
	}
	
	
	if (capabilities != null) {
		var serializer = new XMLSerializer();
		var xmlstr = serializer.serializeToString( capabilities );
		
		// send xml to server
		//logger( xmlstr );
		
	} else {
		xmlstr = "<profilelist></profilelist>";
	}
	//xmlstr = xmlExample;
	//console.log( "capabilities original:" ,capabilities );
	console.log( "capabilities:" ,xmlstr );
	
	/*
	// OLD VERSION
	var entries = xmlstr.grep(/\<(\w*)\>/g).map(function(i){return i.replace("<","").replace(">","")});
	console.log( entries, xmlstr );
	var table = $("<div class='verticalMiddle'></div>");
	$.each(entries, function(i,name){
		//var value = capabilities.getElementsByTagName(name)[0].nodeValue;
		var value = $(xmlstr).find( name ).text();
		console.log( value );
		table.append("<div style='display: table-row;background:rgba(0,0,0,0.9);'><div style='display: table-cell;vertical-align: middle;word-break: break-all;border: 1px solid white;'>"+name+"</div><div style='display: table-cell;vertical-align: middle;border-bottom: 1px solid white;border-top: 1px solid white;'>"+value+"</div></div>");
	});
	
	*/
	var table = $("<div class='verticalMiddle'></div>");
	/*
	$.each( $(capabilities).find("ui_profile  *"), function( i, property ){
		if( !property[0] )
			return;
		var name = property[0].nodeName;
		var attr = "";
		$.each( property[0].attributes, function(n, attribute){
			attr += attribute.nodeName + " = " +attribute.nodeValue + ";";
		} );
		table.append("<div style='display: table-row;background:rgba(0,0,0,0.9);'><div style='display: table-cell;vertical-align: middle;word-break: break-all;border: 1px solid white;'>"+name+"</div><div style='display: table-cell;vertical-align: middle;border-bottom: 1px solid white;border-top: 1px solid white;'>"+attr+"</div></div>");

	} );
	*/
	
	var printableSource = xmlstr.replace(/&/g, "&amp;").replace(/>/g, "&gt;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
	table.append("<div style='display: table-row;background:rgba(0,0,0,0.9);'><div style='display: table-cell;vertical-align: middle;word-break: break-all;border: 1px solid white;text-align:left !important;'>UserAgent: </div><div style='display: table-cell;vertical-align: middle;word-break: break-all;border: 1px solid white;text-align:left !important;'>"+ navigator.userAgent +"</div></div>");
	table.append("<div style='display: table-row;background:rgba(0,0,0,0.9);'><div style='display: table-cell;vertical-align: middle;word-break: break-all;border: 1px solid white;text-align:left !important;'>xmlCapabilities</div><div style='display: table-cell;vertical-align: middle;word-break: break-all;border: 1px solid white;text-align:left !important;'><pre style='word-break: break-all;'>"+ printableSource +"</pre></div></div>");

	
	
	showInfoBox( table );
	//showInfoBox( xmlstr.replace(/\</, "\<").replace(/\>/, "\>") );
	//showInfo( xmlstr );
}


function mediaPlaySpeeds(){
	
}

























