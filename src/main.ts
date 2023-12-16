import './style.css';
import shaderSource from "./shaders/shader.wgsl?raw";

class Renderer {

    private context!: GPUCanvasContext;

    // To use WebGPU, you start by creating a GPU device.
    // his device represents the GPU on the user's machine and is the primary interface for interacting with the GPU.
    private device!: GPUDevice;

    private pipeline!: GPURenderPipeline;
    constructor() {}

    public async initialize()
    {
        const canvas = document.getElementById('canvas') as HTMLCanvasElement;
        this.context = canvas.getContext('webgpu')!;

        if(!this.context){
            alert('webgpu is not supported');
            console.error('webgpu is not supported');
            return -1;
        }

        const adaptor : GPUAdapter | null = await navigator?.gpu.requestAdapter({powerPreference: 'low-power'});
        this.device = await adaptor!.requestDevice();
        this.context.configure({
            device: this.device,
            format: navigator.gpu.getPreferredCanvasFormat()
        });
        this.prepareModel();
    }

    private prepareModel()
    {
        // A shader module contains one or more shader functions
        const shaderModule = this.device.createShaderModule({
            label: 'our hardcoded red triangle shaders', // always try to label
            code: shaderSource
        });

        /*
        * We then tell the render pipeline to use the vertexMain function from our shader module for a vertex shader
        *  and the fragmentMain function for our fragment shader.
        * */
        const vertexState: GPUVertexState = {
            module: shaderModule,
            entryPoint: "vertexMain",
            buffers: []
        }
        const fragmentState: GPUFragmentState = {
            module: shaderModule,
            entryPoint: "fragmentMain",
            targets:[{format:navigator.gpu.getPreferredCanvasFormat()}]
        }

        this.pipeline = this.device.createRenderPipeline({
            vertex: vertexState,
            fragment: fragmentState,
            primitive: {
                topology: "triangle-list"
            },
            layout: "auto" // We set layout to 'auto' which means to ask WebGPU to derive the layout of data from the shaders. We’re not using any data though.
        });
    }

    public draw()
    {
        /*
        Data, such as vertex positions, colors, and textures, is stored in buffers and textures.
         Buffers are used for generic data, and textures are used for image data.
        Buffers and textures are created on the GPU and are more efficient for rendering because the data stays on the GPU,
         (reducing the need for frequent data transfers between the CPU and GPU)
         */
        const commandEncoder = this.device.createCommandEncoder();
        const textureView = this.context.getCurrentTexture().createView();
        const renderPassDescriptor: GPURenderPassDescriptor = {
           label: 'our basic canvas renderPass',
           colorAttachments:[{
               view: textureView,
               clearValue:{r: 0.0, g: 0.0, b: 0.25, a: 1.0},
               loadOp: 'clear',
               storeOp: 'store'
           }]
        }


        const passEncoder = commandEncoder.beginRenderPass((renderPassDescriptor));

        passEncoder.setPipeline(this.pipeline);
        passEncoder.draw(3); // 3 times for 3 vertices
        passEncoder.end();

        /*
        Developers use a command encoder to encode a sequence of rendering commands,
         specifying how buffers, textures, and shaders should be used.
        These commands are sent to the GPU for execution.
         */
        const commandBuffer = commandEncoder.finish();
        this.device.queue.submit([commandBuffer]);
        //console.log('drew')
    }
}

const renderer = new Renderer();
renderer.initialize().then(()=>
{
    renderer.draw();
});

