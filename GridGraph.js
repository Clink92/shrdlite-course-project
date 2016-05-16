///<reference path="Graph.ts"/>
var GridNode = (function () {
    function GridNode(pos) {
        this.pos = pos;
    }
    GridNode.prototype.add = function (delta) {
        return new GridNode({
            x: this.pos.x + delta.x,
            y: this.pos.y + delta.y
        });
    };
    GridNode.prototype.compareTo = function (other) {
        return (this.pos.x - other.pos.x) || (this.pos.y - other.pos.y);
    };
    GridNode.prototype.toString = function () {
        return "(" + this.pos.x + "," + this.pos.y + ")";
    };
    return GridNode;
}());
var GridGraph = (function () {
    function GridGraph(size, obstacles) {
        this.size = size;
        this.walls = new collections.Set();
        for (var _i = 0, obstacles_1 = obstacles; _i < obstacles_1.length; _i++) {
            var pos = obstacles_1[_i];
            this.walls.add(new GridNode(pos));
        }
        for (var x = -1; x <= size.x; x++) {
            this.walls.add(new GridNode({ x: x, y: -1 }));
            this.walls.add(new GridNode({ x: x, y: size.y }));
        }
        for (var y = -1; y <= size.y; y++) {
            this.walls.add(new GridNode({ x: -1, y: y }));
            this.walls.add(new GridNode({ x: size.x, y: y }));
        }
    }
    GridGraph.prototype.outgoingEdges = function (node) {
        var outgoing = [];
        for (var dx = -1; dx <= 1; dx++) {
            for (var dy = -1; dy <= 1; dy++) {
                if (!(dx * dx == dy * dy)) {
                    var next = node.add({ x: dx, y: dy });
                    if (!this.walls.contains(next)) {
                        outgoing.push({
                            from: node,
                            to: next,
                            cost: 1
                        });
                    }
                }
            }
        }
        return outgoing;
    };
    GridGraph.prototype.compareNodes = function (a, b) {
        return a.compareTo(b);
    };
    GridGraph.prototype.toString = function (start, goal, path) {
        function pathContains(path, n) {
            for (var _i = 0, path_1 = path; _i < path_1.length; _i++) {
                var p = path_1[_i];
                if (p.pos.x == n.pos.x && p.pos.y == n.pos.y)
                    return true;
            }
            return false;
        }
        var str = "";
        for (var y = this.size.y - 1; y >= 0; y--) {
            // row of borders
            for (var x = 0; x < this.size.x; x++) {
                if (y == this.size.y ||
                    this.walls.contains(new GridNode({ x: x, y: y })) ||
                    this.walls.contains(new GridNode({ x: x, y: y + 1 })))
                    str += "+---";
                else
                    str += "+   ";
            }
            str += "+\n";
            // row of cells
            for (var x = 0; x < this.size.x; x++) {
                var xynode = new GridNode({ x: x, y: y });
                // the wall between cells
                if (x == 0 || this.walls.contains(xynode) ||
                    this.walls.contains(new GridNode({ x: x - 1, y: y })))
                    str += "|";
                else
                    str += " ";
                // the cell
                if (start && x == start.pos.x && y == start.pos.y)
                    str += " S ";
                else if (goal && goal(xynode))
                    str += " G ";
                else if (path && pathContains(path, xynode))
                    str += " O ";
                else if (this.walls.contains(xynode))
                    str += "###";
                else
                    str += "   ";
            }
            str += "|\n";
        }
        str += new Array(this.size.x + 1).join("+---") + "+\n";
        return str;
    };
    return GridGraph;
}());
//# sourceMappingURL=GridGraph.js.map