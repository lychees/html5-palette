(function(window, undefined)
{
    var eh_status_change = null;
    var eh_message = null;
    var tmr_connect = null;
    
    function status_change(msg)
    {
        if (typeof eh_status_change == 'function')
            eh_status_change.call(Realtime.socket, msg);
    }

    function onSocketMessage(action, data)
    {
        switch(action)
        {
            case 'connect':
                status_change('Connected');
                changeOnlineUserNumber(1);                
                break;
            case 'disconnect':
                status_change('Disconnected');
                changeOnlineUserNumber(-1);                
                break;
            default:
                if (typeof eh_status_change == 'function')
                    eh_message.call(Realtime.socket, action, data);
                
                break;
        }
    }
    
    var Realtime = window.Realtime = 
    {
        socket: null,
        
        Connect: function()
        {
            status_change('Connecting');
            Realtime.socket = io.connect();
            
            var $emit = Realtime.socket.$emit;
            Realtime.socket.$emit = function()
            {
                onSocketMessage.apply(Realtime.socket, arguments);
                $emit.apply(Realtime.socket, arguments);
            };
            
            return Realtime;
        },
        
        OnStatusChange: function(eventHandler)
        {
            eh_status_change = eventHandler;
            return Realtime;
        },
        
        OnMessage: function(eventHandler)
        {
            eh_message = eventHandler;
            return Realtime;
        }
    }

})(window);

$(document).ready(function()
{
    Realtime
    .OnStatusChange(function(msg)
    {
        console.log(msg);
    })
    .OnMessage(function(action, data)
    {
        switch(action)
        {
            case 'push':
                pushResult(data);
                drawSingle(clickX.length - 1);
                break;
            case 'clear':
                clearCanvas(false);
                break;
            case 'changeOnlineUserNumber':
                changeOnlineUserNumber(data);;
                break;
        }
    })
    .Connect();

    $.get('/getdrawings', function(d)
    {
        var data = JSON.parse(d.toString());

        clearCanvas(false);
        parseResult(data);
        redraw();
    });
});

// Copyright 2010 William Malone (www.williammalone.com)
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var canvas;
var context;
var canvasWidth = 1168;
var canvasHeight = 600;
var padding = 25;
var lineWidth = 8;
var colorPurple = "#cb3594";
var colorGreen = "#659b41";
var colorYellow = "#ffcf33";
var colorBrown = "#986928";
var outlineImage = new Image();
var crayonImage = new Image();
var markerImage = new Image();
var eraserImage = new Image();
var crayonBackgroundImage = new Image();
var markerBackgroundImage = new Image();
var eraserBackgroundImage = new Image();
var crayonTextureImage = new Image();
var clickX = new Array();
var clickY = new Array();
var clickDrag = new Array();
var clickColor = new Array();
var clickTool = new Array();
var clickSize = new Array();
var clickAlpha = new Array();
var paint = false;
var curColor = "blue";
var curTool = "pencil";
var curSize = 9;
var curAlpha = 100;
var mediumStartX = 18;
var mediumStartY = 19;
var mediumImageWidth = 93;
var mediumImageHeight = 46;
var drawingAreaX = 111;
var drawingAreaY = 11;
var drawingAreaWidth = 267;
var drawingAreaHeight = 200;
var toolHotspotStartY = 23;
var toolHotspotHeight = 38;
var sizeHotspotStartY = 157;
var sizeHotspotHeight = 36;
var sizeHotspotWidthObject = new Object();
sizeHotspotWidthObject.huge = 39;
sizeHotspotWidthObject.large = 25;
sizeHotspotWidthObject.normal = 18;
sizeHotspotWidthObject.small = 16;
var totalLoadResources = 8;
var curLoadResNum = 0;
var onlineUserNumber = 0;

var onShift = false;


var cvs;
var ctx;

/**
* Test...
*/


function changeOnlineUserNumber(delta){
    onlineUserNumber += delta;
    $("#onlineUserNumber").val(onlineUserNumber);
}

             
    

// Slide .
$(function() {
    $( "#brushSizeSlider" ).slider({
        range: "min",
        value: 9,          min: 1,
        max: 700,
        slide: function(event, ui){
            setSize(ui.value);
        }
    });
    $("#brushSize").val($("brushSizeSlider").slider("value"));
});

$(function() {
    $( "#brushAlphaSlider" ).slider({
        range: "min",
        value: 90,
        min: 0,
        max: 100,
        slide: function(event, ui){
            setAlpha(ui.value);
        }
    });
    $("#brushAlpha").val($("brushAlphaSlider").slider("value"));
});      

