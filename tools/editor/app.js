"use strict";
/* Simple Refapp "catalogue/config.json" Menu Editor */

/*var checkLoad = function(counter) {
  counter++;
  if (document.readyState != "complete" && counter<1000) {
	var fn = function() { checkLoad(counter); };
	setTimeout(fn,10);
  } else init(counter);
};
checkLoad(0);*/
init(0);

function init(counter) {
	// acttivate "?tab=3" 0..n tab or first one
	var idxTab = parseInt(getURLParam(window.location.href, "tab","-1"));
	loadConfig(idxTab);
	setRetval("&nbsp;", "modified");
	setRetval( getYMDHMS() +" loading config");
}

//FIXME: finish CSS stylesheet

// { menus: [
//    { title: "Tab 1", items:[ { title,url,..}, {..} ] }
//    { title: "Tab 2", items:[ .. ] }
// ]}
// { "title": "My video 1",
//   "url": "https://server.com/videos/video1.mpd",
//   "drm": "playready",
//   "la_url": "https://license.com/laurl",
//   "la_url_id": "${ep_Prod1236}",
//   "desc": "My test video 1"
//   "img": "icons/icons_1x1_1080p.png",
//   "app": 6,
//   ,"live": true
//   ,"eval": ""
//   , "profile": ["oipf","html5","mse-eme"]
//   , "subtitles": [ .. ]
//   , "adBreaks": [ .. ]
// }
var objMenu = {};
var objPopupDivItem = null; // current <DIV> list element in a popup editor

function loadConfig(idxTab) {
	// 1a) https://server.com/refappeditor/
	// 1b) https://server.com/refapp/editor/
	// 2 ) https://server.com/refapp/catalogue/
	var url="../catalogue/config.json?r="+ Date.now();
	var fn=function(xhr) {
		if(xhr.status<200 || xhr.status>299) {
			setRetval( getYMDHMS() +" loading a config failed "+ xhr.status );
			return;
		}
		var obj = JSON.parse(xhr.responseText);
		setRetval( getYMDHMS() +" config loaded");
		objMenu = convertDataModel(obj);
		
		renderTabs(objMenu.menus);		
		var tab = getTabByIndex(idxTab>=0 ? idxTab : 0);
		if(tab==null) tab = getTabByIndex(0);
		if(tab) tab.click();	
	};
	ajaxGet(url, null, fn);
	
	document.getElementById("menuItemAdd").addEventListener("click", onMenuItemAddClicked);
}

function convertDataModel(obj) {
// convert refapp configjson to an internal json model
	var objRetval = { menus:[] };
	for(var idx=0; idx<obj.menus[0].items.length; idx++) {
		var item = obj.menus[0].items[idx];
		var menuItem = {
			title: item.title, // tabsheet title(top-level menu)
			items: [] // 0..n media items
		};

		// submenu 1..n points to the submenu items
		var menuIdx = item.submenu || -1; // submenu 0..n points to the submenu items
		if(menuIdx >= 1 && obj.menus.length>menuIdx)
			menuItem.items = obj.menus[menuIdx].items;

		objRetval.menus.push(menuItem);
	}
	return objRetval;
}

