async function getShaders(): Promise<[string, string]> {
    const [vertexShaderResponse, fragmentShaderResponse] = await Promise.all([
        fetch('/shaders/basic.vert'),
        fetch('/shaders/basic.frag')
    ]);

    return await Promise.all([
        vertexShaderResponse.text(),
        fragmentShaderResponse.text()
    ]);
}

export async function getResources(): Promise<[string, string][]> {
    return await Promise.all([
        getShaders()
    ]);
}