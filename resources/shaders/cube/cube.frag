#version 300 es

precision mediump float;

in vec2 uv;
in vec3 color;

out vec4 finalColor;

uniform sampler2D awesomeFaceTexture;
uniform sampler2D gridTexture;

void main() {
    vec4 awesomeFaceTexel = texture(awesomeFaceTexture, uv);
    awesomeFaceTexel.a = 1.f;
    vec4 textureMix = mix(texture(gridTexture, uv), awesomeFaceTexel, 0.2);

    finalColor = mix(textureMix, vec4(color, 1.0f), 0.2f);
}