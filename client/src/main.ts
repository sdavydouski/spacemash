import {mat4, vec3} from 'gl-matrix';
import {getContext} from './gl';
import {getResources} from './resources';
import {
    createProgram,
    createShader,
    getUniformLocation,
    setUniform1f,
    setUniform1i,
    setUniformMatrix4fv
} from './shaders';
import {clamp, toRadians} from './math';
import {createCamera} from './camera';
import {updateUI} from './ui';
import {createSkymap, createTexture} from './textures';

const pressedKeys: {
    [key: string]: any;
} = {};

getResources().then(([[
    gridVertexShaderSource, gridFragmentShaderSource,
    cubeVertexShaderSource, cubeFragmentShaderSource,
    skymapVertexShaderSource, skymapFragmentShaderSource
], [
    awesomeFaceImage, gridImage,
    bluespaceBackImage, bluespaceBottomImage, bluespaceFrontImage, bluespaceLeftImage, bluespaceRightImage, bluespaceTopImage
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

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.enable(gl.DEPTH_TEST);

    const transformationsBindingIndex = 0;

    const gridVertexShader = createShader(gl, gridVertexShaderSource, gl.VERTEX_SHADER);
    const gridFragmentShader = createShader(gl, gridFragmentShaderSource, gl.FRAGMENT_SHADER);
    const gridShaderProgram = createProgram(gl, gridVertexShader, gridFragmentShader);
    const gridUniformBlockIndex = gl.getUniformBlockIndex(gridShaderProgram, 'transformations');
    gl.uniformBlockBinding(gridShaderProgram, gridUniformBlockIndex, transformationsBindingIndex);

    const cubeVertexShader = createShader(gl, cubeVertexShaderSource, gl.VERTEX_SHADER);
    const cubeFragmentShader = createShader(gl, cubeFragmentShaderSource, gl.FRAGMENT_SHADER);
    const cubeShaderProgram = createProgram(gl, cubeVertexShader, cubeFragmentShader);
    const cubeUniformBlockIndex = gl.getUniformBlockIndex(gridShaderProgram, 'transformations');
    gl.uniformBlockBinding(cubeShaderProgram, cubeUniformBlockIndex, transformationsBindingIndex);

    const skymapVertexShader = createShader(gl, skymapVertexShaderSource, gl.VERTEX_SHADER);
    const skymapFragmentShader = createShader(gl, skymapFragmentShaderSource, gl.FRAGMENT_SHADER);
    const skymapShaderProgram = createProgram(gl, skymapVertexShader, skymapFragmentShader);
    const skymapUniformBlockIndex = gl.getUniformBlockIndex(skymapShaderProgram, 'transformations');
    gl.uniformBlockBinding(skymapShaderProgram, skymapUniformBlockIndex, transformationsBindingIndex);

    const cubeModelUniformLocation = getUniformLocation(gl, cubeShaderProgram, 'model');
    const model = mat4.create();
    mat4.translate(model, model, [0, 1, 0]);
    gl.useProgram(cubeShaderProgram);
    setUniformMatrix4fv(gl, cubeModelUniformLocation, model);

    const angleUniformLocation = getUniformLocation(gl, cubeShaderProgram, 'angle');

    const projection = mat4.create();
    const view = mat4.create();
    let fov = 45;

    const UBO = gl.createBuffer();
    gl.bindBuffer(gl.UNIFORM_BUFFER, UBO);
    gl.bufferData(gl.UNIFORM_BUFFER, projection.byteLength + view.byteLength, gl.STREAM_DRAW);
    gl.bindBufferRange(gl.UNIFORM_BUFFER, transformationsBindingIndex, UBO, 0, projection.byteLength + view.byteLength);
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);

    const camera = createCamera(vec3.fromValues(-3, 3, 4), vec3.fromValues(0.5, -0.4, -0.8));

    // grid setup {
    const HALF_WORLD_SIZE = 20;
    const LINES_PER_AXIS = 20;
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

    // cube setup {
    const cube = new Float32Array([
        // position          uv       color      normal

        // front face
        -1, -1, 1,    0, 1,    1, 0, 0,    0, 0, 1,
        -1, 1, 1,     0, 0,    1, 0, 0,    0, 0, 1,
        1, -1, 1,     1, 1,    1, 0, 0,    0, 0, 1,
        1, 1, 1,      1, 0,    1, 0, 0,    0, 0, 1,
        -1, 1, 1,     0, 0,    1, 0, 0,    0, 0, 1,
        1, -1, 1,     1, 1,    1, 0, 0,    0, 0, 1,

        // right face
        1, -1, 1,     0, 1,    0, 1, 0,    1, 0, 0,
        1, 1, 1,      0, 0,    0, 1, 0,    1, 0, 0,
        1, -1, -1,    1, 1,    0, 1, 0,    1, 0, 0,
        1, 1, -1,     1, 0,    0, 1, 0,    1, 0, 0,
        1, 1, 1,      0, 0,    0, 1, 0,    1, 0, 0,
        1, -1, -1,    1, 1,    0, 1, 0,    1, 0, 0,

        // back face
        1, -1, -1,    0, 1,    1, 1, 0,    0, 0, -1,
        1, 1, -1,     0, 0,    1, 1, 0,    0, 0, -1,
        -1, -1, -1,   1, 1,    1, 1, 0,    0, 0, -1,
        -1, 1, -1,    1, 0,    1, 1, 0,    0, 0, -1,
        1, 1, -1,     0, 0,    1, 1, 0,    0, 0, -1,
        -1, -1, -1,   1, 1,    1, 1, 0,    0, 0, -1,

        // left face
        -1, -1, -1,   0, 1,    0, 0, 1,    -1, 0, 0,
        -1, 1, -1,    0, 0,    0, 0, 1,    -1, 0, 0,
        -1, -1, 1,    1, 1,    0, 0, 1,    -1, 0, 0,
        -1, 1, 1,     1, 0,    0, 0, 1,    -1, 0, 0,
        -1, 1, -1,    0, 0,    0, 0, 1,    -1, 0, 0,
        -1, -1, 1,    1, 1,    0, 0, 1,    -1, 0, 0,

        // top face
        -1, 1, 1,     0, 1,    0, 1, 1,     0, 1, 0,
        -1, 1, -1,    0, 0,    0, 1, 1,     0, 1, 0,
        1, 1, 1,      1, 1,    0, 1, 1,     0, 1, 0,
        1, 1, -1,     1, 0,    0, 1, 1,     0, 1, 0,
        -1, 1, -1,    0, 0,    0, 1, 1,     0, 1, 0,
        1, 1, 1,      1, 1,    0, 1, 1,     0, 1, 0,

        // bottom face
        -1, -1, -1,   0, 1,    1, 0, 1,     0, -1, 0,
        -1, -1, 1,    0, 0,    1, 0, 1,     0, -1, 0,
        1, -1, -1,    1, 1,    1, 0, 1,     0, -1, 0,
        1, -1, 1,     1, 0,    1, 0, 1,     0, -1, 0,
        -1, -1, 1,    0, 0,    1, 0, 1,     0, -1, 0,
        1, -1, -1,    1, 1,    1, 0, 1,     0, -1, 0
    ]);

    const cubeVAO = gl.createVertexArray();
    gl.bindVertexArray(cubeVAO);

    const cubeVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVBO);
    gl.bufferData(gl.ARRAY_BUFFER, cube, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false,
        11 * Float32Array.BYTES_PER_ELEMENT, 0);

    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false,
        11 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);

    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false,
        11 * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);

    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 3, gl.FLOAT, false,
        11 * Float32Array.BYTES_PER_ELEMENT, 8 * Float32Array.BYTES_PER_ELEMENT);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    // }

    // gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    const awesomeFaceTexture = createTexture(gl, gl.RGBA, awesomeFaceImage);
    const gridTexture = createTexture(gl, gl.RGB, gridImage);

    gl.useProgram(cubeShaderProgram);
    const awesomeFaceTextureUniformLocation = getUniformLocation(gl, cubeShaderProgram, 'awesomeFaceTexture');
    setUniform1i(gl, awesomeFaceTextureUniformLocation, 0);
    const gridTextureUniformLocation = getUniformLocation(gl, cubeShaderProgram, 'gridTexture');
    setUniform1i(gl, gridTextureUniformLocation, 1);

    const bluespaceSkymapTexture = createSkymap(gl, gl.RGB, {
        right: bluespaceRightImage, left: bluespaceLeftImage,
        top: bluespaceTopImage, bottom: bluespaceBottomImage,
        back: bluespaceBackImage, front: bluespaceFrontImage
    });

    // gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

    let lastTime = 0;
    function gameLoop() {
        const currentTime = performance.now();
        const delta = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        input(delta);
        render(delta);

        window.requestAnimationFrame(gameLoop);
    }

    let angle = 0;
    gl.clearColor(0, 0, 0, 1);
    function render(delta: number) {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.bindBuffer(gl.UNIFORM_BUFFER, UBO);
        mat4.perspective(projection, toRadians(fov), screenWidth / screenHeight, 0.1, 1000);
        camera.updateViewMatrix(view);
        gl.bufferSubData(gl.UNIFORM_BUFFER, 0, projection);
        gl.bufferSubData(gl.UNIFORM_BUFFER, projection.byteLength, view);
        gl.bindBuffer(gl.UNIFORM_BUFFER, null);

        gl.bindVertexArray(gridVAO);
        gl.useProgram(gridShaderProgram);
        gl.drawArrays(gl.LINES, 0, grid.length / 3);

        gl.useProgram(cubeShaderProgram);
        angle += delta;
        angle %= Math.PI * 2;
        setUniform1f(gl, angleUniformLocation, angle);

        gl.bindVertexArray(cubeVAO);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, awesomeFaceTexture);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, gridTexture);
        gl.drawArrays(gl.TRIANGLES, 0, 36);

        // rendering skymap
        gl.bindVertexArray(cubeVAO);
        gl.depthFunc(gl.LEQUAL);
        gl.useProgram(skymapShaderProgram);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, bluespaceSkymapTexture);
        gl.drawArrays(gl.TRIANGLES, 0, 36);
        gl.depthFunc(gl.LESS);

        updateUI([camera.position, camera.direction]);
    }

    gameLoop();

    function input(delta: number) {
        const speed = 5 * delta;

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

