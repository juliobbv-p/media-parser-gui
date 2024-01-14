import { ReactNode, createContext, useCallback, useEffect, useMemo, useState } from "react";
import { DataNode } from "../types/parser.types";
import { BitstreamUploader } from "./uploader";
import { BitRange } from "./range";
import { colors } from "@mui/material";

type State<N extends string, T> = {
    [key in N]: T
} & {
        [key in `set${Capitalize<N>}`]: React.Dispatch<React.SetStateAction<T>>
    }


export const EMPTY_TREE: DataNode = {
    key: "root",
    title: "Empty bitstream",
    start: 0,
    size: 0
};

export const BitstreamSelectionContext = createContext<
    State<"ranges", BitRange[]>
    & {
        getBitColor: (pos: number) => string | undefined,
        getByteColor: (pos: number) => string | undefined
    }
>({
    ranges: [],
    setRanges: () => { },
    getBitColor: () => undefined,
    getByteColor: () => undefined,
});

export const BitstreamExplorerContext = createContext<
    & State<"buffer", Uint8Array>
    & State<"syntax", DataNode>
    & State<"showHiddenSyntax", boolean>
    & State<"filter", { text: string }>
    & {
        readFileUploadData: (file: File) => void,
        reset: () => void,
    }
>({
    buffer: new Uint8Array,
    setBuffer: () => { },
    readFileUploadData: () => { },
    syntax: EMPTY_TREE,
    setSyntax: () => { },
    showHiddenSyntax: false,
    setShowHiddenSyntax: () => undefined,
    filter: { text: "" },
    setFilter: () => undefined,
    reset: () => undefined
});

function forEachPreOrder(node: DataNode, cb: (node: DataNode) => void) {
    cb(node);
    for (const child of (node.children || [])) {
        forEachPreOrder(child, cb);
    }
}

// const COLORS = [colors.purple[700], colors.purple[400], colors.purple[300], colors.purple[200], colors.purple[100], colors.purple[50]];
const COLORS = ["var(--primary-color)", "var(--secondary-color)"];

let watchCount: { [k: string]: number } = {};
function watch<T extends Function>(name: string, cb: T) {
    watchCount[name] = 0;
    return ((...args: any) => {
        watchCount[name]++;
        console.log(`Watch: ${name} callled ${watchCount[name]} times.`, args);
        console.trace();
        return cb(...args);
    }) as any as T;
}

function BitstreamSelection({ children }: {
    children: ReactNode,
}) {
    const [ranges, setRanges] = useState<BitRange[]>([]);

    const getBitColor = useCallback((bitPos: number) => {
        for (let i = 0; i < ranges.length; i++) {
            if (ranges[i].inRange(bitPos)) {
                return COLORS[i];
            }
        }
        return undefined;
    }, [ranges]);

    const getByteColor = useCallback((bytePos: number) => {
        const bitRange = new BitRange(bytePos * 8, (bytePos + 1) * 8);
        for (let i = 0; i < ranges.length; i++) {
            if (ranges[i].intersect(bitRange).count() > 0) {
                return COLORS[i];
            }
        }
        return undefined;
    }, [ranges]);


    return <BitstreamSelectionContext.Provider value={{
        ranges, setRanges,
        getBitColor, getByteColor,
    }}>
        {children}
    </BitstreamSelectionContext.Provider>
}

export function BitstreamExplorer({ children, parser, uploader = <BitstreamUploader title="Drop media file here" /> }: {
    children: ReactNode,
    parser: (buffer: Uint8Array) => DataNode,
    uploader?: ReactNode
}) {
    const [syntax, setSyntax] = useState<DataNode>(EMPTY_TREE);
    const [buffer, setBuffer] = useState<Uint8Array>(() => new Uint8Array());
    const [filter, setFilter] = useState<{text: string}>({text: ""});
    const [showHiddenSyntax, setShowHiddenSyntax] = useState<boolean>(false);



    const readFileUploadData = useCallback((file: File) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            const buff = new Uint8Array(event.target?.result as ArrayBuffer);
            if (buff.length === 0) return;
            setBuffer(buff);
        };

        reader.onerror = (err) => {
            console.error(err);
        };

        reader.readAsArrayBuffer(file);
    }, []);

    useEffect(() => {
        setSyntax(parser(buffer));
    }, [buffer]);

    const filteredSyntax = useMemo(() => {
        if (!filter.text) return syntax;
        const text = filter.text.toLowerCase();
        function dfs(node: DataNode): DataNode | undefined {
            const take = node.title!.toString().toLowerCase().indexOf(text) >= 0;
            if (take) return node;
            const children: DataNode[] = []
            for (const child of (node.children || [])) {
                const takeChild = dfs(child);
                if (takeChild !== undefined) {
                    children.push(takeChild);
                }
            }
            if (children.length > 0) {
                return {
                    ...node,
                    children
                }
            }
            return undefined;
        }

        return dfs(syntax) || EMPTY_TREE;
    }, [syntax, filter]);

    const reset = useCallback(() => {
        setSyntax(parser(buffer));
    }, [setSyntax, parser, buffer]);

    return <>
        <BitstreamExplorerContext.Provider value={{
            syntax: filteredSyntax, setSyntax,
            buffer, setBuffer,
            readFileUploadData,
            showHiddenSyntax, setShowHiddenSyntax,
            filter, setFilter,
            reset
        }}>
            <BitstreamSelection>
                {
                    buffer.byteLength == 0
                        ? uploader
                        : children
                }
            </BitstreamSelection>
        </BitstreamExplorerContext.Provider >
    </>
}
