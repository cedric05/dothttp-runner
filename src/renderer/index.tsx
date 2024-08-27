import { h, render } from 'preact';
import { ActivationFunction, RendererContext } from 'vscode-notebook-renderer';
import { MultiResponse, Response } from './renderer';
import './style.css';


export const activate: ActivationFunction = (context: RendererContext<any>) => ({
	renderOutputItem(outputItem, element) {
		const outputResponse = outputItem.json() as any;
		// if outputResponse is array, then render MultiReponse otherwise render Response
		if (Array.isArray(outputResponse)) {
			render(<MultiResponse multiResponse={outputResponse as any} context={context} />, element);
		} else {
			render(<Response out={outputResponse} context={context} />, element);
		}
	}
});