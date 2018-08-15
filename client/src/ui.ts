const uiPanel = document.getElementById('ui-panel');

// todo: generics?
const uiElements = [{
    element: uiPanel.appendChild(document.createElement('span')),
    render: (cameraPosition: any) => `
        camera position:<br>
        x: ${cameraPosition[0].toFixed(3)}, 
        y: ${cameraPosition[1].toFixed(3)}, 
        z: ${cameraPosition[2].toFixed(3)}
    `
}, {
    element: uiPanel.appendChild(document.createElement('span')),
    render: (cameraDirection: any) => `
        camera direction:<br>
        x: ${cameraDirection[0].toFixed(3)}, 
        y: ${cameraDirection[1].toFixed(3)}, 
        z: ${cameraDirection[2].toFixed(3)}
    `
}, {
    element: uiPanel.appendChild(document.createElement('span')),
    render: (isViewMode: any) => `
        view mode: <span class="view-mode">${isViewMode ? 'enabled' : 'disabled'}</span>
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