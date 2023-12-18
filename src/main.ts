import './style.css';
import shaderSource from "./shaders/shader.wgsl?raw";

class Renderer {

    private context!: GPUCanvasContext; // Indicates where do you want to render exactly

    // To use WebGPU, you start by creating a GPU device.
    // his device represents the GPU on the user's machine and is the primary interface for interacting with the GPU.
    private device!: GPUDevice; // A logical device is the basis from which a web app accesses all WebGPU functionality.

    private pipeline!: GPURenderPipeline;
    private positionBuffer!: GPUBuffer;
    private colorsBuffer!: GPUBuffer;
    private renderPassDescriptor!: GPURenderPassDescriptor;
    constructor() {}

    public async initialize(): Promise<void>
    {
        const canvas = document.getElementById('canvas') as HTMLCanvasElement;
        this.context = canvas.getContext('webgpu')!;

        if(!this.context){
            this.fail('need a browser that supports WebGPU');
            console.error('webgpu is not supported');
            return;
        }

        const adaptor : GPUAdapter | null = await navigator?.gpu.requestAdapter({powerPreference: 'low-power'});
        this.device = await adaptor!.requestDevice();

        this.context.configure({
            device: this.device,
            format: navigator.gpu.getPreferredCanvasFormat(),
            alphaMode: "premultiplied"
        });
        this.prepareModel();

        this.positionBuffer = this.createBuffer(new Float32Array([
            -0.5, -0.5, // x,y
            0.5, -0.5,
            0.0, 0.5
        ]));

        this.colorsBuffer = this.createBuffer(new Float32Array([
            1.0, 0.0, 0.0, // r g b
            0.0, 1.0, 0.0,
            0.0, 0.0, 1.0
        ]))
    }

    /*
    The GPUBuffer is created via a call to GPUDevice.createBuffer().
    We give it a size equal to the length of the vertices array so it can contain all the data,
    and VERTEX and COPY_DST usage flags to indicate that the buffer will be used as a vertex buffer and the destination of copy operations.
     */
    private createBuffer(data: Float32Array): GPUBuffer {
        const buffer = this.device.createBuffer({
            size: data.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });

        new Float32Array(buffer.getMappedRange()).set(data);
        buffer.unmap();

        return buffer;
    }

    private prepareModel()
    {
        // A shader module contains one or more shader functions
        const shaderModule = this.device.createShaderModule({
            label: 'our hardcoded red triangle shaders', // always try to label
            code: shaderSource
        });

        const positionBufferLayout: GPUVertexBufferLayout = {
            arrayStride: 2 * Float32Array.BYTES_PER_ELEMENT,
            attributes:[{
                    shaderLocation:0,
                    offset:0,
                    format: "float32x2"
                }],
            stepMode: "vertex"
        };

        const colorBufferLayout: GPUVertexBufferLayout = {
            arrayStride: 3 * Float32Array.BYTES_PER_ELEMENT,
            attributes:[{
                shaderLocation:1,
                offset:0,
                format: "float32x3"
            }],
            stepMode: "vertex"
        }

        /*
        * We then tell the render pipeline to use the vertexMain function from our shader module for a vertex shader
        *  and the fragmentMain function for our fragment shader.
        * */
        const vertexState: GPUVertexState = {
            module: shaderModule,
            entryPoint: "vertexMain",
            buffers: [positionBufferLayout,colorBufferLayout]
        }

        const fragmentState: GPUFragmentState = {
            module: shaderModule,
            entryPoint: "fragmentMain",
            targets:[{format:navigator.gpu.getPreferredCanvasFormat()}]
        }

        this.pipeline = this.device.createRenderPipeline({
            label: "draw a triangle",
            vertex: vertexState,
            fragment: fragmentState,
            primitive: {
                topology: "triangle-list"
            },
            layout: "auto" // We set layout to 'auto' which means to ask WebGPU to derive the layout of data from the shaders. We’re not using any data though.
        });


        //  GPURenderPassDescriptor which describes which textures we want to draw to and how to use them.
        /*
        A GPURenderPassDescriptor has an array for colorAttachments which lists the textures we will render to and how to treat them.
        We’ll wait to fill in which texture we actually want to render to.
        For now, we set up a clear value of semi-dark gray, and a loadOp and storeOp.
        loadOp: 'clear' specifies to clear the texture to the clear value before drawing.
        The other option is 'load' which means load the existing contents of the texture into the GPU so we can draw over what’s already there.
        storeOp: 'store' means store the result of what we draw. We could also pass 'discard' which would throw away what we draw.
         */

        this.renderPassDescriptor = {
            label: 'our basic canvas renderPass',
            colorAttachments:[{
                view: this.context.getCurrentTexture().createView(),

                clearValue:{r: 0.3, g: 0.3, b: 0.23, a: 1.0},
                loadOp: 'clear',
                storeOp: 'store'
            }]
        }

        /*
         * we call context.getCurrentTexture() to get a texture that will appear in the canvas.
         * Calling createView gets a view into a specific part of a texture but with no parameters,
         * it will return the default part which is what we want in this case.
         * For now, our only colorAttachment is a texture view from our canvas which we get via the context we created at the start.
         * Again, element 0 of the colorAttachments array corresponds to @location(0) as we specified for the return value of the fragment shader.
         */
        //const textureView = this.context.getCurrentTexture().createView();
    }


    public render()
    {

        /*
        Data, such as vertex positions, colors, and textures, is stored in buffers and textures.
        Buffers are used for generic data, and textures are used for image data.
        Buffers and textures are created on the GPU and are more efficient for rendering because the data stays on the GPU,
        (reducing the need for frequent data transfers between the CPU and GPU)
         */

        const commandEncoder = this.device.createCommandEncoder();

        // A pass encoder object on which compute/render commands are issued
        // A render pass encoder is a specific encoder for creating commands related to rendering.
        // We pass it our renderPassDescriptor to tell it which texture we want to render to.
        const renderPassEncoder = commandEncoder.beginRenderPass((this.renderPassDescriptor));


        /*
           We encode the command, setPipeline, to set our pipeline
           and then tell it to execute our vertex shader 3 times by calling draw with 3
         */

        /*
        It’s important to emphasize that all of these functions we called like setPipeline,
        and draw only add commands to a command buffer.
        They don’t actually execute the commands.
        The commands are executed when we submit the command buffer to the device queue.
         */
        renderPassEncoder.setPipeline(this.pipeline);

        renderPassEncoder.setVertexBuffer(0, this.positionBuffer);
        renderPassEncoder.setVertexBuffer(1, this.colorsBuffer);
        renderPassEncoder.draw(3); // 3 times for 3 vertices
        renderPassEncoder.end();

        /*
        Developers use a command encoder to encode a sequence of rendering commands,
        specifying how buffers, textures, and shaders should be used.
        These commands are sent to the GPU for execution.
         */

        /*
        We end the render pass, and then finish the encoder.
        This gives us a command buffer that represents the steps we just specified.
        Finally, we submit the command buffer to be executed.
         */
        const commandBuffer = commandEncoder.finish();
        this.device.queue.submit([commandBuffer]); //Submit the command buffer to the GPU via the logical device's command queue.
        //console.log('drew')
    }

    private fail(msg:String) {
        // eslint-disable-next-line no-alert
        alert(msg);
    }
}

const renderer = new Renderer();
renderer.initialize().then(()=>
{
    renderer.render();
});