function saveConfig(idxTab, fnRetval) {
// convert internal json to refapp configjson, 
// save to server, refresh UI
	var objConfig = { menus: [], icondelay: "10" };

	// first item is a list of tabsheets, configArray[0]
	var objConfigMenu = { 
		center: 1, title: "Main", items: []
	};
	objConfig.menus.push(objConfigMenu);
	for(var idxTab=0; idxTab<objMenu.menus.length; idxTab++) {
		objConfigMenu.items.push({
			title: objMenu.menus[idxTab].title, // tabsheet name
			app: 0,
			submenu: idxTab+1 // 1..n index in configArray
		});
	}
	
	// loop tabs and items on each tab, append to configArray[1..n]
	for(var idxTab=0; idxTab<objMenu.menus.length; idxTab++) {
		objConfigMenu = { 
			center: 0, 
			title: objMenu.menus[idxTab].title,
			items: []
		};
		objConfig.menus.push(objConfigMenu);
		for(var idxItem=0; idxItem<objMenu.menus[idxTab].items.length; idxItem++) {
			var val;
			var menuItem = objMenu.menus[idxTab].items[idxItem];
			
			// delete empty fields from config item
			val = menuItem.url || "";
			if(val=="") delete menuItem.url;
			val = menuItem.la_url || "";
			if(val=="") delete menuItem.la_url;
			val = menuItem.la_url_id || "";
			if(val=="") delete menuItem.la_url_id;			
			val = menuItem.drm || "";
			if(val=="") delete menuItem.drm;
			val = menuItem.img || "";
			if(val=="") delete menuItem.img; // icons/icons_1x1_1080p.png

			if( (menuItem.live || false)==false ) delete menuItem.live;
			if(menuItem.profile && menuItem.profile.length<1) delete menuItem.profile;

			val = menuItem["eval"] || "";
			if(val=="") {
				menuItem.app = 6; // video item
				delete menuItem["eval"];
			} else {
				menuItem.app = 0; // settings "eval" item
				delete menuItem.live;
			}

			objConfigMenu.items.push(menuItem);
		}
	}
	
	var data = JSON.stringify(objConfig, null, 3);
	console.log(data);

	var fn=function(xhr) {
		fnRetval(xhr);
	};
	ajaxCall("POST", "application/json; charset=UTF-8", "saveConfig.php", data, fn);
}


function renderTabs(items) {
	var root = document.getElementById("tabs");
	while(root.firstChild) { // remove all child elements
		root.firstChild.remove();
	}	
	for(var idx=0; idx<items.length; idx++) {
		var item = items[idx];
		var domItem = document.createElement("span"); 		
		domItem.setAttribute("data-bind", "tab="+idx);
		domItem.setAttribute("class", idx==0 ? "tab active" : "tab");
		domItem.innerText = item.title;
		domItem.addEventListener("click", onTabClicked);
		root.appendChild(domItem);
	}
}

function renderItems(items) {
	var root = document.getElementById("menuItems");
	while(root.firstChild) { // remove all child elements
		root.firstChild.remove();
	}
	var itemTemplate = document.getElementById("menuItemTemplate");	
	for(var idx=0; idx<items.length; idx++) {
		var item = items[idx];
		var elem = itemTemplate.content.cloneNode(true);
		if (renderItem(elem, idx, item))
			root.appendChild(elem);
	}
}

function renderItem(rootElem, itemIdx, item) {
	if(rootElem==null) return;
	var elem, val;
	if(itemIdx>=0) {
		// remember index of json array
		elem=getChildElementByAttribute("data-bind", "keyidx", rootElem);
		if(elem!=null) elem.setAttribute("data-bind", "item="+itemIdx);
	} // this is an existing div item?

	elem=getChildElementByAttribute("data-bind", "title", rootElem);
	elem.innerText = item.title || "(title)";
	elem.addEventListener("click", onItemClicked);

	val = item.url || "";
	if(val=="") val = item["eval"] || "";
	elem=getChildElementByAttribute("data-bind", "url", rootElem);
	if(elem!=null) elem.innerText = val;

	elem=getChildElementByAttribute("data-bind", "drm", rootElem);
	if(elem!=null) elem.innerText = item.drm || "";

	// show "${ep_Prod1236}" id or static laurl value
	val = item.la_url_id || "";
	if(val.indexOf("${")!=0) val = item.la_url || "";
	elem=getChildElementByAttribute("data-bind", "laurl", rootElem);
	if(elem!=null) elem.innerText = val;

	elem=getChildElementByAttribute("data-bind", "desc", rootElem);
	if(elem!=null) elem.innerText = item.desc || "";
	
	return true;
}

