#version 300 es

// Gaussian blur (vertical pass)

precision mediump float;

in vec2 uv;

out vec4 finalColor;

uniform sampler2D image;

float weights[5] = float[] (0.227027f, 0.1945946f, 0.1216216f, 0.054054f, 0.016216f);

void main() {
    vec2 texelOffset = 2.f / vec2(textureSize(image, 0));
    // current fragment's contribution
    vec3 result = texture(image, uv).rgb * weights[0];

    for(int i = 1; i < 5; ++i) {
        result += texture(image, uv + vec2(0.f, texelOffset.y * float(i))).rgb * weights[i];
        result += texture(image, uv - vec2(0.f, texelOffset.y * float(i))).rgb * weights[i];
    }

    finalColor = vec4(result, 1.0);
}