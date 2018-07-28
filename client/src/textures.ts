export interface SkymapImages {
    right: HTMLImageElement,
    left: HTMLImageElement,
    top: HTMLImageElement,
    bottom: HTMLImageElement,
    back: HTMLImageElement,
    front: HTMLImageElement
}

export function createTexture(gl: WebGL2RenderingContext, format: number, image: HTMLImageElement): WebGLTexture {
    const texture = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, format, format, gl.UNSIGNED_BYTE, image);
    // gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);

    return texture;
}

export function createSkymap(gl: WebGL2RenderingContext, format: number, images: SkymapImages): WebGLTexture {
    const texture = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
    const imagesArray = [
        images.right, images.left,
        images.top, images.bottom,
        images.front, images.back
    ];
    imagesArray.forEach((image, i) => {
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, format, format, gl.UNSIGNED_BYTE, image);
    });
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);

    return texture;
}