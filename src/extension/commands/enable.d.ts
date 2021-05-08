import { Position } from '../views/tree';
export declare function enableCommand(node: Position): void;
export declare function disableCommand(node: Position): void;
export declare function copyProperty(node: Position): void;
export declare function toggleExperimentalFlag(confKey: string): () => void;
