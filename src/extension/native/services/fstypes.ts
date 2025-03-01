export interface FsSuccessResult<CustomResult> {
    result: CustomResult;
}

export interface FsErrorResult {
    error: boolean;
    error_message: string;
}


export type ReadFileOperationResult = FsSuccessResult<{ operation: string, content: string }> | FsErrorResult;

export type StatFileOperationResult = FsSuccessResult<
    { operation: string, stat: [number, number, number, number, number, number, number, number, number, number] }>
    | FsErrorResult;

export type ReadDirectoryOperationResult =
    FsSuccessResult<
        { operation: string, files: [[string, string]] }>
    | FsErrorResult;


export type SimpleOperationResult =
    FsSuccessResult<
        { operation: string }>
    | FsErrorResult;