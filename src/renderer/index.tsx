import { h, render } from 'preact';
import { ActivationFunction, RendererContext } from 'vscode-notebook-renderer';
import { MultiResponse, Response } from './renderer';
import './style.css';


export const activate: ActivationFunction = (context: RendererContext<any>) => {
	// Listen for settings messages from the extension
	if (context.onDidReceiveMessage) {
		context.onDidReceiveMessage((message: any) => {
			if (message.messageType === 'settings' && message.settings) {
				console.log('Renderer received settings:', message.settings);
				// Update Monaco settings via the global function
				if ((window as any).updateMonacoSettings) {
					(window as any).updateMonacoSettings(message.settings);
				}
			}
		});
	}

	return {
		renderOutputItem(outputItem, element) {
			const outputResponse = outputItem.json() as any;
			// if outputResponse is array, then render MultiReponse otherwise render Response
			if (Array.isArray(outputResponse)) {
				render(<MultiResponse multiResponse={outputResponse as any} context={context} />, element);
			} else {
				render(<Response out={outputResponse} context={context} />, element);
			}
		}
	};
};