function onItemClicked(event) {
	var sender = getParentElementByClass("menuItem", event.target);
	objPopupDivItem = sender; // remember current div element
	formPopup_open(sender, "menuItemForm");
}

function onMenuItemAddClicked(event) {
	objPopupDivItem = null;
	formPopup_open(event.target, "menuItemForm");
}

function onReloadClicked(sender) {
	var tab = getActiveTab();
	var strBind = tab.getAttribute("data-bind"); // "tab=2"
	var idxTab = parseInt(getURLParam(strBind, "tab", "-1"));	
	loadConfig(idxTab);
	setRetval("&nbsp;", "modified");
}

function onSaveConfigClicked(sender) {
	var tab = getActiveTab();
	var strBind = tab.getAttribute("data-bind"); // "tab=2"
	var idxTab = parseInt(getURLParam(strBind, "tab", "-1"));
	
	var fn=function(xhr) {
		if(xhr.status<200 || xhr.status>299) {
			setRetval( getYMDHMS() +" saving a config failed "+ xhr.status );
			return;
		}
		setRetval( getYMDHMS() +" config saved");

		setTimeout(function(){
			loadConfig(idxTab);	
		},1000);
	};
	saveConfig(idxTab, fn);
	setRetval("&nbsp;", "modified");
}

function renderPopupDiv(sender, frm) {
// write values to dialog box, sender is <DIV> element
	var strBind=sender.getAttribute("data-bind"); // "item=10"  0..n in objMenu[tabIdx].items[idx] array
	var idxItem = parseInt(getURLParam(strBind, "item", "-1")); // -1=add new item

	var tab= getActiveTab();
	strBind= tab.getAttribute("data-bind"); // "tab=2"
	var idxTab = parseInt(getURLParam(strBind, "tab", "-1"));
	if(idxTab<0) {
		setRetval( getYMDHMS() +" error objMenu.item not found");
		return false;
	}
	
	var item = idxItem>=0 ? objMenu.menus[idxTab].items[idxItem] : {};
	getChildElementById("title", frm).value = item.title || "";
	getChildElementById("url", frm).value = item.url || "";
	getChildElementById("eval", frm).value = item["eval"] || "";
	getChildElementById("live", frm).checked = (item.live || false);
	getChildElementById("desc", frm).innerText = item.desc || ""; // multiline <DIV> editbox

	getChildElementById("laurl", frm).value = item.la_url || ""; // static laurl 
	getChildElementById("laurlid", frm).value = item.la_url_id || ""; // dynamic laurl id
	
	getChildElementById("img", frm).value = item.img || "";
	
	var val = item.drm || ""; // playready,widevine,marlin,clearkey
	var elem = getChildElementById("drm_"+val, frm);
	if(elem!=null) {
		elem.checked=true;
		getChildElementById("drmc", frm).value = "";
	} else {
		getChildElementById("drm_custom", frm).checked=true;
		getChildElementById("drmc", frm).value = val;
	}

	// uncheck profile values, then enable 0..n values
    var arrItems = [ "oipf", "html5", "mse-eme" ];
	for(var idx=0; idx < arrItems.length; idx++) {
		getChildElementById("profile_"+arrItems[idx], frm).checked=false;		
	}
	for(var idx=0; idx < (item.profile ? item.profile.length : 0); idx++) {
		val = item.profile[idx];
		var elem = getChildElementById("profile_"+val, frm);
		if(elem) elem.checked=true;		
	}
		
	var elem=getChildElementById("databind", frm);
	elem.setAttribute("data-bind", "tab="+idxTab+"&item="+idxItem);
	return true;
}

function onTabClicked(event) {
	var sender = event.target;
	var strBind= sender.getAttribute("data-bind"); // "tab=0"
	var idx = parseInt(getURLParam(strBind, "tab", "-1"));	
	var menuItem= objMenu.menus[idx];
	renderItems(menuItem.items);
	objPopupDivItem=null; // forget current <DIV> even if popup dialog is still open
	
	// toggle "active" tab
	var tab = getChildElementByType("span", document.getElementById("tabs"));
	while(tab) {
		tab.classList.remove("active");
		tab = getNextSiblingElementByType("span", tab);
	}
	sender.classList.add("active");
}

