#version 300 es

layout (location = 0) in vec3 position;
layout (location = 1) in vec2 in_uv;

layout (std140) uniform transformations {
    mat4 projection;
    mat4 view;
};

out vec2 uv;

uniform mat4 model;

void main() {
    uv = in_uv;
    gl_Position = projection * view * model * vec4(position, 1.0f);
}
