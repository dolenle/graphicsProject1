

var canvas;
var gl;

var NumVertices  = 36;

var pointsArray = [];
var colorsArray = [];

var vertices = [
	vec4( -0.2, -0.2,  0.2, 1.0 ),
	vec4( -0.2,  0.2,  0.2, 1.0 ),
	vec4(  0.2,  0.2,  0.2, 1.0 ),
	vec4(  0.2, -0.2,  0.2, 1.0 ),
	vec4( -0.2, -0.2, -0.2, 1.0 ),
	vec4( -0.2,  0.2, -0.2, 1.0 ),
	vec4(  0.2,  0.2, -0.2, 1.0 ),
	vec4(  0.2, -0.2, -0.2, 1.0 )
];

var near = 0.3;
var far = 5.0;
var radius = 4.0;
var theta  = 0.0;
var phi    = 0.0;
var dr = 5.0 * Math.PI/180.0;

var  fovy = 45.0;  // Field-of-view in Y direction angle (in degrees)
var  aspect = 1.0;       // Viewport aspect ratio

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;
var eye;
const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

//-----------NEW STUFF-------------------------------------------------------------------------------------

var spacing = 0.45;
var rubiks = [];
var animationQueue = [[]];
var animSpeed = 3;

var camDirec = [0, 0, 0];
var camAccel = 1.1;
var camSpeed = 0.5;

var rows = [[],[],[]]; //rows of the rubiks cube
var cols = [[],[],[]]; //columns of the cube
var faces = [[],[],[]];

var cubeColors = [
	vec4( 0.2, 0.2, 0.2, 1.0 ), //black
	vec4( 1.0, 0.0, 0.0, 1.0 ), //red
	vec4( 1.0, 1.0, 0.0, 1.0 ), //yellow
	vec4( 0.0, 0.6, 0.0, 1.0 ), //green
	vec4( 0.0, .0, 0.6, 1.0 ), //blue
	vec4( 0.9, 0.9, 0.9, 1.0 ), //white
	vec4( 1.0, 0.5, 0.0, 1.0 ), //orange
];

var Colors = {
	BLACK: 0,
	RED: 1,
	YELLOW: 2,
	GREEN: 3,
	BLUE: 4,
	WHITE: 5,
	ORANGE: 6
};

var axis=0;
var rot = [0,0,0];
var tempMV = mat4().create;

function rubiksCube() {
	var index=0;
	//Color Ordering: [front, right, bottom, top, back, left]
	var c = [Colors.YELLOW, Colors.GREEN, Colors.RED, Colors.ORANGE, Colors.WHITE, Colors.GREEN];
	var frontColors = [Colors.BLACK, Colors.BLACK, Colors.YELLOW];
	var rightColors = [Colors.BLACK, Colors.BLACK, Colors.GREEN];
	var bottomColors = [Colors.RED, Colors.BLACK, Colors.BLACK];
	var topColors = [Colors.BLACK, Colors.BLACK, Colors.ORANGE];
	var backColors = [Colors.WHITE, Colors.BLACK, Colors.BLACK];
	var leftColors = [Colors.BLUE, Colors.BLACK, Colors.BLACK];
	for(var x=0; x<3; x++) {
		for(var y=0; y<3; y++) {
			for(var z=0; z<3; z++) {
				rubiks.push(new Cube([(x-1)*spacing, (y-1)*spacing, (z-1)*spacing, 1.0],
					[frontColors[z], rightColors[x], bottomColors[y], topColors[y], backColors[z], leftColors[x]]));
				cols[x].push(index);
				rows[y].push(index);
				faces[z].push(index);
				index++;
			}
		}
	}
	console.log("[rubiksCube]");
}

function Cube(position, colors) {
	this.origin = position;
	this.angle = [0, 0, 0];
	this.colors = colors;
	this.target = 0;
	this.direction = 0;
	this.axis = 0;
}

Cube.prototype.render = function(x, y, z) {
	tempMV = modelViewMatrix;  //backup modelViewMatrix
	// Move to cube frame
	modelViewMatrix = mult(modelViewMatrix, rotate(this.angle[0], [1, 0, 0] ));
    modelViewMatrix = mult(modelViewMatrix, rotate(this.angle[1], [0, 1, 0] ));
    modelViewMatrix = mult(modelViewMatrix, rotate(this.angle[2], [0, 0, 1] ));
	
	modelViewMatrix = mult(modelViewMatrix, translate(vec3(this.origin)));
	
	modelViewMatrix = mult(modelViewMatrix, rotate(-this.angle[0], [1, 0, 0] ));
    modelViewMatrix = mult(modelViewMatrix, rotate(-this.angle[1], [0, 1, 0] ));
    modelViewMatrix = mult(modelViewMatrix, rotate(-this.angle[2], [0, 0, 1] ));
	
	//Rotate about axis
	modelViewMatrix = mult(modelViewMatrix, rotate(this.angle[0], [1, 0, 0] ));
	modelViewMatrix = mult(modelViewMatrix, rotate(this.angle[1], [0, 1, 0] ));
	modelViewMatrix = mult(modelViewMatrix, rotate(this.angle[2], [0, 0, 1] ));
	
	var colorsArray = [];
	for(var c in this.colors) {
		for(var i=0; i<6; i++) {
			colorsArray.push(cubeColors[this.colors[c]]);
		}
	}
	
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer);
	//gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(colorsArray));
	gl.bufferData( gl.ARRAY_BUFFER, flatten(colorsArray), gl.DYNAMIC_DRAW );

    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW );

	setMatrixUniforms();
	gl.drawArrays( gl.TRIANGLES, 0, NumVertices );

	modelViewMatrix = tempMV;
}

	var effectiveFPMS = 60 / 1000;
    Cube.prototype.animate = function(elapsedTime) {
    	var animAngle = animSpeed * Math.round(effectiveFPMS * elapsedTime);
    	//for(var i in this.target) {
			if(this.target != 0) {
				this.angle[this.axis] += animAngle * this.direction;
				this.target -= animAngle;
			} else {
				//this.target = 0;
				this.angle[this.axis] = this.angle[this.axis]%360;
				this.direction=0;
			}
        //}
    };
    
    var lastTime = 0;
    
    


