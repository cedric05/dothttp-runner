// copied from 
// most of it is copied from this file https://github.com/lovasoa/html2unicode/blob/master/src/index.js
// please refer above repository for license.


export default function transform(text: string, { bold }: { bold: boolean }) {
    text = text.normalize("NFKD");
    if (bold) text = bolden(text);
    return text;
}


class CharTransform {
    startCode: number;
    endCode: number;
    replacementCodes: number[];
    static boldenTransforms: (CapitalLetterTransform | SmallLetterTransform | DigitTransform)[];
    constructor(startLetter: string, endLetter: string, startReplacement: string) {
        this.startCode = startLetter.charCodeAt(0);
        this.endCode = endLetter.charCodeAt(0);
        this.replacementCodes = startReplacement.split('').map(c => c.charCodeAt(0));
    }

    matches(charCode: number) {
        return charCode >= this.startCode && charCode <= this.endCode;
    }

    transform(charCode: number, buffer: number[]) {
        buffer.push(...this.replacementCodes);
        buffer[buffer.length - 1] += charCode - this.startCode;
    }
}

class SmallLetterTransform extends CharTransform {
    constructor(startReplacement: string) {
        super('a', 'z', startReplacement);
    }
}

class CapitalLetterTransform extends CharTransform {
    constructor(startReplacement: string) {
        super('A', 'Z', startReplacement);
    }
}

class DigitTransform extends CharTransform {
    constructor(startReplacement: string) {
        super('0', '9', startReplacement);
    }
}


CharTransform.boldenTransforms = [
    new CapitalLetterTransform('𝗔'),
    new SmallLetterTransform('𝗮'),
    new DigitTransform('𝟬'),
];

function transformator(transforms: string[] | any[]) {
    return function transform(text: string) {
        let codesBuffer = [];
        for (let i = 0; i < text.length; i++) {
            let code = text.charCodeAt(i);
            const transform = transforms.find((t: { matches: (arg0: any) => any; }) => t.matches(code));
            if (transform) transform.transform(code, codesBuffer);
            else codesBuffer.push(code);
        }
        return String.fromCharCode(...codesBuffer);
    };
}

const bolden = transformator(CharTransform.boldenTransforms);

