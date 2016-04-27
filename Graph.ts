///<reference path="lib/collections.ts"/>
///<reference path="lib/node.d.ts"/>

/** Graph module
*
*  Types for generic A\* implementation.
*
*  *NB.* The only part of this module
*  that you should change is the `aStarSearch` function. Everything
*  else should be used as-is.
*/

import copy = collections.arrays.copy;
import isUndefined = collections.isUndefined;
/** An edge in a graph. */
class Edge<Node> {
    from : Node;
    to   : Node;
    cost : number;
}

/** A directed graph. */
interface Graph<Node> {
    /** Computes the edges that leave from a node. */
    outgoingEdges(node : Node) : Edge<Node>[];
    /** A function that compares nodes. */
    compareNodes : collections.ICompareFunction<Node>;
}

/** Type that reports the result of a search. */
class SearchResult<Node> {
    /** The path (sequence of Nodes) found by the search algorithm. */
    path : Node[];
    /** The total cost of the path. */
    cost : number;
}


/**
* A\* search implementation, parameterised by a `Node` type. The code
* here is just a template; you should rewrite this function
* entirely. In this template, the code produces a dummy search result
* which just picks the first possible neighbour.
*
* Note that you should not change the API (type) of this function,
* only its body.
* @param graph The graph on which to perform A\* search.
* @param start The initial node.
* @param goal A function that returns true when given a goal node. Used to determine if the algorithm has reached the goal.
* @param heuristics The heuristic function. Used to estimate the cost of reaching the goal from a given Node.
* @param timeout Maximum time to spend performing A\* search.
* @returns A search result, which contains the path from `start` to a node satisfying `goal` and the cost of this path.
*/
function aStarSearch<Node> (
    graph : Graph<Node>,
    start : Node,
    goal : (n:Node) => boolean,
    heuristics : (n:Node) => number,
    timeout : number
) : SearchResult<Node> 
{
    // A dummy search result: it just picks the first possible neighbour
    var result : SearchResult<Node> = 
	{
        path: [],
        cost: 0
    };

    var fScore = new collections.Dictionary<Node, number>();
    var gScore = new collections.Dictionary<Node, number>();
    // this dictionary keeps track of the best path's currently travelled
    var cameFrom = new collections.LinkedDictionary<Node, Node>();

    // we send in a compare function to prioritize in a correct manner
    var openList = new collections.PriorityQueue<Node>(function(a, b){
        var c1 = fScore.getValue(a),
            c2 = fScore.getValue(b);

        // if the cost of a is less then b we prioritize it higher
        if(c1 < c2)
            return 1;
        else if(c1 > c2)
            return -1;
        return 0;
    });

    // We add these primarily for the .contains() call to work as expected
    // maybe a dictionary would be better here so we get an O(1) complexity instead when calling contains()
    var frontier = new collections.Set<Node>();
	var explored = new collections.Set<Node>();
    
	// Add start node
    gScore.setValue(start, 0);
    fScore.setValue(start, heuristics(start));
    openList.enqueue(start);

    while(!openList.isEmpty())
    {
        var current = openList.dequeue();

        frontier.remove(current);
        explored.add(current);

        if(goal(current)) {
            // Goal found, reconstruct the path
            var cf = current;
            var hasNext:boolean = true;
            
            while(hasNext){
                // Andreas: Simplified this reconstruction of the path
                result.path.unshift(cf);
                hasNext = cameFrom.containsKey(cf);
                if(hasNext)
                    cf = cameFrom.getValue(cf);
            }

            // cool dudes make stupid hacks.. apparently we do not expect the start node as a part of the path!
            // Andreas: Why? It passes the tests without this
            //result.path.shift();

            // Set the final path cost
            result.cost = gScore.getValue(current);

            break;
        }

        var edges :Edge<Node>[] = graph.outgoingEdges(current);

        for(var i:number = 0; i < edges.length; i++){
            var child:Node = edges[i].to;

            if(explored.contains(child)){
                continue;
            }

            // Andreas: Remove this if-statement? Don't see why it is needed. Just do the calculation.
            //if(gScore.containsKey(current)){
                var tempCost:number = edges[i].cost + gScore.getValue(current);
            //}

            // According to splendid sources an unknown gScore should equal to infinity, since we are not Buzz Lightyear
            // we pause and reflect on our life choices...
            //else var tempCost:number = 9999999999999999;
            
            if(!(frontier.contains(child))){
                frontier.add(child);
                openList.enqueue(child);
            }
            else if (tempCost >= gScore.getValue(child)) {
                // if the cost of this path is more then the old one we continue to other children
                continue;
            }

            cameFrom.setValue(child, current);
            gScore.setValue(child, tempCost);
            fScore.setValue(child, (tempCost + heuristics(child)));
        }

	}

    return result;
}



//////////////////////////////////////////////////////////////////////
// here is an example graph

interface Coordinate {
    x : number;
    y : number;
}


class GridNode {
    constructor(
        public pos : Coordinate
    ) {}

    add(delta : Coordinate) : GridNode {
        return new GridNode({
            x: this.pos.x + delta.x,
            y: this.pos.y + delta.y
        });
    }

    compareTo(other : GridNode) : number {
        return (this.pos.x - other.pos.x) || (this.pos.y - other.pos.y);
    }

    toString() : string {
        return "(" + this.pos.x + "," + this.pos.y + ")";
    }
}

/** Example Graph. */
class GridGraph implements Graph<GridNode> {
    private walls : collections.Set<GridNode>;

    constructor(
        public size : Coordinate,
        obstacles : Coordinate[]
    ) {
        this.walls = new collections.Set<GridNode>();
        for (var pos of obstacles) {
            this.walls.add(new GridNode(pos));
        }
        for (var x = -1; x <= size.x; x++) {
            this.walls.add(new GridNode({x:x, y:-1}));
            this.walls.add(new GridNode({x:x, y:size.y}));
        }
        for (var y = -1; y <= size.y; y++) {
            this.walls.add(new GridNode({x:-1, y:y}));
            this.walls.add(new GridNode({x:size.x, y:y}));
        }
    }

    outgoingEdges(node : GridNode) : Edge<GridNode>[] {
        var outgoing : Edge<GridNode>[] = [];
        for (var dx = -1; dx <= 1; dx++) {
            for (var dy = -1; dy <= 1; dy++) {
                if (! (dx == 0 && dy == 0)) {
                    var next = node.add({x:dx, y:dy});
                    if (! this.walls.contains(next)) {
                        outgoing.push({
                            from: node,
                            to: next,
                            cost: Math.sqrt(dx*dx + dy*dy)
                        });
                    }
                }
            }
        }
        return outgoing;
    }

    compareNodes(a : GridNode, b : GridNode) : number {
        return a.compareTo(b);
    }

    toString() : string {
        var borderRow = "+" + new Array(this.size.x + 1).join("--+");
        var betweenRow = "+" + new Array(this.size.x + 1).join("  +");
        var str = "\n" + borderRow + "\n";
        for (var y = this.size.y-1; y >= 0; y--) {
            str += "|";
            for (var x = 0; x < this.size.x; x++) {
                str += this.walls.contains(new GridNode({x:x,y:y})) ? "## " : "   ";
            }
            str += "|\n";
            if (y > 0) str += betweenRow + "\n";
        }
        str += borderRow + "\n";
        return str;
    }
}