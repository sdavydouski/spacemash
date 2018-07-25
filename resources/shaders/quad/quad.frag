#version 300 es

precision mediump float;

in vec2 uv;

out vec4 finalColor;

uniform sampler2D quadTexture;

void main() {
    finalColor = texture(quadTexture, uv);
}