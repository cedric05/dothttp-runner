export type ReadFileOperationResult = {
    "result": {
        "operation": string;
        "content": string;
    };
} | {
    "error": boolean;
    "error_message": string;
};

export type StatFileOperationResult = {
    "result": {
        "operation": string;
        "stat": [number, number, number, number, number, number, number, number, number, number];
    };
} | {
    "error": boolean;
    "error_message": string;
};


export type ReadDirectoryOperationResult = {
    "result": { "operation": string, "files": [[string, string]] }
}

export type WriteFileOperationResult = {
    "result": {
        "operation": string;
    };
} | {
    "error": boolean;
    "error_message": string;
};