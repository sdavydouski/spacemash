#version 300 es

layout (location = 0) in vec3 position;

layout (std140) uniform transformations {
    mat4 projection;
    mat4 view;
};

void main() {
    gl_Position = projection * view * vec4(position, 1.0f);
}
