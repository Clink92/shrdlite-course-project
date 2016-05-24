module Laws {

    abstract class Laws {
        check(
            object: Parser.Object,
            location: Parser.Object,
            polarity,
            laws: (object, location, polarity) => boolean): boolean {
            if (location.form !== "floor") return laws(object, location, polarity);
            return true;
        };

        abstract laws(object: Parser.Object, location: Parser.Object, polarity: boolean): boolean;
    }
    
    const FORM = {
        brick: 'brick',
        plank: 'plank',
        ball: 'ball',
        pyramid: 'pyramid',
        box: 'box',
        table: 'table',
        floor: 'floor',
        anyform: 'anyform',
    };


    class PhysicalLaws extends Laws {

        check(object:Parser.Object, location:Parser.Object, polarity): boolean {
            return super.check(object, location, polarity, this.laws);
        };

        laws(object: Parser.Object, location: Parser.Object, polarity: boolean): boolean {
           // Balls cannot support anything.
            if (!polarity) {
                var temp = object;
                object = location;
                location = temp;
            }
            if (location.form === FORM.ball) {
                return false;
            }
            //Small objects cannot support large objects.
            if (lte(object.size, location.size)) {
                switch (object.form) {
                    case FORM.ball:
                        return location.form === FORM.box || location.form === FORM.floor;
                    case FORM.box:
                        if (equalSize(object.size, location.size)) {
                            // Boxes cannot contain pyramids, planks or boxes of the same size.
                            return !(location.form === FORM.pyramid ||
                            location.form === FORM.plank ||
                            location.form === FORM.box);
                        }
                        else if (getSize(object.size) === SIZE.small) {
                            // Small boxes cannot be supported by small bricks or pyramids.
                            return !(location.form === FORM.brick || location.form === FORM.pyramid);
                        }
                        else if (getSize(object.size) == SIZE.large) {
                            // Large boxes cannot be supported by large pyramids.
                            return !(location.form === FORM.pyramid);
                        }
                        return true;
                    default:
                        return true;
                }
            }
            return false;
        }
    }

}