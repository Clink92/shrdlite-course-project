///<reference path="World.ts"/>
///<reference path="Parser.ts"/>

import DNFFormula = Interpreter.DNFFormula;
import Entity = Parser.Entity;
/**
 * Interpreter module
 *
 * The goal of the Interpreter module is to interpret a sentence
 * written by the user in the context of the current world state. In
 * particular, it must figure out which objects in the world,
 * i.e. which elements in the `objects` field of WorldState, correspond
 * to the ones referred to in the sentence.
 *
 * Moreover, it has to derive what the intended goal state is and
 * return it as a logical formula described in terms of literals, where
 * each literal represents a relation among objects that should
 * hold. For example, assuming a world state where "a" is a ball and
 * "b" is a table, the command "put the ball on the table" can be
 * interpreted as the literal ontop(a,b). More complex goals can be
 * written using conjunctions and disjunctions of these literals.
 *
 * In general, the module can take a list of possible parses and return
 * a list of possible interpretations, but the code to handle this has
 * already been written for you. The only part you need to implement is
 * the core interpretation function, namely `interpretCommand`, which produces a
 * single interpretation for a single command.
 */
module Interpreter {

    //////////////////////////////////////////////////////////////////////
    // exported functions, classes and interfaces/types

    /**
     Top-level function for the Interpreter. It calls `interpretCommand` for each possible parse of the command. No need to change this one.
     * @param parses List of parses produced by the Parser.
     * @param currentState The current state of the world.
     * @returns Augments ParseResult with a list of interpretations. Each interpretation is represented by a list of Literals.
     */
    export function interpret(parses:Parser.ParseResult[], currentState:WorldState):InterpretationResult[] {
        var errors:Error[] = [];
        var interpretations:InterpretationResult[] = [];


        let counter:number = 0;

        parses.forEach((parseresult) => {
            try {
                var result:InterpretationResult = <InterpretationResult>parseresult;
                result.interpretation = interpretCommand(result.parse, currentState);
                interpretations.push(result);
                counter++;
            } catch (err) {
                errors.push(err);
            }
        });
        if (interpretations.length) {
            return interpretations;
        } else {
            // only throw the first error found
            throw errors[0];
        }
    }

    export interface InterpretationResult extends Parser.ParseResult {
        interpretation:DNFFormula;
    }

    export type DNFFormula = Conjunction[];
    type Conjunction = Literal[];

    /**
     * A Literal represents a relation that is intended to
     * hold among some objects.
     */
    export interface Literal {
        /** Whether this literal asserts the relation should hold
         * (true polarity) or not (false polarity). For example, we
         * can specify that "a" should *not* be on top of "b" by the
         * literal {polarity: false, relation: "ontop", args:
	 * ["a","b"]}.
         */
        polarity:boolean;
        /** The name of the relation in question. */
        relation:string;
        /** The arguments to the relation. Usually these will be either objects
         * or special strings such as "floor" or "floor-N" (where N is a column) */
        args:string[];
    }

    export function stringify(result:InterpretationResult):string {
        return result.interpretation.map((literals) => {
            return literals.map((lit) => stringifyLiteral(lit)).join(" & ");
            // return literals.map(stringifyLiteral).join(" & ");
        }).join(" | ");
    }

    export function stringifyLiteral(lit:Literal):string {
        return (lit.polarity ? "" : "-") + lit.relation + "(" + lit.args.join(",") + ")";
    }

