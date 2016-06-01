///<reference path="World.ts"/>
///<reference path="Interpreter.ts"/>
///<reference path="Graph.ts"/>
///<reference path="WorldGraph.ts"/>


import Literal = Interpreter.Literal;
/**
* Planner module
*
* The goal of the Planner module is to take the interpetation(s)
* produced by the Interpreter module and to plan a sequence of actions
* for the robot to put the world into a state compatible with the
* user's command, i.e. to achieve what the user wanted.
*
* The planner should use your A* search implementation to find a plan.
*/
module Planner {

    //////////////////////////////////////////////////////////////////////
    // exported functions, classes and interfaces/types

    import stringifyLiteral = Interpreter.stringifyLiteral;
    /**
     * Top-level driver for the Planner. Calls `planInterpretation` for each given interpretation generated by the Interpreter. 
     * @param interpretations List of possible interpretations.
     * @param currentState The current state of the world.
     * @returns Augments Interpreter.InterpretationResult with a plan represented by a list of strings.
     */
    export function plan(interpretations : Interpreter.InterpretationResult[], currentState : WorldState) : PlannerResult[] {
        var errors : Error[] = [];
        var plans : PlannerResult[] = [];

        console.log("PLAN", interpretations);
        interpretations.forEach((interpretation) => {
            try {
                var result : PlannerResult = <PlannerResult>interpretation;
                result.plan = planInterpretation(result.interpretation, currentState);
                if (result.plan.length == 0) {
                    result.plan.push("That is already true!");
                }
                plans.push(result);
            } catch(err) {
                errors.push(err);
            }
        });
        if (plans.length) {
            return plans;
        } else {
            // only throw the first error found
            throw errors[0];
        }
    }

    export interface PlannerResult extends Interpreter.InterpretationResult {
        plan : string[];
    }

    export function stringify(result : PlannerResult) : string {
        return result.plan.join(", ");
    }

    //////////////////////////////////////////////////////////////////////
    // private functions

