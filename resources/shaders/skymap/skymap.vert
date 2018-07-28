#version 300 es

layout (location = 0) in vec3 position;

layout (std140) uniform transformations {
    mat4 projection;
    mat4 view;
};

out vec3 uv;

void main() {
    uv = position;

    mat4 translatelessView = view;
    translatelessView[3].xyz = vec3(0.f);
    vec4 pos = projection * translatelessView * vec4(position, 1.0f);
    gl_Position = pos.xyww;
}
