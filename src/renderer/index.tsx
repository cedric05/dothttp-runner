import { h, render } from 'preact';
import { ActivationFunction, RendererContext } from 'vscode-notebook-renderer';
import { Response } from './renderer';
import './style.css';


export const activate: ActivationFunction = (context: RendererContext<any>) => ({
	renderOutputItem(outputItem, element) {
		render(<Response out={outputItem.json() as any} context={context} />, element);
	}

});