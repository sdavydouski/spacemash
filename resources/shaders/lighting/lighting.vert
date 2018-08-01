#version 300 es

layout (location = 0) in vec3 position;
layout (location = 1) in vec2 in_uv;
layout (location = 2) in vec3 in_normal;

layout (std140) uniform transformations {
    mat4 projection;
    mat4 view;
};

out vec2 uv;
out vec3 normal;
out vec3 lightPosition;
out vec3 fragmentPosition;

uniform mat4 model;
uniform mat3 normalMatrix;
uniform vec3 uLightPosition;

void main() {
    mat4 viewModel = view * model;

    uv = in_uv;
    normal = normalMatrix * in_normal;
    lightPosition = vec3(view * vec4(uLightPosition, 1.f));
    fragmentPosition = vec3(viewModel * vec4(position, 1.f));

    gl_Position = projection * viewModel * vec4(position, 1.0f);
}
