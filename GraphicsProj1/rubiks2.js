

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

var spacing = 0.42;
var rubiks = [];
var animationQueue = [];
var animSpeed = 3;

var camDirec = [0, 0, 0];
var camAccel = 1.05;
var camSpeed = 0.5;

var rows = [[],[],[]]; //rows of the rubiks cube
var cols = [[],[],[]]; //columns of the cube
var faces = [[],[],[]];
var planes = [[[],[],[]], [[],[],[]], [[],[],[]]];

var animRunning = 0;

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
var rot = [0,30,0];
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
				rubiks.push(new Cube([(x-1)*spacing, (y-1)*spacing, (z-1)*spacing, 1.0], [x, y, z],
					[frontColors[z], rightColors[x], bottomColors[y], topColors[y], backColors[z], leftColors[x]]));
				planes[0][x].push(index);
				planes[1][y].push(index);
				planes[2][z].push(index);
				index++;
			}
		}
	}
	evaluatePlanes();
	console.log("[rubiksCube]");
}

function Cube(position, planes, colors) {
	this.start = position;
	this.curPos = planes;
	this.angle = [0, 0, 0];
	this.cubeAxes = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
	this.newAxes = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
	this.colors = colors;
	this.target = 0;
	this.direction = 0;
	this.axis = 0;
	this.isAnimating = 0;
}

Cube.prototype.render = function(x, y, z) {
	tempMV = modelViewMatrix;  //backup modelViewMatrix
	// Move to cube frame

	// var r = mat4();
// 	r = mult(rotate(this.angle[2], [0, 0, 1]), r);
// 	r = mult(rotate(this.angle[1], [-Math.sin(radians(this.angle[2])), Math.cos(radians(this.angle[2])), 0]), r);
// 	r = mult(rotate(this.angle[0], [Math.cos(radians(this.angle[2]))*Math.cos(radians(this.angle[1])), Math.sin(radians(this.angle[2])), -Math.cos(radians(this.angle[2]))*Math.sin(radians(this.angle[1]))] ), r);
// 	modelViewMatrix = mult(modelViewMatrix, r);

	
	//modelViewMatrix = mult(modelViewMatrix, translate(scale(-1,vec3(this.start))));
// 	for(var i=0; i<3; i++)  
//         modelViewMatrix = mult(modelViewMatrix, rotate(this.angle[i], this.cubeAxes[i]));
	
	modelViewMatrix = mult(modelViewMatrix, rotate(this.angle[this.axis], this.cubeAxes[this.axis]) );
    modelViewMatrix = mult(modelViewMatrix, rotate(this.angle[(this.axis+1)%3], this.cubeAxes[(this.axis+1)%3]) );
 	modelViewMatrix = mult(modelViewMatrix, rotate(this.angle[(this.axis+2)%3], this.cubeAxes[(this.axis+2)%3]) );
	
	modelViewMatrix = mult(modelViewMatrix, translate(vec3(this.start)));
	
	var colorsArray = [];
	for(var c in this.colors) {
		for(var i=0; i<6; i++) {
			colorsArray.push(cubeColors[this.colors[c]]);
		}
	}
	
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer);
	gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(colorsArray));
	//gl.bufferData( gl.ARRAY_BUFFER, flatten(colorsArray), gl.DYNAMIC_DRAW );

    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW );

	setMatrixUniforms();
	gl.drawArrays( gl.TRIANGLES, 0, NumVertices );

	modelViewMatrix = tempMV;
}

var effectiveFPMS = 60 / 1000;
Cube.prototype.animate = function(elapsedTime) {
	var animAngle = animSpeed * Math.round(effectiveFPMS * elapsedTime);
	if(this.isAnimating == 1) {
		if(this.target > 1) {
			this.angle[this.axis] += animAngle * this.direction;
			this.target -= animAngle;
		} else {
			//this.target = 0;
			this.isAnimating = 0;
			this.angle[this.axis] -= this.angle[this.axis]%90;
			this.direction=0;
			animRunning = 0;
			for(var j=0; j<3; j++) {
				//console.log("Replacing axis "+j+" with "+this.newAxes[j]);
				//this.cubeAxes[j] = this.newAxes[j];
				//if(j!=this.axis)	
				//this.angle[j] = 0;
			}
		}
	}
};
    
var lastTime = 0;

