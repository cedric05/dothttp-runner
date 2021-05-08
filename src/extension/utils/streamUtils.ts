import { Readable } from 'stream';

// String chunk to string
export function streamToString(stream: Readable) {
	const chunks: Array<Buffer> = [];
	return new Promise((resolve, reject) => {
		console.log(stream);
		stream.on('data', chunk => {
			return chunks.push(chunk);
		});
		stream.on('error', reject);
		stream.on('end', () => {
			return resolve(chunks.join(""));
		});
	});
}
