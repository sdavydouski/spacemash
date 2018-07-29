type Position = [number, number, number];
type UV = [number, number];
type Normal = [number, number, number];

export function parseObj(obj: string): Float32Array {
    const vertices: Array<number> = [];

    const positions: Array<Position> = [];
    const uvs: Array<UV> = [];
    const normals: Array<Normal> = [];

    const lines = obj.split('\n');
    lines.forEach(line => {
        const firstPart = line.substring(0, 2).trim();
        const lastPart = line.substring(2).trim();

        switch (firstPart) {
            case 'v': {
                positions.push(
                    lastPart.split(' ').map(position => parseFloat(position)) as Position
                );
                break;
            }
            case 'vt': {
                uvs.push(
                    lastPart.split(' ').map(uv => parseFloat(uv)) as UV
                );
                break;
            }
            case 'vn': {
                normals.push(
                    lastPart.split(' ').map(normal => parseFloat(normal)) as Normal
                );
                break;
            }
            case 'f': {
                lastPart.split(' ').map(vertex => {
                    const [positionIndex, uvIndex, normalIndex] =
                        vertex.split('/').map(index => parseInt(index) - 1);
                    vertices.push(...positions[positionIndex], ...uvs[uvIndex], ...normals[normalIndex]);
                });
                break;
            }
        }
    });

    return new Float32Array(vertices);
}