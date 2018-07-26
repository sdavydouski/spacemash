#version 300 es

layout (location = 0) in vec3 position;
layout (location = 1) in vec2 in_uv;
layout (location = 2) in vec3 in_color;
layout (location = 3) in vec3 in_normal;

layout (std140) uniform transformations {
    mat4 projection;
    mat4 view;
};

out vec2 uv;
out vec3 color;

uniform mat4 model;
uniform float angle;

vec3 warp(vec3 p) {
    return p + 0.5f * abs(sin(angle + 0.5f * (p.x + p.y + p.z))) * in_normal;
}

void main() {
    uv = in_uv;
    color = in_color;

    gl_Position = projection * view * model * vec4(warp(position), 1.0f);
}
