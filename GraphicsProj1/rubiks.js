

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

var vertexColors = [
    vec4( 0.0, 0.0, 0.0, 1.0 ),  // black
    vec4( 1.0, 0.0, 0.0, 1.0 ),  // red
    vec4( 1.0, 1.0, 0.0, 1.0 ),  // yellow
    vec4( 0.0, 1.0, 0.0, 1.0 ),  // green
    vec4( 0.0, 0.0, 1.0, 1.0 ),  // blue
    vec4( 1.0, 0.0, 1.0, 1.0 ),  // magenta
    vec4( 0.0, 1.0, 1.0, 1.0 ),  // cyan
    vec4( 1.0, 1.0, 1.0, 1.0 ),  // white
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

var rubiks = [];
var colorIndices = [];

var cubeColors = [
	vec4( 0.1, 0.1, 0.1, 1.0 ), //black
	vec4( 1.0, 0.0, 0.0, 1.0 ), //red
	vec4( 1.0, 1.0, 0.0, 1.0 ), //yellow
	vec4( 0.0, 0.6, 0.0, 1.0 ), //green
	vec4( 0.0, .0, 0.6, 1.0 ), //blue
	vec4( 0.96, 0.96, 0.96, 1.0 ), //white
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

function testCube() {
	var index=0;
	//Color Ordering: [front, right, bottom, top, back, left]
	var c = [Colors.YELLOW, Colors.GREEN, Colors.RED, Colors.ORANGE, Colors.WHITE, Colors.GREEN];
	var frontColors = [Colors.BLACK, Colors.BLACK, Colors.YELLOW];
	var rightColors = [Colors.BLACK, Colors.BLACK, Colors.GREEN];
	var bottomColors = [Colors.RED, Colors.BLACK, Colors.BLACK];
	var topColors = [Colors.BLACK, Colors.BLACK, Colors.ORANGE];
	var backColors = [Colors.WHITE, Colors.BLACK, Colors.BLACK];
	var leftColors = [Colors.BLUE, Colors.BLACK, Colors.BLACK];
	for(var x=-1; x<=1; x++) {
		for(var y=-1; y<=1; y++) {
			for(var z=-1; z<=1; z++) {
				
				rubiks.push(new Cube([x*0.45, y*0.45, z*0.45, 1.0],
					[frontColors[z+1], rightColors[x+1], bottomColors[y+1], topColors[y+1], backColors[z+1], leftColors[x+1]]));
				// gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer);
				// for(var k in c) {
					// for(var i=0; i<=9; i++) {
						// //colorsArray.push(cubeColors[c]);
						// gl.bufferSubData(gl.ARRAY_BUFFER, 16*(index+i), flatten(cubeColors[k]));
					// }
				// }
			index++;
			}
		}
	}
	console.log("[TestCube]");
}

function Cube(position, colors) {
	this.origin = position;
	this.angle = [0, 0, 0];
	this.colors = colors;
}

Cube.prototype.draw = function(x, y, z) {
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
	
    //gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    //gl.enableVertexAttribArray( vColor);

    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW );
    
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    //gl.enableVertexAttribArray( vPosition );

	setMatrixUniforms();
	gl.drawArrays( gl.TRIANGLES, 0, NumVertices );

	modelViewMatrix = tempMV;
}
//-----------END NEW STUFF--------------------------------------------------------------------------------------------------

function quad(a, b, c, d) {
     pointsArray.push(vertices[a]); 
     pointsArray.push(vertices[b]); 
     pointsArray.push(vertices[c]); 
     pointsArray.push(vertices[a]); 
     pointsArray.push(vertices[c]); 
     pointsArray.push(vertices[d]); 
     colorsArray.push(vertexColors[a]);
	 colorsArray.push(vertexColors[a]);
	 colorsArray.push(vertexColors[a]);
	 colorsArray.push(vertexColors[a]);
	 colorsArray.push(vertexColors[a]);
	 colorsArray.push(vertexColors[a]);
	 
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
	testCube();
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
    
    document.getElementById( "xButton" ).onclick = function () {
        axis = 0;
    };
    document.getElementById( "yButton" ).onclick = function () {
        axis = 1;
    };
    document.getElementById( "zButton" ).onclick = function () {
        axis = 2;
    };
}

var render = function() {

    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            
    eye = vec3(radius*Math.sin(theta)*Math.cos(phi), radius*Math.sin(theta)*Math.sin(phi), radius*Math.cos(theta));
    
    modelViewMatrix = lookAt(eye, at , up);
    
    rot[axis]+=2.0;
	//rot[1]+=2.0;
    modelViewMatrix = mult(modelViewMatrix, rotate(rot[0], [1, 0, 0] ));
    modelViewMatrix = mult(modelViewMatrix, rotate(rot[1], [0, 1, 0] ));
    modelViewMatrix = mult(modelViewMatrix, rotate(rot[2], [0, 0, 1] ));
    
    projectionMatrix = perspective(fovy, aspect, near, far);
	
	// for(var i=0; i<9; i++)
		// rubiks[i].angle[0]++;
	// for(var i=18; i<27; i++)
		// rubiks[i].angle[0]--;
    for (var i in rubiks) {
    	rubiks[i].draw(0, 0, 0);
    }
    requestAnimFrame(render);
}

