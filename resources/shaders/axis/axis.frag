#version 300 es

precision mediump float;

in vec3 color;

out vec4 finalColor;

void main() {
    finalColor = vec4(color, 1.f);
}