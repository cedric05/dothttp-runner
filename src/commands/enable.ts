import { FileState } from "../models/state";
import { EnvTree, Position } from '../views/tree';



export function enableCommand(node: Position) {
    FileState.getState()?.enableEnv(node.env);
    EnvTree._tree.refresh();
}

export function disableCommand(node: Position) {
    FileState.getState()?.disableEnv(node.env);
    EnvTree._tree.refresh();
}