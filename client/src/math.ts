import {vec3} from 'gl-matrix';

const radiansInOneDegree = Math.PI / 180;

export const outVec3 = vec3.create();

export function toRadians(degrees: number) {
    return degrees * radiansInOneDegree;
}

export function toDegrees(radians: number) {
    return radians / radiansInOneDegree;
}

export function max(value: number, max: number) {
    if (value > max) return max;

    return value;
}

export function min(value: number, min: number) {
    if (value < min) return min;

    return value;
}

export function clamp(value: number, min: number, max: number) {
    if (value < min) return min;
    if (value > max) return max;

    return value;
}

export function sin(value: number) {
    return Math.sin(value);
}

export function cos(value: number) {
    return Math.cos(value);
}

export function asin(value: number) {
    return Math.asin(value);
}

export function atan(value: number) {
    return Math.atan(value);
}

export function getRandomNumberInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
}