import {mat3, mat4, vec3} from 'gl-matrix';
import {getContext} from './gl';
import {getResources} from './resources';
import {
    createProgram,
    createShader,
    getUniformLocation, setUniform1f, setUniform1i, setUniform3fv, setUniformMatrix3fv,
    setUniformMatrix4fv
} from './shaders';
import {clamp, cos, outMat3, outMat4, sin, toRadians} from './math';
import {createCamera} from './camera';
import {updateUI} from './ui';
import {createSkymap, createTexture} from './textures';
import {parseObj} from './objLoader';

const pressedKeys: {
    [key: string]: any;
} = {};

getResources().then(([[
    gridVertexShaderSource, gridFragmentShaderSource,
    generalVertexShaderSource, generalFragmentShaderSource,
    skymapVertexShaderSource, skymapFragmentShaderSource,
    lightingVertexShaderSource, lightingFragmentShaderSource
], [
    bluespaceBackImage, bluespaceBottomImage, bluespaceFrontImage, bluespaceLeftImage, bluespaceRightImage, bluespaceTopImage,
    sunImage, mercuryImage, venusImage, earthDayDiffuseMapImage, earthSpecularMapImage, marsImage,
    diffuseImage, specularImage, noneSpecularImage,
    spaceshipImage
], [
    cubeMesh, sphereMesh, spaceshipMesh
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

    const generalVertexShader = createShader(gl, generalVertexShaderSource, gl.VERTEX_SHADER);
    const generalFragmentShader = createShader(gl, generalFragmentShaderSource, gl.FRAGMENT_SHADER);
    const generalShaderProgram = createProgram(gl, generalVertexShader, generalFragmentShader);
    const generalUniformBlockIndex = gl.getUniformBlockIndex(gridShaderProgram, 'transformations');
    gl.uniformBlockBinding(generalShaderProgram, generalUniformBlockIndex, transformationsBindingIndex);

    const skymapVertexShader = createShader(gl, skymapVertexShaderSource, gl.VERTEX_SHADER);
    const skymapFragmentShader = createShader(gl, skymapFragmentShaderSource, gl.FRAGMENT_SHADER);
    const skymapShaderProgram = createProgram(gl, skymapVertexShader, skymapFragmentShader);
    const skymapUniformBlockIndex = gl.getUniformBlockIndex(skymapShaderProgram, 'transformations');
    gl.uniformBlockBinding(skymapShaderProgram, skymapUniformBlockIndex, transformationsBindingIndex);

    const generalModelUniformLocation = getUniformLocation(gl, generalShaderProgram, 'model');
    const model = mat4.create();

    const lightingVertexShader = createShader(gl, lightingVertexShaderSource, gl.VERTEX_SHADER);
    const lightingFragmentShader = createShader(gl, lightingFragmentShaderSource, gl.FRAGMENT_SHADER);
    const lightingShaderProgram = createProgram(gl, lightingVertexShader, lightingFragmentShader);
    const lightingUniformBlockIndex = gl.getUniformBlockIndex(lightingShaderProgram, 'transformations');
    gl.uniformBlockBinding(lightingShaderProgram, lightingUniformBlockIndex, transformationsBindingIndex);
    const lightingModelUniformLocation = getUniformLocation(gl, lightingShaderProgram, 'model');
    const lightingModel = mat4.create();

    const lightPosition = vec3.fromValues(0, 0, 0);

    gl.useProgram(lightingShaderProgram);
    const lightPositionUniformLocation = getUniformLocation(gl, lightingShaderProgram, 'uLightPosition');
    setUniform3fv(gl, lightPositionUniformLocation, lightPosition);
    const normalMatrixUniformLocation = getUniformLocation(gl, lightingShaderProgram, 'normalMatrix');
    const normalMatrix = mat3.create();
    
    const materialDiffuseMapUniformLocation = getUniformLocation(gl, lightingShaderProgram, 'material.diffuse');
    setUniform1i(gl, materialDiffuseMapUniformLocation, 0);
    const materialSpecularMapUniformLocation = getUniformLocation(gl, lightingShaderProgram, 'material.specular');
    setUniform1i(gl, materialSpecularMapUniformLocation, 1);
    const materialShininessUniformLocation = getUniformLocation(gl, lightingShaderProgram, 'material.shininess');

    const lightAmbientUniformLocation = getUniformLocation(gl, lightingShaderProgram, 'light.ambient');
    setUniform3fv(gl, lightAmbientUniformLocation, vec3.fromValues(0.3, 0.3, 0.3));
    const lightDiffuseUniformLocation = getUniformLocation(gl, lightingShaderProgram, 'light.diffuse');
    setUniform3fv(gl, lightDiffuseUniformLocation, vec3.fromValues(1, 1, 1));
    const lightSpecularUniformLocation = getUniformLocation(gl, lightingShaderProgram, 'light.specular');

    const lightConstantAttenuationUniformLocation = getUniformLocation(gl, lightingShaderProgram, 'light.constant');
    setUniform1f(gl, lightConstantAttenuationUniformLocation, 1);
    const lightLinearAttenuationUniformLocation = getUniformLocation(gl, lightingShaderProgram, 'light.linear');
    setUniform1f(gl, lightLinearAttenuationUniformLocation, 0.0004);
    const lightQuadraticAttenuationUniformLocation = getUniformLocation(gl, lightingShaderProgram, 'light.quadratic');
    setUniform1f(gl, lightQuadraticAttenuationUniformLocation, 0.000002);

    const projection = mat4.create();
    const view = mat4.create();
    let fov = 45;

    const UBO = gl.createBuffer();
    gl.bindBuffer(gl.UNIFORM_BUFFER, UBO);
    gl.bufferData(gl.UNIFORM_BUFFER, projection.byteLength + view.byteLength, gl.STREAM_DRAW);
    gl.bindBufferRange(gl.UNIFORM_BUFFER, transformationsBindingIndex, UBO, 0, projection.byteLength + view.byteLength);
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);

    const camera = createCamera(vec3.fromValues(0, 15, 100), vec3.fromValues(0, 0, -1));

    // grid setup {
    const HALF_WORLD_SIZE = 2000;
    const LINES_PER_AXIS = 22;
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
        -1, -1, 0,  0, 0,  0, 0, 1,
        -1, 1, 0,   0, 1,  0, 0, 1,
        1, -1, 0,   1, 0,  0, 0, 1,
        1, 1, 0,    1, 1,  0, 0, 1,
    ]);

    const quadVAO = gl.createVertexArray();
    gl.bindVertexArray(quadVAO);

    const quadVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVBO);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false,
        8 * Float32Array.BYTES_PER_ELEMENT, 0);

    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false,
        8 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);

    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false,
        8 * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);
    // }

    // cube setup {
    const cube = parseObj(cubeMesh);

    const cubeVAO = gl.createVertexArray();
    gl.bindVertexArray(cubeVAO);

    const cubeVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVBO);
    gl.bufferData(gl.ARRAY_BUFFER, cube, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false,
        8 * Float32Array.BYTES_PER_ELEMENT, 0);

    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false,
        8 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);

    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false,
        8 * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);
    // }

    // sphere setup {
    const sphere = parseObj(sphereMesh);

    const sphereVAO = gl.createVertexArray();
    gl.bindVertexArray(sphereVAO);

    const sphereVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVBO);
    gl.bufferData(gl.ARRAY_BUFFER, sphere, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false,
        8 * Float32Array.BYTES_PER_ELEMENT, 0);

    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false,
        8 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);

    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false,
        8 * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);
    // }

    // spaceship setup {
    const spaceship = parseObj(spaceshipMesh);

    const spaceshipVAO = gl.createVertexArray();
    gl.bindVertexArray(spaceshipVAO);

    const spaceshipVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, spaceshipVBO);
    gl.bufferData(gl.ARRAY_BUFFER, spaceship, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false,
        8 * Float32Array.BYTES_PER_ELEMENT, 0);

    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false,
        8 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);

    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false,
        8 * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);
    // }

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    const noneSpecularTexture = createTexture(gl, gl.RGB, noneSpecularImage);
    const sunTexture = createTexture(gl, gl.RGB, sunImage);
    const mercuryTexture = createTexture(gl, gl.RGB, mercuryImage);
    const venusTexture = createTexture(gl, gl.RGB, venusImage);
    const earthDayDiffuseMapTexture = createTexture(gl, gl.RGB, earthDayDiffuseMapImage);
    const earthSpecularMapTexture = createTexture(gl, gl.RGB, earthSpecularMapImage);
    const marsTexture = createTexture(gl, gl.RGB, marsImage);

    const diffuseMapTexture = createTexture(gl, gl.RGBA, diffuseImage);
    const specularMapTexture = createTexture(gl, gl.RGBA, specularImage);

    const spaceshipTexture = createTexture(gl, gl.RGBA, spaceshipImage);

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

    const bluespaceSkymapTexture = createSkymap(gl, gl.RGB, {
        right: bluespaceRightImage, left: bluespaceLeftImage,
        top: bluespaceTopImage, bottom: bluespaceBottomImage,
        back: bluespaceBackImage, front: bluespaceFrontImage
    });


    let playing = false;
    let timeupdate = false;

    const video = <HTMLVideoElement>document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.loop = true;

    video.addEventListener('playing', () => {
        playing = true;
    }, true);
    video.addEventListener('timeupdate', () => {
        timeupdate = true;
    }, true);

    video.src = '/video/motivation.mp4';
    video.play();

    const videoTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, videoTexture);

    // Because video has to be download over the internet
    // they might take a moment until it's ready so
    // put a single pixel in the texture so we can
    // use it immediately.
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 255, 0, 255]);  // opaque green
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
        width, height, border, srcFormat, srcType,
        pixel);

    // Turn off mips and set  wrapping to clamp to edge so it
    // will work regardless of the dimensions of the video.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    function updateVideoTexture(gl: WebGL2RenderingContext,
                                texture: WebGLTexture,
                                video: HTMLVideoElement) {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

        const level = 0;
        const internalFormat = gl.RGBA;
        const srcFormat = gl.RGBA;
        const srcType = gl.UNSIGNED_BYTE;
        // WebGL knows how to pull the current frame out of the video and use it as a texture
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
            srcFormat, srcType, video);

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    }


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
        mat4.perspective(projection, toRadians(fov), screenWidth / screenHeight, 0.1, 10000);
        camera.updateViewMatrix(view);
        gl.bufferSubData(gl.UNIFORM_BUFFER, 0, projection);
        gl.bufferSubData(gl.UNIFORM_BUFFER, projection.byteLength, view);
        gl.bindBuffer(gl.UNIFORM_BUFFER, null);

        // gl.bindVertexArray(gridVAO);
        // gl.useProgram(gridShaderProgram);
        // gl.drawArrays(gl.LINES, 0, grid.length / 3);

        angle += toRadians(delta);
        angle %= 2 * Math.PI;

        // sun
        gl.bindVertexArray(sphereVAO);

        // gl.useProgram(lightingShaderProgram);
        // vec3.copy(lightPosition, [sin(-angle * 50) * 150, 10, cos(angle * 50) * 150]);
        // setUniform3fv(gl, lightPositionUniformLocation, lightPosition);

        gl.useProgram(generalShaderProgram);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, sunTexture);
        mat4.identity(model);
        mat4.translate(model, model, lightPosition);
        mat4.rotateY(model, model, angle * 10);
        mat4.scale(model, model, [5, 5, 5]);
        setUniformMatrix4fv(gl, generalModelUniformLocation, model);
        gl.drawArrays(gl.TRIANGLES, 0, sphere.length / 8);

        gl.useProgram(lightingShaderProgram);

        // mercury
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, mercuryTexture);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, noneSpecularTexture);
        mat4.identity(lightingModel);
        mat4.translate(lightingModel, lightingModel, [sin(angle * 20) * -100, 0, cos(angle * 20) * 100]);
        mat4.rotateY(lightingModel, lightingModel, angle * 50);
        mat4.scale(lightingModel, lightingModel, [1, 1, 1]);
        setUniformMatrix4fv(gl, lightingModelUniformLocation, lightingModel);
        mat3.transpose(normalMatrix, mat3.invert(outMat3, mat3.fromMat4(outMat3, mat4.multiply(outMat4, view, lightingModel))));
        setUniformMatrix3fv(gl, normalMatrixUniformLocation, normalMatrix);
        setUniform1f(gl, materialShininessUniformLocation, 1);
        setUniform3fv(gl, lightSpecularUniformLocation, vec3.fromValues(0.6, 0.6, 0.6));
        gl.drawArrays(gl.TRIANGLES, 0, sphere.length / 8);

        // venus
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, venusTexture);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, noneSpecularTexture);
        mat4.identity(lightingModel);
        mat4.translate(lightingModel, lightingModel, [sin(angle * 15) * -200, 0, cos(angle * 15) * 200]);
        mat4.rotateY(lightingModel, lightingModel, angle * 50);
        mat4.scale(lightingModel, lightingModel, [1.5, 1.5, 1.5]);
        setUniformMatrix4fv(gl, lightingModelUniformLocation, lightingModel);
        mat3.transpose(normalMatrix, mat3.invert(outMat3, mat3.fromMat4(outMat3, mat4.multiply(outMat4, view, lightingModel))));
        setUniformMatrix3fv(gl, normalMatrixUniformLocation, normalMatrix);
        setUniform1f(gl, materialShininessUniformLocation, 2);
        setUniform3fv(gl, lightSpecularUniformLocation, vec3.fromValues(0.3, 0.3, 0.3));
        gl.drawArrays(gl.TRIANGLES, 0, sphere.length / 8);

        // earth
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, earthDayDiffuseMapTexture);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, earthSpecularMapTexture);
        mat4.identity(lightingModel);
        mat4.translate(lightingModel, lightingModel, [sin(angle * 10) * -400, 0, cos(angle * 10) * 400]);
        mat4.rotateY(lightingModel, lightingModel, angle * 20);
        mat4.scale(lightingModel, lightingModel, [2, 2, 2]);
        setUniformMatrix4fv(gl, lightingModelUniformLocation, lightingModel);
        mat3.transpose(normalMatrix, mat3.invert(outMat3, mat3.fromMat4(outMat3, mat4.multiply(outMat4, view, lightingModel))));
        setUniformMatrix3fv(gl, normalMatrixUniformLocation, normalMatrix);
        setUniform1f(gl, materialShininessUniformLocation, 4);
        setUniform3fv(gl, lightSpecularUniformLocation, vec3.fromValues(0.1, 0.1, 0.1));
        gl.drawArrays(gl.TRIANGLES, 0, sphere.length / 8);

        // mars
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, marsTexture);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, noneSpecularTexture);
        mat4.identity(lightingModel);
        mat4.translate(lightingModel, lightingModel, [sin(angle * 5) * -650, 0, cos(angle * 5) * 650]);
        mat4.rotateY(lightingModel, lightingModel, angle * 50);
        mat4.scale(lightingModel, lightingModel, [2, 2, 2]);
        setUniformMatrix4fv(gl, lightingModelUniformLocation, lightingModel);
        mat3.transpose(normalMatrix, mat3.invert(outMat3, mat3.fromMat4(outMat3, mat4.multiply(outMat4, view, lightingModel))));
        setUniformMatrix3fv(gl, normalMatrixUniformLocation, normalMatrix);
        setUniform1f(gl, materialShininessUniformLocation, 16);
        setUniform3fv(gl, lightSpecularUniformLocation, vec3.fromValues(0.1, 0.1, 0.1));
        gl.drawArrays(gl.TRIANGLES, 0, sphere.length / 8);

        // cube
        gl.bindVertexArray(cubeVAO);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, diffuseMapTexture);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, specularMapTexture);
        mat4.identity(lightingModel);
        mat4.translate(lightingModel, lightingModel, [100, 100, 100]);
        mat4.rotateX(lightingModel, lightingModel, angle * 10);
        mat4.rotateY(lightingModel, lightingModel, angle * 20);
        mat4.rotateZ(lightingModel, lightingModel, angle * 30);
        mat4.scale(lightingModel, lightingModel, [8, 8, 8]);
        setUniformMatrix4fv(gl, lightingModelUniformLocation, lightingModel);
        mat3.transpose(normalMatrix, mat3.invert(outMat3, mat3.fromMat4(outMat3, mat4.multiply(outMat4, view, lightingModel))));
        setUniformMatrix3fv(gl, normalMatrixUniformLocation, normalMatrix);
        setUniform1f(gl, materialShininessUniformLocation, 64);
        setUniform3fv(gl, lightSpecularUniformLocation, vec3.fromValues(1, 1, 1));
        gl.drawArrays(gl.TRIANGLES, 0, cube.length / 8);

        // spaceship
        gl.bindVertexArray(spaceshipVAO);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, spaceshipTexture);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, noneSpecularTexture);
        mat4.identity(lightingModel);
        mat4.translate(lightingModel, lightingModel, [-100, 100, 100]);
        mat4.rotateX(lightingModel, lightingModel, angle * 10);
        mat4.rotateY(lightingModel, lightingModel, angle * 20);
        mat4.rotateZ(lightingModel, lightingModel, angle * 30);
        mat4.scale(lightingModel, lightingModel, [4, 4, 4]);
        setUniformMatrix4fv(gl, lightingModelUniformLocation, lightingModel);
        mat3.transpose(normalMatrix, mat3.invert(outMat3, mat3.fromMat4(outMat3, mat4.multiply(outMat4, view, lightingModel))));
        setUniformMatrix3fv(gl, normalMatrixUniformLocation, normalMatrix);
        setUniform1f(gl, materialShininessUniformLocation, 64);
        setUniform3fv(gl, lightSpecularUniformLocation, vec3.fromValues(1, 1, 1));
        gl.drawArrays(gl.TRIANGLES, 0, spaceship.length / 8);

        // motivation
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, videoTexture);

        if (playing && timeupdate) {
            updateVideoTexture(gl, videoTexture, video);
        }

        gl.bindVertexArray(quadVAO);
        gl.useProgram(generalShaderProgram);
        mat4.identity(model);
        mat4.translate(model, model, [0, 500, -2000]);
        mat4.scale(model, model, [1000, 500, 500]);
        setUniformMatrix4fv(gl, generalModelUniformLocation, model);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // skymap
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
        const speed = 200 * delta;

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

