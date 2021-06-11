import { h, render } from 'preact';
import { ActivationFunction } from 'vscode-notebook-renderer';
import { Response } from './renderer';
import './style.css';


export const activate: ActivationFunction = () => ({
	renderOutputItem(outputItem, element) {
		render(<Response response={outputItem.json() as any} />, element);
	}

});