///<reference path="PhysicalLaws.ts" />
///<reference path="World.ts"/>
///<reference path="Utils.ts"/>

//import passLaws = PhysicalLaws.passLaws;
import clone = Utils.clone;

class WorldNode{
    constructor(
        public stacks: Stack[],
        public holding: string,
        public arm: number
    ) {}

    add(stacks: Stack[], holding: string, arm: number): WorldNode{
        return new WorldNode(stacks, holding, arm);
    }

    compareTo(node: WorldNode) : number {
        let diff: number = 0;

        if(this.arm !== node.arm) diff++;
        if(this.holding !== node.holding) diff++;

        this.stacks.forEach((stack: Stack, col: number): void => {
           stack.forEach((object: string, row: number): void => {
                if(object !== node.stacks[col][row]) diff++;
           })
        });

        return diff;
    }
}

class WorldGraph implements Graph<WorldNode> {

    private objects: { [s:string]: ObjectDefinition; };

    constructor(objects: {[s: string]: ObjectDefinition;}) {
        this.objects = objects;
    }

    outgoingEdges(node:WorldNode):Edge<WorldNode>[] {
        let outgoing: Edge<WorldNode>[] = [];

        //console.log("Getting new outgoing edges from:", node);
        if(!node.holding){
            //console.log("Outgoing: Pickup");
            outgoing.push(getOutgoing(node, pickup, "p"));
        }
        if(node.holding){
            let stack: Stack = node.stacks[node.arm];

            // if the stack is empty we can drop, else we have to check the physical laws
            if(stack.length === 0){
                outgoing.push(getOutgoing(node, drop, "d"));
            } else {
                let topObject: string = stack[stack.length - 1];

                if(passLaws(this.objects[node.holding], this.objects[topObject], true)){
                    outgoing.push(getOutgoing(node, drop, "d"));
                }
            }

        } 
        if(node.arm > 0) {
            //console.log("Outgoing: Left");
            outgoing.push(getOutgoing(node, goLeft, "l"));
        }
        if(node.arm < node.stacks.length - 1){
            //console.log("Outgoing: Right");
            outgoing.push(getOutgoing(node, goRight, "r"));
        }

        return outgoing;
    }

    compareNodes(a: WorldNode, b: WorldNode): number {
        return a.compareTo(b);
    }

}

//////////////////////////////////////////////////////
/// Private Functions
//////////////////////////////////////////////////////

function getOutgoing(node: WorldNode, method: (node: WorldNode) => WorldNode, action: string): any{
    return {
        from: node,
        to: method(node),
        cost: 1,
        action: action
    };
}

function pickup(node: WorldNode): WorldNode {
    let stacks: Stack[] = <Stack[]>clone(node.stacks);
    let stack: Stack = stacks[node.arm];

    // get the object on the top of the stack, remove it from the stack and add it to the array of stacks
    let holding: string = stack[stack.length - 1];
    if(stack.length > 0 ) stack.splice(length - 1);
    stacks[node.arm] = stack;

    return node.add(stacks, holding, node.arm);
}

function drop(node: WorldNode): WorldNode {
    let stacks: Stack[] = <Stack[]>clone(node.stacks);
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