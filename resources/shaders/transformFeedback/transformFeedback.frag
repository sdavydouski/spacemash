#version 300 es

precision mediump float;

in float lifespan;

out vec4 finalColor;

uniform sampler2D particleTexture;

void main() {
    vec4 texelColor = texture(particleTexture, gl_PointCoord);
    finalColor = vec4(texelColor.rgb, texelColor.a * lifespan);
}