//-----------END NEW STUFF--------------------------------------------------------------------------------------------------

function quad(a, b, c, d) {
	pointsArray.push(vertices[a]); 
	pointsArray.push(vertices[b]); 
	pointsArray.push(vertices[c]); 
	pointsArray.push(vertices[a]); 
	pointsArray.push(vertices[c]); 
	pointsArray.push(vertices[d]); 
	colorsArray.push(vec4( 0.0, 0.0, 0.0, 1.0 ));
	colorsArray.push(vec4( 0.0, 0.0, 0.0, 1.0 ));
	colorsArray.push(vec4( 0.0, 0.0, 0.0, 1.0 ));
	colorsArray.push(vec4( 0.0, 0.0, 0.0, 1.0 ));
	colorsArray.push(vec4( 0.0, 0.0, 0.0, 1.0 ));
	colorsArray.push(vec4( 0.0, 0.0, 0.0, 1.0 ));
}

function colorCube()
{
    quad( 1, 0, 3, 2 );
    quad( 2, 3, 7, 6 );
    quad( 3, 0, 4, 7 );
    quad( 6, 5, 1, 2 );
    quad( 4, 5, 6, 7 );
    quad( 5, 4, 0, 1 );
}

var cBuffer;
var vColor;
var vBudder;
var vPosition;

function setMatrixUniforms() {
	gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    gl.uniformMatrix4fv( projectionMatrixLoc, false, flatten(projectionMatrix) );
}

window.onload = function init() {
    canvas = document.getElementById( "gl-canvas" );
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }
    gl.viewport( 0, 0, canvas.width, canvas.height );
    aspect =  canvas.width/canvas.height;
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
    gl.enable(gl.DEPTH_TEST);
    
    //
    //  Load shaders and initialize attribute buffers
    //
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    colorCube();
    rubiksCube();

    cBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colorsArray), gl.DYNAMIC_DRAW );
    //gl.bufferData(gl.ARRAY_BUFFER, 15552, gl.STATIC_DRAW );
    
    vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor);

    vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW );
    
    vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );
    
    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    
	setupUI();
    render();
}

function setupUI() {
	//event handlers
	document.getElementById("zFarSlider").onchange = function(event) {
        far = event.target.value;
    };
    document.getElementById("zNearSlider").onchange = function(event) {
        near = event.target.value;
    };
    document.getElementById("radiusSlider").onchange = function(event) {
       radius = event.target.value;
    };
    document.getElementById("thetaSlider").onchange = function(event) {
        theta = event.target.value* Math.PI/180.0;
    };
    document.getElementById("phiSlider").onchange = function(event) {
        phi = event.target.value* Math.PI/180.0;
    };
    document.getElementById("aspectSlider").onchange = function(event) {
        aspect = event.target.value;
    };
    document.getElementById("fovSlider").onchange = function(event) {
        fovy = event.target.value;
    };
    
    document.getElementById( "resetRot" ).onclick = function () {
        camDirec =  [0,0,0];
		rot = [0,0,0];
		camSpeed = 0.01;
    };
    document.getElementById( "tButton" ).onclick = function () {
		for(var i in faces[2]) {
			var id = faces[2][i];
			if(rubiks[id].direction == 0) {
				rubiks[id].axis = 2;
				rubiks[id].target=90;
				rubiks[id].direction=-1;
			}
		}
    };
	
	document.onkeydown = function(event) {
		switch(event.keyCode) {
			case 37: //left arrow
				camDirec[1]-=camSpeed*=camAccel;
				break;
			case 38: //up arrow
				camDirec[0]-=camSpeed*=camAccel;
				break;
			case 39: //right arrow
				camDirec[1]+=camSpeed*=camAccel;
				break;
			case 40: //down arrow
				camDirec[0]+=camSpeed*=camAccel;
				break;
		}
	}
	document.onkeyup = function() {
		camSpeed=0.01;
	}
}

var render = function() {

    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            
    eye = vec3(radius*Math.sin(theta)*Math.cos(phi), radius*Math.sin(theta)*Math.sin(phi), radius*Math.cos(theta));
    
    modelViewMatrix = lookAt(eye, at , up);
    
    rot[1]+=camDirec[1];
	if((rot[0]<90 || camDirec[0]<0) && (rot[0]>-90 || camDirec[0]>0))
		rot[0]+=camDirec[0];
	else {
		camDirec[0]=0;
	}
    modelViewMatrix = mult(modelViewMatrix, rotate(rot[0], [1, 0, 0] ));
    modelViewMatrix = mult(modelViewMatrix, rotate(rot[1], [0, 1, 0] ));
    modelViewMatrix = mult(modelViewMatrix, rotate(rot[2], [0, 0, 1] ));
    
    projectionMatrix = perspective(fovy, aspect, near, far);
	
    for (var i in rubiks) {
    	rubiks[i].render(0, 0, 0);
    }
    
    //Perform Animations
    var timeNow = new Date().getTime();
	if (lastTime != 0) {
		var elapsed = timeNow - lastTime;
		for (var i in rubiks) {
			rubiks[i].animate(elapsed);
		}
	}
	lastTime = timeNow;
    requestAnimFrame(render);
}

