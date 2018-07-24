import {mat4} from 'gl-matrix';
import {getContext} from './gl';
import {getResources} from './resources';
import {createProgram, createShader, getUniformLocation, setUniformMatrix4fv} from './shaders';
import {clamp, getRandomNumberInRange, toRadians} from './math';
import {createCamera} from './camera';
import {updateUI} from './ui';

const pressedKeys: {
    [key: string]: any;
} = {};

getResources().then(([[
    gridVertexShaderSource, gridFragmentShaderSource,
    quadVertexShaderSource, quadFragmentShaderSource,
]]) => {
    const canvas = <HTMLCanvasElement>document.getElementById('game-surface');
    const gl = getContext(canvas);

    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    const onResize = () => {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        canvas.width = screenWidth;
        canvas.height = screenHeight;

        gl.viewport(0, 0, screenWidth, screenHeight);
    };
    window.addEventListener('resize', onResize);
    onResize();

    const transformationsBindingIndex = 0;

    const gridVertexShader = createShader(gl, gridVertexShaderSource, gl.VERTEX_SHADER);
    const gridFragmentShader = createShader(gl, gridFragmentShaderSource, gl.FRAGMENT_SHADER);
    const gridShaderProgram = createProgram(gl, gridVertexShader, gridFragmentShader);
    const gridUniformBlockIndex = gl.getUniformBlockIndex(gridShaderProgram, 'transformations');
    gl.uniformBlockBinding(gridShaderProgram, gridUniformBlockIndex, transformationsBindingIndex);

    const quadVertexShader = createShader(gl, quadVertexShaderSource, gl.VERTEX_SHADER);
    const quadFragmentShader = createShader(gl, quadFragmentShaderSource, gl.FRAGMENT_SHADER);
    const quadShaderProgram = createProgram(gl, quadVertexShader, quadFragmentShader);
    const quadUniformBlockIndex = gl.getUniformBlockIndex(gridShaderProgram, 'transformations');
    gl.uniformBlockBinding(quadShaderProgram, quadUniformBlockIndex, transformationsBindingIndex);
    const quadModelUniformLocation = getUniformLocation(gl, quadShaderProgram, 'model');

    const quadsCount = 100;
    const quadModels: mat4[] = [];
    for (let i = 0; i < quadsCount; ++i) {
        quadModels[i] = mat4.create();
        mat4.translate(quadModels[i], quadModels[i], [
            getRandomNumberInRange(-10, 10),
            getRandomNumberInRange(0, 5),
            getRandomNumberInRange(-10, 10)
        ]);
        mat4.rotateX(quadModels[i], quadModels[i], toRadians(getRandomNumberInRange(0, 360)));
        mat4.rotateY(quadModels[i], quadModels[i], toRadians(getRandomNumberInRange(0, 360)));
        mat4.rotateZ(quadModels[i], quadModels[i], toRadians(getRandomNumberInRange(0, 360)));
    }

    const projection = mat4.create();
    const view = mat4.create();
    let fov = 45;

    const UBO = gl.createBuffer();
    gl.bindBuffer(gl.UNIFORM_BUFFER, UBO);
    gl.bufferData(gl.UNIFORM_BUFFER, projection.byteLength + view.byteLength, gl.STREAM_DRAW);
    gl.bindBufferRange(gl.UNIFORM_BUFFER, transformationsBindingIndex, UBO, 0, projection.byteLength + view.byteLength);
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);

    const camera = createCamera();

    // grid setup {
    const HALF_WORLD_SIZE = 10;
    const LINES_PER_AXIS = 50;
    const offset = 2 * HALF_WORLD_SIZE / (LINES_PER_AXIS - 1);

    const grid = new Float32Array(2 * LINES_PER_AXIS * 2 * 3);

    let index = 0;
    for (let x = -HALF_WORLD_SIZE; x <= HALF_WORLD_SIZE; x += offset) {
        grid[index++] = x;
        grid[index++] = 0;
        grid[index++] = -HALF_WORLD_SIZE;

        grid[index++] = x;
        grid[index++] = 0;
        grid[index++] = HALF_WORLD_SIZE;
    }
    for (let z = -HALF_WORLD_SIZE; z <= HALF_WORLD_SIZE; z += offset) {
        grid[index++] = -HALF_WORLD_SIZE;
        grid[index++] = 0;
        grid[index++] = z;

        grid[index++] = HALF_WORLD_SIZE;
        grid[index++] = 0;
        grid[index++] = z;
    }

    const gridVAO = gl.createVertexArray();
    gl.bindVertexArray(gridVAO);

    const gridVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gridVBO);
    gl.bufferData(gl.ARRAY_BUFFER, grid, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false,0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    // }

    // quad setup {
    const quad = new Float32Array([
        -0.5, -0.5, 0, 0, 0,
        -0.5, 0.5, 0, 0, 1,
        0.5, -0.5, 0, 1, 0,
        0.5, 0.5, 0, 1, 1
    ]);

    const quadVAO = gl.createVertexArray();
    gl.bindVertexArray(quadVAO);

    const quadVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVBO);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false,
        5 * Float32Array.BYTES_PER_ELEMENT, 0);

    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false,
        5 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    // }

    let lastTime = 0;
    function gameLoop() {
        const currentTime = performance.now();
        const delta = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        input(delta);
        render(delta);

        window.requestAnimationFrame(gameLoop);
    }

    gl.clearColor(0, 0, 0, 1);
    function render(delta: number) {
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.bindBuffer(gl.UNIFORM_BUFFER, UBO);
        mat4.perspective(projection, toRadians(fov), screenWidth / screenHeight, 0.1, 100);
        camera.updateViewMatrix(view);
        gl.bufferSubData(gl.UNIFORM_BUFFER, 0, projection);
        gl.bufferSubData(gl.UNIFORM_BUFFER, projection.byteLength, view);
        gl.bindBuffer(gl.UNIFORM_BUFFER, null);

        gl.bindVertexArray(gridVAO);
        gl.useProgram(gridShaderProgram);
        gl.drawArrays(gl.LINES, 0, grid.length / 3);
        gl.bindVertexArray(null);

        gl.useProgram(quadShaderProgram);
        gl.bindVertexArray(quadVAO);

        for (let i = 0; i < quadsCount; ++i) {
            setUniformMatrix4fv(gl, quadModelUniformLocation, quadModels[i]);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }

        gl.bindVertexArray(null);

        updateUI([camera.position, camera.direction]);
    }

    gameLoop();

    function input(delta: number) {
        const speed = 2.5 * delta;

        if (pressedKeys.w) {
            camera.moveForward(speed);
        }
        if (pressedKeys.s) {
            camera.moveBackward(speed);
        }
        if (pressedKeys.a) {
            camera.strafeLeft(speed);
        }
        if (pressedKeys.d) {
            camera.strafeRight(speed);
        }
    }

    canvas.addEventListener('click', () => {
        canvas.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
        if(document.pointerLockElement === canvas) {
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('keydown', onKeyDown);
            window.addEventListener('keyup', onKeyUp);
            window.addEventListener('wheel', onWheel);
        } else {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('wheel', onWheel);
        }
    });


    const mouseSensitivity = 0.05;
    function onMouseMove(e: MouseEvent) {
        let xOffset = e.movementX;
        let yOffset = -e.movementY;

        xOffset *= mouseSensitivity;
        yOffset *= mouseSensitivity;

        camera.rotate(xOffset, yOffset);
    }

    function onKeyDown(e: KeyboardEvent) {
        pressedKeys[e.key] = true;
    }

    function onKeyUp(e: KeyboardEvent) {
        pressedKeys[e.key] = false;
    }

    const zoomSensitivity = 0.01;
    function onWheel(e: WheelEvent) {
        fov += e.deltaY * zoomSensitivity;
        fov = clamp(fov, 1, 45);
    }
});

