async function getShaders(): Promise<string[]> {
    const [
        gridVertexShaderResponse,
        gridFragmentShaderResponse,
        generalVertexShaderResponse,
        generalFragmentShaderResponse,
        skymapVertexShaderResponse,
        skymapFragmentShaderResponse
    ] = await Promise.all([
        fetch('/shaders/grid/grid.vert'),
        fetch('/shaders/grid/grid.frag'),
        fetch('/shaders/general/general.vert'),
        fetch('/shaders/general/general.frag'),
        fetch('/shaders/skymap/skymap.vert'),
        fetch('/shaders/skymap/skymap.frag')
    ]);

    return await Promise.all([
        gridVertexShaderResponse.text(),
        gridFragmentShaderResponse.text(),
        generalVertexShaderResponse.text(),
        generalFragmentShaderResponse.text(),
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
        loadTexture('/textures/skymaps/blue/bkg1_back.png'),
        loadTexture('/textures/skymaps/blue/bkg1_bottom.png'),
        loadTexture('/textures/skymaps/blue/bkg1_front.png'),
        loadTexture('/textures/skymaps/blue/bkg1_left.png'),
        loadTexture('/textures/skymaps/blue/bkg1_right.png'),
        loadTexture('/textures/skymaps/blue/bkg1_top.png'),

        loadTexture('/textures/sun.jpg'),
        loadTexture('/textures/mercury.jpg'),
        loadTexture('/textures/venus.jpg'),
        loadTexture('/textures/earth.jpg'),
        loadTexture('/textures/mars.jpg')
    ]);
}

async function getModels(): Promise<string[]> {
    const [
        cubeMeshResponse,
        sphereMeshResponse
    ] = await Promise.all([
        fetch('/models/cube/cube.obj'),
        fetch('/models/sphere/sphere.obj')
    ]);

    return await Promise.all([
        cubeMeshResponse.text(),
        sphereMeshResponse.text()
    ]);
}

export async function getResources(): Promise<[string[], HTMLImageElement[], string[]]> {
    return await Promise.all([
        getShaders(),
        getTextures(),
        getModels()
    ]);
}