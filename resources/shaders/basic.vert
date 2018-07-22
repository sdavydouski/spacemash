#version 300 es

layout (location = 0) in vec3 position;
layout (location = 1) in float angleOffset;
		
uniform float pointSize;
uniform float angle;

//const float PI = 3.14159265359f;

void main() {
    gl_PointSize = pointSize;

    if (position.x == 0.f && position.y == 0.f) {
        gl_Position = vec4(position, 1.0f);
    } else {
        gl_Position = vec4(
            cos(-angle + angleOffset) * 0.5,
            sin(-angle + angleOffset) * 0.5,
            1.f, 1.0f
        );
    }
}
