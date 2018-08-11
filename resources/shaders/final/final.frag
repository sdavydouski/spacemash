#version 300 es

precision mediump float;

in vec2 uv;

out vec4 finalColor;

uniform sampler2D scene;
uniform sampler2D bloomBlur;

const float gamma = 2.2f;
const float exposure = 1.f;

void main() {
    vec3 hdrColor = texture(scene, uv).rgb;
    vec3 bloomColor = texture(bloomBlur, uv).rgb;
    // additive blending
    hdrColor += bloomColor;
    // tone mapping
    vec3 result = vec3(1.f) - exp(-hdrColor * exposure);
    // gamma correction
    result = pow(result, vec3(1.f / gamma));

    finalColor = vec4(hdrColor, 1.f);
}