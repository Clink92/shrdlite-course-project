///<reference path="World.ts"/>
///<reference path="Interpreter.ts"/>
///<reference path="Graph.ts"/>
///<reference path="WorldGraph.ts"/>

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

        // WE DONT LIKE ThEM NULLS, KÄFTEN ANDREAS!!!!
        state.stacks.forEach((stack) => {
            stacks.push(stack.filter((object) => {return object !== undefined; }));
        });

        console.log("stacks", stacks);

        let startNode = new WorldNode(stacks, state.holding, state.arm);

        type position = {
            col: number;
            row: number;
        }

        function goal(node: WorldNode): boolean {
            let found: boolean = false;

            for(let i = 0; i < interpretation.length; i++) {
                let conjuction:any = interpretation[i];
                for (let j = 0; j < conjuction.length; j++) {
                    let literal:any = conjuction[j];

                    switch (literal.relation){
                        case "holding":
                            return literal.args[0] === node.holding;
                        default:
                            let stack: Stack = node.stacks[node.arm];
                            let row: number = null;

                            stack.forEach((object, iterator) => {
                                if(object === literal.args[0]) row = iterator;
                            });

                            if(row){
                                switch (literal.relation) {
                                    case "inside":
                                    case "ontop":
                                        console.log("ONTOPOPOPPOP");
                                        console.log("Row", row);
                                        console.log("Under", stack[row - 1] );
                                        if((row === 0 && literal.args[1] === "floor") || stack[row - 1] === literal.args[1]){
                                            console.log("On top goal was found");
                                            found = true;
                                        }
                                        break;
                                    case "under":
                                        break;
                                    case "above":
                                        break;
                                    case "beside":
                                        break;
                                }
                            }

                            break;
                    }
                }
            }


            return found;
        }

        let actions = aStarSearch(graph, startNode, goal, () =>  {return 0;}, 10);

        console.log("ACTIONS", actions);

        actions.actions.forEach((action) => {
            plan.push(action);
        });

        /*
        // First move the arm to the leftmost nonempty stack
        if (pickstack < state.arm) {
            plan.push("Moving left");
            for (var i = state.arm; i > pickstack; i--) {
                plan.push("l");
            }
        } else if (pickstack > state.arm) {
            plan.push("Moving right");
            for (var i = state.arm; i < pickstack; i++) {
                plan.push("r");
            }
        }

        // Then pick up the object
        var obj = state.stacks[pickstack][state.stacks[pickstack].length-1];
        plan.push("Picking up the " + state.objects[obj].form,
                  "p");

        if (pickstack < state.stacks.length-1) {
            // Then move to the rightmost stack
            plan.push("Moving as far right as possible");
            for (var i = pickstack; i < state.stacks.length-1; i++) {
                plan.push("r");
            }

            // Then move back
            plan.push("Moving back");
            for (var i = state.stacks.length-1; i > pickstack; i--) {
                plan.push("l");
            }
        }

        // Finally put it down again
        plan.push("Dropping the " + state.objects[obj].form,
                  "d");
        */
        return plan;
    }

}
