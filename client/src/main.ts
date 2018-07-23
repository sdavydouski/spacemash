import {mat4, vec3} from 'gl-matrix';
import {getContext} from './gl';
import {getResources} from './resources';
import {createProgram, createShader, getUniformLocation} from './shaders';
import {clamp, toRadians} from './math';
import {createCamera} from './camera';

const pressedKeys: {
    [key: string]: any;
} = {};

getResources().then(([[vertexShaderSource, fragmentShaderSource]]) => {
    const canvas = <HTMLCanvasElement>document.getElementById('game-surface');
    const gl = getContext(canvas);

    const uiPanel = <HTMLDivElement>document.getElementById('ui-panel');

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

    const vertexShader = createShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = createShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);
    const shaderProgram = createProgram(gl, vertexShader, fragmentShader);

    gl.useProgram(shaderProgram);

    const modelUniformLocation = getUniformLocation(gl, shaderProgram, 'model');
    const model = mat4.create();
    gl.uniformMatrix4fv(modelUniformLocation, false, model);

    const viewUniformLocation = getUniformLocation(gl, shaderProgram, 'view');
    const view = mat4.create();

    const projectionUniformLocation = getUniformLocation(gl, shaderProgram, 'projection');
    const projection = mat4.create();
    let fov = 45;

    const camera = createCamera();

    const magic = 10;
    const LINES_PER_AXIS = 100;
    const offsetX = 2 * magic / (LINES_PER_AXIS - 1);
    const offsetZ = 2 * magic / (LINES_PER_AXIS - 1);

    let grid: number[] = [];

    for (let x = -magic; x <= magic; x += offsetX) {
        grid.push(x, 0, -magic);
        grid.push(x, 0, magic);
    }
    for (let z = -magic; z <= magic; z += offsetZ) {
        grid.push(-magic, 0, z);
        grid.push(magic, 0, z);
    }

    const vertices = new Float32Array(grid);

    const VAO = gl.createVertexArray();
    gl.bindVertexArray(VAO);

    const VBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, VBO);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false,0, 0);

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

        gl.useProgram(shaderProgram);

        mat4.perspective(projection, toRadians(fov), screenWidth / screenHeight, 0.1, 100);
        gl.uniformMatrix4fv(projectionUniformLocation, false, projection);

        camera.updateViewMatrix(view);
        gl.uniformMatrix4fv(viewUniformLocation, false, view);

        gl.bindBuffer(gl.ARRAY_BUFFER, VBO);
        gl.drawArrays(gl.LINES, 0, grid.length / 3);

        updateUI();
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

    function updateUI() {
        uiPanel.innerHTML = `
            <span>
                ${camera.position[0].toFixed(3)}, 
                ${camera.position[1].toFixed(3)}, 
                ${camera.position[2].toFixed(3)}
            </span>
            <span>
                ${camera.direction[0].toFixed(3)}, 
                ${camera.direction[1].toFixed(3)}, 
                ${camera.direction[2].toFixed(3)}
            </span>
        `;
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

