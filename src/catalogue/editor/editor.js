
var lastModified = null;
var lastModifiedTimer = null;
var applib = [];
var jsFunctions = [];
var documentloadtime = new Timer();

$.ajaxSetup({ cache: false });
$( document ).tooltip();

function selectApp(button)
{
	$("#appmenu").remove();
	var input = $(button).next("input[name=url]");
	$(button).after('<ul id="appmenu"><li class="ui-widget-header">Application Library</li></ul>');
	if( applib.length == 0 )
		$("#appmenu").append('<li class="ui-state-disabled">[empty]</li>');
	$.each( applib, function(i, app){
		$("#appmenu").append("<li>" + app.name +"</li>");
	});
	
	// videos
	$("#appmenu").append('<li class="ui-widget-header">Video Library</li>');
	$.each( videolib, function(i, vid){
		$("#appmenu").append("<li data-type='video'>" + vid.name +"</li>");
	});
	
	$( "#appmenu" ).menu({
		items: "> :not(.ui-widget-header)",
		select: function( event, ui ) {
			console.log(ui.item.text());
			var lib = ( ui.item.attr('data-type') == "video"? videolib : applib );;
			for( i = 0; i < lib.length; ++i)
			{
				if( ui.item.text() == lib[i].name )
				{
					console.log( lib[i].url );
					input.attr("value", lib[i].url );
					input.focus();
					$("#appmenu").remove();
					break;
				}
			}
		}
	});
	$( "#appmenu" ).mouseleave(function() {
		$("#appmenu").remove();
	});
}

// just get last modified header and notify if the file is changed on server
// called always when page comes focused and polls changes within 10s interval when page active
function checkModified()
{
	$.ajax({
		url : "../config.json",
		type : "HEAD",
		success: function(data, status, xhr) {
			//console.log( status );
			console.log( "latest client version:  " + lastModified );
			console.log( "checked server version: " + xhr.getResponseHeader('Last-Modified') );
			if( lastModified != xhr.getResponseHeader('Last-Modified') )
			{
				clearInterval( lastModifiedTimer );
				lastModifiedTimer = null;
				showMessage("Configuration is modified by somebody else. Reload the page to get new changes");
				if( confirm("Configuration is modified by somebody else. Do you want to reload the page to get new changes? Saving now will override newer version") )
					location.reload();
				lastModifiedTimer = setInterval( checkModified, 10000);
			}
		}
	});
}
// returns a form to edit one menu. Menu should be put in a menu tab
function createMenuEditor( menu, index )
{
	var menuform = $("<form class='menu'></form>");
	menuform.append( "<div class='containertitle'>Menu name: <input name='title' class='subname' type='text' value='"+ menu.title +"'></input><input class='action' type='button' value='Rename' onclick=\"$('a[href=#tab"+index+"]').html( $(this).prev('input').val() );refreshSelectBoxes();\"><br></div>");
	var table = $('<table border="0" cellspacing="0" cellpadding="5"><tbody id="table'+index+'"><tr><th>Focus</th><th>Move</th><th>Title</th><th>Description</th><th>Action</th><th>App type</th><th>Submenu</th><th>App icon</th></tr></tbody></table>');
	
	$.each( menu.items, function (i, item){
		table.append( addRow( index, item ) );
	} );
	
	table.find("input[name=center]:eq(" + menu.center + ")").prop('checked', true);
	
	menuform.append(table);
	menuform.append('<div style="margin-top:10px;margin-left:5px;"><input type="button" class="action" value="  Add Item   " onclick=\'$("#table'+index+'").append( addRow('+index+') );refreshSelectBoxes();\'></input></div>');		
	
	return menuform;
}


