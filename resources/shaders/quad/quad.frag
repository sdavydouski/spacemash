#version 300 es

precision mediump float;

in vec2 uv;

out vec4 finalColor;

void main() {
    // square border
    if (uv.x <= 0.1f || uv.x >= 0.9f || uv.y <= 0.1f || uv.y >= 0.9f) {
        finalColor = vec4(0.f, 1.f, 0.f, 1.0f);
    } else {
        discard;
    }
}