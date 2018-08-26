async function getShaders(): Promise<string[]> {
    const shaderResponses = await Promise.all([
        fetch('/shaders/axis/axis.vert'),
        fetch('/shaders/axis/axis.frag'),
        fetch('/shaders/general/general.vert'),
        fetch('/shaders/general/general.frag'),
        fetch('/shaders/skymap/skymap.vert'),
        fetch('/shaders/skymap/skymap.frag'),
        fetch('/shaders/light/light.vert'),
        fetch('/shaders/light/light.frag'),
        fetch('/shaders/lighting/lighting.vert'),
        fetch('/shaders/lighting/lighting.frag'),
        fetch('/shaders/blur/blur.vert'),
        fetch('/shaders/blur/blur_horizontal.frag'),
        fetch('/shaders/blur/blur_vertical.frag'),
        fetch('/shaders/final/final.vert'),
        fetch('/shaders/final/final.frag')
    ]);

    return await Promise.all(shaderResponses.map(shaderResponse => shaderResponse.text()));
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

        loadTexture('/textures/sun2.jpg'),
        loadTexture('/textures/mercury_diffuse_map.jpg'),
        loadTexture('/textures/mercury_normal_map.png'),
        loadTexture('/textures/venus_diffuse_map.jpg'),
        loadTexture('/textures/venus_normal_map.png'),
        loadTexture('/textures/earth_day_diffuse_map.jpg'),
        loadTexture('/textures/earth_specular_map.jpg'),
        loadTexture('/textures/earth_normal_map.jpg'),
        loadTexture('/textures/mars_diffuse_map.jpg'),
        loadTexture('/textures/mars_normal_map.png'),

        loadTexture('/textures/container_diffuse.png'),
        loadTexture('/textures/container_specular.png'),

        loadTexture('/textures/none_specular_map.jpg'),
        loadTexture('/textures/flat_normal_map.jpg'),

        loadTexture('/textures/predator_diffuse_map.png'),
        loadTexture('/textures/predator_specular_map.png'),

        loadTexture('/textures/fighter.jpg'),
        loadTexture('/textures/missile.png')
    ]);
}

// https://www.cgtrader.com/free-3d-models/space/spaceship/spaceships-pack
async function getModels(): Promise<string[]> {
    const meshResponses = await Promise.all([
        fetch('/models/cube/cube.obj'),
        fetch('/models/sphere/sphere.obj'),
        fetch('/models/spaceship/predator.obj'),
        fetch('/models/spaceship/fighter.obj'),
        fetch('/models/missiles/missile.obj')
    ]);

    return await Promise.all(meshResponses.map(meshResponce => meshResponce.text()));
}

export async function getResources(): Promise<[string[], HTMLImageElement[], string[]]> {
    return await Promise.all([
        getShaders(),
        getTextures(),
        getModels()
    ]);
}