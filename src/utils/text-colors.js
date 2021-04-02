// copied from 
// most of it is copied from this file https://github.com/lovasoa/html2unicode/blob/master/src/index.js
// please refer above repository for license.


function transform(text, { bold, italics, mono, variable, sub, sup }) {
    text = text.normalize("NFKD");
    if (sub) text = subscript(text);
    else if (sup) text = superscript(text);
    else if (bold && italics) text = boldenAndItalicize(text);
    else if (bold) text = bolden(text);
    else if (italics) text = italicize(text);
    else if (mono) text = monospace(text);
    else if (variable) text = scriptize(text);
    return text;
}

class CharTransform {
    constructor(startLetter, endLetter, startReplacement) {
        this.startCode = startLetter.charCodeAt(0);
        this.endCode = endLetter.charCodeAt(0);
        this.replacementCodes = startReplacement.split('').map(c => c.charCodeAt(0));
    }

    matches(charCode) {
        return charCode >= this.startCode && charCode <= this.endCode;
    }

    transform(charCode, buffer) {
        buffer.push(...this.replacementCodes);
        buffer[buffer.length - 1] += charCode - this.startCode;
    }
}

class SmallLetterTransform extends CharTransform {
    constructor(startReplacement) {
        super('a', 'z', startReplacement);
    }
}

class CapitalLetterTransform extends CharTransform {
    constructor(startReplacement) {
        super('A', 'Z', startReplacement);
    }
}

class DigitTransform extends CharTransform {
    constructor(startReplacement) {
        super('0', '9', startReplacement);
    }
}


CharTransform.boldenTransforms = [
    new CapitalLetterTransform('𝗔'),
    new SmallLetterTransform('𝗮'),
    new DigitTransform('𝟬'),
];

function transformator(transforms) {
    return function transform(text) {
        let codesBuffer = [];
        for (let i = 0; i < text.length; i++) {
            let code = text.charCodeAt(i);
            const transform = transforms.find(t => t.matches(code));
            if (transform) transform.transform(code, codesBuffer);
            else codesBuffer.push(code);
        }
        return String.fromCharCode(...codesBuffer);
    };
}

const bolden = transformator(CharTransform.boldenTransforms);

module.exports = transform