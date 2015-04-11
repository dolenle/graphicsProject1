

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

var spacing = 0.42;
var rubiks = [];
var animationQueue = [];
var animSpeed = 3;

var camAccel = [1,1];
var camSpeed = [0,0];
var rot = [15,20];

var rows = [[],[],[]]; //rows of the rubiks cube
var cols = [[],[],[]]; //columns of the cube
var faces = [[],[],[]];
var planes = [[[],[],[]], [[],[],[]], [[],[],[]]];

var animRunning = 0;

var cubeColors = [
	[ 0.2, 0.2, 0.2, 1.0 ], //black
	[ 1.0, 0.0, 0.0, 1.0 ], //red
	[ 1.0, 1.0, 0.0, 1.0 ], //yellow
	[ 0.0, 0.6, 0.0, 1.0 ], //green
	[ 0.0, 0.0, 0.6, 1.0 ], //blue
	[ 0.9, 0.9, 0.9, 1.0 ], //white
	[ 1.0, 0.5, 0.0, 1.0 ], //orange
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

var tempMV = mat4().create;

//Create a rubiks cube by combining 27 cubes
function rubiksCube() {
	var index=0;
	//Color Ordering: [right, top, front, back, bottom, left]
	var rightColors = [Colors.BLACK, Colors.BLACK, Colors.GREEN];
	var topColors = [Colors.BLACK, Colors.BLACK, Colors.ORANGE];
	var frontColors = [Colors.BLACK, Colors.BLACK, Colors.YELLOW];
	var backColors = [Colors.WHITE, Colors.BLACK, Colors.BLACK];
	var bottomColors = [Colors.RED, Colors.BLACK, Colors.BLACK];
	var leftColors = [Colors.BLUE, Colors.BLACK, Colors.BLACK];
	for(var x=0; x<3; x++) {
		for(var y=0; y<3; y++) {
			for(var z=0; z<3; z++) {
				rubiks.push(new Cube([(x-1)*spacing, (y-1)*spacing, (z-1)*spacing, 1.0], [x, y, z],
					[rightColors[x], topColors[y], frontColors[z],
					backColors[z], bottomColors[y], leftColors[x]]
				));
				planes[0][x].push(index);
				planes[1][y].push(index);
				planes[2][z].push(index);
				index++;
			}
		}
	}
	console.log("[rubiksCube]");
}

//Construct a cube
function Cube(position, planes, colors) {
	this.origin = position;
	this.curPos = planes;
	this.angle = [0, 0, 0];
	this.cubeAxes = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
	this.colors = colors;
	this.nextColors = colors.slice(0);
	this.target = 0;
	this.direction = 0;
	this.axis = 0;
	this.isAnimating = 0;
}

//Draw a cube
Cube.prototype.render = function(x, y, z) {
	tempMV = modelViewMatrix;  //backup modelViewMatrix
	// Move to cube frame
    for(var i=0; i<3; i++)  
        modelViewMatrix = mult(modelViewMatrix, rotate(this.angle[i], this.cubeAxes[i]));

	modelViewMatrix = mult(modelViewMatrix, translate(vec3(this.origin)));
	
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

//Cube animation step
Cube.prototype.animate = function(elapsedTime) {
	var animAngle = animSpeed * Math.round(0.06 * elapsedTime);
	if(this.isAnimating == 1) {
		if(this.target > 1) {
			this.angle[this.axis] += animAngle * this.direction;
			this.target -= animAngle;
		} else {
			this.isAnimating = 0;
			this.angle = [0, 0, 0];
			this.direction=0;
			animRunning = 0;
			this.colors = this.nextColors.slice(0);
		}
	}
};
    
var lastTime = 0;

//plane: 0=column, 1=row, 2=face
function makeTurn(data) { //plane, index, direction
	var p = data[0];
	var i = data[1];
	var d = data[2];
	if(!animRunning) {
		var p1 = (p+1)%3; //other plane 1
		var p2 = (p+2)%3; //other plane 2
		
		if(p%2 != 0) { //swap p1/p2 for y-axis rotation
			p2 = [p1, p1 = p2][0];
		}

		for(var x in planes[p][i]) {
			var id = planes[p][i][x];
			rubiks[id].axis = p;
			rubiks[id].target = 90;
			rubiks[id].direction = d;
			rubiks[id].isAnimating = 1;

			var p1Index = rubiks[id].curPos[p1]; //Cubes p1 location
			var p2Index = rubiks[id].curPos[p2]; //Cubes p2 location
			
			//Compute new colors based on p1 and p2
			if((p!=1 && d>0) || (p==1 && d<0)) {
				if(p1Index==0) {
					rubiks[id].nextColors[5-p1] = rubiks[planes[p][i][p2Index*3+2]].colors[p2];
					rubiks[id].nextColors[p] = rubiks[planes[p][i][p2Index*3+2]].colors[p];
					rubiks[id].nextColors[5-p] = rubiks[planes[p][i][p2Index*3+2]].colors[5-p]
				} else if(p1Index==2) {
					rubiks[id].nextColors[p1] = rubiks[planes[p][i][p2Index*3]].colors[5-p2];
					rubiks[id].nextColors[p] = rubiks[planes[p][i][p2Index*3]].colors[p];
					rubiks[id].nextColors[5-p] = rubiks[planes[p][i][p2Index*3]].colors[5-p];
				}
				if(p2Index==0) {
					rubiks[id].nextColors[5-p2] = rubiks[planes[p][i][-p1Index+2]].colors[5-p1];
					rubiks[id].nextColors[p] = rubiks[planes[p][i][-p1Index+2]].colors[p];
					rubiks[id].nextColors[5-p] = rubiks[planes[p][i][-p1Index+2]].colors[5-p];
				} else if(p2Index==2) {
					rubiks[id].nextColors[p2] = rubiks[planes[p][i][-p1Index+8]].colors[p1];
					rubiks[id].nextColors[p] = rubiks[planes[p][i][-p1Index+8]].colors[p];
					rubiks[id].nextColors[5-p] = rubiks[planes[p][i][-p1Index+8]].colors[5-p];
				}
			} else if((p!=1 && d<0) || (p==1 && d>0)) {
				if(p1Index==0) {
					rubiks[id].nextColors[5-p1] = rubiks[planes[p][i][(-p2Index+2)*3]].colors[5-p2];
					rubiks[id].nextColors[p] = rubiks[planes[p][i][(-p2Index+2)*3]].colors[p];
					rubiks[id].nextColors[5-p] = rubiks[planes[p][i][(-p2Index+2)*3]].colors[5-p];	
				} else if(p1Index==2) {
					rubiks[id].nextColors[p1] = rubiks[planes[p][i][(-p2Index+2)*3+2]].colors[p2];
					rubiks[id].nextColors[p] = rubiks[planes[p][i][(-p2Index+2)*3+2]].colors[p];
					rubiks[id].nextColors[5-p] = rubiks[planes[p][i][(-p2Index+2)*3+2]].colors[5-p];
				}
				if(p2Index==0) {
					rubiks[id].nextColors[5-p2] = rubiks[planes[p][i][p1Index+6]].colors[p1];
					rubiks[id].nextColors[p] = rubiks[planes[p][i][p1Index+6]].colors[p];
					rubiks[id].nextColors[5-p] = rubiks[planes[p][i][p1Index+6]].colors[5-p]
				} else if(p2Index==2) {
					rubiks[id].nextColors[p2] = rubiks[planes[p][i][p1Index]].colors[5-p1];
					rubiks[id].nextColors[p] = rubiks[planes[p][i][p1Index]].colors[p];
					rubiks[id].nextColors[5-p] = rubiks[planes[p][i][p1Index]].colors[5-p];
				}
			}
			animRunning = 1;
		}
	}
	if(checkSolve()) { //check if puzzle is solved
		$("#notify").slideDown();
	} else {
		$("#notify").fadeOut();
	}
}

function checkSolve() {
	var sideColor;
	for (var i in planes) { //for each dimension
		for (var j in planes[i]) {
			if(j==0) {
				sideColor = rubiks[planes[i][j][0]].nextColors[5-i];
				for(var k in planes[i][j])
					if(rubiks[planes[i][j][k]].nextColors[5-i]!=sideColor) {
						return false;
					}
			} else if(j==2) {
				sideColor = rubiks[planes[i][j][0]].nextColors[i];
				for(var k in planes[i][j])
					if(rubiks[planes[i][j][k]].nextColors[i]!=sideColor) {
						return false;
					}
			}
		}
	}
	return true;
}

function getRelativePlane(p, i, d) {
	return [p, i, d];
//--------------------NOT COMPLETE; PLEASE IGNORE------------------
// 	var newPlanes = [0,1,2];
// 	var newIndex = i;
// 	var newDirec = d;
// 	var angleY = Math.abs(rot[1])%360;
// 	if(rot[0] > 45) { //facing top
// 		//console.log("bar");
// 		if(rot[1]>0 && angleY>45 && angleY<135 || rot[1]<0 && angleY>225 && angleY<315) {
// 			newPlanes = [2,0,1]
// 			if(p==0)
// 				newDirec = -d;
// 		}
// 		if(angleY%180 > 45 && angleY%180 < 135) {
// 			newPlanes = [2,0,1]
// 			console.log("bar1");
// 			//return [p,i,d];
// 		} else {
// 			console.log("bar2");
// 			newPlanes = [0,2,1];
// 			//return [p,i,d];
// 		}
// 		if(rot[1]<0 && angleY<135 || rot[1]>0 && angleY<45) {
// 			console.log("negate!");
// 			newIndex = (-i+2);
// 			newDirec = -d;
// 		}		
// 	} else if(rot[0] < -45) { //facing bottom
// 		//console.log("foo");
// 	} else if(angleY%180 > 45 && angleY%180 < 135) { //facing sides
// 		newPlanes = [2,1,0];
// 		if(p!=0 && (rot[1]>0 && angleY>45 && angleY<135 || rot[1]<0 && angleY>225 && angleY<315)) {
// 			newIndex = (-i+2);
// 			newDirec = -d; //reverse spin if flipped
// 		}
// 	} else if(angleY<180 && angleY%90 > 45 || angleY>180 && angleY%180 < 45) {
// 		newIndex = (-i+2);
// 		newDirec = -d;
// 	}
// 	return [newPlanes[p],newIndex,newDirec];
}

function quad(a, b, c, d) { //create one face of the cube
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
    quad( 2, 3, 7, 6 ); //right
    quad( 6, 5, 1, 2 ); //top
    quad( 1, 0, 3, 2 ); //front
    quad( 4, 5, 6, 7 ); //back
    quad( 3, 0, 4, 7 ); //bottom
    quad( 5, 4, 0, 1 ); //left
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
	$('#accordion').accordion(); //Jquery
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
    $("#resetRot").click(function() {
		rot = [0,0,0];
		camSpeed = [0,0,0];
    });
    $("#tButton").click(function() {
		animationQueue.push([0, document.getElementById( "ind" ).value,
		document.getElementById( "dir" ).value]);
    });
    $("#tButton2").click(function() {
		animationQueue.push([1, document.getElementById( "ind" ).value,
		document.getElementById( "dir" ).value]);
    });
    $("#tButton3").click(function() {
		animationQueue.push([2, document.getElementById( "ind" ).value,
		document.getElementById( "dir" ).value]);
    });
    
    $("#hide_notify").click(function() {
    	$("#notify").slideUp();
    });
    
    $("#hide_error").click(function() {
    	$("#error_msg").slideUp();
    });
    
    //Generate random commands
    $("#gen_rand").click(function() {
     	var cmds = ["F","B","U","D","L","R","f","b","u","d","l","r"];
     	var end = $("#rand_num").val();
     	if($.isNumeric(end)) {
			$("#rand_txt").val(""); //clear text
			for(var i=0; i < end; i++) {
				$("#rand_txt").val($("#rand_txt").val()+cmds[Math.round(11*Math.random())]);
				if(Math.random() > 0.5) {
					$("#rand_txt").val($("#rand_txt").val()+"'");
				}
			}
		} else {
			$("#error_msg").slideDown();
		}
    });
    
    $("#run_rand").click(function() {
    	$("#cmd_txt").val(""); //clear commands
    	$("#cmd_txt").val($("#rand_txt").val()); //copy random commands
    	$('#accordion').accordion({active: 0});
    	runCommands();
    });
    
    $("#run_cmd").click(function() {
    	runCommands();
    });
    
    $("#saveButton").click(function() {
		var data = [];
		for (var i in rubiks) {
			data.push(rubiks[i].colors);
		}
		saveAs(new Blob([JSON.stringify(data)], {type: "text/plain;"}), ($("#file_name").val()+".txt" || "cube.txt"));
    });
    
	$("#load_save").on("change", function() { //read a savefile
		var reader = new FileReader();
		reader.onload = function() {
			var data 
			try {
				data = JSON.parse(reader.result);
				if(data.length == 27) {
					var id = 0;
					for(var i in data) {
						if(data[i].length==6) {
							rubiks[id].colors=data[i];
						} else { //Incorrect length
							$("#error_msg").slideDown();
							return;
						}
					id++;
					}
				} else { //Incorrect length
					$("#error_msg").slideDown();
					return;
				}
			} catch(e) { //not JSON
				$("#error_msg").slideDown();
				return;
			}
		}
		if(!this.files[0]) { //no file available
			$("#error_msg").slideDown();
		} else {
			reader.readAsText(this.files[0]);
		}
	});
	
	document.onkeydown = function(event) {
		if(event.keyCode > 36 && event.keyCode < 41 && $(document.activeElement).prop("tagName")=="BODY") { //arrow keys
			event.preventDefault(); //prevent scrolling
			var key = (event.keyCode-38)%2;
			var id = Math.abs(key);
			var reverseX=1;
			var angle = Math.abs(rot[0]%360);
			if(angle>90 && angle<270) { //reverse spin if flipped
				reverseX=-1;
			}
			if(Math.abs(camSpeed[id]) < 1) {
				camSpeed[id] = 1;
			}
			if(key==0) {
				camAccel[id]=(1.1*(event.keyCode-39));
			} else {
				camAccel[id]=(1.1*key*reverseX);
			}
		}
	}
	document.onkeyup = function() {
		if(event.keyCode > 36 && event.keyCode < 41) { //arrow keys
			var key = (event.keyCode-38)%2;
			var id = Math.abs(key);
			if(key==0) {
				camAccel[id]=0.9*sign(camAccel[id]);
			} else {
				camAccel[id]=0.9*sign(camAccel[id]);
			}
		}
	}
}

//get +1/-1 sign of number
function sign(x) { return (x >> 31) + (x > 0 ? 1 : 0); }

//Get commands from input
function runCommands() {
	if(!$("#cmd_txt").val()) {
		$("#error_msg").slideDown();
	} else {
		$("#error_msg").slideUp();
			//get commands text and remove smart quotes
		var txt=$("#cmd_txt").val().replace( /\u2018|\u2019|\u201A|\uFFFD/g, "'" );
		var regex = /[FBUDLRfbudlr]'?/g;
		var commands=txt.match(regex).reverse();
		for(var i in commands) {
			var cmd = commands[i];
			var d = 1;
			if(cmd.length==2) {
				d=-1;
			}
			switch(cmd[0]) {
				case "F":
					animationQueue.push([2, 2, -d]);
					break;
				case "B":
					animationQueue.push([2, 0, d]);
					break;
				case "U":
					animationQueue.push([1, 2, -d]);
					break;
				case "D":
					animationQueue.push([1, 0, d]);
					break;
				case "L":
					animationQueue.push([0, 0, d]);
					break;
				case "R":
					animationQueue.push([0, 2, -d]);
					break;
				case "f":
					animationQueue.push([2, 1, -d]);
					break;
				case "b":
					animationQueue.push([2, 1, d]);
					break;
				case "u":
					animationQueue.push([1, 1, -d]);
					break;
				case "d":
					animationQueue.push([1, 1, d]);
					break;
				case "l":
					animationQueue.push([0, 1, -d]);
					break;
				case "r":
					animationQueue.push([0, 1, d]);
					break;
			}
		}
	}
}

var render = function() {

    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            
    eye = vec3(radius*Math.sin(theta)*Math.cos(phi), radius*Math.sin(theta)*Math.sin(phi), radius*Math.cos(theta));
    
    modelViewMatrix = lookAt(eye, at , up);
    
	if(rot[0]>89 && camAccel[0]>0 || rot[0]<-89 && camAccel[0]<0) {
		camSpeed[0]=0;
	}
    
    rot[0]+=(camSpeed[0]*=sign(camSpeed[0])*camAccel[0]);
    rot[1]+=(camSpeed[1]*=sign(camSpeed[1])*camAccel[1]);
    modelViewMatrix = mult(modelViewMatrix, rotate(rot[0], [1, 0, 0] ));
    modelViewMatrix = mult(modelViewMatrix, rotate(rot[1], [0, 1, 0] ));
    
    projectionMatrix = perspective(fovy, aspect, near, far);
	
    for (var i in rubiks) {
    	rubiks[i].render(0, 0, 0);
    }
    
    //Perform Moves
    if(!animRunning && animationQueue.length) {
		var ani = animationQueue.pop();
		makeTurn(getRelativePlane(ani[0], ani[1], ani[2]));
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
    requestAnimFrame(render); //recursive
}

