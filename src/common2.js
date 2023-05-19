/**
 * Common helpers to be used in catalogue or videoplayers
 * - keep new EcmaScript functions here, old devices may not support.
 *
 * @module Common
 */

function getMSEEMECapabilities(){
	// MSEEME browser capabilities
	var keySysConfig = [{
	  "initDataTypes": ["cenc"]
	  //,"persistentState": "required"  // don't use or MacSafari "not supported"
	  //,"persistentState": "required", "distinctiveIdentifier": "required"
	  //,"audioCapabilities": [{
	  //  "contentType": "audio/mp4;codecs=\"mp4a.40.2\""
	  //}]
	  ,"videoCapabilities": [{
		"contentType": "video/mp4;codecs=\"avc1.4D401E\"" // avc1.42E01E = ConstrainedLevel3, 4D401E=MainLevel3
		//,"robustness": "3000"
	  }]
	}];
	
	// clone this config to schemes "cenc","cbcs","cbcs-19"
	var keySysConfigScheme = [{
	  "videoCapabilities": [{
		"contentType": "video/mp4;codecs=\"avc1.4D401E\""
		, "encryptionScheme": "todovalue"
	  }],
	  "audioCapabilities": [{
		  "contentType": "audio/mp4;codecs=\"mp4a.40.2\""
		  , "encryptionScheme": "todovalue"
	  }]
	  //,"initDataTypes": ["keyids"]
	}];	
	
	var propKeys = new Array("cenc","cbcs","cbcs-1-9");
	var propConfigs = {};
	for(var idx=0; idx<propKeys.length; idx++) {
		var kscfg = JSON.parse(JSON.stringify(keySysConfigScheme)); // deep-clone json obj
		kscfg[0].videoCapabilities[0].encryptionScheme=propKeys[idx];
		kscfg[0].audioCapabilities[0].encryptionScheme=propKeys[idx];
		propConfigs[propKeys[idx]]=kscfg;
	}	
	
	// com.microsoft.playready.recommendation.3000=HWDRM, com.microsoft.playready.recommendation=SWDRM	
	var keySystems = {
	  playready: ['com.microsoft.playready.recommendation', 'com.microsoft.playready.recommendation.3000'
	    , 'com.microsoft.playready'
		, 'com.microsoft.playready.hardware' ],
	  widevine: ['com.widevine.alpha'],
	  clearkey: ['org.w3.clearkey', 'webkit-org.w3.clearkey' ],
	  primetime: ['com.adobe.primetime', 'com.adobe.access'],
	  fairplay: ['com.apple.fps'
		, 'com.apple.fps.1_0', 'com.apple.fps.2_0', 'com.apple.fps.3_0']
	};

	console.log("Invoke TestEME async functions");
	var retvalProps={};
	const promTasks=[];
	if(navigator.requestMediaKeySystemAccess) {
		for(let keyArr in keySystems) {
			for(let forItemIdx in keySystems[keyArr]) {
				let sKeySys = keySystems[keyArr][forItemIdx];			
				let promTask= navigator.requestMediaKeySystemAccess(sKeySys, keySysConfig).
				then(function(mediaKeySystemAccess) {
					return { retval:true,  key: keyArr, keySystem: sKeySys, message: "" };
				}).catch(function(ex) {
					if(typeof sKeySys == "string") {
						return { retval:false, key: keyArr, keySystem: sKeySys, message: ex.name+" "+ex.message };
					} else {
						// why sometimes this is a function() retval?
						return { retval:false, key: keyArr, keySystem: "unknown", message: ex.name+" "+ex.message };
					}			
				});
				promTasks.push(promTask);
				
				for(let propKey in propConfigs) {
					promTask= navigator.requestMediaKeySystemAccess(sKeySys, propConfigs[propKey]).
					then(function(mediaKeySystemAccess) {
						retvalProps[sKeySys+"_"+propKey]=true;
						return null;
					}).catch(function(ex) {
						retvalProps[sKeySys+"_"+propKey]=false;
						return null;
					});
					promTasks.push(promTask);
				}
			}
		}
	} else {
		promTasks.push( { retval:false, key: "EME", keySystem: "", message: "navigator.requestMediaKeySystemAccess not found" } );
	}

	Promise.all(promTasks).
	then(function(results){
		var table = $("<div class='verticalMiddle'></div>");
		var sKey="UserAgent"; 
		var sVal = XMLEscape(navigator.userAgent);
		table.append("<div style='display: table-row;background:rgba(0,0,0,0.9);'><div style='display: table-cell;vertical-align: middle; border: 1px solid white;text-align:left !important;'>"+sKey+"</div><div style='display: table-cell;vertical-align: middle;word-break: break-all;border: 1px solid white;text-align:left !important;'>"+ sVal +"</div></div>");

		sKey="MSE";
		sVal="MediaSource="+ ('MediaSource' in window)
			+", MediaKeys="+ ("MediaKeys" in window)
			+", WebKitMediaKeys="+ ("WebKitMediaKeys" in window)
			+", MSMediaKeys="+ ("MSMediaKeys" in window);
		table.append("<div style='display: table-row;background:rgba(0,0,0,0.9);'><div style='display: table-cell;vertical-align: middle; border: 1px solid white;text-align:left !important;'>"+sKey+"</div><div style='display: table-cell;vertical-align: middle;word-break: break-all;border: 1px solid white;text-align:left !important;'>"+ sVal +"</div></div>");
						
		results.forEach(function(result){ // loop OK results
			if(!result || result.retval==false) return;
			var sKey=result.key;
			var sVal = result.keySystem + " supported";
			for(var idx=0; idx<propKeys.length; idx++) {
				var propKey = propKeys[idx];
				sVal += ", "+propKey.toUpperCase()+"="+retvalProps[result.keySystem+"_"+propKey];
			}					
			console.log(sKey+":"+sVal);
			table.append("<div style='display: table-row;background:rgba(0,0,0,0.9);'><div style='display: table-cell;vertical-align: middle;word-break: break-all;border: 1px solid white;text-align:left !important;'>"+sKey+"</div><div style='display: table-cell;vertical-align: middle;word-break: break-all;border: 1px solid white;text-align:left !important;'>"+ sVal +"</div></div>");
		});
		results.forEach(function(result){ // loop ERROR results
			if(!result || result.retval==true || result.keySystem=="unknown") return;
			var sKey=result.key; var sVal = result.keySystem + " not supported ("+result.message+")";
			console.log(sKey+":" + sVal);
			table.append("<div style='display: table-row;background:rgba(0,0,0,0.9);'><div style='display: table-cell;vertical-align: middle;word-break: break-all;border: 1px solid white;text-align:left !important;'>"+sKey+"</div><div style='display: table-cell;vertical-align: middle;word-break: break-all;border: 1px solid white;text-align:left !important;'>"+ sVal +"</div></div>");
		});
		showInfoBox(table);
	}).catch(function(ex) {
		console.log("getMSEEMECapabilities "+ex.name+" "+ex.message);
	});	
}

