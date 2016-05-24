class WorldNode{
    constructor(
        public stacks: Stack[],
        public holding: string,
        public arm: number
    ) {}

    add(stacks: Stack[], holding: string, arm: number): WorldNode{
        return new WorldNode(stacks, holding, arm);
    }
}

class WorldGraph implements Graph<WorldNode> {
    private states:collections.Set<WorldNode>;

    constructor(public state: WorldState) {
        this.states = new collections.Set<WorldNode>();
        this.states.add(new WorldNode(state.stacks, state.holding, state.arm));
    }

    outgoingEdges(node:WorldNode):Edge<WorldNode>[] {
        let nextList: WorldNode[] = [];

        if(!node.holding) nextList.push(pickup(node));
        if(node.holding) nextList.push(drop(node));
        if(node.arm > 0) nextList.push(goLeft(node));
        if(node.arm < node.stacks.length) nextList.push(goRight(node));


        let outgoing: Edge<WorldNode>[] = [];

        nextList.forEach((next): void => {
            if (!this.states.contains(next)) {
                outgoing.push({
                    from: node,
                    to: next,
                    cost: 1
                });
            }
        });

        return outgoing;
    }

    compareNodes(a:GridNode, b:GridNode):number {
        return a.compareTo(b);
    }
}

//////////////////////////////////////////////////////
/// Private Functions
//////////////////////////////////////////////////////

function pickup(node: WorldNode): WorldNode {
    let stacks: Stack[] = node.stacks;
    let stack: Stack = stacks[node.arm];

    // get the object on the top of the stack, remove it from the stack and add it to the array of stacks
    let holding: string = stack[stack.length];
    stack[stack.length] = null;
    stacks[node.arm] = stack;

    return node.add(stacks, holding, node.arm);
}

function drop(node: WorldNode): WorldNode {
    let stacks: Stack[] = node.stacks;
    let stack: Stack = stacks[node.arm];

    stack.push(node.holding);
    let holding: string = null;

    return node.add(stacks, holding, node.arm);
}

function goLeft(node: WorldNode): WorldNode {
    return node.add(node.stacks, node.holding, node.arm - 1);
}

function goRight(node: WorldNode): WorldNode {
    return node.add(node.stacks, node.holding, node.arm + 1);
}