///<reference path="World.ts"/>
///<reference path="Parser.ts"/>
///<reference path="lib/node.d.ts"/>
///<reference path="PhysicalLaws.ts"/>
var passLaws = PhysicalLaws.passLaws;
var SIZE = PhysicalLaws.SIZE;
var RELATION = PhysicalLaws.RELATION;
var FORM = PhysicalLaws.FORM;
//var bunyan = require('bunyan');
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
 */
var Interpreter;
(function (Interpreter) {
    //let log: any = bunyan.createLogger({name: "Interpreter"});
    /**
     * Top-level function for the Interpreter. It calls `interpretCommand` for each possible parse of the command. No need to change this one.
     * @param parses List of parses produced by the Parser.
     * @param currentState The current state of the world.
     * @returns Augments ParseResult with a list of interpretations. Each interpretation is represented by a list of Literals.
     */
    function interpret(parses, currentState) {
        var errors = [];
        var interpretations = [];
        parses.forEach(function (parseresult) {
            try {
                var result = parseresult;
                result.interpretation = interpretCommand(result.parse, currentState);
                // NOTE: We did not now what to return if there was no result so we return null, if so we do not add it
                if (result.interpretation !== null)
                    interpretations.push(result);
            }
            catch (err) {
                errors.push(err);
            }
        });
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
    /**
     *
     * The implementation of the interpreter
     *
     * @param   cmd The actual command. Note that it is *not* a string,
     *          but rather an object of type `Command` (as it has been parsed by the parser).
     * @param   state The current state of the world. Useful to look up objects in the world.
     * @returns A list of list of Literal, representing a formula in disjunctive normal form
     *          (disjunction of conjunctions). See the dummy interpetation returned in the code
     *          for an example, which means ontop(a,floor) AND holding(b).
     */
    function interpretCommand(cmd, state) {
        var interpretation = [];
        var location = cmd.location;
        if (cmd.command !== "put") {
            var objects = findObjects(cmd.entity, state, false);
            // if there is no location we go through all the objects and assume we just pick them up
            if (!location) {
                objects.forEach(function (obj) {
                    // The arm can only hold one object at the time.
                    interpretation.push(getGoal(true, "holding", [obj]));
                });
            }
            else {
                var locationObjects = findObjects(location.entity, state, true);
                objects.forEach(function (obj) {
                    locationObjects.forEach(function (locObj) {
                        // Push the interpretation if it passes the physical laws
                        if (state.objects[obj] !== state.objects[locObj]
                            && verticalRelationAllowed(state.objects[obj], state.objects[locObj], state, location.relation, locObj === FORM.floor)) {
                            interpretation.push(getGoal(true, location.relation, [obj, locObj]));
                        }
                    });
                });
            }
        }
        else if (cmd.command === "put") {
            var locationObjects = findObjects(location.entity, state, true);
            locationObjects.forEach(function (locObj) {
                // Push the interpretation if it passes the physical laws
                if (state.objects[state.holding] !== state.objects[locObj]
                    && verticalRelationAllowed(state.objects[state.holding], state.objects[locObj], state, location.relation, locObj === FORM.floor)) {
                    interpretation.push(getGoal(true, location.relation, [state.holding, locObj]));
                }
            });
        }
        return (interpretation.length !== 0) ? interpretation : null;
    }
    /**
     * Check if an interpretation passes the physical laws of the world.
     * Possible stack relation will be tested against the physical laws.
     *
     * @param obj The object
     * @param locObj The location object
     * @param relation The relation between the objects
     * @param isLocFloor If the location is the floor
     * @returns True if the vertical relation is allowed.
     */
    function verticalRelationAllowed(obj, locObj, state, relation, isLocFloor) {
        // Assume true since an object with no stack relation can always be placed
        var allowed = true;
        var queue = new collections.Queue();
        queue.add([locObj]);
        var currentStack;
        if (!isLocFloor && checkStackRelation(relation)) {
            while (!queue.isEmpty()) {
                currentStack = queue.dequeue();
                allowed = isAllowed(obj, currentStack[currentStack.length - 1], relation);
                if (allowed)
                    break;
                else {
                    for (var col = 0; col < state.stacks.length; col++) {
                        var stack = state.stacks[col];
                        for (var row = 0; row < stack.length; row++) {
                            var object = stack[row];
                            if (currentStack.indexOf(state.objects[object]) === -1 && isAllowed(state.objects[object], currentStack[currentStack.length - 1], relation)) {
                                currentStack.push(state.objects[object]);
                                queue.enqueue(currentStack);
                            }
                        }
                    }
                }
            }
        }
        else if (isLocFloor) {
            // If the location is the floor, the object must be either on top or above.
            allowed = (relation === RELATION.ontop || relation === RELATION.above);
        }
        return allowed;
    }
    /**
     * Check if the spatial relations are allowed.
     *
     * @param obj to check against locObj
     * @param locObj to check against obj
     * @param relation between the objects
     * @returns {boolean} if it is an allowed arrangement
     */
    function isAllowed(obj, locObj, relation) {
        switch (relation) {
            case RELATION.inside:
            case RELATION.ontop:
                return passLaws(obj, locObj, true);
            case RELATION.under:
                return passLaws(obj, locObj, false);
            default:
                return true;
        }
    }
    /**
     * Finds all the objects that matches the entity description
     *
     * @param entity that we search for
     * @param state of the world
     * @returns {string[]} with the objects inside the world state that match the entity
     */
    function findObjects(entity, state, isLocation) {
        var obj = entity.object;
        var objects = [];
        // If we search for the floor as a location we add it.
        if (isObjectMatch(obj, state, 0, -1)) {
            if (isLocation) {
                objects.push(FORM.floor);
                return objects;
            }
            // Can't pick up floor
            return null;
        }
        if (state.holding !== null) {
            var holdObj = state.objects[state.holding];
            if (objectCompare(obj, holdObj)) {
                objects.push(state.holding);
            }
        }
        // we make a search through the world state to find objects that match our description
        for (var col = 0; col < state.stacks.length; col++) {
            var stack = state.stacks[col];
            for (var row = 0; row < stack.length; row++) {
                var item = stack[row];
                if (isObjectMatch(entity.object, state, col, row)) {
                    objects.push(item);
                }
            }
        }
        return objects;
    }
    /**
     *
     * Matches an object description against objects in the world.
     * Makes recursive calls if there is a location else it compares the object against a state object.
     *
     * @param obj description that we search for
     * @param state of the world
     * @param col of the state object that we compare to
     * @param row of the state object that we compare to
     * @returns {boolean} depending on if the state object is a match with the parsed object
     */
    function isObjectMatch(obj, state, col, row) {
        var stateObject = (row === -1) ? { form: FORM.floor, size: null, color: null } : state.objects[state.stacks[col][row]];
        // If we have a location we make recursive calls until we find an object
        // without one and check it against a state object
        if (obj.location) {
            // If the object has a location we know that it also contains an object
            // therefore we interpret the object as well as follow the location to
            // make sure the both are a match
            return isObjectMatch(obj.object, state, col, row) && isLocationMatch(obj.location, state, col, row);
        }
        else {
            return objectCompare(obj, stateObject);
        }
    }
    /**
     *
     * Compare if two objects are the same
     *
     * @param obj First object
     * @param stateObject Second object
     * @returns {boolean} True if the objects are the same
     */
    function objectCompare(obj, stateObject) {
        return (obj.color == stateObject.color || obj.color == null)
            && (obj.size == stateObject.size || obj.size == null)
            && (obj.form == stateObject.form || obj.form == FORM.anyform && stateObject.form != FORM.floor);
    }
    /**
     *
     * Interprets an object and returns a matched object
     *
     * @param col of were the state object is positioned in the world state
     * @param row of were the state object is positioned in the world state
     * @param obj that we want to compare against the state object
     * @param state of the world
     * @returns {{col: number, row: number, matched: boolean}}
     */
    function getMatchedObject(obj, state, col, row) {
        return { col: col, row: row, matched: isObjectMatch(obj, state, col, row) };
    }
    /**
     *
     * Follows the location relation and checks if the object is a match or not with
     * the state object.
     *
     * @param location to match
     * @param state of the world
     * @param col of the position inside the state
     * @param row of the position inside the state
     * @returns {boolean} if the location is a match with the state position we are at
     */
    function isLocationMatch(location, state, col, row) {
        var matchedObject = [];
        // If there is a location defined and that location object matches the state object
        // we handle the relation
        switch (location.relation) {
            case RELATION.beside:
                // x is beside y if they are in adjacent stacks.
                if (col < state.stacks.length - 1) {
                    var dCol = col + 1;
                    for (var dRow_1 = 0; dRow_1 < state.stacks[dCol].length; dRow_1++) {
                        matchedObject.push(getMatchedObject(location.entity.object, state, dCol, dRow_1));
                    }
                }
                if (col > 0) {
                    var dCol = col - 1;
                    for (var dRow_2 = 0; dRow_2 < state.stacks[dCol].length; dRow_2++) {
                        matchedObject.push(getMatchedObject(location.entity.object, state, dCol, dRow_2));
                    }
                }
                break;
            case RELATION.leftof:
                // x is left of y if it is somewhere to the left.
                for (var dCol = col + 1; dCol < state.stacks.length - 1; dCol++) {
                    for (var dRow_3 = 0; dRow_3 < state.stacks[dCol].length; dRow_3++) {
                        matchedObject.push(getMatchedObject(location.entity.object, state, dCol, dRow_3));
                    }
                }
                break;
            case RELATION.rightof:
                // x is right of y if it is somewhere to the right.
                for (var dCol = col - 1; dCol >= 0; dCol--) {
                    for (var dRow_4 = 0; dRow_4 < state.stacks[dCol].length; dRow_4++) {
                        matchedObject.push(getMatchedObject(location.entity.object, state, dCol, dRow_4));
                    }
                }
                break;
            case RELATION.ontop:
            case RELATION.inside:
                //x is on top of y if it is directly on top – the same relation is called inside if y is a box.
                var dRow = row - 1;
                matchedObject.push(getMatchedObject(location.entity.object, state, col, dRow));
                break;
            case RELATION.under:
                // x is under y if it is somewhere below.
                if (row < (state.stacks[col].length - 1)) {
                    var dRow_5 = row + 1;
                    matchedObject.push(getMatchedObject(location.entity.object, state, col, dRow_5));
                }
                break;
            case RELATION.above:
                // x is above y if it is somewhere above.
                for (var dRow_6 = row + 1; dRow_6 < matchedObject.length; dRow_6++) {
                    matchedObject.push(getMatchedObject(location.entity.object, state, col, dRow_6));
                }
                break;
            default:
                break;
        }
        // We go through each object that fits the spatial relation
        // if it is a match we follow the location if we have one
        // else we return true since we found a match
        for (var i = 0; i < matchedObject.length; i++) {
            var mObj = matchedObject[i];
            if (mObj.matched) {
                if (location.entity.object.location) {
                    return isLocationMatch(location.entity.object.location, state, mObj.col, mObj.row);
                }
                return true;
            }
        }
        return false;
    }
    /**
     * Returns a goal for the DNF
     *
     * @param pol polarity
     * @param rel relation
     * @param args arguments
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