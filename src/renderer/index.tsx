import { h, render } from 'preact';
import { ActivationFunction } from 'vscode-notebook-renderer';
import { Response } from './renderer';
import './style.css';


export const activate: ActivationFunction = () => ({
	renderCell(_id: any, { value, element }) {
		render(<Response response={value as any} />, element);
	}

});