function onSavePopupDiv(frm, objPopupDivItem) {
// save popup values to json object,
// refresh UI element
	var elem=getChildElementById("databind", frm);
	var strBind=elem.getAttribute("data-bind");
	var idxTab = parseInt(getURLParam(strBind, "tab", "-1"));
	var idxItem= parseInt(getURLParam(strBind, "item", "-1"));
	if(idxTab<0) {
		setRetval( getYMDHMS() +" error objMenu.item not found");
		return false;
	}
	
	var item;
	if(idxItem>=0) {
		item = objMenu.menus[idxTab].items[idxItem]; // update existing object
	} else {
		item = {}; // append a new object to the end of list
		objMenu.menus[idxTab].items.push(item);		
	}
	
	item.title  = getChildElementById("title", frm).value.trim();
	item.url    = getChildElementById("url", frm).value.trim();
	item["eval"]= getChildElementById("eval", frm).value.trim();
	item.live   = getChildElementById("live", frm).checked;
	item.img    = getChildElementById("img", frm).value.trim();
	
	item.la_url = getChildElementById("laurl", frm).value.trim();
	item.la_url_id = getChildElementById("laurlid", frm).value.trim();
	
	item.desc  = getChildElementById("desc", frm).innerText.trim(); // multiline <DIV> editbox

    var arrItems = [ "", "playready", "widevine", "clearkey", "custom" ];
	elem=null;
	for(var idx=0; idx < arrItems.length; idx++) {
		elem = getChildElementById("drm_"+arrItems[idx], frm);
		if(!elem) {
			elem=null;
			break;
		} else if (elem.checked) break;
		elem=null;
	}
	var val = elem ? elem.value.trim() : "";
	item.drm = val != "custom" ? val : getChildElementById("drmc",frm).value.trim();

	// profile 0..n values
    arrItems = [ "oipf", "html5", "mse-eme" ];
	for(var idx=arrItems.length-1; idx>=0; idx--) {
		elem = getChildElementById("profile_"+arrItems[idx], frm);
		if(!elem.checked) arrItems.splice(idx,1); // remove item from array
	}
	item.profile = arrItems;

	setRetval( getYMDHMS() +` pending changes in a config, \'${item.title}\' was modified`, "modified");
	if(objPopupDivItem!=null)
		renderItem(objPopupDivItem, -1, item);	 // re-render UI item
	return true;
}

function onDeletePopupDiv(frm, objPopupDivItem) {
	var elem=getChildElementById("databind", frm);
	var strBind=elem.getAttribute("data-bind");
	var idxTab = parseInt(getURLParam(strBind, "tab", "-1"));
	var idxItem= parseInt(getURLParam(strBind, "item", "-1"));
	if(idxTab<0) {
		setRetval( getYMDHMS() +" error objMenu.item not found");
		return false;
	} else if (idxItem<0) return false;

	var title = objMenu.menus[idxTab].items[idxItem].title;
	objMenu.menus[idxTab].items.splice(idxItem, 1); // remove item from array
	
	setRetval( getYMDHMS() +` pending changes in a config, \'${title}\' was deleted`, "modified");
	if(objPopupDivItem!=null)
		objPopupDivItem.remove(); // remove <DIV> from UI
	return true;
}

function getActiveTab() {
// find active tabsheet
	var idxTab = -1;
	var tab = getChildElementByType("span", document.getElementById("tabs"));
	while(tab) {
		if(Array.from(tab.classList).indexOf("active")>=0)
			return tab;
		tab = getNextSiblingElementByType("span", tab);
	}
	return null;
}
function getTabByIndex(idxTab) {
// get tab by 0..n index number	
	var tab = getChildElementByType("span", document.getElementById("tabs"));
	var idx=-1;
	while(tab) {
		idx++;
		if(idx==idxTab) return tab;
		tab = getNextSiblingElementByType("span", tab);
	}
	return null;
}