// adds row for item in table index. If item is null, creates empty inputs, othervise filled values
function addRow( index, item )
{
	//               title str,  url,      desc,		     icon,	   apptype, script to evaluate
	var defaults = { title : "", url : "", description : "", img : "", app : 0, eval : "" };
	item = item || defaults;
	
	// add defaults when missing
	$.each( defaults, function( key, val ){ if( !item.hasOwnProperty(key) ) item[key] = val; } );
	
	var row = $('<tr name="item"><td><input type="radio" name="center"></input></td><td><input class="action" type="button" value="&darr;" onclick="moveDown(this);"></input><input class="action" type="button" value="&uarr;" onclick="moveUp(this);"></input><input class="action" type="button" value="X" onclick="removeRow(this);"></input></td></tr>');
	row.append('<td><input type="textbox" value="'+item.title+'" name="title"></input></td><td><input type="textbox" value="'+item.description+'" name="description"></input></td>');
	
	var apptype = ( item.eval? "eval" : ( item.submenu? "submenu" : "url" ) );
	
	row.append('<td><input name="apptype" class="action" value="'+ apptype +'" onclick="changeAction(this);" type="button" title="Click to switch different app type for different actions"></input> <input class="action" value="≡" onclick="selectApp(this);" type="button"></input><input type="textbox" class="mlink'+ (apptype != "submenu"? '" value="'+ item[apptype] +'" name="'+apptype+'"':' hidden" value="" name="url"')+'></input></td>');
	
	var optstring = ""; 
	$.each( apptypes, function( i, type ){
		optstring += "<option value='"+i+"'"+(item.app == i? " selected":"")+">"+type+"</option>";
	} );
	row.append('<td><select class="selectapp" name="app">'+optstring+'</select></td>');
	
	item.submenu = item.submenu || "NONE";
	optstring = "";
	$.each( menus, function( i, menu ){
		optstring += "<option value='"+i+"'"+(item.submenu == i? " selected":"")+">"+menu.title+"</option>";
	} );
	row.append('<td><select class="selectsubmenu" name="submenu"><option value="NONE" '+(item.submenu == "NONE"? " selected":"")+'>No</option>'+optstring+'</select></td>');
	
	optstring = "<option data-img-src='css/images/noicon.png' value='' "+ (item.img == ""? "selected":"") +"></option>";
	$.each( icons, function( i, icon ){
		optstring += "<option data-img-src='../"+icon+"' value='"+icon+"' "+ (item.img == icon? "selected": "") +"></option>";
	} );
	row.append('<td>Icon: <img class="icon" style="display:inline-block;width:24px;height:24px;" src="'+(item.img == ''? 'css/images/noicon.png':'../'+item.img)+'" onclick="iconPicker($(this));"><div id="iconselector'+index+'" class="iconselector"><input class="action" type="button" onclick=\'$(this).parent().removeClass("iconselectorOpen");\' style="position:relative;top:0px;left:0px;" value="Close"></input><select class="selecticon" name="img">'+optstring+'</select></div></td>');
	
	return row;
}

var itemActionTypes = [ "url", "submenu", "eval" ];
function changeAction( button, action )
{
	sction = action || null;
	var initial = true;
	// get next action if not determined
	if( action == null )
	{
		initial = false;
		action = $(button).attr('value');
		var actionNumber = itemActionTypes.indexOf( action ) + 1;
		action = (itemActionTypes.length <= actionNumber? itemActionTypes[0] : itemActionTypes[ actionNumber ] );
	}
	$(button).attr( 'value', action );
	var row = $(button).parent().parent();

	switch( action )
	{
		case "url":
			row.find(".mlink").attr("name", action);
			row.find(".mlink").removeClass('hidden');
			row.find("[name=submenu]").addClass('hidden');
			row.find("[name=app]").removeClass('hidden');
			$(button).next("input").removeClass('hidden');
			if(!initial) // autocomplete off
			{
				$( ".mlink" ).autocomplete({
					source: []
				});
			}
			break;
		case "submenu":
			row.find(".mlink").addClass('hidden');
			row.find("[name=submenu]").removeClass('hidden');
			row.find("[name=app]").addClass('hidden');
			$(button).next("input").addClass('hidden');
			break;
		case "eval":
			row.find(".mlink").attr("name", action);
			row.find(".mlink").removeClass('hidden');
			row.find("[name=submenu]").addClass('hidden');
			row.find("[name=app]").addClass('hidden');
			$(button).next("input").addClass('hidden');;
			if(!initial) // autocomplete on
			{
				$( ".mlink" ).autocomplete({
					source: jsFunctions
				});
			}
			break;
	}
}