//plane: 0=column, 1=row, 2=face
function makeTurn(p, i, d) { //plane, index, direction
	if(!animRunning) {
		if(d==1) {
			var p1 = (p+1)%3; //other plane 1
			var p2 = (p+2)%3; //other plane 2
		} else {
			var p1 = (p+2)%3; //other plane 1
			var p2 = (p+1)%3; //other plane 2
		}
		//console.log("p1="+p1+" p2="+p2);

		for(var x in planes[p][i]) {
			var id = planes[p][i][x];
			rubiks[id].axis = p;
			rubiks[id].target = 90;
			rubiks[id].direction = d;
			rubiks[id].isAnimating = 1;
		
			var p1Index = rubiks[id].curPos[p1];
			var p2Index = rubiks[id].curPos[p2];
			var p1Axis = rubiks[id].cubeAxes[p1];
			rubiks[id].newAxes[p1] = scale(-1, rubiks[id].cubeAxes[p2]);
			rubiks[id].newAxes[p2] = p1Axis;
		
			if(p1Index==0) {
				//console.log("moving cube "+id+" from row 0 to face 0 (was on "+rubiks[id].curPos[p2]+")")
				rubiks[id].curPos[p2]=0;
				if(p2Index==1)
					rubiks[id].curPos[p1]=1;
				else
					rubiks[id].curPos[p1]=(p2Index+2)%3;
			}
			if(p2Index==0) {
				//console.log("moving cube "+id+" from face 0 to row 2 (was on "+rubiks[id].curPos[p1]+")")
				rubiks[id].curPos[p1]=2;
				rubiks[id].curPos[p2]=p1Index;
			}
			if(p1Index==2) {
				//console.log("moving cube "+id+" from row 2 to face 2 (was on "+rubiks[id].curPos[p2]+")")
				rubiks[id].curPos[p2]=2;
				if(p2Index==1)
					rubiks[id].curPos[p1]=1;
				else
					rubiks[id].curPos[p1]=(p2Index+2)%3;
			}
			if(p2Index==2) {
				//console.log("moving cube "+id+" from face 2 to row 0 (was on "+rubiks[id].curPos[p1]+")")
				rubiks[id].curPos[p1]=0;
				rubiks[id].curPos[p2]=p1Index;
			}
		}
		evaluatePlanes(); //Refresh plane arrays
		animRunning = 1;
	}
}

function evaluatePlanes() {
	planes = [[[],[],[]], [[],[],[]], [[],[],[]]];
	for (var i in rubiks) {
		planes[0][rubiks[i].curPos[0]].push(i);
		planes[1][rubiks[i].curPos[1]].push(i);
		planes[2][rubiks[i].curPos[2]].push(i);
	}
// 	for (var i in planes) {
// 		for (var j in planes[i]) {
// 			if(planes[i][j].length != 9) {
// 				console.log("Incorrect length ("+planes[i][j].length+") in planes["+i+"]["+j+"]");
// 				console.log("Cubes in this plane:");
// 				for(var k in planes[i][j])
// 					console.log(planes[i][j][k]);
// 			}
// 		}
// 	}
// 	for (var i=0; i<9; i++)
// 		debugPrintPlanes(i);
}

function debugPrintPlanes(i) {
	console.log("Cube "+i+" col="+rubiks[i].curPos[0]+" row="+rubiks[i].curPos[1]+" face="+rubiks[i].curPos[2]);
}

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
    
    //  Load shaders and initialize attribute buffers
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
		camSpeed = 0.05;
    };
    document.getElementById( "tButton" ).onclick = function () {
		animationQueue.push([0, 0, -1]);
    };
    document.getElementById( "tButton2" ).onclick = function () {
		animationQueue.push([1, 2, -1]);
    };
    document.getElementById( "tButton3" ).onclick = function () {
		animationQueue.push([2, 2, -1]);
    };
	
	document.onkeydown = function(event) {
		if(event.keyCode > 36 && event.keyCode < 41) {	
			var key = (event.keyCode-38)%2
			if(key==0)
				camDirec[Math.abs(key)]+=(camSpeed*=camAccel)*(event.keyCode-39);
			else
				camDirec[Math.abs(key)]+=(camSpeed*=camAccel)*key;
		}
	}
	document.onkeyup = function() {
		camSpeed=0.5;
		//camAccel = 0.2;
		//console.log(camSpeed);
	}
}

var render = function() {

    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            
    eye = vec3(radius*Math.sin(theta)*Math.cos(phi), radius*Math.sin(theta)*Math.sin(phi), radius*Math.cos(theta));
    
    modelViewMatrix = lookAt(eye, at , up);
    
    rot[1]+=camDirec[1];
	if((rot[0]<70 || camDirec[0]<0) && (rot[0]>-70 || camDirec[0]>0))
		rot[0]+=camDirec[0];
	else {
		camDirec[0]=0;
	}
    modelViewMatrix = mult(modelViewMatrix, rotate(rot[0], [1, 0, 0] ));
    modelViewMatrix = mult(modelViewMatrix, rotate(rot[1], [0, 1, 0] ));
    //modelViewMatrix = mult(modelViewMatrix, rotate(rot[2], [0, 0, 1] ));
    
    projectionMatrix = perspective(fovy, aspect, near, far);
	
    for (var i in rubiks) {
    	rubiks[i].render(0, 0, 0);
    } 
    //Perform Animations
    if(!animRunning && animationQueue.length) {
		var ani = animationQueue.pop();
		console.log(ani);
		makeTurn(ani[0], ani[1], ani[2]);
	}
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

