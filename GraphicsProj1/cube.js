
var canvas;
var gl;

var NumVertices  = 36;

var points = [];
var colors = [];

var cubeLocations = [];
var cubeRotations = [];

var xAxis = 0;
var yAxis = 1;
var zAxis = 2;

var axis = 0;
var theta = [ 0, 0, 0 ];

var thetaLoc;

var black = [ 0.1, 0.1, 0.1, 1.0 ];
var red = [ 1.0, 0.0, 0.0, 1.0 ];
var yellow = [ 1.0, 1.0, 0.0, 1.0 ];
var green = [ 0.0, 1.0, 0.0, 1.0 ];
var blue = [ 0.0, 0.0, 1.0, 1.0 ];
var white = [ 0.96, 0.96, 0.96, 1.0 ];
var orange = [ 1.0, 0.5, 0.0, 1.0 ];

window.onload = function init()
{
    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    rubiksCube();
	//colorCube();

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
    
    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    var cBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW );

    var vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );

    var vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );

    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    thetaLoc = gl.getUniformLocation(program, "theta"); 
    
    //event listeners for buttons
    
    document.getElementById( "xButton" ).onclick = function () {
        axis = xAxis;
    };
    document.getElementById( "yButton" ).onclick = function () {
        axis = yAxis;
    };
    document.getElementById( "zButton" ).onclick = function () {
        axis = zAxis;
    };
        
    render();
}

function rubiksCube() {
	var i=0;
	for(var x=-1; x<=1; x++) {
		for(var y=-1; y<=1; y++) {
			for(var z=-1; z<=1; z++) {
				cubeAt(x*0.4, y*0.4, z*0.4);
				i++;
			}
		}
	}
	console.log(i);
}

function cubeAt(x, y, z) {
	quad2( 1, 0, 3, 2 );
    quad2( 2, 3, 7, 6 );
    quad2( 3, 0, 4, 7 );
    quad2( 6, 5, 1, 2 );
    quad2( 4, 5, 6, 7 );
    quad2( 5, 4, 0, 1 );
	cubeLocations.push([x,y,z]);
	console.log([x,y,z]);
}

function quad2(a, b, c, d) 
{
	var vertices = [
        vec3( -0.2, -0.2,  0.2 ),
        vec3( -0.2,  0.2,  0.2 ),
        vec3(  0.2,  0.2,  0.2 ),
        vec3(  0.2, -0.2,  0.2 ),
        vec3( -0.2, -0.2, -0.2 ),
        vec3( -0.2,  0.2, -0.2 ),
        vec3(  0.2,  0.2, -0.2 ),
        vec3(  0.2, -0.2, -0.2 )
    ];

    var vertexColors = [
        [ 0.0, 0.0, 0.0, 1.0 ],  // black
        [ 1.0, 0.0, 0.0, 1.0 ],  // red
        [ 1.0, 1.0, 0.0, 1.0 ],  // yellow
        [ 0.0, 1.0, 0.0, 1.0 ],  // green
        [ 0.0, 0.0, 1.0, 1.0 ],  // blue
        [ 1.0, 0.5, 0.0, 1.0 ],  // orange
        [ 0.96, 0.96, 0.96, 1.0 ],  //gray
        [ 0.0, 1.0, 1.0, 1.0 ]   // cyan
    ];
    
    var indices = [ a, b, c, a, c, d ];

    for ( var i = 0; i < indices.length; ++i ) {
		//console.log(vertices[indices[i]]);
        points.push( vertices[indices[i]] );
        colors.push(vertexColors[a]); //solid colors        
    }
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

function quad(a, b, c, d) 
{
    var vertices = [
        vec3( -0.5, -0.5,  0.5 ),
        vec3( -0.5,  0.5,  0.5 ),
        vec3(  0.5,  0.5,  0.5 ),
        vec3(  0.5, -0.5,  0.5 ),
        vec3( -0.5, -0.5, -0.5 ),
        vec3( -0.5,  0.5, -0.5 ),
        vec3(  0.5,  0.5, -0.5 ),
        vec3(  0.5, -0.5, -0.5 )
    ];

    var vertexColors = [
        [ 0.0, 0.0, 0.0, 1.0 ],  // black
        [ 1.0, 0.0, 0.0, 1.0 ],  // red
        [ 1.0, 1.0, 0.0, 1.0 ],  // yellow
        [ 0.0, 1.0, 0.0, 1.0 ],  // green
        [ 0.0, 0.0, 1.0, 1.0 ],  // blue
        [ 1.0, 0.5, 0.0, 1.0 ],  // orange
        [ 0.96, 0.96, 0.96, 1.0 ],  //gray
        [ 0.0, 1.0, 1.0, 1.0 ]   // cyan
    ];

    // We need to parition the quad into two triangles in order for
    // WebGL to be able to render it.  In this case, we create two
    // triangles from the quad indices
    
    //vertex color assigned by the index of the vertex
    
    var indices = [ a, b, c, a, c, d ];

    for ( var i = 0; i < indices.length; ++i ) {
        points.push( vertices[indices[i]] );
        //colors.push( vertexColors[indices[i]] ); //blended colors
        colors.push(vertexColors[a]); //solid colors
        
    }
}

function render()
{
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    theta[axis] += 2.0;
    gl.uniform3fv(thetaLoc, theta);

    gl.drawArrays( gl.TRIANGLES, 0, NumVertices );

    requestAnimFrame( render );
}

