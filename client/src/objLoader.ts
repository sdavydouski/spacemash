import {vec2, vec3} from 'gl-matrix';
import {outVec3} from './math';

type Position = [number, number, number];
type UV = [number, number];
type Normal = [number, number, number];

// todo: indexing
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
                const trianglePositions: Array<vec3> = [];
                const triangleUvs: Array<vec2> = [];
                const triangleNormals: Array<Normal> = [];

                lastPart.split(' ').map(vertex => {
                    const [positionIndex, uvIndex, normalIndex] =
                        vertex.split('/').map(index => parseInt(index) - 1);
                    trianglePositions.push(
                        vec3.fromValues(
                            positions[positionIndex][0],
                            positions[positionIndex][1],
                            positions[positionIndex][2]
                        )
                    );
                    triangleUvs.push(
                        vec2.fromValues(
                            uvs[uvIndex][0],
                            uvs[uvIndex][1]
                        )
                    );
                    triangleNormals.push(normals[normalIndex]);
                    // vertices.push(...positions[positionIndex], ...uvs[uvIndex], ...normals[normalIndex]);
                });

                // calculating tangent/bitangent vectors for each triangle
                const deltaPosition1 = vec3.create();
                vec3.subtract(deltaPosition1, trianglePositions[1], trianglePositions[0]);
                const deltaPosition2 = vec3.create();
                vec3.subtract(deltaPosition2, trianglePositions[2], trianglePositions[0]);

                const deltaUv1 = vec2.create();
                vec2.subtract(deltaUv1, triangleUvs[1], triangleUvs[0]);
                const deltaUv2 = vec2.create();
                vec2.subtract(deltaUv2, triangleUvs[2], triangleUvs[0]);

                // float r = 1.0f / (deltaUV1.x * deltaUV2.y - deltaUV1.y * deltaUV2.x);
                // glm::vec3 tangent = (deltaPos1 * deltaUV2.y   - deltaPos2 * deltaUV1.y)*r;
                // glm::vec3 bitangent = (deltaPos2 * deltaUV1.x   - deltaPos1 * deltaUV2.x)*r;
                const r = 1 / (deltaUv1[0] * deltaUv2[1] - deltaUv1[1] * deltaUv2[0]);
                const tangent = vec3.create();
                vec3.normalize(tangent, vec3.scale(outVec3,
                    vec3.subtract(outVec3,
                        vec3.scale(vec3.create(), deltaPosition1, deltaUv2[1]),
                        vec3.scale(vec3.create(), deltaPosition2, deltaUv1[1])
                    ),
                    r
                ));
                const bitangent = vec3.create();
                vec3.normalize(bitangent, vec3.scale(outVec3,
                    vec3.subtract(outVec3,
                        vec3.scale(vec3.create(), deltaPosition2, deltaUv1[0]),
                        vec3.scale(vec3.create(), deltaPosition1, deltaUv2[0])
                    ),
                    r
                ));

                for (let i = 0; i < 3; ++i) {
                    vertices.push(...trianglePositions[i], ...triangleUvs[i], ...triangleNormals[i], ...tangent, ...bitangent);
                }

                break;
            }
        }
    });

    return new Float32Array(vertices);
}