// inits and opens iconpicker for icon selector when icon clicked
// determine also iconpicker to close when icon selected
function iconPicker( img )
{
	var div = $(img).next('div');
	div.addClass( "iconselectorOpen" );
	div.find(".selecticon").imagepicker({
		hide_select : true,
		show_label  : false,
		selected : function( val ) {
			if( val.value() == "" ) {
				$(img).attr('src', 'css/images/noicon.png' );
			} else {
				$(img).attr('src', '../'+ val.value() ); 
				$(img).attr('title', val.value() ); 
			}
			div.removeClass( "iconselectorOpen" ); 
		} // sets thumbnail and closes popup
	});
	
	div.find("img").each( function( i, img ){
		var del = $("<span class='ui-icon ui-icon-trash' title='Delete this image' style='cursor:pointer;'></span>");
		del.click(  function( ) {
			$.get("delete.php?delete=" + $(img).attr('src'), function(data){
				showMessage( data );
			} );
		});
		$(img).after( del );
	} );
}

function showMessage( msg, time )
{
	time = time || 5;
	$('#info').html( msg );
	$('#info').show();
	setTimeout( function(){ $('#info').html("");$('#info').hide();}, time * 1000 );
}

// refreshes selectboxes (with mutable selections) when selections changed, eg. added/removed/renamed menus
function refreshSelectBoxes( refreshInfo )
{
		
	var selections = $.map( $("input.subname[name=title]"), function(field){ return $(field).val();}) ;
	$(".selectsubmenu").each( function(i){
		var current = $(this);
		var selected = current.val();
		
		// if deleted submenu index is lower than current, it must be reduced by one to match right id again
		if( refreshInfo && refreshInfo.hasOwnProperty('removedTabId') )
		{
			var menuid = parseInt( refreshInfo.removedTabId.substring(3) ); // "tab(\d+)"
			if( menuid < selected )
			{
				if( --selected <= 0 ) // decrease by one
					selected = "NONE"; // or set NONE
			}
			else if( menuid == selected )
				selected = "NONE";
		}
		current.empty(); // clear and rebuild options
		current.append("<option value='NONE'"+(selected == "NONE"? " selected":"")+">No</option>");
		$.each( selections, function( j, title ){
			current.append("<option value='"+j+"'"+(selected == j? " selected":"")+">"+ title +"</option>");
		});
	});
}

