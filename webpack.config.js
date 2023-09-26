//@ts-check

'use strict';

const path = require('path');
const webpack = require('webpack');
const NODE_ENV = process.env.NODE_ENV ?? "PRODUCTION";
/**@type {import('webpack').Configuration}*/
const baseConfig = {
	mode: 'none', // this leaves the source code as close as possible to the original (when packaging we set this to 'production')
	devtool: 'nosources-source-map',
	externals: {
		vscode: 'commonjs vscode' // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
	},
	resolve: {
		// support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
		extensions: ['.ts', '.js']
	},
	plugins: [
		new webpack.DefinePlugin({
			// eslint-disable-next-line @typescript-eslint/naming-convention
			'process.env.NODE_ENV': JSON.stringify(NODE_ENV),
		})
	],
	module: {
		rules: [
			{
				test: /\.ts$/,
				exclude: /node_modules/,
				use: [
					{
						loader: 'ts-loader',
						options: {
							projectReferences: true,
							configFile: path.resolve(__dirname, 'src/extension/tsconfig.json'),
						}
					}
				]
			}
		]
	}
};


const webConfig = {
	...baseConfig,
	entry: './src/extension/webextension.ts',
	target: 'webworker', // vscode extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
	output: {
		// the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
		path: path.resolve(__dirname, 'dist'),
		filename: 'extension-web.js',
		libraryTarget: 'commonjs2'
	},
	resolve: {
		fallback: {
			"stream": require.resolve("stream-browserify"),
			"buffer": require.resolve("buffer/"),
			"querystring": require.resolve("querystring-es3"),
			"path": require.resolve("path-browserify"),
			"url": require.resolve("url/"),
			"os": require.resolve("os-browserify/browser"),

		},
		extensions: ['.ts', '.js']
	},
};


const nodeconfig = {
	...baseConfig,
	entry: './src/extension/extension.ts', // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
	target: 'node', // vscode extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
	output: {
		// the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
		path: path.resolve(__dirname, 'dist'),
		filename: 'extension-node.js',
		libraryTarget: 'commonjs2'
	},
};



const prefetchconfig = {
	...baseConfig,
	entry: './src/utils/prefetch.ts', // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
	target: 'node', // vscode extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
	output: {
		// the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
		path: path.resolve(__dirname, 'dist'),
		filename: 'prefetch.js',
		libraryTarget: 'commonjs2'
	},
};


const rendererConfig = {
	target: 'web',
	mode: "development",
	entry: './src/renderer/index.tsx',
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: 'renderer.js',
		libraryTarget: 'module',
	},
	resolve: {
		extensions: ['.ts', '.tsx', '.css', '.js', '.jsx']
	},
	experiments: {
		outputModule: true,
	},
	module: {
		rules: [
			{
				test: /\.ts(x?)$/,
				exclude: /node_modules/,
				use: [
					{
						loader: 'ts-loader',
						options: {
							configFile: path.resolve(__dirname, 'src/renderer/tsconfig.json'),
							projectReferences: true,
							compilerOptions: {
								module: 'esnext',
							},
						},
					},
				],
			},
			{
				test: /\.css$/i,
				use: ['style-loader', 'css-loader'],
			},
			{
				test: /\.svg$/,
				loader: 'svg-inline-loader',
			},
		],
	}
};



module.exports = [rendererConfig, webConfig, nodeconfig, prefetchconfig];