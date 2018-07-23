import {mat4} from 'gl-matrix';

export function createShader(gl: WebGL2RenderingContext, source: string, type: number): WebGLShader {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation failed:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);

        return null;
    }

    return shader;
}

export function createProgram(gl: WebGL2RenderingContext,
                              vertexShader: WebGLShader,
                              fragmentShader: WebGLShader): WebGLProgram {
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.error('Shader program linkage failed:', gl.getProgramInfoLog(shaderProgram));
        gl.deleteProgram(shaderProgram);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);

        return null;
    }

    gl.detachShader(shaderProgram, vertexShader);
    gl.detachShader(shaderProgram, fragmentShader);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    return shaderProgram;
}

export function getUniformLocation(gl: WebGL2RenderingContext,
                                   shaderProgram: WebGLProgram,
                                   name: string): WebGLUniformLocation {
    const location = gl.getUniformLocation(shaderProgram, name);

    if (!location) {
        console.warn(`Uniform ${name} either doesn't exist or isn't used`);
    }

    return location;
}