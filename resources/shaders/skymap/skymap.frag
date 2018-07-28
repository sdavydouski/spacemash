#version 300 es

precision mediump float;

in vec3 uv;

out vec4 finalColor;

uniform samplerCube skybox;

void main() {
    finalColor = texture(skybox, uv);
}