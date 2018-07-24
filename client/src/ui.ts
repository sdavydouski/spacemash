import {vec3} from 'gl-matrix';

const uiPanel = document.getElementById('ui-panel');

const uiElements = [{
    element: uiPanel.appendChild(document.createElement('span')),
    render: (cameraPosition: vec3) => `
        camera position:<br>
        x: ${cameraPosition[0].toFixed(3)}, 
        y: ${cameraPosition[1].toFixed(3)}, 
        z: ${cameraPosition[2].toFixed(3)}
    `
}, {
    element: uiPanel.appendChild(document.createElement('span')),
    render: (cameraDirection: vec3) => `
        camera direction:<br>
        x: ${cameraDirection[0].toFixed(3)}, 
        y: ${cameraDirection[1].toFixed(3)}, 
        z: ${cameraDirection[2].toFixed(3)}
    `
}];

export function updateUI(data: Array<any>): void {
    uiElements.forEach(({element, render}, i) => {
        const oldHtml = element.innerHTML;
        const newHtml = render(data[i]).trim();

        if (oldHtml !== newHtml) {
            element.innerHTML = newHtml;
        }
    });
}