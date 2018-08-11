#version 300 es

layout (location = 0) in vec3 position;
layout (location = 1) in vec2 in_uv;

out vec2 uv;

void main() {
    uv = in_uv;
    gl_Position = vec4(position, 1.f);
}