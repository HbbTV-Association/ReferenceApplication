// ############# ERRORS ############################
/* collect all client side errors to buffer and flush it after there is a gap of time between errors
 *requires clientError.php to receive errors at server
 *requires jquery

Copy clientError.php
to html page:
<script type="text/javascript" src="jquery-1.11.0.min.js"></script>
<script type="text/javascript" src="clientError.js"></script>

*/

var errbuffer = [];
var logbuffer = [];
var logtimer = null;
window.onerror = error;

function error(message, url, lineNumber) { 
	if(logtimer)
		clearTimeout( logtimer );
	errbuffer.push( { msg : message, url : url , line : lineNumber } );
	console.log( errbuffer[ errbuffer.length-1 ] );
	logtimer = setTimeout( sendLogs, 2000 ); // call delayed, so all rapidly appearing errors are sent in one request
	return false; // when false, print it also to js console
}; 

function logger( message ) { 
	if(logtimer)
		clearTimeout( logtimer );
	logbuffer.push( { msg : message } );
	console.log( logbuffer[ logbuffer.length-1 ] );
	logtimer = setTimeout( sendLogs, 2000 ); // call delayed, so all rapidly appearing errors are sent in one request
	return false; // when false, print it also to js console
}; 

// send collected errorbuffer to server
function sendLogs()
{
	if( errbuffer.length )
	{
		$.ajax({
			data : JSON.stringify( errbuffer ) ,
			dataType : "json",
			url : "../log.php?type=error",
			type : "post"
		}).always(function( data ) {
			console.log( data.responseText );
		});
	}
	errbuffer = [];
	
	if( logbuffer.length )
	{
		$.ajax({
			data : JSON.stringify( logbuffer ) ,
			dataType : "json",
			url : "../log.php?type=log",
			type : "post"
		}).always(function( data ) {
			console.log( data.responseText );
		});
	}
	logbuffer = [];
	logtimer = null;
}