    /**
     * The core planner function. The code here is just a template;
     * you should rewrite this function entirely. In this template,
     * the code produces a dummy plan which is not connected to the
     * argument `interpretation`, but your version of the function
     * should be such that the resulting plan depends on
     * `interpretation`.
     *
     * 
     * @param interpretation The logical interpretation of the user's desired goal. The plan needs to be such that by executing it, the world is put into a state that satisfies this goal.
     * @param state The current world state.
     * @returns Basically, a plan is a
     * stack of strings, which are either system utterances that
     * explain what the robot is doing (e.g. "Moving left") or actual
     * actions for the robot to perform, encoded as "l", "r", "p", or
     * "d". The code shows how to build a plan. Each step of the plan can
     * be added using the `push` method.
     */
    function planInterpretation(interpretation : Interpreter.DNFFormula, state : WorldState) : string[] {

        var plan : string[] = [];


        let graph = new WorldGraph(state.objects);

        let stacks: Stack[] = [];

        // For some reason there are null objects in the stacks. Filter them out.
        state.stacks.forEach((stack) => {
            stacks.push(stack.filter((object) => {return object !== undefined; }));
        });

        let startNode = new WorldNode(stacks, state.holding, state.arm);

        type position = {
            col: number;
            row: number;
        }

        function goal(node: WorldNode): boolean {
            let found: boolean = false;

            let conjuction: any;
            let literal: any;
            let stack: Stack;
            let row: number = null;
            
            for(let i = 0; i < interpretation.length; i++) {
                conjuction = interpretation[i];
                for (let j = 0; j < conjuction.length; j++) {
                    literal = conjuction[j];
                    switch (literal.relation) {
                        case RELATION.holding:
                            return literal.args[0] === node.holding;
                        default:

                            let stackPos: number;

                            // Find the stack the object is in
                            for (let i: number = 0; i < node.stacks.length; i++) {
                                stack = node.stacks[i];
                                if (existInStack(stack, literal.args[0])){
                                    stackPos = i;
                                    break;
                                }
                            }

                            stack.forEach((object, iterator) => {
                                if(object === literal.args[0]) row = iterator;
                            });

                            if(row !== null){
                                switch (literal.relation) {
                                    case RELATION.inside:
                                    case RELATION.ontop:
                                        if ((row === 0 && literal.args[1] === FORM.floor) || stack[row - 1] === literal.args[1]) {
                                            found = true;
                                        }
                                        break;

                                    case RELATION.under:
                                        for (let i: number = row + 1; i < stack.length; i++) {
                                            if (stack[i] === literal.args[1]) {
                                                found = true;
                                                break;
                                            }
                                        }
                                        break;
                                    
                                    case RELATION.above:
                                        for (let i: number = row - 1; i >= 0; i--) {
                                            if (stack[i] === literal.args[1]) {
                                                found = true;
                                                break;
                                            }
                                        }
                                        break;

                                    case RELATION.beside:
                                        let col: number;
                                        // Look in the left stack.
                                        if (stackPos > 0) {
                                            col = stackPos - 1;
                                            found = existInStack(node.stacks[col], literal.args[1]);
                                        }
                                        // Look in the right stack if it wasn't found in the left stack.
                                        if (!found && stackPos < node.stacks.length - 1) {
                                            col = stackPos + 1;
                                            found = existInStack(node.stacks[col], literal.args[1]);
                                        }
                                        break;

                                    case RELATION.leftof:
                                        for (let col: number = stackPos + 1; col < node.stacks.length; col++) {
                                            if (existInStack(node.stacks[col], literal.args[1])) {
                                                found = true;
                                                break;
                                            }
                                        }
                                        break;

                                    case RELATION.rightof:
                                        for (let col: number = stackPos - 1; col >= 0; col--) {
                                            if (existInStack(node.stacks[col], literal.args[1])) {
                                                found = true;
                                                break;
                                            }
                                        }
                                        break;
                                }
                            }
                            break;
                    }
                }
            }


            return found;
        }

        function heuristic(node: WorldNode): number {
            if(interpretation.length === 0) return 0;
            let min:number = Number.MAX_VALUE;
            for(let i = 0; i < interpretation.length; i++) {
                let conjuction:any = interpretation[i];

                for (let j = 0; j < conjuction.length; j++) {
                    let literal:any = conjuction[j];
                    console.log("HERE", literal.args);
                    let objCol: number;
                    // There is only supposed to be one of argument 0 so we take that
                    if(node.holding === literal.args[0]) objCol = node.arm;
                    else objCol = (getObjectPositions(node.stacks, literal.args[0]))[0].col;

                    console.log(literal.args[1]);
                    if(literal.args[1] !== undefined){
                        console.log("SEARCHING STUFF");
                        console.log("RELATION", literal.relation);
                        let positions: pos = getObjectPositions(node.stacks, literal.args[1]);

                        positions.forEach((pos) => {
                            console.log(pos);
                            let value: number = Math.abs(objCol - pos.col);
                            console.log("VALUE", value);

                            switch (literal.relation) {
                                case RELATION.beside:
                                    value = Math.abs(value - 1);
                                    break;
                                case RELATION.leftof:
                                    if (node.arm < pos.col) {
                                        value -= 1;
                                    }
                                    break;
                                case RELATION.rightof:
                                    if (node.arm > pos.col) {
                                        value -= 1;
                                    }
                                    break;
                                case RELATION.under:
                                    break;
                            }

                            if(value < min) min = value;

                        });
                    } else {
                        min = Math.abs(objCol - node.arm);
                    }
                }
            }
            console.log("MIN", min);
            return min;
        }

        let result = aStarSearch(graph, startNode, goal, heuristic, 100);
        
        return getPlan(result.actions);
    }

    const msg: {[action: string]: string} = {
        l: 'Moving left',
        r: 'Moving right',
        p: 'Picking up object',
        d: 'Dropping object'
    };

    /**
     * Generates the plan according to the actions
     *
     * @param actions that needs to be done
     * @returns a plan of actions and messages
     */
    function getPlan(actions: string[]): string[] {
        let previous: string;
        let plan: string[] = [];

        actions.forEach((action) => {
            if(previous !== action) plan.push(msg[action]);
            plan.push(action);
            previous = action;
        });

        return plan;
    }
}


type pos = {
    col: number;
    row: number;
}[];

/**
 *
 * Get the columns where the literal exists
 *
 * @param state
 * @param literal
 * @returns {number[]}
 */
function getObjectPositions(stacks: Stack[], object: string): pos {
    let positions: pos = [];

    for(let k: number = 0; k < stacks.length; k++) {
        for(let l: number = 0; l < stacks[k].length; l++) {
            if(stacks[k][l] === object) {
                positions.push({col: k, row: l});
            }
        }
        if(object === FORM.floor && stacks[k].length === 0) {
            positions.push({col: k, row: 0});
        }
    }
    return positions;
}

function existInStack(stack: string[], obj: string): boolean {
    let exist: boolean = false;
    for (let row: number = 0; row < stack.length; row++) {
        if (stack[row] === obj) {
            exist = true;
            break;
        }
    }
    return exist;
}