///<reference path="World.ts"/>
///<reference path="Parser.ts"/>
///<reference path="lib/async.d.ts"/>
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
var Interpreter;
(function (Interpreter) {
    /**
     Top-level function for the Interpreter. It calls `interpretCommand` for each possible parse of the command. No need to change this one.
     * @param parses List of parses produced by the Parser.
     * @param currentState The current state of the world.
     * @returns Augments ParseResult with a list of interpretations. Each interpretation is represented by a list of Literals.
     */
    function interpret(parses, currentState) {
        var errors = [];
        var interpretations = [];
        try {
            var result = parses[0];
            result.interpretation = interpretCommand(result.parse, currentState);
            // NOTE: We did not now what to return if there was no result so we return null, if so we do not add it
            if (result.interpretation)
                interpretations.push(result);
        }
        catch (err) {
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
        }
        else {
            // only throw the first error found
            throw errors[0];
        }
    }
    Interpreter.interpret = interpret;
    function stringify(result) {
        return result.interpretation.map(function (literals) {
            return literals.map(function (lit) { return stringifyLiteral(lit); }).join(" & ");
            // return literals.map(stringifyLiteral).join(" & ");
        }).join(" | ");
    }
    Interpreter.stringify = stringify;
    function stringifyLiteral(lit) {
        return (lit.polarity ? "" : "-") + lit.relation + "(" + lit.args.join(",") + ")";
    }
    Interpreter.stringifyLiteral = stringifyLiteral;
    //////////////////////////////////////////////////////////////////////
    // private functions
    var SIZE;
    (function (SIZE) {
        SIZE[SIZE["small"] = 0] = "small";
        SIZE[SIZE["large"] = 1] = "large";
        SIZE[SIZE["undefined"] = 2] = "undefined";
    })(SIZE || (SIZE = {}));
    var RELATION = {
        ontop: 'ontop',
        inside: 'inside',
        above: 'above',
        under: 'under',
        beside: 'beside',
        leftof: 'leftof',
        rightof: 'rightof'
    };
    var FORM = {
        brick: 'brick',
        plank: 'plank',
        ball: 'ball',
        pyramid: 'pyramid',
        box: 'box',
        table: 'table',
        floor: 'floor'
    };
    var COLOR = {
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
    function interpretCommand(cmd, state) {
        var interpretation = [];
        var location = cmd.location;
        var objects = interpretEntity(cmd.entity, state);
        // if there is no location we go through all the objects and assume we just pick them up
        if (!location) {
            objects.forEach(function (obj) {
                // The arm can only hold one object at the time.
                if (!state.holding)
                    interpretation.push(getGoal(true, "holding", [obj]));
            });
        }
        else {
            var locationObjects = interpretEntity(location.entity, state);
            objects.forEach(function (obj) {
                locationObjects.forEach(function (locObj) {
                    if (state.objects[obj] !== state.objects[locObj]) {
                        // If the location is a floor we can always place the object there
                        // If we have a stack relationship we need to check that it fulfills the physical laws
                        if (locObj !== "floor" && checkStackRelation(location.relation)) {
                            // small objects cannot support large objects
                            var stateObj = state.objects[obj];
                            var stateLocObj = state.objects[locObj];
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
                                    if (checkPhysicalLaws(stateObj, stateLocObj, true))
                                        interpretation.push(getGoal(true, location.relation, [obj, locObj]));
                                    break;
                                case RELATION.under:
                                    if (checkPhysicalLaws(stateObj, stateLocObj, false))
                                        interpretation.push(getGoal(true, location.relation, [obj, locObj]));
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
                });
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
    function interpretEntity(entity, state) {
        var obj = entity.object;
        var objects = [];
        // If we search for a floor we add it
        if (interpretObject(obj, state, 0, -1)) {
            objects.push("floor");
            return objects;
        }
        // we make a search through the world state to find objects that match our description
        for (var col = 0; col < state.stacks.length; col++) {
            var stack = state.stacks[col];
            for (var row = 0; row < stack.length; row++) {
                var item = stack[row];
                if (interpretObject(obj, state, col, row)) {
                    objects.push(item);
                }
            }
        }
        return objects;
    }
    /**
     *
     * @param obj
     * @param state
     * @param col
     * @param row
     * @returns {boolean}
     */
    function interpretObject(obj, state, col, row) {
        var stateObject = (row == -1) ? { form: "floor" } : state.objects[state.stacks[col][row]];
        if (!obj || !stateObject)
            return false;
        if (obj.location) {
            return interpretObject(obj.object, state, col, row) && interpretLocation(obj.location, state, col, row);
        }
        else {
            return isObjectMatch(obj, stateObject);
        }
    }
    function isObjectMatch(obj, stateObject) {
        return (obj.color == stateObject.color || obj.color == null)
            && (obj.size == stateObject.size || obj.size == null)
            && (obj.form == stateObject.form || (obj.form == "anyform" && stateObject.form != "floor"));
    }
    function interpretLocation(location, state, col, row) {
        var positions = [];
        // console.log("here again....", location.entity);
        // If there is a location defined and that location object matches the state object
        // we handle the relation
        // We make recursive calls on the location match until there are no more locations, if there is a match on
        // the final location we return true
        switch (location.relation) {
            case RELATION.beside:
                // x is beside y if they are in adjacent stacks.
                if (col < state.stacks.length) {
                    var dCol = col + 1;
                    positions.push({
                        object: state.stacks[dCol][row],
                        col: dCol,
                        row: row
                    });
                }
                if (col > 0) {
                    var dCol = col - 1;
                    positions.push({
                        object: state.stacks[dCol][row],
                        col: dCol,
                        row: row
                    });
                }
                break;
            case RELATION.leftof:
                // x is left of y if it is somewhere to the left.
                for (var dCol = col - 1; dCol >= 0; dCol--) {
                    for (var dRow_1 = 0; row < state.stacks[dCol].length; dRow_1++) {
                        positions.push({
                            object: state.stacks[dCol][dRow_1],
                            col: dCol,
                            row: dRow_1
                        });
                    }
                }
                break;
            case RELATION.rightof:
                // x is right of y if it is somewhere to the right.
                for (var dCol = col + 1; dCol < (state.stacks.length - 1); dCol++) {
                    for (var dRow_2 = 0; row < state.stacks[dCol].length; dRow_2++) {
                        positions.push({
                            object: state.stacks[dCol][dRow_2],
                            col: dCol,
                            row: dRow_2
                        });
                    }
                }
                break;
            case RELATION.ontop:
            case RELATION.inside:
                //x is on top of y if it is directly on top – the same relation is called inside if y is a box.
                var dRow = row - 1;
                positions.push({
                    object: state.stacks[col][dRow],
                    col: col,
                    row: dRow
                });
                break;
            case RELATION.under:
                // x is under y if it is somewhere below.
                if (row < (state.stacks[col].length - 1)) {
                    var dRow_3 = row + 1;
                    positions.push({
                        object: state.stacks[col][dRow_3],
                        col: col,
                        row: dRow_3
                    });
                }
                break;
            case RELATION.above:
                // x is above y if it is somewhere above.
                break;
            default:
                break;
        }
        for (var i = 0; i < positions.length; i++) {
            if (interpretObject(location.entity.object, state, positions[i].col, positions[i].row))
                return true;
        }
        return false;
    }
    function checkPhysicalLaws(obj, locObj, polarity) {
        // Balls cannot support anything. /
        if (!polarity) {
            var temp = obj;
            obj = locObj;
            locObj = temp;
        }
        if (locObj.form === FORM.ball)
            return false;
        //Small objects cannot support large objects.
        if (lte(obj.size, locObj.size)) {
            switch (obj.form) {
                case FORM.ball:
                    return locObj.form === FORM.box || locObj.form === FORM.floor;
                case FORM.box:
                    if (equalSize(obj.size, locObj.size)) {
                        // Boxes cannot contain pyramids, planks or boxes of the same size.
                        return !(locObj.form === FORM.pyramid ||
                            locObj.form === FORM.plank ||
                            locObj.form === FORM.box);
                    }
                    else if (getSize(obj.size) === SIZE.small) {
                        // Small boxes cannot be supported by small bricks or pyramids.
                        return !(locObj.form === FORM.brick || locObj.form === FORM.pyramid);
                    }
                    else if (getSize(obj.size) == SIZE.large) {
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
    function getGoal(pol, rel, args) {
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
    function getSize(size) {
        switch (size) {
            case "small":
                return SIZE.small;
            case "large":
                return SIZE.large;
            default:
                return SIZE.undefined;
        }
    }
    /**
     * Simply a less than or equal for the Parse.Object
     *
     * @param size1
     * @param size2
     * @returns {boolean}
     */
    function lte(size1, size2) {
        return getSize(size1) <= getSize(size2);
    }
    function equalSize(size1, size2) {
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
    function checkStackRelation(relation) {
        // We create an array and the check if the relation is contained within that
        // array.
        var arr = [
            RELATION.ontop,
            RELATION.above,
            RELATION.inside,
            RELATION.under
        ];
        return (arr.indexOf(relation) === -1) ? false : true;
    }
})(Interpreter || (Interpreter = {}));
//# sourceMappingURL=Interpreter.js.map