function setRetval(str, id) {
	id = "retval" + (id ? "-"+id : ""); // "retval", "retval-modified"
	var elem = document.getElementById(id);
	if(elem) {
		if(str=="&nbsp;") elem.innerHTML = str;
		else elem.innerText = str;
	}
}

/************************************************************
 * utils
 ************************************************************/

function getYMDHMS(objDate) {
	if(!objDate) objDate=new Date();
	var arrYMD = new Array();
	arrYMD[0] = objDate.getFullYear();
	arrYMD[1] = objDate.getMonth()+1;
	arrYMD[2] = objDate.getDate();		  
	var arrHMS = new Array();
	arrHMS[0] = objDate.getHours();
	arrHMS[1] = objDate.getMinutes();
	arrHMS[2] = objDate.getSeconds();
	return ( 
		(arrYMD[0] < 10 ? "0" + arrYMD[0] : arrYMD[0]) + "-" +
		(arrYMD[1] < 10 ? "0" + arrYMD[1] : arrYMD[1]) + "-" +
		(arrYMD[2] < 10 ? "0" + arrYMD[2] : arrYMD[2]) +
		"T" +
		(arrHMS[0] < 10 ? "0" + arrHMS[0] : arrHMS[0]) + ":" +
		(arrHMS[1] < 10 ? "0" + arrHMS[1] : arrHMS[1]) + ":" +
		(arrHMS[2] < 10 ? "0" + arrHMS[2] : arrHMS[2])
	);
}

// parse parameter value from url (case sensitive)
function getURLParam(strURL, strKey, strDef) {
   // "http://mywebapp/do.url?key1=val1&key2=val2", "key1=val1&key2=val2"
   if(!strURL || strURL=="") return strDef;   
   if(strURL.indexOf("?")<0) strURL="?"+strURL;
   var idx = strURL.indexOf("?");
	 
   // "&key1=val1&key2=val2&"
   strURL = "&" + strURL.substring(idx+1) + "&";
   idx = strURL.indexOf("&" + strKey + "=");
   if (idx < 0) return strDef; // param not found
	 
   // "&key1=val1&key2=val2&" -> "val1&key2=val2&" -> "val1"
   strURL = strURL.substring(idx + strKey.length + 2);
   idx = strURL.indexOf("&");	 
   return strURL.substring(0, idx);
}

/************************************************************
 * formPopup
 ************************************************************/

function formPopup_open(sender, frmId) {
	// sender is a parent item <DIV> or AddNew <BUTTON>
	var frm = document.getElementById(frmId);
	frm.style.position = "absolute";
	frm.style.display = "block"; // make visible before X,Y coords

	var x = (window.innerWidth / 2) - (frm.offsetWidth / 2);
	var y = sender.offsetTop - frm.offsetHeight;
	if(y<10) y = 10;
	//setRetval("wiw="+window.innerWidth
	//	+ ",wih="+window.innerHeight
	//	+ "|ow="+frm.offsetWidth+",oh="+frm.offsetHeight
	//	+ "|sx="+sender.offsetLeft+",sy="+sender.offsetTop
	//	+ ",xy="+x+","+y
	//);
	frm.style.left=x+"px";
	frm.style.top=y+"px"
	
	if(renderPopupDiv(sender, frm)) {
		var field = getChildElementById("title", frm);
		field.setSelectionRange(field.value.length, field.value.length); // cursor to the end of field
		field.focus();
	} else {
		formPopup_clicked_cancel(frmId);
	}
}

