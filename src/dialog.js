
/******************************
	DIALOG Functions
	
	Dialog can be initialized with customizable parameters, buttons, texts, classes many ways
	
	1) use initialization object:
	showDialog({  
		title : "Are you sure...",              
		subtext : "you want to stop playback",             
		buttons : ["Stop", "Cancel"],           
		checkmarks : false,           
		success : function(val){   
			if( val == 0 ){
				stopPlayback();
			}
			else{
				vidobj.play(1);
			}
		}
	});
	
	2) use function parameters
	showDialog("Are you sure...","you want to stop playback", ["Stop", "Cancel"], function( val ){
		if( val == 0 ){
			stopPlayback();
		}
		else{
			vidobj.play(1);
		}
	}, null, null, "nocheckmarks" );
	
	3) combine. Initialization object may be any argument. It will owerride all other set function parameters
	showDialog("Are you sure...","you want to stop playback", ["Stop", "Cancel"], function( val ){
		if( val == 0 ){
			stopPlayback();
		}
		else{
			vidobj.play(1);
		}
	}, {checkmarks : false} );
	
	4) Dialog may be usead as alert box with default ok button (If buttons not declared OK is the default button alone):
	showDialog("Are you sure...");
	
	customizable ui is available via dialog class and other settings:
	
	In init object:
	{
		className : "classname", // sets class name for wrapper element
		checkmarks : false // removes checkmarks. defaults to true.
	}
	
*******************************/
var dialog = { open : false };

// Chained parameter is used if different dialogs are shown subsequently
function showDialog( title, subtext, buttons, callback, _checked, _focused, cls, chained )
{
	console.log( "show dialog" );
	// create object if not created
    
	if( !$("#dialog")[0] ){
		$("body").append( '<div id="dialog" class="hide"><div id="dialogWrapper" class="wrapper"></div><div id="dialog_logo"></div><div id="dialog_time">18:45</div></div>' );
		console.log("dialog div created");
	} 
	
	// defaults. can be overwritten by either parameters or initialization object passed as any argument
	dialog.element = document.getElementById("dialog");
	dialog.checkmarks = true;
	dialog.buttons = Array.isArray( buttons )? buttons : ["OK"];
	dialog.title = ( typeof(title) === "string"? title : "" );
	dialog.subtext = ( typeof(subtext) === "string"? subtext : "" );
	dialog.callback = typeof(callback) === "function"? callback : console.log;
	dialog.checked = isNaN(_checked) ? 0 : _checked;
	dialog.focused = isNaN(_focused) ? 0 : _focused;
	dialog.className = ( typeof(cls) === "string"? cls : "" );
	dialog.visibleItems = 10;
	dialog.open = true;
	dialog.barbuttons = { VK_ENTER : "Select", VK_BACK : "Back" };
    dialog.chained = typeof(chained) === "boolean"? chained : false;
	
	// support for dialog object initializer
    $.each( arguments, function(i, arg){
        if( typeof( arg ) == "object" && !(arg instanceof Array)){
            $.each( arg, function( parameter, value ){
                console.log( parameter, value );
                dialog[ parameter ] = value;
            } );
            return false; // initialization object found. Do not continue
        }
    });
    
	
    // remove all css classes
    $("#dialog").removeClass();
    
	dialog.options = dialog.buttons.length; 
	
	$("#dialog").removeClass("hide");
	$("#dialog").addClass("show");
    
	console.log("set class " + dialog.className);
	
	if(dialog.className && typeof(dialog.className) == "string"){
		$("#dialog").addClass(dialog.className);
	}
	
	// Arrows
	var up_arrow 	= document.createElement("div");
	var down_arrow 	= document.createElement("div");
	up_arrow.setAttribute("id", "dialog_up_arrow");
	down_arrow.setAttribute("id", "dialog_down_arrow");
	up_arrow.addClass("dialog_arrow");
	down_arrow.addClass("dialog_arrow");
	up_arrow.addClass("hide");
	down_arrow.addClass("hide");

	$("#dialog").html("");

    if(!$("#dialog").hasClass("basicInfoDialog")){

        $("#dialog").append("<div class=\"dialogControls\"></div>");
        $(".dialogControls").append("<div class=\"dialogTitle\">"+dialog.title+"</div>");
        $(".dialogControls").append("<div class=\"dialogText\">"+dialog.subtext+"</div>");
        $(".dialogControls").append($(up_arrow));
		$(".dialogControls").append('<div id="dialogWrapper" class="wrapper"></div>');
		$(".dialogControls").append($(down_arrow));
    }
	
	if($("#dialog").hasClass("basicInfoDialog")){
		$("#dialog").append("<div class=\"dialogControls\"></div>");
		$(".dialogControls").append("<div class=\"dialogTitle\">"+dialog.title+"</div>");
		$(".dialogControls").append("<div class=\"dialogText\">"+dialog.subtext+"</div>");
		$(".dialogControls").append('<div id="dialogWrapper" class="wrapper"></div>');
		$(".dialogControls").append($(up_arrow));
		$(".dialogControls").append($(down_arrow));
	}
	
	$("#dialog").append("<div id=\"dialog_logo\"></div>");
	$("#dialog").append("<div id=\"dialog_time\">--:--</div>");

	var dialogClockUpdate = function(){
		if( $("#dialog_time")[0] ){
			var d = new Date();
			//var timenow = prepend( d.getHours(),0,"2" ) + ":" + prepend( d.getMinutes(),0, 2);
			var timenow = ("0"+d.getHours()).slice(-2) + ":" + ("0"+d.getMinutes()).slice(-2); 
			
			console.log(timenow);
			$("#dialog_time").html( timenow );
		}
		else{
			clearInterval( dialog.clockInterval );
		}
	};
	dialogClockUpdate();
	dialog.clockInterval = setInterval( dialogClockUpdate, 1000);


	var dialogButtons = document.createElement("div");
	dialogButtons.setAttribute("id", "dialogButtons");
	$("#dialogWrapper").append(dialogButtons);

	if(dialog.buttons.length > 0){
		$.each( dialog.buttons, function(i, label){
			var dialogButton = document.createElement("div");
			dialogButton.addClass("dialogButton");
			dialogButton.innerHTML = "<span>"+label+"</span>";
			if( dialog.checkmarks ){
				var checkmark = document.createElement("div");
				checkmark.addClass("checkmark");
				dialogButton.appendChild(checkmark);
			}
			if(i == dialog.focused){ dialogButton.addClass("focused"); }
			if(i == dialog.checked){ 
				dialogButton.addClass("checked");
			}
			dialogButtons.appendChild(dialogButton);
		});

		var buttonElems = $(".dialogButton");
		var firstvisible = buttonElems[0];
		var lastvisible = null;
		var firstvisibleIdx = 0;
		if(dialog.focused >= dialog.visibleItems){
			$.each( buttonElems, function(i, elem){
				if(i == dialog.focused || i == buttonElems.length - dialog.visibleItems){
					firstvisible = elem;
					firstvisibleIdx = i;
					return false;
				}
			});
		}
		
		var dialogButtonMarginBottom = 12;
		var scrolltop = ($(".dialogButton:eq("+ dialog.focused +")").outerHeight(true) * firstvisibleIdx);
		scrolltop += (firstvisibleIdx > 0) ? (dialogButtonMarginBottom*firstvisibleIdx) : 0;
		console.log("scrolltop: ", scrolltop);
		$("#dialogWrapper").scrollTop(scrolltop);
	}

	handleDialogArrows();
}

