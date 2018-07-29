async function getShaders(): Promise<string[]> {
    const [
        gridVertexShaderResponse,
        gridFragmentShaderResponse,
        quadVertexShaderResponse,
        quadFragmentShaderResponse,
        skymapVertexShaderResponse,
        skymapFragmentShaderResponse
    ] = await Promise.all([
        fetch('/shaders/grid/grid.vert'),
        fetch('/shaders/grid/grid.frag'),
        fetch('/shaders/cube/cube.vert'),
        fetch('/shaders/cube/cube.frag'),
        fetch('/shaders/skymap/skymap.vert'),
        fetch('/shaders/skymap/skymap.frag')
    ]);

    return await Promise.all([
        gridVertexShaderResponse.text(),
        gridFragmentShaderResponse.text(),
        quadVertexShaderResponse.text(),
        quadFragmentShaderResponse.text(),
        skymapVertexShaderResponse.text(),
        skymapFragmentShaderResponse.text()
    ]);
}

function loadTexture(url: string): Promise<HTMLImageElement> {
    return new Promise<HTMLImageElement>(resolve => {
        const texture = new Image();
        texture.src = url;
        texture.onload = () => resolve(texture);
    });
}

async function getTextures(): Promise<HTMLImageElement[]> {
    return await Promise.all([
        loadTexture('/textures/awesomeface.png'),
        loadTexture('/textures/grid.jpg'),

        loadTexture('/textures/skymaps/blue/bkg1_back.png'),
        loadTexture('/textures/skymaps/blue/bkg1_bottom.png'),
        loadTexture('/textures/skymaps/blue/bkg1_front.png'),
        loadTexture('/textures/skymaps/blue/bkg1_left.png'),
        loadTexture('/textures/skymaps/blue/bkg1_right.png'),
        loadTexture('/textures/skymaps/blue/bkg1_top.png'),

        loadTexture('/textures/sphere_test_texture.png'),
        loadTexture('/textures/monkey_test_texture.png')
    ]);
}

async function getModels(): Promise<string[]> {
    const [
        sphereMeshResponse,
        monkeyMeshResponse
    ] = await Promise.all([
        fetch('/models/sphere/sphere.obj'),
        fetch('/models/monkey/monkey.obj')
    ]);

    return await Promise.all([
        sphereMeshResponse.text(),
        monkeyMeshResponse.text()
    ]);
}

export async function getResources(): Promise<[string[], HTMLImageElement[], string[]]> {
    return await Promise.all([
        getShaders(),
        getTextures(),
        getModels()
    ]);
}