async function getShaders(): Promise<string[]> {
    const [
        gridVertexShaderResponse,
        gridFragmentShaderResponse,
        quadVertexShaderResponse,
        quadFragmentShaderResponse
    ] = await Promise.all([
        fetch('/shaders/grid/grid.vert'),
        fetch('/shaders/grid/grid.frag'),
        fetch('/shaders/quad/quad.vert'),
        fetch('/shaders/quad/quad.frag')
    ]);

    return await Promise.all([
        gridVertexShaderResponse.text(),
        gridFragmentShaderResponse.text(),
        quadVertexShaderResponse.text(),
        quadFragmentShaderResponse.text()
    ]);
}

export async function getResources(): Promise<string[][]> {
    return await Promise.all([
        getShaders()
    ]);
}