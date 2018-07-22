export function getContext(canvas: HTMLCanvasElement): WebGL2RenderingContext {
    const gl = <WebGL2RenderingContext>canvas.getContext('webgl2');

    if (!gl) {
        console.error('WebGL context is not available');
        return null;
    }

    return gl;
}