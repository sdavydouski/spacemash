#version 300 es

layout (location = 0) in vec3 position;
layout (location = 1) in vec3 in_color;

layout (std140) uniform transformations {
    mat4 projection;
    mat4 view;
};

out vec3 color;

void main() {
    color = in_color;

    gl_Position = projection * view * vec4(position, 1.0f);
}
