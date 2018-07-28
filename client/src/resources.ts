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

        // loadTexture('/textures/skymaps/lightblue/back.png'),
        // loadTexture('/textures/skymaps/lightblue/bottom.png'),
        // loadTexture('/textures/skymaps/lightblue/front.png'),
        // loadTexture('/textures/skymaps/lightblue/left.png'),
        // loadTexture('/textures/skymaps/lightblue/right.png'),
        // loadTexture('/textures/skymaps/lightblue/top.png'),

        // loadTexture('/textures/skymaps/debug/debug_back.png'),
        // loadTexture('/textures/skymaps/debug/debug_bottom.png'),
        // loadTexture('/textures/skymaps/debug/debug_front.png'),
        // loadTexture('/textures/skymaps/debug/debug_left.png'),
        // loadTexture('/textures/skymaps/debug/debug_right.png'),
        // loadTexture('/textures/skymaps/debug/debug_top.png')
    ]);
}

export async function getResources(): Promise<[string[], HTMLImageElement[]]> {
    return await Promise.all([
        getShaders(),
        getTextures()
    ]);
}