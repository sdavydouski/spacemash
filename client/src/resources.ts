async function getShaders(): Promise<string[]> {
    const [
        gridVertexShaderResponse,
        gridFragmentShaderResponse,
        quadVertexShaderResponse,
        quadFragmentShaderResponse
    ] = await Promise.all([
        fetch('/shaders/grid/grid.vert'),
        fetch('/shaders/grid/grid.frag'),
        fetch('/shaders/cube/cube.vert'),
        fetch('/shaders/cube/cube.frag')
    ]);

    return await Promise.all([
        gridVertexShaderResponse.text(),
        gridFragmentShaderResponse.text(),
        quadVertexShaderResponse.text(),
        quadFragmentShaderResponse.text()
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
        loadTexture('/textures/grid.jpg')
    ]);
}

export async function getResources(): Promise<[string[], HTMLImageElement[]]> {
    return await Promise.all([
        getShaders(),
        getTextures()
    ]);
}