///<reference path="World.ts"/>
///<reference path="Parser.ts"/>
///<reference path="lib/async.d.ts"/>


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

    import Command = Parser.Command;
    /**
     Top-level function for the Interpreter. It calls `interpretCommand` for each possible parse of the command. No need to change this one.
     * @param parses List of parses produced by the Parser.
     * @param currentState The current state of the world.
     * @returns Augments ParseResult with a list of interpretations. Each interpretation is represented by a list of Literals.
     */
    export function interpret(parses:Parser.ParseResult[], currentState:WorldState):InterpretationResult[] {
        var errors:Error[] = [];
        var interpretations:InterpretationResult[] = [];


        try {
            var result:InterpretationResult = <InterpretationResult>parses[0];
            result.interpretation = interpretCommand(result.parse, currentState);
            // NOTE: We did not now what to return if there was no result so we return null, if so we do not add it
            if (result.interpretation) interpretations.push(result);
        } catch (err) {
            errors.push(err);
        }


        /*
        parses.forEach((parseresult) => {
            try {
                var result:InterpretationResult = <InterpretationResult>parseresult;
                result.interpretation = interpretCommand(result.parse, currentState);
                // NOTE: We did not now what to return if there was no result so we return null, if so we do not add it
                if (result.interpretation) interpretations.push(result);
            } catch (err) {
                errors.push(err);
            }
        });*/


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
        ontop:      'ontop',
        inside:     'inside',
        above:      'above',
        under:      'under',
        beside:     'beside',
        leftof:     'leftof',
        rightof:    'rightof'
    };

    const FORM = {
        brick:      'brick',
        plank:      'plank',
        ball:       'ball',
        pyramid:    'pyramid',
        box:        'box',
        table:      'table',
        floor:      'floor'
    };


    const COLOR = {
        red:    'red',
        black:  'black',
        blue:   'blue',
        green:  'green',
        yellow: 'yellow',
        white:  'white'
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
        let objects : string[] = interpretEntity(cmd.entity, state);

        // if there is no location we go through all the objects and assume we just pick them up
        if (!location) {
            objects.forEach((obj) => {
                // The arm can only hold one object at the time.
                if(!state.holding) interpretation.push(getGoal(true, "holding", [obj]));
            });
        }
        else {
            var locationObjects : string[] = interpretEntity(location.entity, state);

            objects.forEach((obj) => {
                locationObjects.forEach((locObj) => {
                    if (state.objects[obj] !== state.objects[locObj]) {

                        // If the location is a floor we can always place the object there
                        // If we have a stack relationship we need to check that it fulfills the physical laws
                        if (locObj !== "floor" && checkStackRelation(location.relation)) {

                            // small objects cannot support large objects

                            let stateObj : Parser.Object = state.objects[obj];
                            let stateLocObj : Parser.Object = state.objects[locObj];

                            // Depending on the type of relationship we define different laws
                            /*
                             Physical laws

                             The world is ruled by physical laws that constrain the placement and movement of the objects:
                                 The floor can support at most N objects (beside each other).
                                 All objects must be supported by something.
                                 The arm can only pick up free objects.
                             */

                            switch (location.relation) {
                                case RELATION.inside:
                                case RELATION.ontop:
                                    if(checkPhysicalLaws(stateObj, stateLocObj, true)) interpretation.push(getGoal(true, location.relation, [obj, locObj]));
                                    break;
                                case RELATION.under:
                                    if(checkPhysicalLaws(stateObj, stateLocObj, false)) interpretation.push(getGoal(true, location.relation, [obj, locObj]));
                                    break;
                                default:
                                    interpretation.push(getGoal(true, location.relation, [obj, locObj]));
                                    break;
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
    function interpretEntity(entity : Parser.Entity, state : WorldState) : string[] {
        var obj : Parser.Object = entity.object;
        var objects : string[] = [];

        // If we search for a floor we add it
        if (interpretObject(obj, state, 0, -1)) {
            objects.push("floor");
            return objects;
        }

        // we make a search through the world state to find objects that match our description
        for (var col : number = 0; col < state.stacks.length; col++) {
            var stack : Stack = state.stacks[col];

            for (var row : number = 0; row < stack.length; row++) {
                var item : string = stack[row];

                if (interpretObject(obj, state, col, row)) {
                    objects.push(item);
                }
            }
        }

        return objects;
    }


    type  MatchObject = {
        col: number,
        row: number,
        object: string,
    }


    /**
     *
     * @param obj
     * @param state
     * @param col
     * @param row
     * @returns {boolean}
     */
    function interpretObject(obj: Parser.Object, state : WorldState, col? : number, row? : number):boolean {
        let stateObject : Parser.Object = (row == -1) ? {form: "floor"} : state.objects[state.stacks[col][row]];
        if(!obj || !stateObject) return false;
        if(obj.location) {
            return interpretObject(obj.object, state, col, row) && interpretLocation(obj.location, state, col, row);
        } else{
            return isObjectMatch(obj, stateObject);
        }
    }

    function isObjectMatch(obj : Parser.Object, stateObject: Parser.Object) : boolean {
        return (obj.color == stateObject.color || obj.color == null)
        && (obj.size == stateObject.size || obj.size == null)
        && (obj.form == stateObject.form || (obj.form == "anyform" && stateObject.form != "floor"));
    }

    function interpretLocation(location : Parser.Location, state : WorldState, col : number, row : number) : boolean{
        let positions : MatchObject[] = [];
        // console.log("here again....", location.entity);
        // If there is a location defined and that location object matches the state object
        // we handle the relation

        // We make recursive calls on the location match until there are no more locations, if there is a match on
        // the final location we return true
        switch (location.relation) {
            case RELATION.beside:
                // x is beside y if they are in adjacent stacks.
                if(col < state.stacks.length){
                    let dCol : number = col + 1;
                    positions.push({
                        object: state.stacks[dCol][row],
                        col: dCol,
                        row: row
                    });
                }
                if(col > 0){
                    let dCol = col - 1;
                    positions.push({
                        object: state.stacks[dCol][row],
                        col: dCol,
                        row: row
                    });
                }
                break;

            case RELATION.leftof:
                // x is left of y if it is somewhere to the left.
                for(let dCol : number = col - 1; dCol >= 0; dCol--) {
                    for(let dRow : number = 0; row < state.stacks[dCol].length; dRow++){
                        positions.push({
                            object: state.stacks[dCol][dRow],
                            col: dCol,
                            row: dRow
                        });
                    }
                }
                break;
            case RELATION.rightof:
                // x is right of y if it is somewhere to the right.
                for (let dCol : number = col + 1; dCol < (state.stacks.length - 1); dCol++) {
                    for(let dRow : number = 0; row < state.stacks[dCol].length; dRow++){
                        positions.push({
                            object: state.stacks[dCol][dRow],
                            col: dCol,
                            row: dRow
                        });
                    }
                }

                break;

            case RELATION.ontop:
            case RELATION.inside:
                //x is on top of y if it is directly on top – the same relation is called inside if y is a box.
                let dRow : number = row - 1;
                positions.push({
                    object: state.stacks[col][dRow],
                    col: col,
                    row: dRow
                });
                break;

            case RELATION.under:
                // x is under y if it is somewhere below.
                if(row < (state.stacks[col].length - 1)){
                    let dRow = row + 1;
                    positions.push({
                        object: state.stacks[col][dRow],
                        col: col,
                        row: dRow
                    });
                }
                break;

            case RELATION.above:
                // x is above y if it is somewhere above.
                break;

            default:
                break;
        }

        for(let i = 0; i < positions.length; i++) {
            if(interpretObject(location.entity.object, state, positions[i].col, positions[i].row)) return true;
        }
        return false;

    }

    function checkPhysicalLaws(obj : Parser.Object, locObj : Parser.Object, polarity : boolean) : boolean {
        // Balls cannot support anything. /
        if(!polarity) {
            let temp : Parser.Object = obj;
            obj = locObj;
            locObj = temp;
        }

        if(locObj.form === FORM.ball) return false;

        //Small objects cannot support large objects.
        if(lte(obj.size, locObj.size)){

            switch (obj.form) {
                case FORM.ball:
                    return locObj.form === FORM.box || locObj.form === FORM.floor;

                case FORM.box:
                    if(equalSize(obj.size, locObj.size)){
                        // Boxes cannot contain pyramids, planks or boxes of the same size.
                        return !(locObj.form === FORM.pyramid ||
                        locObj.form === FORM.plank ||
                        locObj.form === FORM.box);
                    } else if(getSize(obj.size) === SIZE.small) {
                        // Small boxes cannot be supported by small bricks or pyramids.
                        return !(locObj.form === FORM.brick || locObj.form === FORM.pyramid);
                    } else if(getSize(obj.size) == SIZE.large) {
                        // Large boxes cannot be supported by large pyramids.
                        return !(locObj.form === FORM.pyramid);
                    }

                    return true;

                default:
                    return true;
            }
        }

        return false;
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
     *  Get the enum size according to the string that is passed into the function
     *
     * @param size string
     * @returns {SIZE}
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
     * @param size1
     * @param size2
     * @returns {boolean}
     */
    function lte(size1 : string, size2 : string) : boolean {
        return getSize(size1) <= getSize(size2);
    }

    function equalSize(size1 : string, size2 : string) : boolean {
        return getSize(size1) == getSize(size2);
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