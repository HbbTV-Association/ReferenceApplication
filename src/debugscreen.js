/* 
	original console.log is replaced by function that saves all arguments passed to console.log and then passes them forward to original console.log
*/

var applog = [];
var originalLog = console.log;
console.log = function(){
	if( !arguments[0] ){ // ??
		originalLog.apply( this, arguments );
		return;
	}
	if( arguments[0][0] == "[" ) return; // this will erase dashjs console
		
	applog.push( Array.apply(this, arguments).map( function(argument){ 
		return XMLEscape( typeof argument == "string"? argument : JSON.stringify(argument), false,true )
	})); 
	originalLog.apply( this, arguments ); 
	debug( arguments );
};

function saveAppLog(){
	if( applog.length ){
		$.ajax({
			type : "POST",
			data : JSON.stringify( applog ),
			url : "log/save.php",
			contentType : "json",
			success : function(response){
				console.log(response);
				if( response.success ){
					showInfo("Application log has been saved to " + response.log);
					applog = []; // empty log
				}
				else{
					showInfo("Error saving log to file: " + response.message);
				}
			}
		});
	} else{
		showInfo("App log is empty")
	}
}

function debug(lines){
	if( !$("#debugScreen")[0] ){
		$("body").append('<div id="debugScreen"><div id="debugText"></div></div>');
	}
	try{
	var textArea = $("#debugText");
	
	var hasPerformance = typeof( performance ) != "undefined";
	var timestamp = "";
	if( hasPerformance ){
		timestamp = "[" + performance.now() + "ms]: ";
	}
	$.each( lines, function( i, object ){
		var line = "";
		
		if( typeof object == "string" ){
			line = timestamp + XMLEscape(object,false,true);
		}
		else {
			line = timestamp + "[obj] " + XMLEscape(JSON.stringify(object),false,true);
		}
		textArea.append( line + "<br/>");
	} );
	} catch(e){
		showInfo(e.description);
	}
}

function toggleDebug(){
	if( !$("#debugScreen")[0] ){
		$("body").append('<div id="debugScreen"><div id="debugText"></div></div>');
	}
	if( $("#debugScreen").css("display") == "block" ){
		$("#debugScreen").hide();
	}
	else{
		$("#debugScreen").show();
	}
		
}

function displayDebugButton( display, buttonText ){
	if( !$("#debugButton")[0] ){
		$("body").append('<div id="debugButton"><div id="debugButtonText">Debug</div></div>');
	}
	if(buttonText){
		$("#debugButtonText").html( buttonText );
	}
	if( display ){
		$("#debugButton").show();
	}
	else{
		$("#debugButton").hide();
	}
}