function formPopup_clicked_ok(sender) {
	var frm=getParentElementByClass("formPopup",sender);
	frm.style.display="none";
	
	var retval=onSavePopupDiv(frm, objPopupDivItem); // save form fields to json item, re-render UI item
	if(!retval) return;
	
	if(objPopupDivItem==null) {
		var tab = getActiveTab();
		if(tab) tab.click(); // click on the tab to render all items
	}
	objPopupDivItem = null;
}
function formPopup_clicked_cancel(sender) {
	objPopupDivItem = null;
	var frm = typeof(sender) == "string" ?
		document.getElementById(sender) :
		getParentElementByClass("formPopup",sender);
	frm.style.display="none";
}

function formPopup_clicked_delete(sender) {	
	var frm = typeof(sender) == "string" ?
		document.getElementById(sender) :
		getParentElementByClass("formPopup",sender);
	var retval=onDeletePopupDiv(frm, objPopupDivItem); // remove item from json array
	if(!retval) return;
	
	formPopup_clicked_cancel(sender);
	// render UI list to use a new 0..n databind index ordering
	var tab = getActiveTab();
	if(tab) tab.click(); // click on the tab to render all items	
}


function formPopup_onKeyPress(sender, evt, btnType) {
	// onkeypress,onkeydown
	var key=evt.keyCode || e.which;
	if(key==13 && btnType==="cancel") key=27; // ENTER on button(cancel) should use ESC key

	if (key==13) { // ENTER
		sender.blur(); // trigger lostFocus function
		formPopup_clicked_ok(sender);
	} else if (key==27) { // ESC
		sender.blur();
		formPopup_clicked_cancel(sender);
	}
}


/************************************************************
 * Parent-Child getters
 ************************************************************/

// Loop element tree and return parent element by class attribute.
function getParentElementByClass(strClass, elem) {
	var parentObj = elem;
	strClass = " " + strClass + " "; // delim multiple class items
	while(parentObj!=null) {
		parentObj = parentObj.parentNode;
		if (parentObj == undefined) parentObj=null;
		else if (parentObj == document) parentObj=null;
		else {
			var stemp = parentObj.getAttribute("class");
			if (stemp != null && (" "+stemp+" ").indexOf(strClass)>=0) break;
		}
	}
	return parentObj;
}

// Loop element tree and return parent element by type.
function getParentElementByType(strType, elem) {
	strType = strType.toUpperCase();
	var parentObj = elem;
	while(parentObj!=null) {
		parentObj = parentObj.parentNode;
		if (parentObj == undefined) parentObj=null;
		else if (parentObj == document) parentObj=null;
		else if (parentObj.nodeName == strType) break;
	}
	return parentObj;
}

// Loop element tree and return child element by id attribute.
function getChildElementById(strId, elem) {
	for(var idx=0; idx < elem.childNodes.length; idx++) {
	  if (elem.childNodes[idx].nodeType != 1) continue; // skip non-element types

	  if (strId == elem.childNodes[idx].getAttribute("id")) 
	    return elem.childNodes[idx];
	  if (elem.childNodes[idx].childNodes.length > 0) {
	    var retval = getChildElementById(strId, elem.childNodes[idx]);
	    if (retval != null) return retval;
	  }
	}
	return null;
}

function getChildElementByType(strType, elem) {
	strType=strType.toUpperCase(); // html always return UCASE node names
	for(var idx=0; idx < elem.childNodes.length; idx++) {
		  if (elem.childNodes[idx].nodeType != 1) continue; // skip non-element types
		  if (strType == elem.childNodes[idx].nodeName) 
			    return elem.childNodes[idx];
		  if (elem.childNodes[idx].childNodes.length > 0) {
		    var retval = getChildElementByType(strType, elem.childNodes[idx]);
		    if (retval != null) return retval;
		  }
	}
	return null;
}

//Loop element tree and return next sibling element by type
function getNextSiblingElementByType(strType, elem) {
	strType = strType.toUpperCase();
	var obj=elem;
	while(obj!=null) {
		obj = obj.nextSibling;
		if (obj==null) break;
		else if (obj.nodeName == strType) break;
	}
	return obj;
}

