async function getShaders(): Promise<string[]> {
    const [
        gridVertexShaderResponse,
        gridFragmentShaderResponse,
        generalVertexShaderResponse,
        generalFragmentShaderResponse,
        skymapVertexShaderResponse,
        skymapFragmentShaderResponse,
        lightingVertexShaderResponse,
        lightingFragmentShaderResponse
    ] = await Promise.all([
        fetch('/shaders/grid/grid.vert'),
        fetch('/shaders/grid/grid.frag'),
        fetch('/shaders/general/general.vert'),
        fetch('/shaders/general/general.frag'),
        fetch('/shaders/skymap/skymap.vert'),
        fetch('/shaders/skymap/skymap.frag'),
        fetch('/shaders/lighting/lighting.vert'),
        fetch('/shaders/lighting/lighting.frag')
    ]);

    return await Promise.all([
        gridVertexShaderResponse.text(),
        gridFragmentShaderResponse.text(),
        generalVertexShaderResponse.text(),
        generalFragmentShaderResponse.text(),
        skymapVertexShaderResponse.text(),
        skymapFragmentShaderResponse.text(),
        lightingVertexShaderResponse.text(),
        lightingFragmentShaderResponse.text()
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
        loadTexture('/textures/venus_diffuse_map.jpg'),
        loadTexture('/textures/venus_normal_map.png'),
        loadTexture('/textures/earth_day_diffuse_map.jpg'),
        loadTexture('/textures/earth_specular_map.jpg'),
        loadTexture('/textures/earth_normal_map3.jpg'),
        loadTexture('/textures/mars.jpg'),

        loadTexture('/textures/container_diffuse.png'),
        loadTexture('/textures/container_specular.png'),

        loadTexture('/textures/none_specular_map.jpg'),
        loadTexture('/textures/flat_normal_map.jpg'),

        loadTexture('/textures/space_ship_test_color.png')
    ]);
}

async function getModels(): Promise<string[]> {
    const [
        cubeMeshResponse,
        sphereMeshResponse,
        spaceshipMeshResponse,
    ] = await Promise.all([
        fetch('/models/cube/cube.obj'),
        fetch('/models/sphere/sphere.obj'),
        fetch('/models/spaceship/spaceship.obj')
    ]);

    return await Promise.all([
        cubeMeshResponse.text(),
        sphereMeshResponse.text(),
        spaceshipMeshResponse.text()
    ]);
}

export async function getResources(): Promise<[string[], HTMLImageElement[], string[]]> {
    return await Promise.all([
        getShaders(),
        getTextures(),
        getModels()
    ]);
}