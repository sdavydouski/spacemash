import {getContext} from './gl';
import {getResources} from './resources';
import {createProgram, createShader, getUniformLocation, setShaderUniform} from './shaders';
import {toRadians} from './math';
import {FLOAT_SIZE_IN_BYTES} from './sizes';

getResources().then(([[vertexShaderSource, fragmentShaderSource]]) => {
    const canvas = <HTMLCanvasElement>document.getElementById('glCanvas');
    const gl = getContext(canvas);

    const onResize = () => {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        canvas.width = screenWidth;
        canvas.height = screenHeight;

        gl.viewport(0, 0, screenWidth, screenHeight);
    };
    window.addEventListener('resize', onResize);
    onResize();

    const vertexShader = createShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = createShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);
    const shaderProgram = createProgram(gl, vertexShader, fragmentShader);

    gl.useProgram(shaderProgram);

    const pointSizeUniformLocation = getUniformLocation(gl, shaderProgram, 'pointSize');
    setShaderUniform(gl, pointSizeUniformLocation, 50);
    const angleUniformLocation = getUniformLocation(gl, shaderProgram, 'angle');

    const vertices = new Float32Array([
        0, 0, 0, 0,
        0.5, 0.5, 0, toRadians(0),
        0.5, -0.5, 0, toRadians(90),
        -0.5, -0.5, 0, toRadians(180),
        -0.5, 0.5, 0, toRadians(270)
    ]);

    const VAO = gl.createVertexArray();
    gl.bindVertexArray(VAO);

    const VBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, VBO);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false,
        4 * FLOAT_SIZE_IN_BYTES, 0);

    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 1, gl.FLOAT, false,
        4 * FLOAT_SIZE_IN_BYTES, 3 * FLOAT_SIZE_IN_BYTES);

    let lastTime = 0;
    function gameLoop() {
        const currentTime = performance.now();
        const delta = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        render(delta);

        window.requestAnimationFrame(gameLoop);
    }

    let angle = toRadians(-90);

    gl.clearColor(0, 0, 0, 1);
    function render(delta: number) {
        gl.clear(gl.COLOR_BUFFER_BIT);

        angle += toRadians(90) * delta;
        angle %= 2 * Math.PI;
        setShaderUniform(gl, angleUniformLocation, angle);

        gl.bindBuffer(gl.ARRAY_BUFFER, VBO);
        gl.useProgram(shaderProgram);
        gl.drawArrays(gl.POINTS, 0, 5);
    }

    gameLoop();
});

