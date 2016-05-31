///<reference path="Parser.ts"/>

/**
 * Interpreter module
 * 
 * Module for the the physical laws.
 */
module PhysicalLaws {
    export enum SIZE {
        small,
        large,
        undefined
    }

    export const RELATION = {
        ontop: 'ontop',
        inside: 'inside',
        above: 'above',
        under: 'under',
        beside: 'beside',
        leftof: 'leftof',
        rightof: 'rightof',
        holding: 'holding'
    };

    export const FORM = {
        brick: 'brick',
        plank: 'plank',
        ball: 'ball',
        pyramid: 'pyramid',
        box: 'box',
        table: 'table',
        floor: 'floor',
        anyform: 'anyform',
    };

     /**
     * Makes a check for the physical laws
     *
     * @param obj that we want compare with locObj to make sure that they follow the physical laws
     * @param locObj same as for obj
     * @param polarity inverts the nature of the relation
     * @returns {boolean} if it follows the physical laws or not
     */
    export function passLaws(obj: ObjectDefinition, locObj: ObjectDefinition, polarity: boolean): boolean {

        if (!polarity) {
            let temp: ObjectDefinition = obj;
            obj = locObj;
            locObj = temp;
        }

         // Balls cannot support anything.
        if (locObj.form === FORM.ball) {
            return false;
        }

        //Small objects cannot support large objects.
        if (lte(obj.size, locObj.size)) {

            switch (obj.form) {
                case FORM.ball:
                    return locObj.form === FORM.box || locObj.form === FORM.floor;
                case FORM.box:
                    if (getSize(obj.size) === SIZE.small) {
                        // Small boxes cannot be supported by small bricks or pyramids.
                        return !((locObj.form === FORM.brick || locObj.form === FORM.pyramid)
                        && (getSize(locObj.size) === SIZE.small));
                    } else if (getSize(obj.size) === SIZE.large) {
                        // Large boxes cannot be supported by large pyramids.
                        return !(locObj.form === FORM.pyramid);
                    }
                    // Boxes cannot contain boxes of the same size.
                    return !(equalSize(obj.size, locObj.size) && locObj.form === FORM.box);
                // Boxes cannot contain pyramids or planks of the same size
                case FORM.pyramid:
                case FORM.plank:
                    return !(equalSize(obj.size, locObj.size) && locObj.form === FORM.box);
                default:
                    return true;
            }
        }

        return false;
    }

    /**
     * Simply a less than or equal for the Parse.Object
     *
     * @param size1
     * @param size2
     * @returns {boolean}
     */
    function lte(size1: string, size2: string) : boolean {
        return getSize(size1) <= getSize(size2);
    }

    /**
     *  Get the enum size according to the string that is passed into the function
     *
     * @param size string
     * @returns {SIZE} enum that is related to the the string
     */
    function getSize(size: string): SIZE {
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
     * A check for equality
     * 
     * @param size1
     * @param size2
     * @returns {boolean}
     */
    function equalSize(size1: string, size2: string): boolean {
        return getSize(size1) === getSize(size2);
    }
}