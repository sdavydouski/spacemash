import {mat4, vec3} from 'gl-matrix';
import {outVec3, sin, cos, clamp, toRadians} from './math';

export interface Camera {
    position: vec3,
    direction: vec3,
    up: vec3,

    pitch: number,
    yaw: number,

    updateViewMatrix: (view: mat4) => void,
    moveForward: (speed: number) => void,
    moveBackward: (speed: number) => void,
    strafeLeft: (speed: number) => void,
    strafeRight: (speed: number) => void,
    rotate: (xOffset: number, yOffset: number) => void
}

function calculateDirectionFromAngles(direction: vec3, pitch: number, yaw: number) {
    direction[0] = cos(toRadians(yaw)) * cos(toRadians(pitch));
    direction[1] = sin(toRadians(pitch));
    direction[2] = sin(toRadians(yaw)) * cos(toRadians(pitch));
    vec3.normalize(direction, direction);
}

export function createCamera(position: vec3 = vec3.fromValues(0, 1, 3),
                             pitch: number, yaw: number,
                             up: vec3 = vec3.fromValues(0, 1, 0)): Camera {
    const direction = vec3.create();
    calculateDirectionFromAngles(direction, pitch, yaw);

    return {
        position,
        direction,
        up,

        pitch,
        yaw,

        updateViewMatrix(view: mat4) {
            mat4.lookAt(view, this.position, vec3.add(outVec3, this.position, this.direction), this.up);
        },

        moveForward(speed: number) {
            vec3.add(this.position, this.position, vec3.scale(outVec3, this.direction, speed));
        },

        moveBackward(speed: number) {
            vec3.subtract(this.position, this.position, vec3.scale(outVec3, this.direction, speed));
        },

        strafeLeft(speed: number) {
            vec3.subtract(this.position, this.position,
                vec3.scale(outVec3,
                    vec3.normalize(outVec3,
                        vec3.cross(outVec3, this.direction, this.up)),
                    speed
                )
            );
        },

        strafeRight(speed: number) {
            vec3.add(this.position, this.position,
                vec3.scale(outVec3,
                    vec3.normalize(outVec3,
                        vec3.cross(outVec3, this.direction, this.up)),
                    speed
                )
            );
        },

        rotate(xOffset: number, yOffset: number) {
            this.yaw += xOffset;
            this.pitch += yOffset;

            this.pitch = clamp(this.pitch, -89, 89);

            calculateDirectionFromAngles(this.direction, this.pitch, this.yaw);
        }
    };
}