function keydown(event){    
    var key = event.keyCode || event.which;        

    if (key === 221){ //']'
        if (curSize < 900){
           setSize(curSize + 1);           
        }
    }
    if (key === 219){ //'['
        if (curSize > 1){
           setSize(curSize - 1);
        }
    }
    if (onCtrl && key === 90){ // Ctrl + Z
        clickX.pop();
        clickY.pop();        
        clickDrag.pop();
        clickTool.pop();
        clickColor.pop();
        clickSize.pop();
        clickAlpha.pop();
        redraw();
    }
    if (key === 16){ // Shift
        onShift = 1;
    }
    if (key === 17){
        onCtrl = 1;
    }
}

function keyup(){
    var key = event.keyCode || event.which;
    if (key === 16){ // Shift
        onShift = 0;
    }
    if (key === 17){ // Ctrl
        onCtrl = 0;
    }
}


function init(){		
	cvs = document.getElementById("Canvas");
	ctx = cvs.getContext("2d");		
	crayonTextureImage.src = "images/crayon-texture.png";	
    document.getElementsByTagName('body')[0].addEventListener("keydown", keydown); 
    document.getElementsByTagName('body')[0].addEventListener("keyup", keyup); 
    setSize(curSize);
    setAlpha(curAlpha);
}

/**
* Creates a canvas element, loads images, adds events, and draws the canvas for the first time.
*/
function prepareCanvas()
{
	// Add mouse events
	$('#Canvas').mousedown(function(e)
	{
		// Mouse down location
		var mouseX = e.pageX - this.offsetLeft;
		var mouseY = e.pageY - this.offsetTop;

		paint = true;

		addClick(mouseX, mouseY, onShift);
        drawSingle(clickX.length - 1);
        addClick(mouseX, mouseY+1, true);  //!
        drawSingle(clickX.length - 1);
        return false;
	});
	
	$('#Canvas').mousemove(function(e){
		if(e.which === 1){
			addClick(e.pageX - this.offsetLeft, e.pageY - this.offsetTop, true);
			drawSingle(clickX.length - 1);            
		}
	});
	
	$('#Canvas').mouseup(function(e){
		paint = false;
	});
	
	$('#Canvas').mouseleave(function(e){
		paint = false;
	});


// -----------

	
}

/**
* Adds a point to the drawing array.
* @param x
* @param y
* @param dragging
*/
function addClick(x, y, dragging)
{
	clickX.push(x);
	clickY.push(y);
    clickDrag.push(dragging);
	clickTool.push(curTool);
	clickColor.push(curColor);
	clickSize.push(curSize);
    clickAlpha.push(curAlpha);
    Realtime.socket.emit('push', {

        x:     x,
        y:     y,
        drag:  dragging,
        tool:  curTool,
        color: curColor,
        size:  curSize,
        alpha: curAlpha    
    });
}


function pushResult(d)
{
    clickX.push(d.x);
    clickY.push(d.y);
    clickDrag.push(d.drag);  
    clickTool.push(d.tool);
    clickColor.push(d.color);
    clickSize.push(d.size);
    clickAlpha.push(d.alpha);    
}

function parseResult(d)
{
    for (var i in d)
        pushResult(d[i]);
}


function save(){	
	window.open(cvs.toDataURL());
}


/**
* Set ...
*/

function setTool(x){
	curTool = x;	
}

function setColor(x){	
	curColor = x;
}

function setSize(x){
    curSize = x;
    $("#brushSize").val(x);
    $("#brushSizeSlider").slider("option", "value", x);
	
}

function setAlpha(x){
    curAlpha = x;
    $("#brushAlpha").val(x);
    $("#brushAlphaSlider").slider("option", "value", x);        
}


/**
* Clears the canvas.
*/
function clearCanvas(sendToAll)
{
	clickX = [];
	clickY = [];
    clickAlpha = []; 
	clickTool = [];	
	clickColor = [];
	clickSize = [];
	clickDrag = [];	    

	ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    if (sendToAll !== false)
    {
        Realtime.socket.emit('clear');
    }
}

function drawSingle(i)
{
    ctx.beginPath();
    if(clickDrag[i] && i){
        ctx.moveTo(clickX[i-1], clickY[i-1]);
    }else{
        ctx.moveTo(clickX[i], clickY[i]);
    }
    ctx.lineTo(clickX[i], clickY[i]);
    ctx.closePath();
    
    if(clickTool[i] == "eraser"){
        ctx.strokeStyle = 'white';
    }else{			
        ctx.strokeStyle = clickColor[i];
        /*if (clickTool[i] == 'crayon'){
            //ctx.globalAlpha = 0.9;
            ctx.drawImage(crayonTextureImage, 0, 0, canvasWidth, canvasHeight);	
        }
        else */if (clickTool[i] == 'pencil'){
            ctx.globalAlpha = clickAlpha[i] / 100.0;
        }
    }
    
    ctx.lineJoin = "round";
    ctx.lineWidth = clickSize[i];
    
    
    ctx.stroke();
}

/**
* Redraws the canvas.
*/
function redraw()
{
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);	
    
    ctx.save();
    
    for(var i = 0; i < clickX.length; i++)
    {		
        drawSingle(i);
    }
    
    ctx.restore();
}

/**/