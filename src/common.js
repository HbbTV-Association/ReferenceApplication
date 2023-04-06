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
	if(timeout<0) {
		$("#info").addClass("hide");
		return;
	}
	infoTimer = setTimeout( function(){
        $("#info").addClass("hide");
    }, timeout * ( inMs? 1 : 1000) );
	try {
		$("#info").removeClass("hide");
		if( typeof msg != "string" ){
			msg = JSON.stringify( msg );
		}
		$("#info").html( XMLEscape(msg,false,true) );
	} catch(e){
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
		row.append("<div style='display: table-cell;vertical-align: middle;border: 1px solid white;'>"+ XMLEscape(value,false,true) +"</div>");
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

// create GUID
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
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
        if( typeof( app ) == "undefined" ){
            app = document.getElementById('appmgr').getOwnerApplication(document); // use global variable app. Declare if not declared
        }
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

function XMLEscape(sValue, bUseApos, bStripTags) {
	try{
		var sval="";
		if(!sValue) return "";
		
		if(bStripTags) sValue = stripTags(sValue); // remove xml field delimiters to have a clear value string

		for(var idx=0; idx < sValue.length; idx++) {
			var c = sValue.charAt(idx);
			if      (c == '<') sval += "&lt;";
			else if (c == '>') sval += "&gt;";
			else if (c == '&') sval += "&amp;";
			else if (c == '"') sval += "&quot;";
			//else if (c == '/') sval += "&#x2F;";
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

// Convert Uint8Array bytes to String 
function uint8ArrayToString(arrUint8) {
	if(!arrUint8) return "";
	else if(typeof arrUint8 == "string") return arrUint8; // failsafe
	return String.fromCharCode.apply(null, arrUint8);
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
		addTableRow( table, ["", "Name", "ccid", "onid", "sid", "tsid"] );
		
		for (var i=0; i<lst.length; i++) {
			var ch = lst.item(i);
			console.log(i+1, ch.name, ch.ccid, ch.onid, ch.sid, ch.tsid);
            addTableRow( table, [""+(i+1), ch.name, ch.ccid, ""+ch.onid, ""+ch.sid, ""+ch.tsid] );
		}
		
		showInfoBox( table );
	} catch (e) {
		showInfo('accessing channel list failed.' + e.message);
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

function deleteAllCookies(param1) {
	document.cookie = "RefappWatched=; path=/; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:01 GMT";
	console.log("Deleted cookie 'RefappWatched'");
}

function readAllCookies(){
	var cookies = document.cookie.split(';');
	list = {};
	$.each( cookies, function( i, cookie ){
		var search = cookie.grep(/(\w*).?=(.*)/);
		if(search!=null)
			list[ search[0] ] = search[1];
	} );
	return list;		
}

function displayCookies(time){
	var cookies = readAllCookies();
	var table = $("<div class='verticalMiddle'></div>");
	if($.isEmptyObject(cookies))
		cookies[""]="no cookies";
	$.each(cookies, function(name, value){
		if( value.length > 80 ){
			var lbreak = 80;
			while(lbreak < value.length){
				value = value.substr(0, lbreak) + "<br/>" + value.substr( lbreak );
				lbreak += 80;
				//console.log("added line break");
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
		capabilities = capobj.xmlCapabilities;
	} catch (e) {
		console.log("error getting capabilities");
		capabilities = null;
	}
	
	var xmlstr = "";
	if (capabilities != null) {
		// PrettyPrint xml with newline indentation
		XMLIndentChildren(capabilities, capabilities.documentElement, "\n", "\n  ");
		var serializer = new XMLSerializer();
		xmlstr = $.trim( serializer.serializeToString( capabilities ) );
	} else {
		xmlstr = "<profilelist></profilelist>";
	}
	console.log( "capabilities:", xmlstr );

	var table = $("<div class='verticalMiddle'></div>");	
	var printableSource = xmlstr.replace(/&/g, "&amp;").replace(/>/g, "&gt;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
	table.append("<div style='display: table-row;background:rgba(0,0,0,0.9);'><div style='display: table-cell;vertical-align: middle;word-break: break-all;border: 1px solid white;text-align:left !important;'>UserAgent</div><div style='display: table-cell;vertical-align: middle;word-break: break-all;border: 1px solid white;text-align:left !important;'>"+ navigator.userAgent +"</div></div>");
	table.append("<div style='display: table-row;background:rgba(0,0,0,0.9);'><div style='display: table-cell;vertical-align: middle;word-break: break-all;border: 1px solid white;text-align:left !important;'>XML</div><div style='display: table-cell;vertical-align: middle;word-break: break-all;border: 1px solid white;text-align:left !important;'><pre style='word-break: break-all;'>"+ printableSource +"</pre></div></div>");
	showInfoBox( table );
}

function mediaPlaySpeeds(){
}

function setOIPFActiveDRM(item) {
	// read from configjson item.desc="setActiveDRM(playready), anything..." string
	// if we need to use this function. Reset value after a playback.
	var drmSystemId;
	var desc;
	if(item) {
		item.setActiveDRM_drmSystemId=null;
		var delim = item.desc.indexOf(")");
		var desc  = delim>0 ? item.desc.substring(0,delim+1) : "";
		if(desc=="setActiveDRM(playready)") {
			drmSystemId="urn:dvb:casystemid:19219";
		} else if (desc=="setActiveDRM(widevine)") {
			drmSystemId="urn:dvb:casystemid:19156";
		} else if (desc=="setActiveDRM(marlin)") {
			drmSystemId="urn:dvb:casystemid:19188";
		} else if (desc=="setActiveDRM(null)") {
			drmSystemId=null;
		} else return; // do nothing
		item.setActiveDRM_drmSystemId=drmSystemId; // remember this, see player.stop()
	} else {
		// reset DRM system to a default state, see videoplayer_xx.clearVideo()
		desc = "setActiveDRM(null)";
		drmSystemId=null;
	}
	
	var retval=false;
	createOIPFDrmAgent();
	var drmAgent = $("#oipfDrm")[0];
	try {
		retval=drmAgent.setActiveDRM(drmSystemId);		
		console.log(desc + ", "+drmSystemId + ", retval="+retval);
	} catch(ex) {
		console.log(desc + ", "+drmSystemId + ", retval="+ex.message);
	}
}

function createOIPFDrmAgent() {
	// create DrmAgent if not already found in html DOM
	var drmAgent = $("#oipfDrm")[0];
	if(!drmAgent){
		console.log("Create DRM agent");
		if( !$("#drm")[0] )
			$("body").append("<div id='drm'></div>");		
		$("#drm").html('<object id="oipfDrm" type="application/oipfDrmAgent" width="0" height="0"></object>');	
	}
}
function destroyOIPFDrmAgent() {
	// remove DrmAgent+parent DIV from html DOM
	var drmAgent = $("#oipfDrm")[0];
	if(!drmAgent) return;	
	$("#oipfDrm").remove();
	$("#drm").remove();	
	console.log("Destroy DRM agent");	
}

function displayDRMCapabilities() {
	destroyOIPFDrmAgent();
	createOIPFDrmAgent();
	var drmAgent = $("#oipfDrm")[0];
	setOIPFActiveDRM(null);
	
	var capabilities = null;
	try {
		var capobj = function(){
			var object = document.getElementById("oipfcap");
			if( !object ){
				console.log("Create oipfcap object");
				object = document.createElement("object");
				object.setAttribute("id", "oipfcap");
				object.setAttribute("type", "application/oipfCapabilities");
				document.body.appendChild( object );				
			}
			return object;
		}();
		capabilities = capobj.xmlCapabilities;
	} catch (e) {
		console.log("Error getting capabilities");	
	}
	
	var xmlstr = "";
	if (capabilities != null) {
		XMLIndentChildren(capabilities, capabilities.documentElement, "\n", "\n  ");
		var serializer = new XMLSerializer();
		var sArr = $.trim( serializer.serializeToString( capabilities ) ).split("\n");
		for(var idx=0; idx<sArr.length; idx++) {
			var val = $.trim(sArr[idx]).toUpperCase();
			if(val.indexOf("DRM")>=0)
				xmlstr += $.trim(sArr[idx])+"\n";
		}
	}
	
	getDeviceID("marlin", function(isOk, retval) {
		var jsonRetval = { deviceID_marlin: "", deviceID_playready: "" };
		jsonRetval.deviceID_marlin = retval;
		getDeviceID("playready", function(isOk, retval) {
			jsonRetval.deviceID_playready = retval;
			xmlstr = "<deviceID sysid=\"marlin\">" + jsonRetval.deviceID_marlin + "</deviceID>\n"
				+ "<deviceID sysid=\"playready\">" + jsonRetval.deviceID_playready + "</deviceID>\n"
				+ xmlstr;
			console.log(xmlstr);
			var table = $("<div class='verticalMiddle'></div>");
			var printableSource = xmlstr.replace(/&/g, "&amp;").replace(/>/g, "&gt;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
			table.append("<div style='display: table-row;background:rgba(0,0,0,0.9);'><div style='display: table-cell;vertical-align: middle;word-break: break-all;border: 1px solid white;text-align:left !important;'>DRM</div><div style='display: table-cell;vertical-align: middle;word-break: break-all;border: 1px solid white;text-align:left !important;'><pre style='word-break: break-all;'>"+ printableSource +"</pre></div></div>");
			showInfoBox( table );
		});
	});	
}

function getDeviceID(sysid, callback) {
	// Get deviceID from oipfDrmAgent object
	var DRMMessage   = '{"command": "getDeviceID"}';
	var DRM_MSG_TYPE = "application/vnd.marlin.xpca+json";

	sysid = sysid ? sysid.toUpperCase() : "default";
	var DRM_SYSTEM_ID = 
		sysid=="MARLIN" ? "urn:dvb:casystemid:19188" :  // marlin XCA
		"urn:dvb:casystemid:19219"; // playready

	var drmAgent = $("#oipfDrm")[0];
	if(!drmAgent) {
		console.log("oipfDrm is null");
		return;
	}
	
	console.log("Get deviceId for " + DRM_SYSTEM_ID);
	drmAgent.onDRMMessageResult = function(msgID, resultMsg, resultCode) {
		console.log("msgID: " + msgID + ", resultCode: " + resultCode
			+ ", resultMsg: " + resultMsg);
		try {
			var deviceIdObj = JSON.parse(resultMsg);
			//window.localStorage.setItem('deviceID', deviceIdObj.deviceID.ID);
			//showInfo( JSON.stringify(deviceIdObj) );			
			callback(true, JSON.stringify(deviceIdObj) );
		} catch(e) {
			if(!resultMsg || resultMsg=="") resultMsg=""+resultCode;
			//showInfo("Error "+ XMLEscape(resultMsg,false,true) );
			callback(false, "Error "+ XMLEscape(resultMsg,false,true) );
		}
	};

	try {
		var msgID = drmAgent.sendDRMMessage(DRM_MSG_TYPE, DRMMessage, DRM_SYSTEM_ID);
	} catch(ex) {
		callback(false, "Error "+ XMLEscape(ex.message));
	}
}

function XMLIndentChildren(xmlDoc, node, prevPrefix, prefix) {
  var children = node.childNodes;
  var idx;
  var prevChild = null;
  var prevChildType = 1;
  var child = null;
  var childType;
  for (idx = 0; idx < children.length; idx++) {
    child = children[idx];
    childType = child.nodeType;
    if (childType != 3) {
      if (prevChildType == 3) {
        // Update prev text node with correct indent
        prevChild.nodeValue = prefix;
      } else {
        // Create and insert text node with correct indent
        var textNode = xmlDoc.createTextNode(prefix);
        node.insertBefore(textNode, child);
        idx++;
      }
      if (childType == 1) {
        var isLeaf = child.childNodes.length == 0 || child.childNodes.length == 1 && child.childNodes[0].nodeType != 1;
        if (!isLeaf) {
          XMLIndentChildren(xmlDoc, child, prefix, prefix + "  ");
        }
      }
    }
    prevChild = child;
    prevChildType =childType;
  }
  if (child != null) {
    // Previous level indentation after last child
    if (childType == 3) {
      child.nodeValue = prevPrefix;
    } else {
      var textNode = xmlDoc.createTextNode(prevPrefix);
      node.append(textNode);
    }
  }
}