//function getElementTop(elem) {
//  return elem.offsetTop + (elem.offsetParent && getElementTop(elem.offsetParent));
//}

function getChildElementByAttribute(strName, strValue, elem) {
	for(var idx=0; idx < elem.childNodes.length; idx++) {
		  if (elem.childNodes[idx].nodeType != 1) continue; // skip non-element types
		  var node = elem.childNodes[idx];
		  for(var idxB=0; idxB<node.attributes.length; idxB++) {
			  if (strName==node.attributes[idxB].name
					  && strValue==node.attributes[idxB].value)
				  return node;
		  }
		  if (elem.childNodes[idx].childNodes.length > 0) {
		    var retval = getChildElementByAttribute(strName, strValue, elem.childNodes[idx]);
		    if (retval != null) return retval;
		  }
	}
	return null;
}


/************************************************************
 * Ajax
 ************************************************************/

// POST: post name-value pair form to destination url (always use UTF-8 charset)
// strURL: destination url without trailing ? queryString delimiter
// params: query parameters, either string or name-value pairs
//     var params = new Object();
//     params['key1'] = 'value1';
// callbackFunc: invoke callback(xmlHttpRequest) after request is completed
function ajaxPost(strURL, params, callbackFunc) {
   return ajaxCall('POST', 'application/x-www-form-urlencoded; charset=UTF-8', 
      strURL, params, callbackFunc);
}

// GET: get name-value pair url to destination url (always use text/plain; charset=UTF-8 content-type)
function ajaxGet(strURL, params, callbackFunc) {
  return ajaxCall('GET', 'text/plain; charset=UTF-8', strURL, params, callbackFunc);
}

// ajaxCall
function ajaxCall(strMethod, strContentType, strURL, params, callbackFunc) {
    var xmlHttpReq = false;
    if (window.XMLHttpRequest) {
       // Mozilla/Safari
       xmlHttpReq = new XMLHttpRequest();
    } else if (window.ActiveXObject) {
       // IE
       try {
         xmlHttpReq = new ActiveXObject("Microsoft.XMLHTTP");
       } catch (e) {
          try {
             xmlHttpReq = new ActiveXObject("Msxml2.XMLHTTP");
          } catch (e2) {
             xmlHttpReq = false;
          }
       }
    }

    if (!xmlHttpReq) { return false; }

    var strURI = "";
	if(!params) { 
		strURI="";
    } else if (typeof(params) != "string") {
      for (var key in params) { 
        strURI += encodeURIComponent(key) + "=" + encodeURIComponent(params[key]) + "&";
      }
      if (strURI.length > 0) { strURI = strURI.substring(0, strURI.length-1); }      
    } else {
      strURI = params;
    }

    // GET method: concatenate URL and URI parts
    if (strMethod == "GET" && strURI != "") {
       var lastChar = strURL.charAt(strURL.length-1);
       if (lastChar == '?' || lastChar == '&')
          strURL += strURI;
       else if (strURL.indexOf('?') > 0)
          strURL += "&" + strURI;
       else
          strURL += "?" + strURI;
       // clear URI part in get method
       strURI = null;
    }

    // we always use UTF-8 charset, so caller must use encodeURIComponent(str) method
    xmlHttpReq.open(strMethod, strURL, true);
    xmlHttpReq.setRequestHeader('Content-Type', strContentType);
    xmlHttpReq.onreadystatechange = function() {
        // 0=uninit, 1=loading, 2=loaded, 3=interactive, 4=complete
        if (xmlHttpReq.readyState == 4) {
           if (callbackFunc != null) { callbackFunc(xmlHttpReq); }
           // clean-up (fix IE memory leak)
           delete xmlHttpReq['onreadystatechange'];
           xmlHttpReq = null;
        }
    }
    xmlHttpReq.send(strURI);
    return true;
}
