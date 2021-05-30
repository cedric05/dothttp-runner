import { h, render } from 'preact';
import { ActivationFunction } from 'vscode-notebook-renderer';
import { Response } from './renderer';
import './style.css';


export const activate: ActivationFunction = () => ({
	renderCell(_id: any, data) {
		render(<Response response={data.json() as any} />, data.element);
	}

});