function handleDialogArrows(){
	console.log("handleDialogArrows");
	var up_arrow = document.getElementById("dialog_up_arrow");
	var down_arrow = document.getElementById("dialog_down_arrow");
	if($("#dialogWrapper").scrollTop() > 0){
		up_arrow.removeClass("hide");
	}
	else{
		up_arrow.addClass("hide");
	}

	if($("#dialogWrapper")[0].scrollHeight > $("#dialogWrapper")[0].offsetHeight){
		down_arrow.removeClass("hide");
	}
	if($("#dialogWrapper").scrollTop() < $("#dialogWrapper")[0].scrollHeight - $("#dialogWrapper")[0].offsetHeight){
		down_arrow.removeClass("hide");
	}
	else{
		down_arrow.addClass("hide");
	}
}

function navigateDialog( keyCode )
{
	console.log( "dialog.js: navigate dialog" );

	switch(keyCode)
	{
		case VK_DOWN:
		case VK_UP:
			if( keyCode == VK_UP && dialog.focused > 0 ){
				var dialogWrapper = $("#dialogWrapper")[0];
				var prev = $(".dialogButton:eq("+ dialog.focused +")").prev();
				if(prev && prev[0].offsetTop < dialogWrapper.scrollTop){
					animating = true;
					$("#dialogWrapper").animate(
						{scrollTop: prev[0].offsetTop},
						{
							duration:250,
							easing:"linear",
							complete:function(){
								animating = false;
								handleDialogArrows();
							},
							always: function(){
								animating = false;
							}
						}
					);
				}
				dialog.focused--;
			}
			else if( keyCode == VK_DOWN && dialog.focused < dialog.options-1 ){
				var dialogWrapper = $("#dialogWrapper")[0];
				var next = $(".dialogButton:eq("+ dialog.focused +")").next();
				if(next && (next[0].offsetTop + next[0].offsetHeight) > dialogWrapper.scrollTop + dialogWrapper.offsetHeight){
					animating = true;
					$("#dialogWrapper").animate(
						{scrollTop: (next[0].offsetTop + next[0].offsetHeight) - dialogWrapper.offsetHeight},
						{
							duration:250,
							easing:"linear",
							complete:function(){
								animating = false;
								handleDialogArrows();
							},
							always: function(){
								animating = false;
							}
						}
					);
				}
				dialog.focused++;
			}
			$(".dialogButton.focused").removeClass("focused");
			$(".dialogButton:eq("+ dialog.focused +")").addClass("focused");
			break;

		case VK_ENTER:
			// this is done only if different dialogs are shown subsequently.
			if(dialog.chained){ 
				dialog.callback( dialog.focused ); // call handler for response
				
				if( typeof( dialog.onClose ) == "function" ){
					dialog.onClose();
					dialog.onClose = null;
				}
				
				break;
			}
			
			dialog.callback( dialog.focused ); // call handler for response
			hideDialog();
			
			break;
			
		case VK_BACK:
			
			if( typeof( dialog.onClose ) == "function" ){
				dialog.onClose();
				dialog.onClose = null;
			}
			hideDialog();
			
			break;
	}
	
}

function hideDialog(){
    dialog.open = false;
    
    $("#dialog").html("");
    $("#dialog").removeClass("show");
    $("#dialog").addClass("hide");
    if( typeof( dialog.onClose ) == "function" ){
        dialog.onClose();
        dialog.onClose = null;
    }
}
