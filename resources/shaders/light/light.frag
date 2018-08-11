#version 300 es

precision mediump float;

in vec2 uv;

layout (location = 0) out vec4 fragmentColor;
layout (location = 1) out vec4 brightnessColor;

uniform sampler2D lightTexture;
uniform float lightBrightness;

void main() {
    fragmentColor = vec4(texture(lightTexture, uv).rgb * lightBrightness, 1.f);

    // check whether fragment output is higher than threshold, if so output as brightness color
    float brightness = dot(fragmentColor.rgb, vec3(0.2126f, 0.7152f, 0.0722f));
    brightnessColor = brightness > 1.f ?
        vec4(fragmentColor.rgb, 1.0f) :
        vec4(0.0f, 0.0f, 0.0f, 1.0f);
}