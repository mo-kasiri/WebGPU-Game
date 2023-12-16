struct VertexOut{
    @builtin(position) position: vec4f,
    @location(0) color: vec4f
}

/*
below we see a function called vertexMain is declared with the @vertex attribute.
This designates it as a vertex shader function.
It accepts one parameter we named vertexIndex.

vertexIndex is a u32 which means a 32-bit unsigned integer.**It gets its value from the builtin called vertex_index.**
vertex_index is the like an iteration number, similar to index in JavaScript’s Array.map(function(value, index) { ... }).
If we tell the GPU to execute this function 10 times by calling draw,
the first time vertex_index would be 0, the 2nd time it would be 1, the 3rd time it would be 2, etc…
*/
@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex :u32) -> @builtin(position) vec4f
{
    let pos = array(
              vec2f( 0.0,  0.5),  // top center
              vec2f(-0.5, -0.5),  // bottom left
              vec2f( 0.5, -0.5)   // bottom right
    );

    /*
    The vertexMain function declares an array of 3 vec2fs. Each vec2f consists of two 32-bit floating point values.
    Finally it uses vertexIndex to return one of the 3 values from the array.
    Since the function requires 4 floating point values for its return type,
    and since pos is an array of vec2f, the code supplies 0.0 and 1.0 for the remaining 2 values.
    */

    //var output: VertexOut;
    //output.position = vec4f(pos[vertexIndex],0.0,1.0);
    //output.color = vec4(1.0, 0.0, 0.0, 1.0);

    return vec4f(pos[vertexIndex],0.0,1.0);
}

// The shader module also declares a function called fragmentMain that is declared with @fragment attribute making it a fragment shader function.
/*
This function takes no parameters and returns a vec4f at location(0).
This means it will write to the first render target.
The code returns 1, 0, 0, 1 which is red.
Colors in WebGPU are usually specified as floating point values from 0.0 to 1.0
where the 4 values above correspond to red, green, blue, and alpha respectively.
When the GPU rasterizes the triangle (draws it with pixels), it will call the fragment shader to find out what color to make each pixel.
In our case, we’re just returning red.
*/
@fragment
fn fragmentMain() -> @location(0) vec4f
{
    return vec4f(1.0, 0.0, 0.0, 1.0);
}
