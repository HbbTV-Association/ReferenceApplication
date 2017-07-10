
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
		console.log = debug;
	}
		
}
