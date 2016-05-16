///<reference path="World.ts"/>
///<reference path="Parser.ts"/>
///<reference path="lib/node.d.ts"/>


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

        parses.forEach((parseresult) => {
            try {
                var result:InterpretationResult = <InterpretationResult>parseresult;
                result.interpretation = interpretCommand(result.parse, currentState);
                // NOTE: We did not now what to return if there was no result so we return null, if so we do not add it
                if (result.interpretation) interpretations.push(result);
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

    enum SIZE {
        small,
        large,
        undefined
    }

    const RELATION = {
        ontop: 'ontop',
        inside: 'inside',
        above: 'above',
        under: 'under',
        beside: 'beside',
        leftof: 'leftof',
        rightof: 'rightof'
    };

    const FORM = {
        brick: 'brick',
        plank: 'plank',
        ball: 'ball',
        pyramid: 'pyramid',
        box: 'box',
        table: 'table'
    };


    const COLOR = {
        red: 'red',
        black: 'black',
        blue: 'blue',
        green: 'green',
        yellow: 'yellow',
        white: 'white'
    };


    /**
     *
     *
     * @param cmd The actual command. Note that it is *not* a string, but rather an object of type `Command` (as it has been parsed by the parser).
     * @param state The current state of the world. Useful to look up objects in the world.
     * @returns A list of list of Literal, representing a formula in disjunctive normal form (disjunction of conjunctions). See the dummy interpetation returned in the code for an example, which means ontop(a,floor) AND holding(b).
     */
    function interpretCommand(cmd : Parser.Command, state : WorldState) : DNFFormula {

        let interpretation : DNFFormula = [];
        let location : Parser.Location = cmd.location;
        let objects : string[] = getObjects(cmd.entity, state);

        // if there is no location we go through all the objects and assume we just pick them up
        if (!location) {
            objects.forEach((obj) => {
                interpretation.push(getGoal(true, "holding", [obj]));
            });
        }
        else {
            var locationObjects : string[] = getObjects(location.entity, state);

            objects.forEach((obj) => {
                locationObjects.forEach((locObj) => {
                    if (state.objects[obj] !== state.objects[locObj]) {

                        // If the location is a floor we can always place the object there
                        // If we have a stack relationship we need to check that it fulfills the physical laws
                        if (locObj !== "floor" && checkStackRelation(location.relation)) {

                            // small objects cannot support large objects
                            if (lte(state.objects[obj], state.objects[locObj])) {
                                let stateObj : Parser.Object = state.objects[obj];
                                let stateLocObj : Parser.Object = state.objects[locObj];

                                // Depending on the type of relationship we define different laws
                                switch (location.relation) {
                                    case RELATION.ontop:
                                        if (stateObj.form == "ball" && stateLocObj.form == "table") break;
                                        interpretation.push(getGoal(true, location.relation, [obj, locObj]));
                                        break;
                                    default:
                                        interpretation.push(getGoal(true, location.relation, [obj, locObj]));
                                        break;
                                }
                            }
                        }
                        else {
                            interpretation.push(getGoal(true, location.relation, [obj, locObj]));
                        }
                    }
                })
            });
        }

        return (interpretation.length !== 0) ? interpretation : null;
    }

    /**
     * Finds all the objects that matches the entity description and returns the
     *
     * @param entity
     * @param state
     * @returns {string[]}
     */
    function getObjects(entity : Parser.Entity, state : WorldState) : string[] {
        var obj : Parser.Object = entity.object;
        var objects : string[] = [];

        // If we search for a floor we add it
        if (objectMatch(obj, {form: "floor"})) {
            objects.push("floor");
            return objects;
        }

        // we make a search through the world state to find objects that match our description
        for (var col : number = 0; col < state.stacks.length; col++) {
            var stack : Stack = state.stacks[col];

            for (var row : number = 0; row < stack.length; row++) {
                var item : string = stack[row];

                if (objectMatch(obj, state.objects[item])) {
                    objects.push(item);
                }
                else if (obj.location && objectMatch(obj.object, state.objects[item])) {
                    // If there is a location defined and that location object matches the state object
                    // we handle the relation

                    if (locationMatch(obj.location, state, col, row)) {
                        objects.push(item);
                    }

                }
            }
        }

        return objects;
    }

    function locationMatch(location : Parser.Location, state : WorldState, col : number, row : number) : boolean{
        let obj : Parser.Object;
        let nCol : number;
        let nRow : number;
        let match : boolean;

        // If there is a location defined and that location object matches the state object
        // we handle the relation

        switch (location.relation) {

            case RELATION.beside:
                nCol = col - 1;
                nRow = row;
                obj = state.objects[state.stacks[nCol][nRow]];
                match = objectMatch(location.entity.object, obj);
                if(match) break;

                nCol = col + 1;
                nRow = row;
                obj = state.objects[state.stacks[nCol][nRow]];
                match = objectMatch(location.entity.object, obj);
                break;

            case RELATION.leftof:
                nCol = col - 1;
                nRow = row;
                obj = state.objects[state.stacks[nCol][nRow]];
                match = objectMatch(location.entity.object, obj);
                break;

            case RELATION.rightof:
                nCol = col + 1;
                nRow = row;
                obj = state.objects[state.stacks[nCol][nRow]];
                match = objectMatch(location.entity.object, obj);
                break;

            case RELATION.ontop:
            case RELATION.inside:
                nCol = col;
                nRow = row - 1;
                obj = (row == 0) ? {form: "floor"} : state.objects[state.stacks[nCol][nRow]];
                match = objectMatch(location.entity.object, obj);
                break;
            default:
                break;
        }

        if(match){
            if(location.entity.object.location) locationMatch(location.entity.object.location, state, nCol, nRow);
            return true;
        } else {
            return false;
        }
    }

    /**
     * Returns a goal for the DNF
     *
     * @param pol
     * @param rel
     * @param args
     * @returns {Interpreter.Literal[]}
     */
    function getGoal(pol:boolean, rel:string, args:string[]) : Interpreter.Literal[] {
        return [
            {
                polarity: pol,
                relation: rel,
                args: args
            }
        ];
    }

    /**
     * A check to see if the description matches an object
     *
     * @param obj
     * @param stateObject
     * @returns {boolean}
     */
    function objectMatch(obj:Parser.Object, stateObject:Parser.Object):boolean {
        if(!obj) return false;
        return (obj.color == stateObject.color || obj.color == null)
            && (obj.size == stateObject.size || obj.size == null)
            && (obj.form == stateObject.form || (obj.form == "anyform" && stateObject.form != "floor"));
    }

    /**
     *  Get the enum size according to the string that is passed into the function
     *
     * @param string
     * @returns {Interpreter.SIZE}
     */
    function getSize(size : string) : SIZE {
        switch (size) {
            case "small":
                return SIZE.small;
            case "large":
                return SIZE.large;
            default:
                return SIZE.undefined
        }
    }

    /**
     * Simply a less than or equal for the Parse.Object
     *
     * @param obj1
     * @param obj2
     * @returns {boolean}
     */
    function lte(obj1 : Parser.Object, obj2 : Parser.Object) : boolean {
        return getSize(obj1.size) <= getSize(obj2.size);
    }

    /**
     *
     * Check to see if we have a stack relation in the world state
     * A stack relation implies that we they are in a vertical relationship
     *
     * @param relation
     * @returns {boolean}
     */
    function checkStackRelation(relation : string) : boolean {
        // We create an array and the check if the relation is contained within that
        // array.
        let arr = [
            RELATION.ontop,
            RELATION.above,
            RELATION.inside,
            RELATION.under
        ];

        return (arr.indexOf(relation) === -1) ? false : true;
    }

}