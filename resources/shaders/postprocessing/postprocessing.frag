#version 300 es

precision mediump float;

in vec2 uv;

out vec4 finalColor;

uniform sampler2D screen;

const float offset = 1.0f / 300.0f;

vec2 offsets[9] = vec2[](
    vec2(-offset,  offset), // top-left
    vec2( 0.0f,    offset), // top-center
    vec2( offset,  offset), // top-right
    vec2(-offset,  0.0f),   // center-left
    vec2( 0.0f,    0.0f),   // center-center
    vec2( offset,  0.0f),   // center-right
    vec2(-offset, -offset), // bottom-left
    vec2( 0.0f,   -offset), // bottom-center
    vec2( offset, -offset)  // bottom-right
);

void main() {
    float kernel[9] = float[](
        1.0f, 1.0f, 1.0f,
        1.0f, -8.0f, 1.0f,
        1.0f, 1.0f, 1.0f
    );

    vec3 samples[9];
    for (int i = 0; i < 9; ++i) {
        samples[i] = texture(screen, uv + offsets[i]).rgb;
    }

    vec3 color = vec3(0.f);
    for (int i = 0; i < 9; ++i) {
        color += samples[i] * kernel[i];
    }

    finalColor = vec4(color, 1.f);
//    finalColor = texture(screen, uv);
}