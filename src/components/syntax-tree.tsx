import { TreeItem, TreeView } from "@mui/x-tree-view";
import { DataNode } from "../types/parser.types";
import { useContext, useEffect, useState } from "react";

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { BitstreamExplorerContext } from "../bitstream/bitstream-explorer";
import { BitRange } from "../bitstream/range";


function DataTreeNodeComponent({ node }: { node: DataNode }) {
    return <>
        <TreeItem nodeId={node.key} label={<>
            {node.title}
            <span className="node-right">
                <span>{Math.floor(node.start / 8)}</span>
                <span>{Math.ceil((node.start + node.size) / 8 - 1)}</span>
            </span>
        </>}>
            {(node.children || [])
                .map(childNode => <DataTreeNodeComponent key={childNode.key} node={childNode} />)
            }
        </TreeItem>
    </>
}

export function DataTreeComponent({ }: {}
) {
    const { syntax: root, setRanges, syntaxById, ranges } = useContext(BitstreamExplorerContext);
    // const [expanded, setExpanded] = useState<string[]>([]);

    console.log("Syntax tree rendered");

    // useEffect(() => {
    //     const allKeys: string[] = [];
    //     function dfs(at: DataNode, d: number, maxd: number) {
    //         if (d > maxd) return;
    //         allKeys.push(at.key);
    //         for (const child of (at.children || [])) {
    //             dfs(child, d+1, maxd);
    //         }
    //     }
    //     dfs(root, 0, 1);
    //     setExpanded(allKeys);
    // }, [root])
    if (!root.children) {
        return <>No data</>
    }

    return <TreeView
        aria-label="file system navigator"
        defaultCollapseIcon={<ExpandMoreIcon />}
        defaultExpandIcon={<ChevronRightIcon />}
        // disableSelection
        // expanded={expanded}
        // onNodeToggle={(ev: any, nodeIds: string[]) => {
        //     setExpanded(nodeIds);
        // }}
        // onNodeSelect={(event, nodeIds) => onSelect([nodeIds])}
        onNodeFocus={(event, nodeId) => {
            console.log(nodeId);
            const node = syntaxById[nodeId];
            if (!node || node.size == 0) return;
            const newRange = new BitRange(node.start, node.start+node.size);
            if (ranges.length == 1 && ranges[0].equals(newRange)) return;
            setRanges([newRange]);
        }}
        sx={{ flex: "1 1 auto", height: 0, overflowY: "auto", width: "100%" }}
    >
        <DataTreeNodeComponent node={root.children[0]} />
    </TreeView>
}