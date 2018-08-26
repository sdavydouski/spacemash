import {mat4, vec3} from 'gl-matrix';
import {getContext} from './gl';
import {getResources} from './resources';
import {
    bindUniformBlock,
    createProgram,
    setUniform1f, setUniform1i, setUniform3fv,
    setUniformMatrix4fv
} from './shaders';
import {clamp, cos, outVec3, sin, toDegrees, toRadians} from './math';
import {createCamera} from './camera';
import {updateUI} from './ui';
import {createSkymap, createTexture, createTextureWithDimensions} from './textures';
import {parseObj} from './objLoader';

const pressedKeys: {
    [key: string]: any;
} = {};
const processedKeys: {
    [key: string]: any;
} = {};

let isViewMode = false;

interface Player {
    position: vec3,
    velocity: number,
    acceleration: number,
    rotation: number
}

getResources().then(([[
    axisVertexShaderSource, axisFragmentShaderSource,
    generalVertexShaderSource, generalFragmentShaderSource,
    skymapVertexShaderSource, skymapFragmentShaderSource,
    lightVertexShaderSource, lightFragmentShaderSource,
    lightingVertexShaderSource, lightingFragmentShaderSource,
    blurVertexShaderSource, blurHorizontalFragmentShaderSource, blurVerticalFragmentShaderSource,
    finalVertexShaderSource, finalFragmentShaderSource
], [
    bluespaceBackImage, bluespaceBottomImage, bluespaceFrontImage, bluespaceLeftImage, bluespaceRightImage, bluespaceTopImage,
    sunImage, mercuryDiffuseMapImage, mercuryNormalMapImage, venusDiffuseMapImage, venusNormalMapImage,
    earthDayDiffuseMapImage, earthSpecularMapImage, earthNormalMapImage,
    marsDiffuseMapImage, marsNormalMapImage, diffuseImage, specularImage, noneSpecularImage, flatNormalImage,
    predatorDiffuseMapImage, predatorSpecularMapImage, fighterImage, missileImage
], [
    cubeMesh, sphereMesh, predatorMesh, fighterMesh, missileMesh
]]) => {
    const player: Player = {
        position: vec3.fromValues(0, -300, 0),
        velocity: 0,
        acceleration: 0,
        rotation: 0
    };

    const baselineZ = -100;

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

    const axisShader = createProgram(gl, axisVertexShaderSource, axisFragmentShaderSource);
    bindUniformBlock(gl, axisShader.program, 'transformations', transformationsBindingIndex);

    const generalShader = createProgram(gl, generalVertexShaderSource, generalFragmentShaderSource);
    bindUniformBlock(gl, generalShader.program, 'transformations', transformationsBindingIndex);

    const skymapShader = createProgram(gl, skymapVertexShaderSource, skymapFragmentShaderSource);
    bindUniformBlock(gl, skymapShader.program, 'transformations', transformationsBindingIndex);
    const generalModel = mat4.create();

    const lightShader = createProgram(gl, lightVertexShaderSource, lightFragmentShaderSource);
    bindUniformBlock(gl, lightShader.program, 'transformations', transformationsBindingIndex);
    gl.useProgram(lightShader.program);
    const lightModel = mat4.create();
    setUniform1f(gl, lightShader.uniforms['lightBrightness'], 4);

    const lightingShader = createProgram(gl, lightingVertexShaderSource, lightingFragmentShaderSource);
    bindUniformBlock(gl, lightingShader.program, 'transformations', transformationsBindingIndex);
    gl.useProgram(lightingShader.program);
    const lightingModel = mat4.create();
    const lightPosition = vec3.fromValues(0, 0, baselineZ);
    setUniform3fv(gl, lightingShader.uniforms['uLightPosition'], lightPosition);
    setUniform1i(gl, lightingShader.uniforms['material.diffuse'], 0);
    setUniform1i(gl, lightingShader.uniforms['material.specular'], 1);
    setUniform1i(gl, lightingShader.uniforms['material.normal'], 2);
    setUniform3fv(gl, lightingShader.uniforms['light.ambient'], vec3.fromValues(0.3, 0.3, 0.3));
    setUniform3fv(gl, lightingShader.uniforms['light.diffuse'], vec3.fromValues(1, 1, 1));
    setUniform1f(gl, lightingShader.uniforms['light.constant'], 1);
    setUniform1f(gl, lightingShader.uniforms['light.linear'], 0.0004);
    setUniform1f(gl, lightingShader.uniforms['light.quadratic'], 0.000002);

    const blurHorizontalShader = createProgram(gl, blurVertexShaderSource, blurHorizontalFragmentShaderSource);
    const blurVerticalShader = createProgram(gl, blurVertexShaderSource, blurVerticalFragmentShaderSource);

    const finalShader = createProgram(gl, finalVertexShaderSource, finalFragmentShaderSource);
    gl.useProgram(finalShader.program);
    setUniform1i(gl, finalShader.uniforms['scene'], 0);
    setUniform1i(gl, finalShader.uniforms['bloomBlur'], 1);

    const projection = mat4.create();
    const view = mat4.create();
    let fov = 45;

    const UBO = gl.createBuffer();
    gl.bindBuffer(gl.UNIFORM_BUFFER, UBO);
    gl.bufferData(gl.UNIFORM_BUFFER, projection.byteLength + view.byteLength, gl.STREAM_DRAW);
    gl.bindBufferRange(gl.UNIFORM_BUFFER, transformationsBindingIndex, UBO, 0, projection.byteLength + view.byteLength);
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);

    const camera = createCamera(vec3.fromValues(player.position[0], player.position[1] - 200, 400), -60, 90);

    // grid setup {
    const HALF_WORLD_SIZE = 2000;
    const LINES_PER_AXIS = 22;
    const offset = 2 * HALF_WORLD_SIZE / (LINES_PER_AXIS - 1);
    const gridColor = [0.3, 0.3, 0.3];

    const gridArray: number[] = [];

    for (let x = -HALF_WORLD_SIZE; x <= HALF_WORLD_SIZE; x += offset) {
        gridArray.push(x, -HALF_WORLD_SIZE, 0, ...gridColor);
        gridArray.push(x, HALF_WORLD_SIZE, 0, ...gridColor);
    }
    for (let y = -HALF_WORLD_SIZE; y <= HALF_WORLD_SIZE; y += offset) {
        gridArray.push(-HALF_WORLD_SIZE, y, 0, ...gridColor);
        gridArray.push(HALF_WORLD_SIZE, y, 0, ...gridColor);
    }

    const grid = new Float32Array(gridArray);

    const gridVAO = gl.createVertexArray();
    gl.bindVertexArray(gridVAO);

    const gridVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gridVBO);
    gl.bufferData(gl.ARRAY_BUFFER, grid, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false,6 * Float32Array.BYTES_PER_ELEMENT, 0);

    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false,
        6 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);
    // }

    // axis setup {
    const axis = new Float32Array([
        // x-axis - red
        -HALF_WORLD_SIZE, 0, 0,   1, 0, 0,
        HALF_WORLD_SIZE, 0, 0,    1, 0, 0,
        // y-axis - green
        0, -HALF_WORLD_SIZE, 0,   0, 1, 0,
        0, HALF_WORLD_SIZE, 0,    0, 1, 0,
        // z-axis - blue
        0, 0, -HALF_WORLD_SIZE,   0, 0, 1,
        0, 0, HALF_WORLD_SIZE,    0, 0, 1
    ]);

    const axisVAO = gl.createVertexArray();
    gl.bindVertexArray(axisVAO);

    const axisVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, axisVBO);
    gl.bufferData(gl.ARRAY_BUFFER, axis, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false,6 * Float32Array.BYTES_PER_ELEMENT, 0);

    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false,
        6 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);
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

    const numbersPerVertex = 14;

    // cube setup {
    const cube = parseObj(cubeMesh);

    const cubeVAO = gl.createVertexArray();
    gl.bindVertexArray(cubeVAO);

    const cubeVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVBO);
    gl.bufferData(gl.ARRAY_BUFFER, cube, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false,
        numbersPerVertex * Float32Array.BYTES_PER_ELEMENT, 0);

    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false,
        numbersPerVertex * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);

    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false,
        numbersPerVertex * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);

    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 3, gl.FLOAT, false,
        numbersPerVertex * Float32Array.BYTES_PER_ELEMENT, 8 * Float32Array.BYTES_PER_ELEMENT);

    gl.enableVertexAttribArray(4);
    gl.vertexAttribPointer(4, 3, gl.FLOAT, false,
        numbersPerVertex * Float32Array.BYTES_PER_ELEMENT, 11 * Float32Array.BYTES_PER_ELEMENT);
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
        numbersPerVertex * Float32Array.BYTES_PER_ELEMENT, 0);

    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false,
        numbersPerVertex * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);

    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false,
        numbersPerVertex * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);

    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 3, gl.FLOAT, false,
        numbersPerVertex * Float32Array.BYTES_PER_ELEMENT, 8 * Float32Array.BYTES_PER_ELEMENT);

    gl.enableVertexAttribArray(4);
    gl.vertexAttribPointer(4, 3, gl.FLOAT, false,
        numbersPerVertex * Float32Array.BYTES_PER_ELEMENT, 11 * Float32Array.BYTES_PER_ELEMENT);
    // }

    // predator setup {
    const predator = parseObj(predatorMesh);

    const predatorVAO = gl.createVertexArray();
    gl.bindVertexArray(predatorVAO);

    const predatorVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, predatorVBO);
    gl.bufferData(gl.ARRAY_BUFFER, predator, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false,
        numbersPerVertex * Float32Array.BYTES_PER_ELEMENT, 0);

    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false,
        numbersPerVertex * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);

    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false,
        numbersPerVertex * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);

    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 3, gl.FLOAT, false,
        numbersPerVertex * Float32Array.BYTES_PER_ELEMENT, 8 * Float32Array.BYTES_PER_ELEMENT);

    gl.enableVertexAttribArray(4);
    gl.vertexAttribPointer(4, 3, gl.FLOAT, false,
        numbersPerVertex * Float32Array.BYTES_PER_ELEMENT, 11 * Float32Array.BYTES_PER_ELEMENT);
    // }

    // fighter setup {
    const fighter = parseObj(fighterMesh);

    const fighterVAO = gl.createVertexArray();
    gl.bindVertexArray(fighterVAO);

    const fighterVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, fighterVBO);
    gl.bufferData(gl.ARRAY_BUFFER, fighter, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false,
        numbersPerVertex * Float32Array.BYTES_PER_ELEMENT, 0);

    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false,
        numbersPerVertex * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);

    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false,
        numbersPerVertex * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);

    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 3, gl.FLOAT, false,
        numbersPerVertex * Float32Array.BYTES_PER_ELEMENT, 8 * Float32Array.BYTES_PER_ELEMENT);

    gl.enableVertexAttribArray(4);
    gl.vertexAttribPointer(4, 3, gl.FLOAT, false,
        numbersPerVertex * Float32Array.BYTES_PER_ELEMENT, 11 * Float32Array.BYTES_PER_ELEMENT);
    // }

    // missile setup {
    const missile = parseObj(missileMesh);

    const missileVAO = gl.createVertexArray();
    gl.bindVertexArray(missileVAO);

    const missileVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, missileVBO);
    gl.bufferData(gl.ARRAY_BUFFER, missile, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false,
        numbersPerVertex * Float32Array.BYTES_PER_ELEMENT, 0);

    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false,
        numbersPerVertex * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);

    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false,
        numbersPerVertex * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);

    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 3, gl.FLOAT, false,
        numbersPerVertex * Float32Array.BYTES_PER_ELEMENT, 8 * Float32Array.BYTES_PER_ELEMENT);

    gl.enableVertexAttribArray(4);
    gl.vertexAttribPointer(4, 3, gl.FLOAT, false,
        numbersPerVertex * Float32Array.BYTES_PER_ELEMENT, 11 * Float32Array.BYTES_PER_ELEMENT);
    // }

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    const noneSpecularTexture = createTexture(gl, noneSpecularImage, gl.RGB, gl.RGB);
    const flatNormalTexture = createTexture(gl, flatNormalImage, gl.RGB, gl.RGB);
    const sunTexture = createTexture(gl, sunImage, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, true);
    const mercuryDiffuseMapTexture = createTexture(gl, mercuryDiffuseMapImage, gl.RGB, gl.RGB);
    const mercuryNormalMapTexture = createTexture(gl, mercuryNormalMapImage, gl.RGB, gl.RGB);
    const venusDiffuseMapTexture = createTexture(gl, venusDiffuseMapImage, gl.RGB, gl.RGB);
    const venusNormalMapTexture = createTexture(gl, venusNormalMapImage, gl.RGB, gl.RGB);
    const earthDayDiffuseMapTexture = createTexture(gl, earthDayDiffuseMapImage, gl.RGB, gl.RGB);
    const earthSpecularMapTexture = createTexture(gl, earthSpecularMapImage, gl.RGB, gl.RGB);
    const earthNormalMapTexture = createTexture(gl, earthNormalMapImage, gl.RGB, gl.RGB);
    const marsDiffuseMapTexture = createTexture(gl, marsDiffuseMapImage, gl.RGB, gl.RGB);
    const marsNormalMapTexture = createTexture(gl, marsNormalMapImage, gl.RGB, gl.RGB);

    const diffuseMapTexture = createTexture(gl, diffuseImage);
    const specularMapTexture = createTexture(gl, specularImage);
    const predatorDiffuseMapTexture = createTexture(gl, predatorDiffuseMapImage);
    const predatorSpecularMapTexture = createTexture(gl, predatorSpecularMapImage);
    const fighterTexture = createTexture(gl, fighterImage, gl.RGB, gl.RGB);
    const missileTexture = createTexture(gl, missileImage, gl.RGBA, gl.RGBA);

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
    // noinspection JSIgnoredPromiseFromCall
    video.play();

    // Because video has to be download over the internet
    // they might take a moment until it's ready so
    // put a single pixel in the texture so we can
    // use it immediately.
    const pixel = new Uint8Array([0, 255, 0, 255]);  // opaque green
    const videoTexture = createTextureWithDimensions(gl, pixel, 1, 1);

    function updateVideoTexture(gl: WebGL2RenderingContext,
                                texture: WebGLTexture,
                                video: HTMLVideoElement) {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

        const internalFormat = gl.RGBA;
        const srcFormat = gl.RGBA;
        const srcType = gl.UNSIGNED_BYTE;
        // WebGL knows how to pull the current frame out of the video and use it as a texture
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat,
            srcFormat, srcType, video);

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    }

    if (!gl.getExtension('EXT_color_buffer_float')) {
        console.warn('need EXT_color_buffer_float extension');
    }
    
    const hdrFBO = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, hdrFBO);

    const hdrBufferTexture = createTextureWithDimensions(gl, null, screenWidth, screenHeight,
        gl.RGBA16F, gl.RGBA, gl.FLOAT);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, hdrBufferTexture, 0);

    const blurBufferTexture = createTextureWithDimensions(gl, null, screenWidth, screenHeight,
        gl.RGBA16F, gl.RGBA, gl.FLOAT);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, blurBufferTexture, 0);

    const RBO = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, RBO);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH24_STENCIL8, screenWidth, screenHeight);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, RBO);

    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);

    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        console.warn('Framebuffer is not complete');
    }

    const blurRegionWidth = 512;
    const blurRegionHeight = 512;

    const pingpongFBO1 = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, pingpongFBO1);
    const pingpongBuffer1 = createTextureWithDimensions(gl, null, blurRegionWidth, blurRegionHeight,
        gl.RGBA16F, gl.RGBA, gl.FLOAT);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, pingpongBuffer1, 0);

    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        console.warn('Framebuffer is not complete');
    }

    const pingpongFBO2 = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, pingpongFBO2);
    const pingpongBuffer2 = createTextureWithDimensions(gl, null, blurRegionWidth, blurRegionHeight,
        gl.RGBA16F, gl.RGBA, gl.FLOAT);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, pingpongBuffer2, 0);

    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        console.warn('Framebuffer is not complete');
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    let lastTime = 0;
    let updateRate = 0.01;      // 10 ms
    let lag = 0;

    let angle = 0;
    function gameLoop() {
        const currentTime = performance.now();
        const delta = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        lag += delta;

        while (lag >= updateRate) {
            let dt = 0.15;

            player.acceleration = 0;
            input(delta);
            update(dt);

            lag -= updateRate;
        }

        render(delta);

        window.requestAnimationFrame(gameLoop);
    }

    gameLoop();

    function input(delta: number) {
        const speed = 200 * delta;

        if (isViewMode) {
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
        } else {
            const acceleration = 4;
            const rotation = 0.03;

            if (pressedKeys.w) {
                player.acceleration = -acceleration;
            }
            if (pressedKeys.s) {
                player.acceleration = acceleration;
            }
            if (pressedKeys.a) {
                player.rotation += rotation;
                player.rotation %= 2 * Math.PI;
            }
            if (pressedKeys.d) {
                player.rotation -= rotation;
                player.rotation %= 2 * Math.PI;
            }
            if (pressedKeys.shift) {
                player.acceleration *= 2;
            }
        }

        if (pressedKeys.v && !processedKeys.v) {
            processedKeys.v = true;
            isViewMode = !isViewMode;
        }
    }

    function update(dt: number) {
        // friction imitation
        player.acceleration += -0.25 * player.velocity;
        player.velocity += player.acceleration * dt;

        // we move in xy plane
        const move = vec3.fromValues(
            (player.velocity * dt + 0.5 * player.acceleration * dt * dt) * sin(Math.PI - player.rotation),
            (player.velocity * dt + 0.5 * player.acceleration * dt * dt) * cos(Math.PI - player.rotation),
            0
        );

        vec3.add(player.position, player.position, move);
        vec3.add(camera.position, camera.position, move);
    }

    function render(delta: number) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, hdrFBO);

        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);

        gl.bindBuffer(gl.UNIFORM_BUFFER, UBO);
        mat4.perspective(projection, toRadians(fov), screenWidth / screenHeight, 0.1, 10000);
        camera.updateViewMatrix(view);
        gl.bufferSubData(gl.UNIFORM_BUFFER, 0, projection);
        gl.bufferSubData(gl.UNIFORM_BUFFER, projection.byteLength, view);
        gl.bindBuffer(gl.UNIFORM_BUFFER, null);

        gl.useProgram(axisShader.program);
        gl.bindVertexArray(gridVAO);
        gl.drawArrays(gl.LINES, 0, grid.length / 6);
        gl.bindVertexArray(axisVAO);
        gl.drawArrays(gl.LINES, 0, axis.length / 6);

        angle += toRadians(delta);
        angle %= 2 * Math.PI;

        // sun
        gl.bindVertexArray(sphereVAO);

        // gl.useProgram(lightingShader);
        // vec3.copy(lightPosition, [sin(-angle * 50) * 150, 10, cos(angle * 50) * 150]);
        // setUniform3fv(gl, lightPositionUniformLocation, lightPosition);

        gl.useProgram(lightShader.program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, sunTexture);
        mat4.identity(lightModel);
        mat4.translate(lightModel, lightModel, lightPosition);
        mat4.rotateZ(lightModel, lightModel, angle * 10);
        mat4.rotateX(lightingModel, lightingModel, toRadians(90));
        mat4.scale(lightModel, lightModel, [10, 10, 10]);
        setUniformMatrix4fv(gl, lightShader.uniforms['model'], lightModel);
        gl.drawArrays(gl.TRIANGLES, 0, sphere.length / numbersPerVertex);

        gl.useProgram(lightingShader.program);

        // mercury
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, mercuryDiffuseMapTexture);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, noneSpecularTexture);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, mercuryNormalMapTexture);
        mat4.identity(lightingModel);
        mat4.translate(lightingModel, lightingModel, [0, 200, baselineZ]);
        mat4.rotateZ(lightingModel, lightingModel, angle * 50);
        mat4.rotateX(lightingModel, lightingModel, toRadians(90));
        mat4.scale(lightingModel, lightingModel, [2, 2, 2]);
        setUniformMatrix4fv(gl, lightingShader.uniforms['model'], lightingModel);
        setUniform1f(gl, lightingShader.uniforms['material.shininess'], 1);
        setUniform3fv(gl, lightingShader.uniforms['light.specular'], vec3.fromValues(0.6, 0.6, 0.6));
        gl.drawArrays(gl.TRIANGLES, 0, sphere.length / numbersPerVertex);

        // venus
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, venusDiffuseMapTexture);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, noneSpecularTexture);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, venusNormalMapTexture);
        mat4.identity(lightingModel);
        mat4.translate(lightingModel, lightingModel, [0, 500, baselineZ]);
        mat4.rotateZ(lightingModel, lightingModel, angle * 50);
        mat4.rotateX(lightingModel, lightingModel, toRadians(90));
        mat4.scale(lightingModel, lightingModel, [3, 3, 3]);
        setUniformMatrix4fv(gl, lightingShader.uniforms['model'], lightingModel);
        setUniform1f(gl, lightingShader.uniforms['material.shininess'], 2);
        setUniform3fv(gl, lightingShader.uniforms['light.specular'], vec3.fromValues(0.3, 0.3, 0.3));
        gl.drawArrays(gl.TRIANGLES, 0, sphere.length / numbersPerVertex);

        // earth
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, earthDayDiffuseMapTexture);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, earthSpecularMapTexture);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, earthNormalMapTexture);
        mat4.identity(lightingModel);
        mat4.translate(lightingModel, lightingModel, [0, 800, baselineZ]);
        mat4.rotateZ(lightingModel, lightingModel, angle * 20);
        mat4.rotateX(lightingModel, lightingModel, toRadians(90));
        mat4.scale(lightingModel, lightingModel, [4, 4, 4]);
        setUniformMatrix4fv(gl, lightingShader.uniforms['model'], lightingModel);
        setUniform1f(gl, lightingShader.uniforms['material.shininess'], 16);
        setUniform3fv(gl, lightingShader.uniforms['light.specular'], vec3.fromValues(0.1, 0.1, 0.1));
        gl.drawArrays(gl.TRIANGLES, 0, sphere.length / numbersPerVertex);

        // mars
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, marsDiffuseMapTexture);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, noneSpecularTexture);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, marsNormalMapTexture);
        mat4.identity(lightingModel);
        mat4.translate(lightingModel, lightingModel, [0, 1200, baselineZ]);
        mat4.rotateZ(lightingModel, lightingModel, angle * 50);
        mat4.rotateX(lightingModel, lightingModel, toRadians(90));
        mat4.scale(lightingModel, lightingModel, [4, 4, 4]);
        setUniformMatrix4fv(gl, lightingShader.uniforms['model'], lightingModel);
        setUniform1f(gl, lightingShader.uniforms['material.shininess'], 16);
        setUniform3fv(gl, lightingShader.uniforms['light.specular'], vec3.fromValues(0.1, 0.1, 0.1));
        gl.drawArrays(gl.TRIANGLES, 0, sphere.length / numbersPerVertex);

        // cube
        gl.bindVertexArray(cubeVAO);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, diffuseMapTexture);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, specularMapTexture);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, flatNormalTexture);
        mat4.identity(lightingModel);
        mat4.translate(lightingModel, lightingModel, [100, 100, 100]);
        mat4.rotateX(lightingModel, lightingModel, angle * 10);
        mat4.rotateY(lightingModel, lightingModel, angle * 20);
        mat4.rotateZ(lightingModel, lightingModel, angle * 30);
        mat4.scale(lightingModel, lightingModel, [8, 8, 8]);
        setUniformMatrix4fv(gl, lightingShader.uniforms['model'], lightingModel);
        setUniform1f(gl, lightingShader.uniforms['material.shininess'], 256);
        setUniform3fv(gl, lightingShader.uniforms['light.specular'], vec3.fromValues(1, 1, 1));
        gl.drawArrays(gl.TRIANGLES, 0, cube.length / numbersPerVertex);

        // predator
        gl.bindVertexArray(predatorVAO);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, predatorDiffuseMapTexture);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, predatorSpecularMapTexture);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, flatNormalTexture);
        mat4.identity(lightingModel);
        mat4.translate(lightingModel, lightingModel, [-200, 200, 0]);
        // mat4.rotateX(lightingModel, lightingModel, angle * 10);
        mat4.rotateZ(lightingModel, lightingModel, angle * 20);
        mat4.rotateX(lightingModel, lightingModel, toRadians(90));
        // mat4.rotateZ(lightingModel, lightingModel, angle * 30);
        mat4.scale(lightingModel, lightingModel, [2, 2, 2]);
        setUniformMatrix4fv(gl, lightingShader.uniforms['model'], lightingModel);
        setUniform1f(gl, lightingShader.uniforms['material.shininess'], 256);
        setUniform3fv(gl, lightingShader.uniforms['light.specular'], vec3.fromValues(1, 1, 1));
        gl.drawArrays(gl.TRIANGLES, 0, predator.length / numbersPerVertex);

        // fighter
        gl.bindVertexArray(fighterVAO);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, fighterTexture);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, noneSpecularTexture);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, flatNormalTexture);
        mat4.identity(lightingModel);
        mat4.translate(lightingModel, lightingModel, player.position);
        mat4.rotateZ(lightingModel, lightingModel, player.rotation);
        mat4.rotateX(lightingModel, lightingModel, toRadians(90));
        mat4.scale(lightingModel, lightingModel, [2, 2, 2]);
        setUniformMatrix4fv(gl, lightingShader.uniforms['model'], lightingModel);
        setUniform1f(gl, lightingShader.uniforms['material.shininess'], 64);
        setUniform3fv(gl, lightingShader.uniforms['light.specular'], vec3.fromValues(1, 1, 1));
        gl.drawArrays(gl.TRIANGLES, 0, fighter.length / numbersPerVertex);

        // missile
        gl.bindVertexArray(missileVAO);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, missileTexture);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, noneSpecularTexture);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, flatNormalTexture);
        mat4.identity(lightingModel);
        mat4.translate(lightingModel, lightingModel, [100, 100, 200]);
        mat4.rotateY(lightingModel, lightingModel, angle * 100);
        mat4.rotateX(lightingModel, lightingModel, toRadians(90));
        mat4.scale(lightingModel, lightingModel, [1, 1, 1]);
        setUniformMatrix4fv(gl, lightingShader.uniforms['model'], lightingModel);
        setUniform1f(gl, lightingShader.uniforms['material.shininess'], 64);
        setUniform3fv(gl, lightingShader.uniforms['light.specular'], vec3.fromValues(1, 1, 1));
        gl.drawArrays(gl.TRIANGLES, 0, missile.length / numbersPerVertex);

        // motivation
        gl.useProgram(generalShader.program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, videoTexture);

        if (playing && timeupdate) {
            updateVideoTexture(gl, videoTexture, video);
        }

        gl.bindVertexArray(quadVAO);
        mat4.identity(generalModel);
        mat4.translate(generalModel, generalModel, [0, -2000, 0]);
        mat4.rotateX(generalModel, generalModel, toRadians(90));
        mat4.scale(generalModel, generalModel, [1000, 500, 500]);
        setUniformMatrix4fv(gl, generalShader.uniforms['model'], generalModel);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // skymap
        gl.bindVertexArray(cubeVAO);
        gl.depthFunc(gl.LEQUAL);
        gl.useProgram(skymapShader.program);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, bluespaceSkymapTexture);
        gl.drawArrays(gl.TRIANGLES, 0, 36);
        gl.depthFunc(gl.LESS);

        // blurring
        gl.viewport(0, 0, blurRegionWidth, blurRegionHeight);
        const amount = 5;
        let horizontal = true;
        gl.bindVertexArray(quadVAO);
        for (let i = 0; i < amount; ++i) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, horizontal ? pingpongFBO1 : pingpongFBO2);
            gl.useProgram(horizontal ? blurHorizontalShader.program : blurVerticalShader.program);
            if (i === 0) {
                gl.bindTexture(gl.TEXTURE_2D, blurBufferTexture);
            } else {
                gl.bindTexture(gl.TEXTURE_2D, horizontal ? pingpongBuffer2 : pingpongBuffer1);
            }
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            horizontal = !horizontal;
        }

        // final render to the screen
        gl.viewport(0, 0, screenWidth, screenHeight);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.clearColor(0, 1, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindVertexArray(quadVAO);
        gl.disable(gl.DEPTH_TEST);
        gl.useProgram(finalShader.program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, hdrBufferTexture);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, pingpongBuffer1);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        updateUI([camera.position, camera.direction, isViewMode]);
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
        if (isViewMode) {
            let xOffset = e.movementX;
            let yOffset = -e.movementY;

            xOffset *= mouseSensitivity;
            yOffset *= mouseSensitivity;

            camera.rotate(xOffset, yOffset);
        }
    }

    function onKeyDown(e: KeyboardEvent) {
        const key = e.key.toLowerCase();
        pressedKeys[key] = true;
    }

    function onKeyUp(e: KeyboardEvent) {
        const key = e.key.toLowerCase();
        pressedKeys[key] = false;
        processedKeys[key] = false;
    }

    const zoomSensitivity = 0.01;
    function onWheel(e: WheelEvent) {
        fov += e.deltaY * zoomSensitivity;
        fov = clamp(fov, 1, 45);
    }
});