// occurs when dom ready
$(function() {
	console.log( "documentloadtime " + documentloadtime.stop() );
	var tabs = $( "#tabs" ).tabs();
	
	var loadtime = new Timer();
	// read menus from file and create menu tabs and their content
	showMessage("Loading menus...", 5);
	$.ajax( {
		url : "../config.json",
		success : function( data, status, xhr ){
			
			console.log( "loadtime " + loadtime.stop() );
			console.log( xhr.getResponseHeader('Last-Modified') );
			menus = data.menus; 
			
			$('#icondelay').val( data.icondelay );
			// build menus dynamically
			var tabstime = new Timer();
			$.each( menus, function( i, menu ){
				addMenuTab(menu);
			} );
			
			tabs.find("input[name=apptype]").each( function(i, button){
				// initialize row to show correct selections for specific apptype
				changeAction( button, $(button).attr('value') );
			});
			
			tabs.tabs( "refresh" );
			
			console.log( "tabstime " + tabstime.stop() );
			
			tabs.tabs({ active: 0 });
			showMessage("Ready!", 3);
			lastModified = xhr.getResponseHeader('Last-Modified');
			
			
			// detect remote changes when editor is active
			window.addEventListener("focus", function(event) {
				checkModified();
				lastModifiedTimer = setInterval( checkModified, 10000);
			}, false);
			
			// set checking off when window is not active
			window.addEventListener("blur", function(event) { 
				clearInterval( lastModifiedTimer );
				lastModifiedTimer = null;
			}, false);
			
			// start checking for the first time as focus event appeared before event listener was attached
			if( lastModifiedTimer == null )
				lastModifiedTimer = setInterval( checkModified, 10000);
		},
		error : function(){
			addMenuTab( {title : "Main", center : 0, items : []} );
			tabs.tabs({ active: 0 });
			showMessage("Error loading configuration!", 10);
		} 
	});
	
	// adds new menu tab + editor and fills contents to editor fields
	var tabCounter = 0;
	function addMenuTab( menu ) {
		var label = "Menu " + tabCounter,
		id = "tab" + tabCounter;
		tabs.find( ".ui-tabs-nav" ).append( $("<li><a href='#"+ id +"'>" + menu.title +"</a> <span class='ui-icon ui-icon-close' role='presentation'>Remove Tab</span></li>") );
		tabs.append( $("<div id='" + id + "'></div>").append( createMenuEditor(menu, tabCounter) ) );
		tabCounter++
	}
	
	
	 $( "#add_tab" ).button().click(function() {
		addMenuTab( { title : "New Menu", center : 0, items : [] }  );
		tabs.tabs( "refresh" );
		refreshSelectBoxes();
	});

	tabs.delegate( "span.ui-icon-close", "click", function() {
		var panelId = $( this ).closest( "li" ).remove().attr( "aria-controls" );
		$( "#" + panelId ).remove();
		tabs.tabs( "refresh" );
		refreshSelectBoxes( { removedTabId : panelId } );
	});
	
	$( "#saveButton" ).click(  function( ) {
		if( lastModifiedTimer )
			clearInterval( lastModifiedTimer );
		var output = { menus : [], icondelay : $('#icondelay').val() };
		$.each( $( "form.menu" ), function(num, form){
			var menu = { center : 0, title : $(form).find('input.subname[name=title]').val(), items : [] };
			// old way from textbox parseInt( $(form).find('input[name=center]').val() )
			$(form).find("tr[name=item]").each( function(index){
				var item = {};
				// get all inputs from one row. select those which contains data.
				$.each( $(this).find(':input').serializeArray(), function( i, field ) {
					if( field.value == "" || field.value == "NONE" || field.value == "undefined" )
						return; // do not add empty fields at all
					if( field.name == "center" ) // SPECIAL: this is the centered item. (not items own property)
					{
						menu.center = index;
						return;
					}
					item[ field.name ] = ( $.isNumeric( field.value )? parseFloat( field.value ) : field.value); // convert numeric to numbers
				});
				menu.items.push( item );
			});
			
			output.menus.push( menu );
		});
		// output is ready to save (in correct config.json form)
		//console.log( output );
		
		$.ajax({
			data : JSON.stringify( output ),
			//dataType : "json",
			url : "save.php?save=config",
			//url : "http://mhp.sofiadigital.fi:8080/debug.jsp",
			//contentType : 'text/html',
			type : 'POST',
			success: function( data, satus, xhr ) {
				console.log( data );
				showMessage( data.message );
				lastModified = xhr.getResponseHeader('Date');
				console.log( lastModified );
				if( lastModifiedTimer )
					clearInterval( lastModifiedTimer );
				lastModifiedTimer = setInterval( checkModified, 10000);
			}
		});
	});
	
	// load css to editor
	// load user.css if set.
	$.get( "css.php", function(data){
		$("#csseditor").val( data );
	}).error( function(a,b,c){
		$("#csseditor").val( "/* No any css files found. Edit CSS here and save the file */" );
	});
	
	$( "#saveCssButton" ).click(  function( ) {
		var output = $('#csseditor').val();
		$.ajax({
			data : output,
			url : "save.php?save=css",
			type : "post"
		}).always(function( data ) {
			showMessage( data.responseText );
		});
	});
	$( "#restoreCssDefaultsButton" ).click(  function( ) {
		$.ajax({ data : "", url : "save.php?save=css", type : "post"}).always(function( data ) {
			window.location.href = "./"; // reload page to get original css tile easily
		});
	});
	$( "#editcss,#cancelEditCss" ).click(  function( ) {
		$( "#cssContainer" ).toggleClass('cssContainerOpen');
	});
	
	// create app library selections
	$.get("apps.php?action=list", function(list){
		applib = [];
		if( list == null )
			return;
		$.each(list, function(i, app){
			applib.push( { name : app, url : window.location.href.replace(/editor\/?(index\.php)?/,"upload/") + app + "/" } );
		});
	});
	
	// create Video library selections
	$.get("videos.php?action=list", function(list){
		videolib = [];
		if( list == null )
			return;
		$.each(list, function(i, app){
			videolib.push( { name : app, url : window.location.href.replace(/editor\/?(index\.php)?/,"videos/") + app } );
		});
	});
	
	// get javascript function names for eval attributes autosuggest
	$.get("getJsFunctions.php", function(result){
		jsFunctions = result;
		$( ".mlink[name=eval]" ).autocomplete({
			source: jsFunctions
		});
	}, "json");
});

