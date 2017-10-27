/* 
	original console.log is replaced by function that saves all arguments passed to console.log and then passes them forward to original console.log
*/

var applog = [];
var originalLog = console.log;
console.log = function(){ 
	if( arguments[0][0] == "[" ) return; // this will erase dashjs console
	applog.push( Array.apply(this, arguments).map( function(argument){ return XMLEscape( typeof argument == "string"? argument : JSON.stringify( argument ) ) } ) ); 
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

function debug(){
	if( !$("#debugScreen")[0] ){
		$("body").append('<div id="debugScreen"><div id="debugText"></div></div>');
	}
	var textArea = $("#debugText");
	$.each( arguments, function( i, object ){
		textArea.append( XMLEscape( typeof object == "string"? object : JSON.stringify( object ) ) + "<br/>"); 
	} );
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

