import {mat4, vec3} from 'gl-matrix';
import {outVec3, sin, cos, toRadians, clamp} from './math';

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

export function createCamera(position: vec3 = vec3.fromValues(0, 1, 3),
                             direction: vec3 = vec3.fromValues(0, 0, -1),
                             up: vec3 = vec3.fromValues(0, 1, 0)): Camera {
    return {
        position,
        direction,
        up,

        pitch: 0,
        yaw: -90,

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

            outVec3[0] = cos(toRadians(this.yaw)) * cos(toRadians(this.pitch));
            outVec3[1] = sin(toRadians(this.pitch));
            outVec3[2] = sin(toRadians(this.yaw)) * cos(toRadians(this.pitch));
            vec3.normalize(this.direction, outVec3);
        }
    };
}