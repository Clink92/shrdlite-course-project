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
     * Planner function
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

                            let row: number = null;
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
            let h: number = Number.MAX_VALUE;
            let curH: number = 0;
            let obj: string;
            let pos: number;
            let objsAbove: number;
            let stack: number;
            let stacks: string[][] = node.stacks;
            for (let i = 0; i < interpretation.length; i++) {
                let conjuction: any = interpretation[i];
                obj = "";
                for (let j = 0; j < conjuction.length; j++) {
                    let literal: any = conjuction[j];

                    // Reset current heuristic for this literal
                    curH = 0;

                    // If we haven't had this object before we must search for it
                    if (obj !== literal.args[0]) {
                        obj = literal.args[0];
                        // If the object is held heuristic is 1 because we must at least drop it
                        if (node.holding === obj) {
                            h = 1;
                            break;
                        }
                        // Find the objects position in a stack
                        for (let k: number = 0; k < stacks.length; k++) {
                            pos = posInStack(stacks[k], obj);
                            if (pos != -1) {
                                stack = k;
                                break;
                            }
                        }
                        // Calculate the amount of objects above the one we whish to pick up
                        objsAbove = stacks[stack].length - pos - 1;
                    }
                    // Heuristic = 4 actions to remove objects above + arm movement to stack + pick up object
                    curH = objsAbove * 4 + Math.abs(node.arm - stack) + 1;

                    // If current heuristic is lower, it should be used
                    if (curH < h) {
                        h = curH;
                    }
                }
            }
            return h;
        }

        let result = aStarSearch(graph, startNode, goal, heuristic, 10);

        if(result === null) {
            throw "A* Couldn't find a solution  =(";
        }

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

    /**
    * Checks if an object is present in a stack
    *
    * @param stack Stack to check
    * @param obj Object to search for
    *@returns True if the object exist in the stack
    */
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

    /**
    * Finds an objects position in a stack.
    *
    * @param stack Stack to find the position in
    * @param obj Object to search for
    * @returns Index for the objects position. -1 if it is not present in the stack
    */
    function posInStack(stack: string[], obj: string): number {
        let pos: number = -1;
        for (let row: number = 0; row < stack.length; row++) {
            if (stack[row] === obj) {
                pos = row;
                break;
            }
        }
        return pos;
    }
}