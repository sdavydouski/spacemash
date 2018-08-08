#version 300 es

layout (location = 0) in vec3 position;
layout (location = 1) in vec2 in_uv;
layout (location = 2) in vec3 normal;
layout (location = 3) in vec3 tangent;
layout (location = 4) in vec3 bitangent;

layout (std140) uniform transformations {
    mat4 projection;
    mat4 view;
};

out vec2 uv;
out vec3 fragmentPosition;
out vec3 lightPosition;
out mat3 TBN;

uniform mat4 model;
uniform vec3 uLightPosition;

void main() {
    mat4 viewModel = view * model;

    uv = in_uv;

    vec3 T = normalize(vec3(viewModel * vec4(tangent, 0.0f)));
    vec3 B = normalize(vec3(viewModel * vec4(bitangent, 0.0f)));
    vec3 N = normalize(vec3(viewModel * vec4(normal, 0.0f)));
    TBN = mat3(T, B, N);

    lightPosition = vec3(view * vec4(uLightPosition, 1.f));
    fragmentPosition = vec3(viewModel * vec4(position, 1.f));

    gl_Position = projection * viewModel * vec4(position, 1.0f);
}
