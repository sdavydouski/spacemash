#version 300 es

layout (location = 0) in vec3 in_position;
layout (location = 1) in vec3 in_velocity;
layout (location = 2) in float in_lifespan;

layout (std140) uniform transformations {
    mat4 projection;
    mat4 view;
};

out vec3 out_position;
out vec3 out_velocity;
out float out_lifespan;

out float lifespan;

uniform float u_time;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898f, 78.233f))) * 43758.5453123f);
}

#define PI 3.1415926538

const float AGE = 1000.f;

void main() {
    float r = random(vec2(gl_VertexID, u_time));
    if (in_lifespan <= 0.f) {
        float ra = 16.f * PI * r;
        float rx = r * cos(ra);
        float ry = r * sin(ra);

        out_position = vec3(0.f, 0.f, 500.f);
        out_velocity = vec3(rx, ry, r) * 20.f;
        out_lifespan = AGE * r;
    } else {
        out_velocity = in_velocity - vec3(0.f, 0.f, 0.1f);
        out_position += out_velocity * r + in_position;
        out_lifespan = in_lifespan - 1.f;
    }

    gl_PointSize = 20.f * out_lifespan / 1000.f;
    lifespan = out_lifespan / AGE;

    gl_Position = projection * view * vec4(out_position, 1.f);
}