    //////////////////////////////////////////////////////////////////////
    // private functions
    /**
     * The core interpretation function. The code here is just a
     * template; you should rewrite this function entirely. In this
     * template, the code produces a dummy interpretation which is not
     * connected to `cmd`, but your version of the function should
     * analyse cmd in order to figure out what interpretation to
     * return.
     * @param cmd The actual command. Note that it is *not* a string, but rather an object of type `Command` (as it has been parsed by the parser).
     * @param state The current state of the world. Useful to look up objects in the world.
     * @returns A list of list of Literal, representing a formula in disjunctive normal form (disjunction of conjunctions). See the dummy interpetation returned in the code for an example, which means ontop(a,floor) AND holding(b).
     */
    function interpretCommand(cmd:Parser.Command, state:WorldState):DNFFormula {

        // Note: some parses might not have an interpretation, and some parses might have several interpretations.
        // Output: a list of logical interpretations

        // Forms: Bricks, planks, balls, pyramids, boxes and tables.
        // Colors: Red, black, blue, green, yellow, white.
        // Sizes: Large, small.

        /*
         The basic commands

         A plan is a sequence of basic commands, and there are only four of them:

         left: Move the arm one step to the left.
         right: Move the arm one step to the right.
         pick: Pick up the topmost object in the stack where the arm is.
         drop: Drop the object that you’re currently holding onto the current stack.

         */

        /*
         cmd: Location
         Entity
         Command
         */
        // This returns a dummy interpretation involving two random objects in the world


        var interpretation:DNFFormula = [];
        var objects:string[] = getObjects(cmd.entity, state);


        if (cmd.location == undefined) {
            objects.forEach(function (obj) {
                interpretation.push(
                    [
                        {
                            polarity: true,
                            // since no locations is specified we assume that we just pick it up and hold
                            relation: "holding",
                            args: [
                                obj
                            ]
                        }
                    ]);
            });
        }
        else if (cmd.location.relation !== undefined) {
            var locationObjects:string[] = getObjects(cmd.location.entity, state);
            console.log("Entity", objects);
            console.log("Location", locationObjects);


            objects.forEach(function (obj) {
                locationObjects.forEach(function (locObj) {
                    if(locObj == "floor"){
                        interpretation.push([
                            {
                                polarity: true,
                                relation: cmd.location.relation,
                                args: [
                                    obj, locObj
                                ]
                            }
                        ]);
                    }
                    else if (state.objects[obj] != state.objects[locObj]) {
                        if (["ontop", "below", "above", "inside"].indexOf(cmd.location.relation) != -1) {
                            if (lte(state.objects[obj], state.objects[locObj])
                                && !(cmd.location.relation == "ontop" && state.objects[obj].form == "ball" && state.objects[locObj].form == "table")) {
                                interpretation.push([
                                    {
                                        polarity: true,
                                        relation: cmd.location.relation,
                                        args: [
                                            obj, locObj
                                        ]
                                    }
                                ]);
                            }
                        }
                        else {
                            interpretation.push([
                                {
                                    polarity: true,
                                    relation: cmd.location.relation,
                                    args: [
                                        obj, locObj
                                    ]
                                }
                            ]);
                        }

                    }
                })
            });
        }
        else {
            interpretation = [
                [
                    {
                        polarity: true,
                        relation: cmd.entity.object.location.relation,
                        args: [
                            cmd.entity.object.toString()
                        ]
                    }
                ]
            ];
        }

        return (interpretation.length != 0) ? interpretation : null;
    }

}

function getObjects(entity:Parser.Entity, state:WorldState):string[] {
    var obj : Parser.Object = entity.object;
    var objects:string[] = [];


    if(descriptionMatch(obj, {form: "floor"})){
        state.stacks.forEach(function(stack){
           if(stack.length == 0 && objects.length == 0) {
               objects.push("floor");
           }
        });
    }
    else{
        for(var col : number = 0; col < state.stacks.length; col++){
            var stack : Stack = state.stacks[col];
            for(var row : number = 0; row < stack.length; row ++){
                var item : string = stack[row];

                if (descriptionMatch(obj, state.objects[item])) {
                    objects.push(item);
                }
                else if(obj.location !== undefined && descriptionMatch(obj.object, state.objects[item])){
                    // If there is a location defined and that location object matches the state object we handle the relation
                    switch(obj.location.relation){
                        case "beside":
                            // for the object to be relevant it needs to have what we search for on either the left or the right side
                            var nObj : Parser.Object = state.objects[state.stacks[col + 1][row]] || state.objects[state.stacks[col - 1][row]];
                            if(nObj != undefined){
                                if(descriptionMatch(obj.location.entity.object, nObj)){
                                    objects.push(item);
                                }
                            }
                            break;
                        case "inside":
                            var uObj : Parser.Object = (row == 0) ? {form: "floor"}:state.objects[stack[row - 1]];
                            if(descriptionMatch(obj.location.entity.object, uObj)){
                                objects.push(item);
                            }
                            break;
                        case "ontop":
                            console.log("HEAHSSE");
                            var uObj : Parser.Object = (row == 0) ? {form: "floor"}:state.objects[stack[row - 1]];
                            if(descriptionMatch(obj.location.entity.object, uObj)){
                                console.log("I WAS HERE");
                                objects.push(item);
                            }
                            break;
                        default:
                            objects.push(item);
                            break;
                    }
                }
            }
    }

    }

    return objects;
}

function descriptionMatch(obj : Parser.Object, stateObject : Parser.Object) : boolean {
    return (obj.color == stateObject.color || obj.color == null)
    && (obj.size == stateObject.size || obj.size == null)
    && (obj.form == stateObject.form || (obj.form == "anyform" && stateObject.form != "floor"));
}

function isEmpty(stacks:Stack[], obj:string):boolean {
    for (var i:number = 0; i < stacks.length; i++) {
        if (stacks[i][stacks[i].length - 1] == obj) return true;
    }
    return false;
}


function contains(stacks:Stack[], objBottom:string, objTop:string):boolean {
    return false;
}

enum SIZE {
    small,
    large,
    undefined
}


function getSize(obj:Parser.Object):SIZE {
    switch (obj.size) {
        case "small":
            return SIZE.small;
        case "large":
            return SIZE.large;
        default:
            return SIZE.undefined
    }
}

// If  obj1 is less than or equal obj2
function lte(obj1:Parser.Object, obj2:Parser.Object):boolean {
    return getSize(obj1) <= getSize(obj2);
}

/*
 function isAnyObject(obj, state, item){
 return (obj.color == null && obj.form == state.objects[item].form);
 }
 */