// ############      Helpers / Debugging / other stuff      #####################################################################

// timer to find out where lags

/*
 eg. in loop 
	var timer = new Timer(); // timer starts
	// stuff that will be timed here
	console.log( timer.stop() ); // to see time consumption in console
*/

var timers = [];

function Timer()
{
	this.startTime = new Date();
	this.stopTime = 0;
	var self = this;
	
	this.start = function()
	{ 
		self.startTime = new Date();
	}
	this.stop = function()
	{
		self.stopTime = new Date();
		return self.diff();
	}
	this.diff = function()
	{
		var diffms = ( self.stopTime.getSeconds() - self.startTime.getSeconds() ) * 1000 + ( self.stopTime.getMilliseconds() - self.startTime.getMilliseconds() );
		return diffms / 1000;
	}
}

// ############      old stuff used      #####################################################################


function moveDown(elem) {
	var row = elem.parentElement.parentElement;
	if (row.nextElementSibling) {
		row.parentElement.insertBefore(row,row.nextElementSibling.nextElementSibling);
	}
}
function moveUp(elem) {
	var row = elem.parentElement.parentElement;
	if (row.previousElementSibling) {
		row.parentElement.insertBefore(row,row.previousElementSibling);
	}
}
function removeRow(elem) {
	var row = elem.parentElement.parentElement;
	row.parentElement.removeChild(row);
}


// ############       events      #####################################################################

function fillEvent(name) {
	if (name=="demo1") {
		document.event.evt_url.value = "http://mhp.sofiadigital.fi/services/hbbtv_demo/item_page_009_001.html";
		document.event.evt_img.value = "http://tvportal.sofiadigital.tv/jtetest/launcher_dev/icons/iconify_blue.png";
		document.event.evt_x.value = "50";
		document.event.evt_y.value = "50";
		document.event.evt_delay.value = "10";
		for (i=0;i<document.event.evt_vk.length;i++) {
			if (document.event.evt_vk[i].value == "VK_GREEN") {
				document.event.evt_vk[i].selected = true;
			} else {
				document.event.evt_vk[i].selected = false;
			}
		}
	}
}

function saveEvent() {
	document.event.submit();
}

//http://phrogz.net/common/attachevent.js

//*** This code is copyright 2003 by Gavin Kistner, gavin@refinery.com
//*** It is covered under the license viewable at http://phrogz.net/JS/_ReuseLicense.txt
//*** Reuse or modification is free provided you abide by the terms of that license.
//*** (Including the first two lines above in your source code satisfies the conditions.)


//***Cross browser attach event function. For 'evt' pass a string value with the leading "on" omitted
//***e.g. AttachEvent(window,'load',MyFunctionNameWithoutParenthesis,false);

function AttachEvent(obj,evt,fnc,useCapture){
	if (!useCapture) useCapture=false;
	if (obj.addEventListener){
		obj.addEventListener(evt,fnc,useCapture);
		return true;
	} else if (obj.attachEvent) return obj.attachEvent("on"+evt,fnc);
	else{
		MyAttachEvent(obj,evt,fnc);
		obj['on'+evt]=function(){ MyFireEvent(obj,evt) };
	}
} 

//The following are for browsers like NS4 or IE5Mac which don't support either
//attachEvent or addEventListener
function MyAttachEvent(obj,evt,fnc){
	if (!obj.myEvents) obj.myEvents={};
	if (!obj.myEvents[evt]) obj.myEvents[evt]=[];
	var evts = obj.myEvents[evt];
	evts[evts.length]=fnc;
}
function MyFireEvent(obj,evt){
	if (!obj || !obj.myEvents || !obj.myEvents[evt]) return;
	var evts = obj.myEvents[evt];
	for (var i=0,len=evts.length;i<len;i++) evts[i]();
}

